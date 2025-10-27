from rest_framework import viewsets, permissions
from .models import Class, Subject, Timetable
from .serializers import ClassSerializer, SubjectSerializer, TimetableSerializer

class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all().select_related("teacher").prefetch_related("students")
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all().select_related("teacher")
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]


class TimetableViewSet(viewsets.ModelViewSet):
    queryset = Timetable.objects.all().select_related("class_assigned", "subject", "teacher")
    serializer_class = TimetableSerializer
    permission_classes = [permissions.IsAuthenticated]
