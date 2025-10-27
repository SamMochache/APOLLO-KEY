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


class Timetable(models.Model):
    """Represents a scheduled subject session for a class."""
    DAYS_OF_WEEK = [
        ("MON", "Monday"),
        ("TUE", "Tuesday"),
        ("WED", "Wednesday"),
        ("THU", "Thursday"),
        ("FRI", "Friday"),
        ("SAT", "Saturday"),
        ("SUN", "Sunday"),
    ]

    class_assigned = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="timetable_entries")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="timetable_entries")
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    day = models.CharField(max_length=3, choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        unique_together = ("class_assigned", "subject", "day", "start_time")
        ordering = ["day", "start_time"]

    def __str__(self):
        return f"{self.class_assigned.name} - {self.subject.name} ({self.day})"
