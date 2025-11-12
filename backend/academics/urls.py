from rest_framework.routers import DefaultRouter
from .views import ClassViewSet, SubjectViewSet, TimetableViewSet, AttendanceViewSet, GradeConfigViewSet, AssessmentViewSet, GradeViewSet, ParentViewSet

router = DefaultRouter()
router.register(r"classes", ClassViewSet, basename="class")
router.register(r"subjects", SubjectViewSet, basename="subject")
router.register(r"timetable", TimetableViewSet, basename="timetable")
router.register(r"attendance", AttendanceViewSet, basename="attendance")
router.register(r"grade-configs", GradeConfigViewSet, basename="grade-config")
router.register(r"assessments", AssessmentViewSet, basename="assessment")
router.register(r"grades", GradeViewSet, basename="grade")
router.register(r"parent", ParentViewSet, basename="parent")

urlpatterns = router.urls
