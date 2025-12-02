from rest_framework import serializers
from .models import Message, MessageAttachment
from django.contrib.auth import get_user_model

User = get_user_model()

class MessageAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageAttachment
        fields = ['id', 'filename', 'file', 'file_size', 'uploaded_at']
        read_only_fields = ['uploaded_at']


class UserBasicSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'full_name', 'profile_photo']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class MessageSerializer(serializers.ModelSerializer):
    sender_details = UserBasicSerializer(source='sender', read_only=True)
    recipient_details = UserBasicSerializer(source='recipient', read_only=True)
    related_student_details = UserBasicSerializer(source='related_student', read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    reply_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_details', 'recipient', 'recipient_details',
            'related_student', 'related_student_details', 'subject', 'body',
            'priority', 'is_read', 'read_at', 'parent_message', 'reply_count',
            'attachments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['sender', 'is_read', 'read_at', 'created_at', 'updated_at']
    
    def get_reply_count(self, obj):
        return obj.replies.count()


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating messages"""
    class Meta:
        model = Message
        fields = [
            'recipient', 'related_student', 'subject', 
            'body', 'priority', 'parent_message'
        ]
    
    def _resolve_user_field(self, value, field_name):
        """
        Accept either a user instance or an integer ID.
        Return a User instance or raise ValidationError.
        """
        if value is None:
            return None
        # If already a User instance (DRF may pass objects in some cases)
        if isinstance(value, User):
            return value
        # If it's a dict (unlikely) try id key
        if isinstance(value, dict) and 'id' in value:
            uid = value['id']
        else:
            uid = value
        try:
            return User.objects.get(id=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError({field_name: "User not found"})

    def validate(self, data):
        request = self.context.get('request')
        if request is None:
            raise serializers.ValidationError("Request is required in context for validation.")
        sender = request.user

        # Resolve recipient -> user instance
        recipient_value = data.get('recipient')
        recipient = self._resolve_user_field(recipient_value, 'recipient')
        data['recipient'] = recipient

        # Optional related student
        related_student_value = data.get('related_student')
        if related_student_value:
            related_student = self._resolve_user_field(related_student_value, 'related_student')
            data['related_student'] = related_student

        # Now role-based validation
        if sender.role == User.TEACHER:
            if recipient.role not in [User.PARENT, User.STUDENT]:
                raise serializers.ValidationError({'recipient': 'Teachers can only message parents or students'})

        elif sender.role == User.PARENT:
            if recipient.role != User.TEACHER:
                raise serializers.ValidationError({'recipient': 'Parents can only message teachers'})

        elif sender.role == User.STUDENT:
            if recipient.role != User.TEACHER:
                raise serializers.ValidationError({'recipient': 'Students can only message teachers'})

        return data
