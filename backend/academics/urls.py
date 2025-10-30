from rest_framework.routers import DefaultRouter
from .views import ClassViewSet, SubjectViewSet, TimetableViewSet, AttendanceViewSet

router = DefaultRouter()
router.register(r"classes", ClassViewSet, basename="class")
router.register(r"subjects", SubjectViewSet, basename="subject")
router.register(r"timetable", TimetableViewSet, basename="timetable")
router.register(r"attendance", AttendanceViewSet, basename="attendance")

urlpatterns = router.urls
