from rest_framework import serializers
from .models import Class, Subject, Timetable

class SubjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True)

    class Meta:
        model = Subject
        fields = ["id", "name", "code", "teacher", "teacher_name"]


class ClassSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True)
    student_count = serializers.IntegerField(source="students.count", read_only=True)

    class Meta:
        model = Class
        fields = ["id", "name", "teacher", "teacher_name", "student_count"]


class TimetableSerializer(serializers.ModelSerializer):
    class_assigned_name = serializers.CharField(source="class_assigned.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True)

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
