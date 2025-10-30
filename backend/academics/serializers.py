# backend/academics/serializers.py - REPLACE ENTIRE FILE

from rest_framework import serializers, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Class, Subject, Timetable, Attendance

class SubjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ["id", "name", "code", "teacher", "teacher_name", "description"]
    
    def get_teacher_name(self, obj):
        """Get full name or username of teacher"""
        if obj.teacher:
            if obj.teacher.first_name and obj.teacher.last_name:
                return f"{obj.teacher.first_name} {obj.teacher.last_name}"
            return obj.teacher.username
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
            if obj.teacher.first_name and obj.teacher.last_name:
                return f"{obj.teacher.first_name} {obj.teacher.last_name}"
            return obj.teacher.username
        return None
    
    def get_student_count(self, obj):
        return obj.user_set.filter(role="student").count()


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
        """Check for scheduling conflicts"""
        # Get the instance being updated (if any)
        instance = self.instance
        
        # Check class conflicts
        class_query = Timetable.objects.filter(
            class_assigned=data['class_assigned'],
            day=data['day'],
            start_time__lt=data['end_time'],
            end_time__gt=data['start_time']
        )
        
        if instance:
            class_query = class_query.exclude(pk=instance.pk)
        
        if class_query.exists():
            raise serializers.ValidationError({
                'class_assigned': 'This class already has a session scheduled during this time slot.'
            })
        # In TimetableSerializer.validate()
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })
        
        
        
        # Check teacher conflicts
        if data.get('teacher'):
            teacher_query = Timetable.objects.filter(
                teacher=data['teacher'],
                day=data['day'],
                start_time__lt=data['end_time'],
                end_time__gt=data['start_time']
            )
            
            if instance:
                teacher_query = teacher_query.exclude(pk=instance.pk)
            
            if teacher_query.exists():
                raise serializers.ValidationError({
                    'teacher': 'This teacher is already scheduled for another class during this time.'
                })
        
        return data
    
    def get_teacher_name(self, obj):
        """Get full name or username of teacher"""
        if obj.teacher:
            if obj.teacher.first_name and obj.teacher.last_name:
                return f"{obj.teacher.first_name} {obj.teacher.last_name}"
            return obj.teacher.username
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
            if obj.student.first_name and obj.student.last_name:
                return f"{obj.student.first_name} {obj.student.last_name}"
            return obj.student.username
        return None

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            if obj.recorded_by.first_name and obj.recorded_by.last_name:
                return f"{obj.recorded_by.first_name} {obj.recorded_by.last_name}"
            return obj.recorded_by.username
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

# backend/academics/views.py
class AttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing attendance records."""
    queryset = Attendance.objects.select_related("student", "class_assigned", "recorded_by")
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter attendance by user role and query params."""
        user = self.request.user
        queryset = super().get_queryset()

        # Students only see their own records
        if not user.is_staff and not user.is_superuser:
            queryset = queryset.filter(student=user)

        # Filtering options
        class_id = self.request.query_params.get("class_id")
        student_id = self.request.query_params.get("student_id")
        date = self.request.query_params.get("date")

        if class_id:
            queryset = queryset.filter(class_assigned_id=class_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if date:
            queryset = queryset.filter(date=date)

        return queryset.order_by("-date")

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get attendance summary (e.g., total present/absent)."""
        queryset = self.get_queryset()
        summary = {
            "total_records": queryset.count(),
            "present": queryset.filter(status="present").count(),
            "absent": queryset.filter(status="absent").count(),
            "late": queryset.filter(status="late").count(),
        }
        return Response(summary)