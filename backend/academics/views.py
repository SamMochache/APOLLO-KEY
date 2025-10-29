# backend/academics/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Class, Subject, Timetable
from .serializers import ClassSerializer, SubjectSerializer, TimetableSerializer

class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all().select_related("teacher").prefetch_related("students")
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def timetable(self, request, pk=None):
        """Get timetable for a specific class"""
        cls = self.get_object()
        timetable = Timetable.objects.filter(class_assigned=cls).select_related(
            'subject', 'teacher'
        ).order_by('day', 'start_time')
        serializer = TimetableSerializer(timetable, many=True)
        return Response(serializer.data)


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all().select_related("teacher")
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]


class TimetableViewSet(viewsets.ModelViewSet):
    queryset = Timetable.objects.all().select_related("class_assigned", "subject", "teacher")
    serializer_class = TimetableSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter timetable based on query parameters"""
        queryset = super().get_queryset()
        
        class_id = self.request.query_params.get('class_id')
        day = self.request.query_params.get('day')
        teacher_id = self.request.query_params.get('teacher_id')
        
        if class_id:
            queryset = queryset.filter(class_assigned_id=class_id)
        if day:
            queryset = queryset.filter(day=day)
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
            
        return queryset.order_by('day', 'start_time')

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create multiple timetable entries at once"""
        entries = request.data.get('entries', [])
        
        if not entries:
            return Response(
                {'error': 'No entries provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=entries, many=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Update multiple timetable entries at once"""
        entries = request.data.get('entries', [])
        
        if not entries:
            return Response(
                {'error': 'No entries provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated = []
        errors = []
        
        for entry_data in entries:
            entry_id = entry_data.get('id')
            if not entry_id:
                errors.append({'error': 'Entry ID required', 'data': entry_data})
                continue
                
            try:
                instance = Timetable.objects.get(id=entry_id)
                serializer = self.get_serializer(instance, data=entry_data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    updated.append(serializer.data)
                else:
                    errors.append({'id': entry_id, 'errors': serializer.errors})
            except Timetable.DoesNotExist:
                errors.append({'error': 'Entry not found', 'id': entry_id})
        
        return Response({
            'updated': updated,
            'errors': errors
        }, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)

    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        """Delete multiple timetable entries at once"""
        ids = request.data.get('ids', [])
        
        if not ids:
            return Response(
                {'error': 'No IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted_count = Timetable.objects.filter(id__in=ids).delete()[0]
        
        return Response({
            'deleted': deleted_count,
            'message': f'{deleted_count} entries deleted successfully'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def conflicts(self, request):
        """Check for scheduling conflicts"""
        class_id = request.query_params.get('class_id')
        teacher_id = request.query_params.get('teacher_id')
        
        conflicts = []
        
        if class_id:
            # Find overlapping time slots for the same class
            entries = Timetable.objects.filter(class_assigned_id=class_id)
            for entry in entries:
                overlaps = entries.filter(
                    day=entry.day,
                    start_time__lt=entry.end_time,
                    end_time__gt=entry.start_time
                ).exclude(id=entry.id)
                
                if overlaps.exists():
                    conflicts.append({
                        'type': 'class_overlap',
                        'entry': TimetableSerializer(entry).data,
                        'conflicts_with': TimetableSerializer(overlaps, many=True).data
                    })
        
        if teacher_id:
            # Find overlapping time slots for the same teacher
            entries = Timetable.objects.filter(teacher_id=teacher_id)
            for entry in entries:
                overlaps = entries.filter(
                    day=entry.day,
                    start_time__lt=entry.end_time,
                    end_time__gt=entry.start_time
                ).exclude(id=entry.id)
                
                if overlaps.exists():
                    conflicts.append({
                        'type': 'teacher_overlap',
                        'entry': TimetableSerializer(entry).data,
                        'conflicts_with': TimetableSerializer(overlaps, many=True).data
                    })
        
        return Response({
            'has_conflicts': len(conflicts) > 0,
            'conflicts': conflicts
        })