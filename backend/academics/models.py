from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()
# Reference to custom User model

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
        indexes = [
            models.Index(fields=['date', 'class_assigned']),
            models.Index(fields=['student', 'date']),
            models.Index(fields=['date', 'status']),
        ]


    def __str__(self):
        return f"{self.student} - {self.class_assigned} - {self.date} ({self.status})"
    

class GradeConfig(models.Model):
    """System-wide grading scale configuration."""
    min_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    max_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    grade_letter = models.CharField(max_length=5, unique=True)  # A+, A, B+, etc.
    gpa_value = models.DecimalField(
        max_digits=3, 
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(4)]
    )
    description = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['-min_percentage']
        indexes = [
            models.Index(fields=['min_percentage', 'max_percentage']),
        ]
    
    def __str__(self):
        return f"{self.grade_letter} ({self.min_percentage}-{self.max_percentage}%)"
    
    def clean(self):
        """Validate no overlapping ranges."""
        super().clean()
        
        if self.min_percentage >= self.max_percentage:
            raise ValidationError({
                'max_percentage': 'Max percentage must be greater than min percentage.'
            })
        
        # Check for overlaps
        overlapping = GradeConfig.objects.filter(
            min_percentage__lt=self.max_percentage,
            max_percentage__gt=self.min_percentage
        ).exclude(pk=self.pk)
        
        if overlapping.exists():
            raise ValidationError({
                'non_field_errors': ['Grading ranges cannot overlap.']
            })


class Assessment(models.Model):
    """Represents an assessment (exam, quiz, assignment, project)."""
    QUIZ = 'quiz'
    EXAM = 'exam'
    ASSIGNMENT = 'assignment'
    PROJECT = 'project'
    
    TYPE_CHOICES = [
        (QUIZ, 'Quiz'),
        (EXAM, 'Exam'),
        (ASSIGNMENT, 'Assignment'),
        (PROJECT, 'Project'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    assessment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    subject = models.ForeignKey(
        Subject, 
        on_delete=models.CASCADE, 
        related_name='assessments'
    )
    class_assigned = models.ForeignKey(
        Class, 
        on_delete=models.CASCADE, 
        related_name='assessments'
    )
    date = models.DateField()
    total_marks = models.DecimalField(
        max_digits=6, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    weightage = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentage contribution to final grade"
    )
    passing_marks = models.DecimalField(
        max_digits=6, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True
    )
    duration = models.DurationField(null=True, blank=True, help_text="Assessment duration")
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='assessments_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', 'name']
        indexes = [
            models.Index(fields=['subject', 'class_assigned', 'date']),
            models.Index(fields=['assessment_type', 'date']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.subject.name} ({self.assessment_type})"
    
    def clean(self):
        """Validate assessment data."""
        super().clean()
        
        if self.passing_marks and self.passing_marks > self.total_marks:
            raise ValidationError({
                'passing_marks': 'Passing marks cannot exceed total marks.'
            })


class Grade(models.Model):
    """Stores individual student grades for assessments."""
    assessment = models.ForeignKey(
        Assessment, 
        on_delete=models.CASCADE, 
        related_name='grades'
    )
    student = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='grades'
    )
    marks_obtained = models.DecimalField(
        max_digits=6, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True
    )
    is_absent = models.BooleanField(default=False)
    grade_letter = models.CharField(max_length=5, blank=True)  # Auto-calculated
    percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        blank=True,
        null=True
    )  # Auto-calculated
    remarks = models.TextField(blank=True)
    graded_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='grades_given'
    )
    graded_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('assessment', 'student')
        ordering = ['-graded_at']
        indexes = [
            models.Index(fields=['student', 'assessment']),
            models.Index(fields=['grade_letter']),
        ]
    
    def __str__(self):
        return f"{self.student.username} - {self.assessment.name}: {self.marks_obtained}/{self.assessment.total_marks}"
    
    def clean(self):
        """Validate grade data."""
        super().clean()
        
        if not self.is_absent and self.marks_obtained is None:
            raise ValidationError({
                'marks_obtained': 'Marks required if student is not absent.'
            })
        
        if self.marks_obtained and self.marks_obtained > self.assessment.total_marks:
            raise ValidationError({
                'marks_obtained': 'Marks obtained cannot exceed total marks.'
            })
    
    def save(self, *args, **kwargs):
        """Auto-calculate percentage and grade letter before saving."""
        if self.marks_obtained is not None and not self.is_absent:
            # Calculate percentage
            self.percentage = (self.marks_obtained / self.assessment.total_marks) * 100
            
            # Determine grade letter
            try:
                grade_config = GradeConfig.objects.filter(
                    min_percentage__lte=self.percentage,
                    max_percentage__gte=self.percentage
                ).first()
                
                if grade_config:
                    self.grade_letter = grade_config.grade_letter
            except Exception as e:
                print(f"Grade letter calculation failed: {e}")
        
        super().save(*args, **kwargs)