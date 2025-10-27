from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL  # Reference to custom User model

class Class(models.Model):
    """Represents an academic class or group of students."""
    name = models.CharField(max_length=100, unique=True)
    teacher = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="classes_taught"
    )
    students = models.ManyToManyField(
        User, related_name="classes_joined", blank=True
    )
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Subject(models.Model):
    """Represents a subject taught in the school."""
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    teacher = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="subjects_taught"
    )
    classes = models.ManyToManyField(Class, related_name="subjects")
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.code})"
