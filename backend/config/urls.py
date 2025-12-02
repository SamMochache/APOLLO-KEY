# Step 3: Update backend/config/urls.py
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Swagger/OpenAPI Schema
schema_view = get_schema_view(
   openapi.Info(
      title="APOLLO-KEY School Management API",
      default_version='v1',
      description="""
      Complete REST API for school management system.
      
      Features:
      - User authentication with JWT
      - Class and subject management
      - Timetable scheduling
      - Attendance tracking with analytics
      - Role-based access control (Admin, Teacher, Student, Parent, Staff)
      
      ## Authentication
      Use JWT tokens obtained from `/api/auth/token/` endpoint.
      Include in header: `Authorization: Bearer <your_token>`
      """,
      terms_of_service="https://www.apollokey.com/terms/",
      contact=openapi.Contact(email="admin@apollokey.com"),
      license=openapi.License(name="MIT License"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

def health(request):
    return JsonResponse({"status": "ok", "version": "1.0.0"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/auth/', include('users.urls')),
    path('api/academics/', include('academics.urls')),
    path('api/', include('messaging.urls')),
    
    # Swagger/OpenAPI Documentation
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('api/swagger.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


# Step 4: Add docstrings to ViewSets for better docs
# Example for AttendanceViewSet:
"""
class AttendanceViewSet(viewsets.ModelViewSet):
    '''
    API endpoints for managing student attendance records.
    
    list:
    Return a list of all attendance records (filtered by role).
    
    create:
    Create a new attendance record.
    
    retrieve:
    Return details of a specific attendance record.
    
    update:
    Update an attendance record.
    
    partial_update:
    Partially update an attendance record.
    
    destroy:
    Delete an attendance record.
    '''
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    ...
"""

# Step 5: Access documentation at:
# - http://localhost:8000/api/docs/  (Swagger UI - Interactive)
# - http://localhost:8000/api/redoc/ (ReDoc - Clean docs)
# - http://localhost:8000/api/swagger.json (Raw OpenAPI spec)