from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Message, MessageAttachment
from .serializers import MessageSerializer, MessageCreateSerializer
from academics.models import ParentStudentRelationship

User = get_user_model()

class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet for messaging system"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter messages by user role"""
        user = self.request.user
        return Message.objects.filter(
            Q(sender=user) | Q(recipient=user)
        ).select_related(
            'sender', 'recipient', 'related_student', 'parent_message'
        ).prefetch_related('attachments', 'replies')
    
    def get_serializer_class(self):
        if self.action in ('create', 'reply'):
            return MessageCreateSerializer
        return MessageSerializer

    # Ensure sender exists before model.full_clean() runs in Message.save()
    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
    
    @action(detail=False, methods=['get'])
    def inbox(self, request):
        messages = self.get_queryset().filter(recipient=request.user).order_by('-created_at')
        read_status = request.query_params.get('read')
        if read_status == 'true':
            messages = messages.filter(is_read=True)
        elif read_status == 'false':
            messages = messages.filter(is_read=False)
        priority = request.query_params.get('priority')
        if priority:
            messages = messages.filter(priority=priority)
        search = request.query_params.get('search')
        if search:
            messages = messages.filter(
                Q(subject__icontains=search) |
                Q(body__icontains=search) |
                Q(sender__username__icontains=search)
            )
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = MessageSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def sent(self, request):
        messages = self.get_queryset().filter(sender=request.user).order_by('-created_at')
        priority = request.query_params.get('priority')
        if priority:
            messages = messages.filter(priority=priority)
        search = request.query_params.get('search')
        if search:
            messages = messages.filter(
                Q(subject__icontains=search) |
                Q(body__icontains=search) |
                Q(recipient__username__icontains=search)
            )
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = MessageSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        message = self.get_object()
        if message.recipient != request.user:
            return Response({'error': 'You can only mark your own messages as read'}, status=status.HTTP_403_FORBIDDEN)
        message.mark_as_read()
        serializer = MessageSerializer(message, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def mark_unread(self, request, pk=None):
        message = self.get_object()
        if message.recipient != request.user:
            return Response({'error': 'You can only mark your own messages as unread'}, status=status.HTTP_403_FORBIDDEN)
        message.is_read = False
        message.read_at = None
        message.save(update_fields=['is_read', 'read_at'])
        serializer = MessageSerializer(message, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Message.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        updated = Message.objects.filter(recipient=request.user, is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({'success': True, 'marked_read': updated})
    
    @action(detail=False, methods=['get'])
    def recipients(self, request):
        user = request.user
        recipients = []
        if user.role == User.TEACHER:
            from academics.models import Class
            teacher_classes = Class.objects.filter(teacher=user)
            student_ids = []
            for cls in teacher_classes:
                student_ids.extend(list(cls.students.values_list('id', flat=True)))
            parent_relationships = ParentStudentRelationship.objects.filter(student_id__in=student_ids).select_related('parent', 'student')
            parent_ids = set()
            for rel in parent_relationships:
                if rel.parent.id not in parent_ids:
                    recipients.append({
                        'id': rel.parent.id,
                        'username': rel.parent.username,
                        'email': rel.parent.email,
                        'role': rel.parent.role,
                        'full_name': rel.parent.get_full_name(),
                        'related_student': {
                            'id': rel.student.id,
                            'name': rel.student.get_full_name()
                        }
                    })
                    parent_ids.add(rel.parent.id)
            students = User.objects.filter(id__in=student_ids, role=User.STUDENT)
            for student in students:
                recipients.append({
                    'id': student.id,
                    'username': student.username,
                    'email': student.email,
                    'role': student.role,
                    'full_name': student.get_full_name()
                })
        elif user.role == User.PARENT:
            relationships = ParentStudentRelationship.objects.filter(parent=user).select_related('student')
            teacher_ids = set()
            for rel in relationships:
                classes = rel.student.classes_joined.all()
                for cls in classes:
                    if cls.teacher and cls.teacher.id not in teacher_ids:
                        recipients.append({
                            'id': cls.teacher.id,
                            'username': cls.teacher.username,
                            'email': cls.teacher.email,
                            'role': cls.teacher.role,
                            'full_name': cls.teacher.get_full_name()
                        })
                        teacher_ids.add(cls.teacher.id)
        elif user.role == User.STUDENT:
            classes = user.classes_joined.all()
            teacher_ids = set()
            for cls in classes:
                if cls.teacher and cls.teacher.id not in teacher_ids:
                    recipients.append({
                        'id': cls.teacher.id,
                        'username': cls.teacher.username,
                        'email': cls.teacher.email,
                        'role': cls.teacher.role,
                        'full_name': cls.teacher.get_full_name()
                    })
                    teacher_ids.add(cls.teacher.id)
        elif user.role == User.ADMIN:
            all_users = User.objects.exclude(id=user.id)
            for u in all_users:
                recipients.append({
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'role': u.role,
                    'full_name': u.get_full_name()
                })
        return Response(recipients)
    
    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        parent_message = self.get_object()
        subject = request.data.get('subject') or f"Re: {parent_message.subject}"
        reply_data = {
            'recipient': parent_message.sender.id,
            'related_student': request.data.get('related_student', parent_message.related_student_id),
            'subject': subject,
            'body': request.data.get('body'),
            'priority': request.data.get('priority', 'normal'),
            'parent_message': parent_message.id
        }
        serializer = MessageCreateSerializer(data=reply_data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        reply = serializer.save(sender=request.user)
        return Response(MessageSerializer(reply, context={'request': request}).data, status=status.HTTP_201_CREATED)
