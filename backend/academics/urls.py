from rest_framework.routers import DefaultRouter
from .views import ClassViewSet, SubjectViewSet, TimetableViewSet

router = DefaultRouter()
router.register(r"classes", ClassViewSet, basename="class")
router.register(r"subjects", SubjectViewSet, basename="subject")
router.register(r"timetable", TimetableViewSet, basename="timetable")

urlpatterns = router.urls
