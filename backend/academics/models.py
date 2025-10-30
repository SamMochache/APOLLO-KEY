from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

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
    
    def clean(self):
        """Validate timetable entry for conflicts"""
        super().clean()
        
        # Check for class time conflicts
        class_conflicts = Timetable.objects.filter(
            class_assigned=self.class_assigned,
            day=self.day,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        ).exclude(pk=self.pk)
        
        if class_conflicts.exists():
            raise ValidationError({
                'class_assigned': f'Class {self.class_assigned.name} already has a scheduled session during this time.'
            })
        
        # Check for teacher conflicts
        if self.teacher:
            teacher_conflicts = Timetable.objects.filter(
                teacher=self.teacher,
                day=self.day,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time
            ).exclude(pk=self.pk)
            
            if teacher_conflicts.exists():
                raise ValidationError({
                    'teacher': f'Teacher is already assigned to another class during this time.'
                })
    
    def save(self, *args, **kwargs):
        """Call full_clean before saving"""
        self.full_clean()
        super().save(*args, **kwargs)


class Attendance(models.Model):
    """Tracks daily attendance for each student in a class."""

    PRESENT = 'present'
    ABSENT = 'absent'
    LATE = 'late'

    STATUS_CHOICES = [
        (PRESENT, 'Present'),
        (ABSENT, 'Absent'),
        (LATE, 'Late'),
    ]

    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="attendances"
    )
    class_assigned = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="attendances"
    )
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="attendance_recorded"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'class_assigned', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.student} - {self.class_assigned} - {self.date} ({self.status})"