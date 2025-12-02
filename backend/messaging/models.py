from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()

class Message(models.Model):
    """Model for teacher-parent-student messaging"""
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_messages'
    )
    related_student = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='related_messages',
        limit_choices_to={'role': User.STUDENT}
    )
    
    subject = models.CharField(max_length=200)
    body = models.TextField()
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='normal'
    )
    
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    parent_message = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['related_student']),
        ]
    
    def __str__(self):
        return f"{self.sender.username} → {self.recipient.username}: {self.subject}"
    
    def clean(self):
        """Validate message roles"""
        # self.sender must exist and be a User
        if not self.sender:
            raise ValidationError("Sender must be set for message validation.")
        
        if self.sender.role == User.TEACHER:
            if self.recipient.role not in [User.PARENT, User.STUDENT]:
                raise ValidationError("Teachers can only message parents or students")
        
        elif self.sender.role == User.PARENT:
            if self.recipient.role != User.TEACHER:
                raise ValidationError("Parents can only message teachers")
        
        elif self.sender.role == User.STUDENT:
            if self.recipient.role != User.TEACHER:
                raise ValidationError("Students can only message teachers")
        
        elif self.sender.role == User.ADMIN:
            pass
        
        else:
            raise ValidationError("Invalid sender role for messaging")
    
    def save(self, *args, **kwargs):
        # run validation before saving
        self.full_clean()
        super().save(*args, **kwargs)
    
    def mark_as_read(self):
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class MessageAttachment(models.Model):
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to='message_attachments/')
    filename = models.CharField(max_length=255)
    file_size = models.IntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['uploaded_at']
    
    def __str__(self):
        return f"Attachment: {self.filename}"
