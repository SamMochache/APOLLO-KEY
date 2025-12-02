# backend/messaging/admin.py
from django.contrib import admin
from .models import Message, MessageAttachment

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('subject', 'sender', 'recipient', 'priority', 'is_read', 'created_at')
    list_filter = ('priority', 'is_read', 'created_at')
    search_fields = ('subject', 'body', 'sender__username', 'recipient__username')
    readonly_fields = ('created_at', 'updated_at', 'read_at')
    date_hierarchy = 'created_at'

@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ('filename', 'message', 'file_size', 'uploaded_at')
    readonly_fields = ('uploaded_at',)