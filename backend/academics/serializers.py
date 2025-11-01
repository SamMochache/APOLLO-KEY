# backend/academics/serializers.py - CLEANED (ONLY SERIALIZERS)
from rest_framework import serializers
from .models import Class, Subject, Timetable, Attendance


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