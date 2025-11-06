# backend/academics/serializers.py - CLEANED (ONLY SERIALIZERS)
from rest_framework import serializers
from .models import Class, Subject, Timetable, Attendance, GradeConfig, Assessment, Grade
from decimal import Decimal
from django.db.models import Avg, Count, Sum, Q

class SubjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ["id", "name", "code", "teacher", "teacher_name", "description"]
    
    def get_teacher_name(self, obj):
        """Get full name or username of teacher"""
        if obj.teacher:
            return obj.teacher.get_full_name()
        return None


class ClassSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    student_count = serializers.IntegerField(source="students.count", read_only=True)

    class Meta:
        model = Class
        fields = ["id", "name", "teacher", "teacher_name", "student_count", "description"]
    
    def get_teacher_name(self, obj):
        """Get full name or username of teacher"""
        if obj.teacher:
            return obj.teacher.get_full_name()
        return None


class TimetableSerializer(serializers.ModelSerializer):
    class_assigned_name = serializers.CharField(source="class_assigned.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = Timetable
        fields = [
            "id",
            "class_assigned",
            "class_assigned_name",
            "subject",
            "subject_name",
            "teacher",
            "teacher_name",
            "day",
            "start_time",
            "end_time",
        ]
    
    def validate(self, data):
        """Check for scheduling conflicts and enforce business rules."""
        instance = self.instance

        # Resolve values from incoming data or existing instance (supports partial updates)
        start_time = data.get("start_time") if "start_time" in data else (instance.start_time if instance else None)
        end_time = data.get("end_time") if "end_time" in data else (instance.end_time if instance else None)
        class_assigned = data.get("class_assigned") if "class_assigned" in data else (instance.class_assigned if instance else None)
        teacher = data.get("teacher") if "teacher" in data else (instance.teacher if instance else None)
        day = data.get("day") if "day" in data else (instance.day if instance else None)

        # If start or end time or class/day missing, skip deep checks to allow partial updates
        if start_time and end_time:
            # Rule 1: Validate time order
            if start_time >= end_time:
                raise serializers.ValidationError({
                    "end_time": "End time must be later than start time."
                })

        # Require class_assigned and day to evaluate schedule conflicts
        if class_assigned and day and start_time and end_time:
            # Rule 2: Check overlapping sessions for the same class
            class_query = Timetable.objects.filter(
                class_assigned=class_assigned,
                day=day,
                start_time__lt=end_time,
                end_time__gt=start_time
            )
            if instance:
                class_query = class_query.exclude(pk=instance.pk)
            if class_query.exists():
                raise serializers.ValidationError({
                    "class_assigned": f"{class_assigned.name} already has a class scheduled during this time."
                })

            # Rule 3: Teacher conflict
            if teacher:
                teacher_query = Timetable.objects.filter(
                    teacher=teacher,
                    day=day,
                    start_time__lt=end_time,
                    end_time__gt=start_time
                )
                if instance:
                    teacher_query = teacher_query.exclude(pk=instance.pk)
                if teacher_query.exists():
                    raise serializers.ValidationError({
                        "teacher": f"{teacher.username} already has another session at this time on {day}."
                    })

            # Rule 4: Max sessions per day (per class)
            MAX_SESSIONS_PER_DAY = 6
            sessions_today = Timetable.objects.filter(
                class_assigned=class_assigned, day=day
            ).exclude(pk=instance.pk if instance else None).count()
            if sessions_today >= MAX_SESSIONS_PER_DAY:
                raise serializers.ValidationError({
                    "limit": f"{class_assigned.name} has reached the maximum of {MAX_SESSIONS_PER_DAY} sessions for {day}."
                })

            # Rule 5: Teacher workload limit (optional)
            MAX_TEACHER_SESSIONS = 8
            if teacher:
                teacher_sessions = Timetable.objects.filter(
                    teacher=teacher, day=day
                ).exclude(pk=instance.pk if instance else None).count()
                if teacher_sessions >= MAX_TEACHER_SESSIONS:
                    raise serializers.ValidationError({
                        "teacher_load": f"{teacher.username} has reached their daily teaching limit ({MAX_TEACHER_SESSIONS} sessions)."
                    })

        return data
    
    def get_teacher_name(self, obj):
        """Get full name or username of teacher"""
        if obj.teacher:
            return obj.teacher.get_full_name()
        return None

    
class AttendanceSerializer(serializers.ModelSerializer):
    """Handles student attendance records."""
    student_name = serializers.SerializerMethodField()
    class_name = serializers.CharField(source="class_assigned.name", read_only=True)
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            "id",
            "student",
            "student_name",
            "class_assigned",
            "class_name",
            "date",
            "status",
            "recorded_by",
            "recorded_by_name",
            "notes",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_student_name(self, obj):
        if obj.student:
            return obj.student.get_full_name()
        return None

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return obj.recorded_by.get_full_name()
        return None

    def validate(self, data):
        """Prevent duplicate attendance records for the same student and date."""
        student = data.get("student")
        class_assigned = data.get("class_assigned")
        date = data.get("date")

        existing = Attendance.objects.filter(
            student=student,
            class_assigned=class_assigned,
            date=date,
        )
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError({
                "non_field_errors": ["Attendance for this student on this date already exists."]
            })
        return data

    def create(self, validated_data):
        """Automatically set recorded_by to current user if available."""
        user = self.context["request"].user
        validated_data["recorded_by"] = user
        return super().create(validated_data)

# ADD these new serializers (append to existing serializers.py):

class GradeConfigSerializer(serializers.ModelSerializer):
    """Serializer for grading scale configuration."""
    
    class Meta:
        model = GradeConfig
        fields = [
            'id', 'grade_letter', 'min_percentage', 'max_percentage', 
            'gpa_value', 'description'
        ]
    
    def validate(self, data):
        """Validate no overlapping ranges."""
        min_pct = data.get('min_percentage')
        max_pct = data.get('max_percentage')
        
        if min_pct >= max_pct:
            raise serializers.ValidationError({
                'max_percentage': 'Max percentage must be greater than min percentage.'
            })
        
        # Check for overlaps
        queryset = GradeConfig.objects.filter(
            min_percentage__lt=max_pct,
            max_percentage__gt=min_pct
        )
        
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError({
                'non_field_errors': ['Grading range overlaps with existing configuration.']
            })
        
        return data


class AssessmentSerializer(serializers.ModelSerializer):
    """Serializer for assessments with nested data."""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_name = serializers.CharField(source='class_assigned.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    grade_count = serializers.SerializerMethodField()
    average_marks = serializers.SerializerMethodField()
    
    class Meta:
        model = Assessment
        fields = [
            'id', 'name', 'description', 'assessment_type',
            'subject', 'subject_name', 'class_assigned', 'class_name',
            'date', 'total_marks', 'weightage', 'passing_marks',
            'duration', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'grade_count', 'average_marks'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None
    
    def get_grade_count(self, obj):
        """Count of students who have been graded."""
        return obj.grades.filter(is_absent=False).count()
    
    def get_average_marks(self, obj):
        """Average marks for this assessment."""
        avg = obj.grades.filter(is_absent=False).aggregate(
            avg=Avg('marks_obtained')
        )['avg']
        return round(float(avg), 2) if avg else None
    
    def validate(self, data):
        """Validate assessment data."""
        total_marks = data.get('total_marks')
        passing_marks = data.get('passing_marks')
        
        if passing_marks and passing_marks > total_marks:
            raise serializers.ValidationError({
                'passing_marks': 'Passing marks cannot exceed total marks.'
            })
        
        # Validate weightage doesn't exceed 100% for subject
        subject = data.get('subject')
        class_assigned = data.get('class_assigned')
        weightage = data.get('weightage')
        
        if subject and class_assigned and weightage:
            existing_weightage = Assessment.objects.filter(
                subject=subject,
                class_assigned=class_assigned
            )
            
            if self.instance:
                existing_weightage = existing_weightage.exclude(pk=self.instance.pk)
            
            total_weightage = existing_weightage.aggregate(
                total=Sum('weightage')
            )['total'] or Decimal('0')
            
            if total_weightage + weightage > 100:
                raise serializers.ValidationError({
                    'weightage': f'Total weightage for this subject exceeds 100%. Current total: {total_weightage}%'
                })
        
        return data
    
    def create(self, validated_data):
        """Set created_by to current user."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class GradeSerializer(serializers.ModelSerializer):
    """Serializer for student grades."""
    student_name = serializers.SerializerMethodField()
    assessment_name = serializers.CharField(source='assessment.name', read_only=True)
    assessment_type = serializers.CharField(source='assessment.assessment_type', read_only=True)
    subject_name = serializers.CharField(source='assessment.subject.name', read_only=True)
    total_marks = serializers.DecimalField(
        source='assessment.total_marks', 
        max_digits=6, 
        decimal_places=2, 
        read_only=True
    )
    graded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Grade
        fields = [
            'id', 'assessment', 'assessment_name', 'assessment_type',
            'subject_name', 'student', 'student_name', 'marks_obtained',
            'total_marks', 'is_absent', 'grade_letter', 'percentage',
            'remarks', 'graded_by', 'graded_by_name', 'graded_at'
        ]
        read_only_fields = ['grade_letter', 'percentage', 'graded_at', 'graded_by']
    
    def get_student_name(self, obj):
        if obj.student:
            return obj.student.get_full_name()
        return None
    
    def get_graded_by_name(self, obj):
        if obj.graded_by:
            return obj.graded_by.get_full_name()
        return None
    
    def validate(self, data):
        """Validate grade data."""
        marks_obtained = data.get('marks_obtained')
        is_absent = data.get('is_absent', False)
        assessment = data.get('assessment') or (self.instance.assessment if self.instance else None)
        
        if not is_absent and marks_obtained is None:
            raise serializers.ValidationError({
                'marks_obtained': 'Marks required if student is not absent.'
            })
        
        if marks_obtained and assessment and marks_obtained > assessment.total_marks:
            raise serializers.ValidationError({
                'marks_obtained': f'Marks cannot exceed total marks ({assessment.total_marks}).'
            })
        
        if marks_obtained and marks_obtained < 0:
            raise serializers.ValidationError({
                'marks_obtained': 'Marks cannot be negative.'
            })
        
        # Check for duplicate grades
        student = data.get('student')
        if assessment and student:
            existing = Grade.objects.filter(
                assessment=assessment,
                student=student
            )
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            
            if existing.exists():
                raise serializers.ValidationError({
                    'non_field_errors': ['Grade already exists for this student and assessment.']
                })
        
        return data
    
    def create(self, validated_data):
        """Set graded_by to current user."""
        validated_data['graded_by'] = self.context['request'].user
        return super().create(validated_data)


class BulkGradeSerializer(serializers.Serializer):
    """Serializer for bulk grade creation/update."""
    grades = GradeSerializer(many=True)
    
    def validate_grades(self, value):
        """Validate bulk grades."""
        if not value:
            raise serializers.ValidationError("At least one grade is required.")
        
        if len(value) > 100:
            raise serializers.ValidationError("Maximum 100 grades can be processed at once.")
        
        return value


class StudentGradebookSerializer(serializers.Serializer):
    """Serializer for student gradebook summary."""
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    overall_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    overall_gpa = serializers.DecimalField(max_digits=3, decimal_places=2)
    total_assessments = serializers.IntegerField()
    grades_by_subject = serializers.ListField()