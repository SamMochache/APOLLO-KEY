from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RegisterSerializer, UserSerializer, CustomTokenObtainPairSerializer
from .permissions import IsAdmin, IsTeacher, IsStudent, IsParent, IsStaff

User = get_user_model()


# ✅ Registration Endpoint
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


# ✅ Get Current User
class MeView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


# ✅ Custom Token View (uses our custom serializer)
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# ✅ Role-Based Views
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
