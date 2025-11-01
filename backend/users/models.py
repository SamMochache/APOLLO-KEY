# backend/users/models.py - FIXED
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    PARENT = "parent"
    STAFF = "staff"

    ROLE_CHOICES = [
        (ADMIN, "Admin"),
        (TEACHER, "Teacher"),
        (STUDENT, "Student"),
        (PARENT, "Parent"),
        (STAFF, "Staff"),
    ]

    # override email to be unique and required if you want email instead of username
    email = models.EmailField("email address", unique=True, blank=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=STUDENT)
    profile_photo = models.ImageField(upload_to="profiles/", null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]  # keep username for compatibility, but email is used to login

    def __str__(self):
        return f"{self.email} ({self.role})"

    # ✅ FIXED: Added get_full_name() method
    def get_full_name(self):
        """Return full name or username as fallback."""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.username

    # helper methods
    def is_admin(self):
        return self.role == self.ADMIN or self.is_superuser

    def is_teacher(self):
        return self.role == self.TEACHER