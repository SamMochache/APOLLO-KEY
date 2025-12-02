# backend/academics/urls.py

from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ClassViewSet, SubjectViewSet, TimetableViewSet, AttendanceViewSet,
    GradeConfigViewSet, AssessmentViewSet, GradeViewSet, ParentViewSet,
    student_performance_analytics, export_analytics_pdf
)

router = DefaultRouter()
router.register(r"classes", ClassViewSet, basename="class")
router.register(r"subjects", SubjectViewSet, basename="subject")
router.register(r"timetable", TimetableViewSet, basename="timetable")
router.register(r"attendance", AttendanceViewSet, basename="attendance")
router.register(r"grade-configs", GradeConfigViewSet, basename="grade-config")
router.register(r"assessments", AssessmentViewSet, basename="assessments")
router.register(r"grades", GradeViewSet, basename="grade")
router.register(r"parent", ParentViewSet, basename="parent")

urlpatterns = [
    # router endpoints
    *router.urls,

    # custom endpoints
    path('analytics/student-performance/', student_performance_analytics, name='student-performance-analytics'),
    path('analytics/export-pdf/', export_analytics_pdf, name='export-analytics-pdf'),
]
