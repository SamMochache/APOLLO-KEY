# backend/academics/serializers.py - REPLACE ENTIRE FILE

from rest_framework import serializers
from .models import Class, Subject, Timetable

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
    
    def get_teacher_name(self, obj):
        """Get full name or username of teacher"""
        if obj.teacher:
            if obj.teacher.first_name and obj.teacher.last_name:
                return f"{obj.teacher.first_name} {obj.teacher.last_name}"
            return obj.teacher.username
        return None