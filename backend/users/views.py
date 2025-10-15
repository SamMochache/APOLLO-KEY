# backend/apps/users/views.py
from rest_framework import generics, permissions
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer
from rest_framework.response import Response

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class MeView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


#RBAC Permissions
from .permissions import IsAdmin, IsTeacher, IsStudent, IsParent, IsStaff
from rest_framework.views import APIView



class AdminOnlyView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({"message": "Welcome, Admin!"})


class TeacherOnlyView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        return Response({"message": "Welcome, Teacher!"})


class StudentOnlyView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        return Response({"message": "Welcome, Student!"})