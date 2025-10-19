from django.urls import path
from .views import (
    RegisterView,
    MeView,
    AdminOnlyView,
    TeacherOnlyView,
    StudentOnlyView,
    CustomTokenObtainPairView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("admin-only/", AdminOnlyView.as_view(), name="admin_only"),
    path("teacher-only/", TeacherOnlyView.as_view(), name="teacher_only"),
    path("student-only/", StudentOnlyView.as_view(), name="student_only"),
]
