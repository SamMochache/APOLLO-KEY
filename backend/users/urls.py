from django.urls import path, include, re_path
from django.views.generic import TemplateView
from . import views
from .views import (
    RegisterView,
    MeView,
    AdminOnlyView,
    TeacherOnlyView,
    StudentOnlyView,
    CustomTokenObtainPairView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="get_user_profile"),
    path("me/update/", views.update_profile, name="update_profile"),  # ✅ now works
    path("admin-only/", AdminOnlyView.as_view(), name="admin_only"),
    path("teacher-only/", TeacherOnlyView.as_view(), name="teacher_only"),
    path("student-only/", StudentOnlyView.as_view(), name="student_only"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password-reset-confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),

    path("", include("djoser.urls")),
    path("", include("djoser.urls.jwt")),
    re_path(r"^(?:.*)/?$", TemplateView.as_view(template_name="index.html")),
]
