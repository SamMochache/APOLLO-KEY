# backend/academics/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from users.models import User
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Class, Subject, Timetable, Attendance
from .serializers import ClassSerializer, SubjectSerializer, TimetableSerializer, AttendanceSerializer

class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all().select_related("teacher").prefetch_related("students")
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def timetable(self, request, pk=None):
        """Get timetable for a specific class"""
        cls = self.get_object()
        timetable = Timetable.objects.filter(class_assigned=cls).select_related(
            'subject', 'teacher'
        ).order_by('day', 'start_time')
        serializer = TimetableSerializer(timetable, many=True)
        return Response(serializer.data)


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all().select_related("teacher")
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]


class TimetableViewSet(viewsets.ModelViewSet):
    queryset = Timetable.objects.all().select_related("class_assigned", "subject", "teacher")
    serializer_class = TimetableSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter timetable based on query parameters"""
        queryset = super().get_queryset()
        
        class_id = self.request.query_params.get('class_id')
        day = self.request.query_params.get('day')
        teacher_id = self.request.query_params.get('teacher_id')
        
        if class_id:
            queryset = queryset.filter(class_assigned_id=class_id)
        if day:
            queryset = queryset.filter(day=day)
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
            
        return queryset.order_by('day', 'start_time')

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create multiple timetable entries at once"""
        entries = request.data.get('entries', [])
        
        if not entries:
            return Response(
                {'error': 'No entries provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=entries, many=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Update multiple timetable entries at once"""
        entries = request.data.get('entries', [])
        
        if not entries:
            return Response(
                {'error': 'No entries provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated = []
        errors = []
        
        for entry_data in entries:
            entry_id = entry_data.get('id')
            if not entry_id:
                errors.append({'error': 'Entry ID required', 'data': entry_data})
                continue
                
            try:
                instance = Timetable.objects.get(id=entry_id)
                serializer = self.get_serializer(instance, data=entry_data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    updated.append(serializer.data)
                else:
                    errors.append({'id': entry_id, 'errors': serializer.errors})
            except Timetable.DoesNotExist:
                errors.append({'error': 'Entry not found', 'id': entry_id})
        
        return Response({
            'updated': updated,
            'errors': errors
        }, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)

    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        """Delete multiple timetable entries at once"""
        ids = request.data.get('ids', [])
        
        if not ids:
            return Response(
                {'error': 'No IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted_count = Timetable.objects.filter(id__in=ids).delete()[0]
        
        return Response({
            'deleted': deleted_count,
            'message': f'{deleted_count} entries deleted successfully'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def conflicts(self, request):
        """Check for scheduling conflicts"""
        class_id = request.query_params.get('class_id')
        teacher_id = request.query_params.get('teacher_id')
        
        conflicts = []
        
        if class_id:
            # Find overlapping time slots for the same class
            entries = Timetable.objects.filter(class_assigned_id=class_id)
            for entry in entries:
                overlaps = entries.filter(
                    day=entry.day,
                    start_time__lt=entry.end_time,
                    end_time__gt=entry.start_time
                ).exclude(id=entry.id)
                
                if overlaps.exists():
                    conflicts.append({
                        'type': 'class_overlap',
                        'entry': TimetableSerializer(entry).data,
                        'conflicts_with': TimetableSerializer(overlaps, many=True).data
                    })
        
        if teacher_id:
            # Find overlapping time slots for the same teacher
            entries = Timetable.objects.filter(teacher_id=teacher_id)
            for entry in entries:
                overlaps = entries.filter(
                    day=entry.day,
                    start_time__lt=entry.end_time,
                    end_time__gt=entry.start_time
                ).exclude(id=entry.id)
                
                if overlaps.exists():
                    conflicts.append({
                        'type': 'teacher_overlap',
                        'entry': TimetableSerializer(entry).data,
                        'conflicts_with': TimetableSerializer(overlaps, many=True).data
                    })
        
        return Response({
            'has_conflicts': len(conflicts) > 0,
            'conflicts': conflicts
        })

from datetime import datetime
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Attendance, Class, User
from .serializers import AttendanceSerializer


class AttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing attendance records."""
    queryset = Attendance.objects.select_related("student", "class_assigned", "recorded_by")
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter attendance by user role and query params."""
        user = self.request.user
        queryset = super().get_queryset()

        # Students only see their own records
        if not user.is_staff and not user.is_superuser:
            queryset = queryset.filter(student=user)

        # Filtering options
        class_id = self.request.query_params.get("class_id")
        student_id = self.request.query_params.get("student_id")
        date = self.request.query_params.get("date")

        if class_id:
            queryset = queryset.filter(class_assigned_id=class_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if date:
            queryset = queryset.filter(date=date)

        return queryset.order_by("-date")

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get attendance summary (e.g., total present/absent/late)."""
        queryset = self.get_queryset()
        summary = {
            "total_records": queryset.count(),
            "present": queryset.filter(status="present").count(),
            "absent": queryset.filter(status="absent").count(),
            "late": queryset.filter(status="late").count(),
        }
        return Response(summary, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="statistics")
    def statistics(self, request):
        """
        Secure Role-Based Attendance Statistics
        Automatically filters based on the logged-in user's role.
        Optional filters:
        - ?start_date=<YYYY-MM-DD>
        - ?end_date=<YYYY-MM-DD>
        """
        user = request.user
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        attendance_qs = Attendance.objects.select_related("student", "class_assigned")

        # 🎓 Role-based filtering
        if user.is_superuser or user.is_admin():
            # Admins see everything
            pass
        elif user.is_teacher():
            # Teachers: show only attendance for their classes
            teacher_classes = Class.objects.filter(teacher=user)
            attendance_qs = attendance_qs.filter(class_assigned__in=teacher_classes)
        elif user.role == User.STUDENT:
            # Students: only their own records
            attendance_qs = attendance_qs.filter(student=user)
        elif user.role == User.PARENT:
            # (Future) Parents: linked child's attendance
            return Response({"detail": "Parent view not yet implemented."}, status=501)
        elif user.role == User.STAFF:
            # Staff: summary-only view (no individual stats)
            total = attendance_qs.count()
            present = attendance_qs.filter(status="present").count()
            absent = attendance_qs.filter(status="absent").count()
            rate = round((present / total) * 100, 2) if total > 0 else 0
            return Response({
                "summary": {
                    "total_records": total,
                    "present": present,
                    "absent": absent,
                    "attendance_rate": rate,
                }
            }, status=200)
        else:
            return Response({"detail": "Unauthorized role."}, status=403)

        # 📅 Date filters
        if start_date:
            attendance_qs = attendance_qs.filter(date__gte=start_date)
        if end_date:
            attendance_qs = attendance_qs.filter(date__lte=end_date)

        if not attendance_qs.exists():
            return Response({"detail": "No attendance records found."}, status=404)

        # 📊 Group stats by student
        stats = []
        students = attendance_qs.values("student").distinct()

        for s in students:
            student_id = s["student"]
            student_records = attendance_qs.filter(student_id=student_id)
            if not student_records.exists():
                continue

            total = student_records.count()
            present = student_records.filter(status="present").count()
            absent = student_records.filter(status="absent").count()
            rate = round((present / total) * 100, 2)

            stats.append({
                "student_username": student_records.first().student.username,
                "present": present,
                "absent": absent,
                "total": total,
                "attendance_rate": rate,
            })

        return Response({
            "role": user.role,
            "total_students": len(stats),
            "student_statistics": stats,
        }, status=200)
