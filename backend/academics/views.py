# backend/academics/views.py - FIXED AttendanceViewSet only
from datetime import datetime
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from .models import Attendance, Class, User, Subject, Timetable
from .serializers import AttendanceSerializer, ClassSerializer, SubjectSerializer, TimetableSerializer
from django_filters.rest_framework import DjangoFilterBackend
from .filters import AttendanceFilter
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.core.cache import cache
from django.db import transaction
from .throttles import UserRateThrottle, BurstRateThrottle, BulkOperationThrottle


class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]


class TimetableViewSet(viewsets.ModelViewSet):
    queryset = Timetable.objects.all()
    serializer_class = TimetableSerializer
    permission_classes = [permissions.IsAuthenticated]


class AttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing attendance records."""
    queryset = Attendance.objects.select_related("student", "class_assigned", "recorded_by")
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = AttendanceFilter

    # ✅ ADD DEFAULT THROTTLING
    throttle_classes = [UserRateThrottle, BurstRateThrottle]

    def get_queryset(self):
        """Filter attendance by user role."""
        user = self.request.user
        queryset = super().get_queryset()

        # Students only see their own records
        if not user.is_staff and not user.is_superuser and user.role == User.STUDENT:
            queryset = queryset.filter(student=user)

        return queryset.order_by("-date")

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get attendance summary (total present/absent/late)."""
        queryset = self.get_queryset()
        summary = {
            "total_records": queryset.count(),
            "present": queryset.filter(status=Attendance.PRESENT).count(),
            "absent": queryset.filter(status=Attendance.ABSENT).count(),
            "late": queryset.filter(status=Attendance.LATE).count(),
        }
        return Response(summary, status=status.HTTP_200_OK)

    @method_decorator(cache_page(60 * 5))  # Cache for 5 minutes
    @action(detail=False, methods=["get"], url_path="statistics")
    def statistics(self, request):
        """Optimized attendance statistics (cached for 5 minutes)."""
        cache_key = f"attendance_statistics_{request.user.id}_{request.get_full_path()}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        user = request.user
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        # Base queryset with related objects for efficiency
        attendance_qs = Attendance.objects.select_related("student", "class_assigned")

        # --- Role-based filtering ---
        if user.is_superuser or user.role == User.ADMIN:
            pass  # See all
        elif user.role == User.TEACHER:
            teacher_classes = Class.objects.filter(teacher=user)
            attendance_qs = attendance_qs.filter(class_assigned__in=teacher_classes)
        elif user.role == User.STUDENT:
            attendance_qs = attendance_qs.filter(student=user)
        elif user.role == User.PARENT:
            return Response(
                {"detail": "Parent view not yet implemented."},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )
        elif user.role == User.STAFF:
            total = attendance_qs.count()
            present = attendance_qs.filter(status=Attendance.PRESENT).count()
            rate = round((present / total) * 100, 2) if total > 0 else 0
            return Response({
                "summary": {
                    "total_records": total,
                    "present": present,
                    "absent": attendance_qs.filter(status=Attendance.ABSENT).count(),
                    "attendance_rate": rate
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {"detail": "Unauthorized role."},
                status=status.HTTP_403_FORBIDDEN
            )

        # --- Date filters ---
        if start_date:
            attendance_qs = attendance_qs.filter(date__gte=start_date)
        if end_date:
            attendance_qs = attendance_qs.filter(date__lte=end_date)

        if not attendance_qs.exists():
            return Response(
                {"detail": "No attendance records found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # --- 🚀 Single optimized query for all student stats ---
        stats_qs = (
            attendance_qs
            .values("student_id", "student__username", "student__first_name", "student__last_name")
            .annotate(
                total=Count("id"),
                present=Count("id", filter=Q(status=Attendance.PRESENT)),
                absent=Count("id", filter=Q(status=Attendance.ABSENT)),
                late=Count("id", filter=Q(status=Attendance.LATE)),
            )
            .order_by("student__username")
        )

        # Compute attendance rate in Python (after aggregation)
        stats = []
        for s in stats_qs:
            rate = round(((s["present"] + s["late"]) / s["total"]) * 100, 2) if s["total"] > 0 else 0
            stats.append({
                "student_id": s["student_id"],
                "student_username": s["student__username"],
                "student_name": f"{s['student__first_name']} {s['student__last_name']}".strip() or s["student__username"],
                "total": s["total"],
                "present": s["present"],
                "absent": s["absent"],
                "late": s["late"],
                "attendance_rate": rate,
            })

        result = {
            "role": user.role,
            "total_students": len(stats),
            "student_statistics": stats
        }

        # Cache the result
        cache.set(cache_key, result, 60 * 5)
        
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="students-by-class")
    def students_by_class(self, request):
        """Return all students in a given class for attendance recording."""
        class_id = request.query_params.get("class_id")
        if not class_id:
            return Response({"error": "class_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            cls = Class.objects.get(id=class_id)
        except Class.DoesNotExist:
            return Response({"error": "Class not found"}, status=status.HTTP_404_NOT_FOUND)

        students = cls.students.filter(role=User.STUDENT)
        data = [
            {
                "id": s.id,
                "username": s.username,
                "full_name": s.get_full_name(),
                "email": s.email,
                "role": s.role,
                "is_active": s.is_active
            } for s in students
        ]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="rankings")
    def rankings(self, request):
        """Top and bottom student attendance rankings."""
        user = request.user
        class_id = request.query_params.get("class_id")
        limit = int(request.query_params.get("limit", 10))
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if limit < 1 or limit > 100:
            return Response({"detail": "Limit must be between 1 and 100"},
                            status=status.HTTP_400_BAD_REQUEST)

        attendance_qs = Attendance.objects.select_related("student", "class_assigned")

        # Role-based filtering
        if user.role == User.TEACHER:
            teacher_classes = Class.objects.filter(teacher=user)
            attendance_qs = attendance_qs.filter(class_assigned__in=teacher_classes)
        elif user.role == User.STUDENT:
            return Response({"detail": "Students cannot view rankings"}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == User.PARENT:
            return Response({"detail": "Parent view not yet implemented."}, status=status.HTTP_501_NOT_IMPLEMENTED)

        if class_id:
            try:
                cls = Class.objects.get(id=class_id)
                attendance_qs = attendance_qs.filter(class_assigned=cls)
                class_name = cls.name
            except Class.DoesNotExist:
                return Response({"detail": "Class not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            class_name = "All Classes"

        if start_date:
            attendance_qs = attendance_qs.filter(date__gte=start_date)
        if end_date:
            attendance_qs = attendance_qs.filter(date__lte=end_date)

        if not attendance_qs.exists():
            return Response({
                "top_students": [],
                "bottom_students": [],
                "total_students": 0,
                "class_name": class_name,
                "message": "No attendance records found"
            }, status=status.HTTP_200_OK)

        # Calculate rankings
        rankings = []
        student_ids = attendance_qs.values_list('student_id', flat=True).distinct()
        for sid in student_ids:
            records = attendance_qs.filter(student_id=sid)
            total = records.count()
            present = records.filter(status=Attendance.PRESENT).count()
            late = records.filter(status=Attendance.LATE).count()
            absent = records.filter(status=Attendance.ABSENT).count()
            rate = round(((present + late) / total) * 100, 2) if total > 0 else 0
            student = records.first().student
            rankings.append({
                "student_id": student.id,
                "student_username": student.username,
                "student_name": student.get_full_name(),
                "total_records": total,
                "present": present,
                "absent": absent,
                "late": late,
                "attendance_rate": rate,
                "email": student.email if (user.role == User.ADMIN or user.role == User.TEACHER) else None
            })

        rankings.sort(key=lambda x: x['attendance_rate'], reverse=True)
        top_students = rankings[:limit]
        bottom_students = rankings[-limit:][::-1]

        return Response({
            "top_students": top_students,
            "bottom_students": bottom_students,
            "total_students": len(rankings),
            "class_name": class_name,
            "filters_applied": {
                "class_id": class_id,
                "start_date": start_date,
                "end_date": end_date,
                "limit": limit
            }
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="student-rank")
    def student_rank(self, request):
        """Get a specific student's rank among peers."""
        user = request.user
        student_id = request.query_params.get("student_id")
        class_id = request.query_params.get("class_id")

        if not student_id:
            return Response({"detail": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_student = User.objects.get(id=student_id, role=User.STUDENT)
        except User.DoesNotExist:
            return Response({"detail": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        if user.role == User.STUDENT and user.id != int(student_id):
            return Response({"detail": "You can only view your own rank"}, status=status.HTTP_403_FORBIDDEN)

        attendance_qs = Attendance.objects.select_related("student", "class_assigned")
        if class_id:
            attendance_qs = attendance_qs.filter(class_assigned_id=class_id)
        if user.role == User.TEACHER and not (user.is_superuser or user.role == User.ADMIN):
            teacher_classes = Class.objects.filter(teacher=user)
            attendance_qs = attendance_qs.filter(class_assigned__in=teacher_classes)

        student_ids = attendance_qs.values_list('student_id', flat=True).distinct()
        all_rankings = []
        for sid in student_ids:
            records = attendance_qs.filter(student_id=sid)
            total = records.count()
            present = records.filter(status=Attendance.PRESENT).count()
            late = records.filter(status=Attendance.LATE).count()
            rate = round(((present + late) / total) * 100, 2) if total > 0 else 0
            all_rankings.append({"student_id": sid, "attendance_rate": rate})

        all_rankings.sort(key=lambda x: x['attendance_rate'], reverse=True)

        rank = None
        student_rate = None
        for idx, r in enumerate(all_rankings, start=1):
            if r['student_id'] == int(student_id):
                rank = idx
                student_rate = r['attendance_rate']
                break

        if rank is None:
            return Response({"detail": "No attendance records found for this student",
                             "student_name": target_student.get_full_name()},
                            status=status.HTTP_404_NOT_FOUND)

        total_students = len(all_rankings)
        percentile = round(((total_students - rank + 1) / total_students) * 100, 2)

        if percentile >= 80:
            category = "Excellent"
        elif percentile >= 60:
            category = "Good"
        elif percentile >= 40:
            category = "Average"
        elif percentile >= 20:
            category = "Below Average"
        else:
            category = "Needs Improvement"

        return Response({
            "student_id": target_student.id,
            "student_name": target_student.get_full_name(),
            "rank": rank,
            "total_students": total_students,
            "percentile": percentile,
            "attendance_rate": student_rate,
            "category": category,
            "class_filter": class_id
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="bulk-create")
    def bulk_create(self, request):
        """
        Bulk create attendance records.
        Expected format: {"records": [{student: 1, class_assigned: 1, date: "2024-01-01", status: "present"}, ...]
        """
        # ✅ OVERRIDE THROTTLING FOR THIS SPECIFIC ENDPOINT
        self.throttle_classes = [BulkOperationThrottle]

        records = request.data.get("records", [])

        # Limit bulk size
        MAX_BULK_SIZE = 100
        if len(records) > MAX_BULK_SIZE:
            return Response(
                {"error": f"Cannot create more than {MAX_BULK_SIZE} records at once"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not records:
            return Response(
                {"error": "No records provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(records, list):
            return Response(
                {"error": "Records must be a list"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate all records first
        serializer = AttendanceSerializer(
            data=records, 
            many=True, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    created_records = serializer.save()
                    return Response(
                        {
                            "success": True,
                            "message": f"{len(created_records)} attendance records created",
                            "data": AttendanceSerializer(created_records, many=True).data
                        },
                        status=status.HTTP_201_CREATED
                    )
            except Exception as e:
                return Response(
                    {"error": f"Failed to create records: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(
            {
                "error": "Validation failed",
                "details": serializer.errors
            }, 
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=["put"], url_path="bulk-update")
    def bulk_update(self, request):
        """
        Bulk update attendance records.
        Expected format: {"records": [{id: 1, status: "late", notes: "..."}, ...]}
        """

        self.throttle_classes = [BulkOperationThrottle]

        records = request.data.get("records", [])

        MAX_BULK_SIZE = 100
        if len(records) > MAX_BULK_SIZE:
            return Response(
                {"error": f"Cannot update more than {MAX_BULK_SIZE} records at once"},
                status=status.HTTP_400_BAD_REQUEST
            )

        
        if not records:
            return Response(
                {"error": "No records provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(records, list):
            return Response(
                {"error": "Records must be a list"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated = []
        errors = []
        
        try:
            with transaction.atomic():
                for record_data in records:
                    record_id = record_data.get('id')
                    
                    if not record_id:
                        errors.append({"record": record_data, "error": "Missing 'id' field"})
                        continue
                    
                    try:
                        instance = Attendance.objects.get(id=record_id)
                        serializer = AttendanceSerializer(
                            instance, 
                            data=record_data, 
                            partial=True,
                            context={'request': request}
                        )
                        
                        if serializer.is_valid():
                            serializer.save()
                            updated.append(serializer.data)
                        else:
                            errors.append({
                                "record_id": record_id, 
                                "errors": serializer.errors
                            })
                            
                    except Attendance.DoesNotExist:
                        errors.append({
                            "record_id": record_id, 
                            "error": "Attendance record not found"
                        })
        
        except Exception as e:
            return Response(
                {"error": f"Bulk update failed: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        response_data = {
            "success": len(updated) > 0,
            "updated": len(updated),
            "data": updated
        }
        
        if errors:
            response_data["errors"] = errors
            response_data["failed"] = len(errors)
        
        status_code = status.HTTP_200_OK if len(updated) > 0 else status.HTTP_400_BAD_REQUEST
        
        return Response(response_data, status=status_code)

    @action(detail=False, methods=["delete"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """
        Bulk delete attendance records.
        Expected format: {"ids": [1, 2, 3, ...]}
        """
        ids = request.data.get("ids", [])
        
        if not ids:
            return Response(
                {"error": "No IDs provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(ids, list):
            return Response(
                {"error": "IDs must be a list"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                deleted_count, _ = Attendance.objects.filter(id__in=ids).delete()
                
                return Response(
                    {
                        "success": True,
                        "message": f"{deleted_count} records deleted",
                        "deleted_count": deleted_count
                    },
                    status=status.HTTP_200_OK
                )
        
        except Exception as e:
            return Response(
                {"error": f"Bulk delete failed: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )