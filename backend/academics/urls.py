# backend/academics/urls.py

from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ClassViewSet, SubjectViewSet, TimetableViewSet, AttendanceViewSet,
    GradeConfigViewSet, AssessmentViewSet, GradeViewSet, ParentViewSet,
    student_performance_analytics, export_analytics_pdf
)
from .ai_views import (
    generate_report_narrative, detect_at_risk_students,
    draft_parent_message, resolve_timetable_conflict,
    generate_assessment_feedback, generate_study_plan,
    detect_attendance_anomalies, predict_grades_ai,
    school_insights, parent_chatbot,
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
    path('ai/generate-report-narrative/', generate_report_narrative),
    path('ai/at-risk-students/', detect_at_risk_students),
    path('ai/draft-message/', draft_parent_message),
    path('ai/resolve-timetable-conflict/', resolve_timetable_conflict),
    path('ai/generate-assessment-feedback/', generate_assessment_feedback),
    path('ai/study-plan/', generate_study_plan),
    path('ai/attendance-anomalies/', detect_attendance_anomalies),
    path('ai/predict-grades/', predict_grades_ai),
    path('ai/school-insights/', school_insights),
    path('ai/parent-chat/', parent_chatbot),
]
