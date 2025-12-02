# backend/academics/views.py - FIXED AttendanceViewSet only
from datetime import datetime
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Avg
from .models import Attendance, Class, User, Subject, Timetable, GradeConfig, Assessment, Grade, ParentStudentRelationship
from .serializers import AttendanceSerializer, ClassSerializer, SubjectSerializer, TimetableSerializer, GradeConfigSerializer, AssessmentSerializer, GradeSerializer, ParentStudentRelationshipSerializer,ChildGradeSerializer,ChildAttendanceSerializer
from django_filters.rest_framework import DjangoFilterBackend
from .filters import AttendanceFilter
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.core.cache import cache
from django.db import transaction
from .throttles import UserRateThrottle, BurstRateThrottle, BulkOperationThrottle
from decimal import Decimal
from django.http import FileResponse, HttpResponse
from .report_generator import ReportCardGenerator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .analytics import StudentPerformanceAnalytics
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from io import BytesIO
import json



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
        
class GradeConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for managing grading scale configurations."""
    queryset = GradeConfig.objects.all()
    serializer_class = GradeConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """Only admins can create/update/delete grading configs."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()


class AssessmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing assessments."""
    queryset = Assessment.objects.select_related(
        'subject', 'class_assigned', 'created_by'
    ).prefetch_related('grades')
    serializer_class = AssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['assessment_type', 'subject', 'class_assigned', 'date']
    
    def get_queryset(self):
        """Filter assessments by user role."""
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.is_superuser or user.role == User.ADMIN:
            return queryset
        elif user.role == User.TEACHER:
            # Teachers see assessments for their subjects/classes
            return queryset.filter(
                Q(subject__teacher=user) | Q(class_assigned__teacher=user)
            )
        elif user.role == User.STUDENT:
            # Students see assessments for their classes
            return queryset.filter(class_assigned__students=user)
        
        return queryset.none()
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get detailed statistics for an assessment."""
        assessment = self.get_object()
        grades = assessment.grades.filter(is_absent=False)
        
        if not grades.exists():
            return Response({
                'message': 'No grades recorded yet.',
                'assessment_id': assessment.id,
                'assessment_name': assessment.name
            })
        
        # Calculate statistics
        marks_list = list(grades.values_list('marks_obtained', flat=True))
        marks_list.sort()
        
        stats = {
            'assessment_id': assessment.id,
            'assessment_name': assessment.name,
            'total_marks': float(assessment.total_marks),
            'passing_marks': float(assessment.passing_marks) if assessment.passing_marks else None,
            'total_students': assessment.class_assigned.students.count(),
            'graded_count': grades.count(),
            'absent_count': assessment.grades.filter(is_absent=True).count(),
            'pending_count': assessment.class_assigned.students.count() - assessment.grades.count(),
            'average': round(float(grades.aggregate(avg=Avg('marks_obtained'))['avg']), 2),
            'highest': float(max(marks_list)),
            'lowest': float(min(marks_list)),
            'median': float(marks_list[len(marks_list) // 2]),
            'passing_count': grades.filter(
                marks_obtained__gte=assessment.passing_marks
            ).count() if assessment.passing_marks else None,
            'grade_distribution': {}
        }
        
        # Grade distribution
        grade_dist = grades.values('grade_letter').annotate(
            count=Count('id')
        ).order_by('-count')
        
        for item in grade_dist:
            stats['grade_distribution'][item['grade_letter']] = item['count']
        
        return Response(stats)
    
    @action(detail=True, methods=['get'], url_path='student-list')
    def student_list(self, request, pk=None):
        """Get list of students for grade entry."""
        assessment = self.get_object()
        students = assessment.class_assigned.students.filter(role=User.STUDENT)
        
        student_data = []
        for student in students:
            try:
                grade = assessment.grades.get(student=student)
                grade_data = GradeSerializer(grade).data
            except Grade.DoesNotExist:
                grade_data = None
            
            student_data.append({
                'id': student.id,
                'username': student.username,
                'full_name': student.get_full_name(),
                'email': student.email,
                'grade': grade_data
            })
        
        return Response({
            'assessment': AssessmentSerializer(assessment).data,
            'students': student_data
        })


class GradeViewSet(viewsets.ModelViewSet):
    """ViewSet for managing grades."""
    queryset = Grade.objects.select_related(
        'assessment', 'student', 'graded_by',
        'assessment__subject', 'assessment__class_assigned'
    )
    serializer_class = GradeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'assessment', 'assessment__subject', 'is_absent']
    
    def get_queryset(self):
        """Filter grades by user role."""
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.is_superuser or user.role == User.ADMIN:
            return queryset
        elif user.role == User.TEACHER:
            # Teachers see grades for their subjects/classes
            return queryset.filter(
                Q(assessment__subject__teacher=user) | 
                Q(assessment__class_assigned__teacher=user)
            )
        elif user.role == User.STUDENT:
            # Students see only their own grades
            return queryset.filter(student=user)
        
        return queryset.none()
    
    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """Bulk create grades."""
        grades_data = request.data.get('grades', [])
        
        if not grades_data:
            return Response(
                {'error': 'No grades provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(grades_data) > 100:
            return Response(
                {'error': 'Maximum 100 grades can be processed at once'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = GradeSerializer(
            data=grades_data,
            many=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    created_grades = serializer.save()
                    return Response(
                        {
                            'success': True,
                            'message': f'{len(created_grades)} grades created successfully',
                            'data': GradeSerializer(created_grades, many=True).data
                        },
                        status=status.HTTP_201_CREATED
                    )
            except Exception as e:
                return Response(
                    {'error': f'Failed to create grades: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(
            {
                'error': 'Validation failed',
                'details': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['put'], url_path='bulk-update')
    def bulk_update(self, request):
        """Bulk update grades."""
        grades_data = request.data.get('grades', [])
        
        if not grades_data:
            return Response(
                {'error': 'No grades provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated = []
        errors = []
        
        try:
            with transaction.atomic():
                for grade_data in grades_data:
                    grade_id = grade_data.get('id')
                    
                    if not grade_id:
                        errors.append({'data': grade_data, 'error': 'Missing id'})
                        continue
                    
                    try:
                        instance = Grade.objects.get(id=grade_id)
                        serializer = GradeSerializer(
                            instance,
                            data=grade_data,
                            partial=True,
                            context={'request': request}
                        )
                        
                        if serializer.is_valid():
                            serializer.save()
                            updated.append(serializer.data)
                        else:
                            errors.append({'id': grade_id, 'errors': serializer.errors})
                    
                    except Grade.DoesNotExist:
                        errors.append({'id': grade_id, 'error': 'Grade not found'})
        
        except Exception as e:
            return Response(
                {'error': f'Bulk update failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        response_data = {
            'success': len(updated) > 0,
            'updated': len(updated),
            'data': updated
        }
        
        if errors:
            response_data['errors'] = errors
            response_data['failed'] = len(errors)
        
        return Response(
            response_data,
            status=status.HTTP_200_OK if len(updated) > 0 else status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'], url_path='student-report')
    def student_report(self, request):
        """Get comprehensive grade report for a student."""
        student_id = request.query_params.get('student_id')
        
        if not student_id:
            return Response(
                {'error': 'student_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student = User.objects.get(id=student_id, role=User.STUDENT)
        except User.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permissions
        user = request.user
        if user.role == User.STUDENT and user.id != int(student_id):
            return Response(
                {'error': 'You can only view your own grades'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all grades
        grades = Grade.objects.filter(student=student).select_related(
            'assessment', 'assessment__subject'
        )
        
        if not grades.exists():
            return Response({
                'student_id': student.id,
                'student_name': student.get_full_name(),
                'message': 'No grades found'
            })
        
        # Calculate overall statistics
        graded = grades.filter(is_absent=False)
        total_percentage = graded.aggregate(avg=Avg('percentage'))['avg']
        
        # Group by subject
        subjects_data = []
        subjects = set(g.assessment.subject for g in grades)
        
        for subject in subjects:
            subject_grades = grades.filter(assessment__subject=subject, is_absent=False)
            
            if subject_grades.exists():
                avg_pct = subject_grades.aggregate(avg=Avg('percentage'))['avg']
                
                subjects_data.append({
                    'subject_id': subject.id,
                    'subject_name': subject.name,
                    'average_percentage': round(float(avg_pct), 2) if avg_pct else None,
                    'grades_count': subject_grades.count(),
                    'grades': GradeSerializer(subject_grades, many=True).data
                })
        
        return Response({
            'student_id': student.id,
            'student_name': student.get_full_name(),
            'overall_percentage': round(float(total_percentage), 2) if total_percentage else None,
            'total_assessments': grades.count(),
            'graded_count': graded.count(),
            'absent_count': grades.filter(is_absent=True).count(),
            'subjects': subjects_data
        })
# backend/academics/views.py - ADD THIS METHOD TO GradeViewSet

    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """
        Get comprehensive grade statistics with filtering support.
        
        Query Parameters:
        - subject: Filter by subject ID
        - class: Filter by class ID
        - start_date: Filter grades from this date
        - end_date: Filter grades until this date
        """
        user = request.user
        
        # Base queryset with permissions
        queryset = Grade.objects.select_related(
            'assessment', 'student', 
            'assessment__subject', 'assessment__class_assigned'
        ).filter(is_absent=False)
        
        # Apply role-based filtering
        if user.role == User.TEACHER:
            queryset = queryset.filter(
                Q(assessment__subject__teacher=user) | 
                Q(assessment__class_assigned__teacher=user)
            )
        elif user.role == User.STUDENT:
            queryset = queryset.filter(student=user)
        elif user.role not in [User.ADMIN]:
            return Response(
                {'error': 'Unauthorized'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Apply filters
        subject_id = request.query_params.get('subject')
        class_id = request.query_params.get('class')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if subject_id:
            queryset = queryset.filter(assessment__subject_id=subject_id)
        if class_id:
            queryset = queryset.filter(assessment__class_assigned_id=class_id)
        if start_date:
            queryset = queryset.filter(assessment__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(assessment__date__lte=end_date)
        
        # Check if we have data
        if not queryset.exists():
            return Response({
                'overview': {
                    'totalAssessments': 0,
                    'totalStudents': 0,
                    'averageScore': 0,
                    'passRate': 0
                },
                'gradeDistribution': [],
                'assessmentPerformance': [],
                'topPerformers': [],
                'needsAttention': [],
                'subjectComparison': []
            })
        
        # Calculate overview statistics
        total_assessments = queryset.values('assessment').distinct().count()
        total_students = queryset.values('student').distinct().count()
        average_percentage = queryset.aggregate(avg=Avg('percentage'))['avg'] or 0
        
        # Calculate pass rate (assuming 40% is passing)
        passing_grades = queryset.filter(percentage__gte=40).count()
        total_grades = queryset.count()
        pass_rate = (passing_grades / total_grades * 100) if total_grades > 0 else 0
        
        # Grade distribution
        grade_counts = queryset.values('grade_letter').annotate(
            count=Count('id')
        ).order_by('-count')
        
        total_graded = sum(item['count'] for item in grade_counts)
        grade_distribution = []
        for item in grade_counts:
            if item['grade_letter']:
                grade_distribution.append({
                    'grade': item['grade_letter'],
                    'count': item['count'],
                    'percentage': round((item['count'] / total_graded * 100), 1)
                })
        
        # Assessment performance
        assessment_performance = []
        assessments = queryset.values(
            'assessment__id',
            'assessment__name',
            'assessment__assessment_type'
        ).annotate(
            average=Avg('percentage')
        ).order_by('assessment__date')[:10]  # Limit to 10 most recent
        
        for assessment in assessments:
            assessment_performance.append({
                'name': assessment['assessment__name'][:20],  # Truncate long names
                'average': round(float(assessment['average']), 1),
                'type': assessment['assessment__assessment_type']
            })
        
        # Top performers (students with highest average)
        top_performers = []
        student_averages = queryset.values(
            'student__id',
            'student__username',
            'student__first_name',
            'student__last_name'
        ).annotate(
            average=Avg('percentage')
        ).order_by('-average')[:5]
        
        for student in student_averages:
            # Get most common grade letter
            common_grade = queryset.filter(
                student_id=student['student__id']
            ).values('grade_letter').annotate(
                count=Count('id')
            ).order_by('-count').first()
            
            full_name = f"{student['student__first_name']} {student['student__last_name']}".strip()
            if not full_name:
                full_name = student['student__username']
            
            top_performers.append({
                'id': student['student__id'],
                'name': full_name,
                'average': round(float(student['average']), 1),
                'grade': common_grade['grade_letter'] if common_grade else 'N/A'
            })
        
        # Students needing attention (lowest averages)
        needs_attention = []
        low_performers = queryset.values(
            'student__id',
            'student__username',
            'student__first_name',
            'student__last_name'
        ).annotate(
            average=Avg('percentage')
        ).order_by('average')[:5]
        
        for student in low_performers:
            # Get grade trend (compare last 3 vs previous 3 assessments)
            student_grades = queryset.filter(
                student_id=student['student__id']
            ).order_by('-assessment__date').values_list('percentage', flat=True)[:6]
            
            student_grades_list = list(student_grades)
            trend = 'stable'
            if len(student_grades_list) >= 6:
                recent_avg = sum(student_grades_list[:3]) / 3
                previous_avg = sum(student_grades_list[3:6]) / 3
                if recent_avg > previous_avg + 5:
                    trend = 'improving'
                elif recent_avg < previous_avg - 5:
                    trend = 'declining'
            
            common_grade = queryset.filter(
                student_id=student['student__id']
            ).values('grade_letter').annotate(
                count=Count('id')
            ).order_by('-count').first()
            
            full_name = f"{student['student__first_name']} {student['student__last_name']}".strip()
            if not full_name:
                full_name = student['student__username']
            
            needs_attention.append({
                'id': student['student__id'],
                'name': full_name,
                'average': round(float(student['average']), 1),
                'grade': common_grade['grade_letter'] if common_grade else 'N/A',
                'trend': trend
            })
        
        # Subject comparison
        subject_comparison = []
        subjects = queryset.values(
            'assessment__subject__id',
            'assessment__subject__name'
        ).annotate(
            average=Avg('percentage'),
            count=Count('student', distinct=True)
        ).order_by('-average')
        
        for subject in subjects:
            subject_comparison.append({
                'subject': subject['assessment__subject__name'],
                'average': round(float(subject['average']), 1),
                'count': subject['count']
            })
        
        return Response({
            'overview': {
                'totalAssessments': total_assessments,
                'totalStudents': total_students,
                'averageScore': round(float(average_percentage), 1),
                'passRate': round(pass_rate, 1)
            },
            'gradeDistribution': grade_distribution,
            'assessmentPerformance': assessment_performance,
            'topPerformers': top_performers,
            'needsAttention': needs_attention,
            'subjectComparison': subject_comparison
        })
    
    # Add to GradeViewSet class
    @action(detail=False, methods=['post'], url_path='generate-report')
    def generate_report(self, request):
        """Generate PDF report card for a student"""
        student_id = request.data.get('student_id')
        class_id = request.data.get('class_id')
        term = request.data.get('term')
        academic_year = request.data.get('academic_year')
        
        if not student_id:
            return Response(
                {'error': 'student_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Permission check
        user = request.user
        if user.role == User.STUDENT and user.id != int(student_id):
            return Response(
                {'error': 'You can only view your own report'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            generator = ReportCardGenerator()
            buffer = generator.generate_report(
                student_id=student_id,
                class_id=class_id,
                term=term,
                academic_year=academic_year
            )
            
            # Get student name for filename
            student = User.objects.get(id=student_id)
            filename = f"report_card_{student.username}_{academic_year or 'current'}.pdf"
            
            return FileResponse(
                buffer,
                as_attachment=True,
                filename=filename,
                content_type='application/pdf'
            )
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to generate report: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='generate-bulk-reports')
    def generate_bulk_reports(self, request):
        """Generate PDF report cards for all students in a class"""
        class_id = request.data.get('class_id')
        term = request.data.get('term')
        academic_year = request.data.get('academic_year')
        
        if not class_id:
            return Response(
                {'error': 'class_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Permission check - only teachers and admins
        if request.user.role not in [User.ADMIN, User.TEACHER]:
            return Response(
                {'error': 'Only teachers and admins can generate bulk reports'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            generator = ReportCardGenerator()
            reports = generator.generate_bulk_reports(
                class_id=class_id,
                term=term,
                academic_year=academic_year
            )
            
            return Response({
                'success': True,
                'message': f'Generated {len(reports)} report cards',
                'count': len(reports)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate bulk reports: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ParentViewSet(viewsets.ViewSet):
    """ViewSet for parent portal functionality."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset_for_parent(self, parent):
        """Get all parent-student relationships for a parent."""
        return ParentStudentRelationship.objects.filter(
            parent=parent
        ).select_related('student')
    
    def check_parent_access(self, parent, student, permission):
        """Check if parent has access to student's data."""
        try:
            relationship = ParentStudentRelationship.objects.get(
                parent=parent,
                student=student
            )
            return getattr(relationship, permission, False)
        except ParentStudentRelationship.DoesNotExist:
            return False
    
    # ===== Children Management =====
    
    @action(detail=False, methods=['get'])
    def my_children(self, request):
        """
        Get all children linked to the parent.
        
        Returns list of students with basic info and relationship details.
        """
        if request.user.role != User.PARENT:
            return Response(
                {'error': 'Only parents can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        relationships = self.get_queryset_for_parent(request.user)
        serializer = ParentStudentRelationshipSerializer(
            relationships,
            many=True,
            context={'request': request}
        )
        
        return Response({
            'total_children': relationships.count(),
            'children': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def add_child(self, request):
        """
        Admin endpoint to link a student to a parent.
        Requires parent and student IDs.
        """
        if request.user.role not in [User.ADMIN, User.STAFF]:
            return Response(
                {'error': 'Only admins can add child relationships'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            parent_id = request.data.get('parent_id')
            student_id = request.data.get('student_id')
            
            if not parent_id or not student_id:
                return Response(
                    {'error': 'parent_id and student_id are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            parent = User.objects.get(id=parent_id, role=User.PARENT)
            student = User.objects.get(id=student_id, role=User.STUDENT)
            
            relationship, created = ParentStudentRelationship.objects.get_or_create(
                parent=parent,
                student=student,
                defaults={
                    'relationship_type': request.data.get('relationship_type', 'guardian'),
                    'is_primary_contact': request.data.get('is_primary_contact', False)
                }
            )
            
            if created:
                serializer = ParentStudentRelationshipSerializer(
                    relationship,
                    context={'request': request}
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'message': 'Relationship already exists'},
                    status=status.HTTP_200_OK
                )
        
        except User.DoesNotExist as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # ===== Child Grades =====
    
    @action(detail=False, methods=['get'], url_path='child/(?P<student_id>[^/.]+)/grades')
    def child_grades(self, request, student_id=None):
        """
        Get grades for a specific child.
        
        Query parameters:
        - subject: Filter by subject ID
        - assessment_type: Filter by assessment type
        - start_date: Filter from date
        - end_date: Filter until date
        - limit: Number of records (default 20)
        """
        # ✅ FIXED: Better error logging
        print(f"🔍 DEBUG: Fetching grades for student_id={student_id}, parent={request.user.username}")
        
        try:
            student = User.objects.get(id=student_id, role=User.STUDENT)
            print(f"✅ Found student: {student.username}")
        except User.DoesNotExist:
            print(f"❌ Student {student_id} not found")
            return Response(
                {'error': f'Student with ID {student_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # ✅ FIXED: Better permission check with detailed logging
        try:
            relationship = ParentStudentRelationship.objects.get(
                parent=request.user,
                student=student
            )
            print(f"✅ Found relationship: {relationship}")
            
            if not relationship.can_view_grades:
                print(f"❌ Permission denied: can_view_grades=False")
                return Response(
                    {'error': 'You do not have permission to view this student\'s grades'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except ParentStudentRelationship.DoesNotExist:
            print(f"❌ No relationship found between {request.user.username} and {student.username}")
            return Response(
                {'error': 'You are not linked to this student'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # ✅ FIXED: Fetch ALL grades (not just non-absent)
        grades = Grade.objects.filter(
            student=student
        ).select_related(
            'assessment',
            'assessment__subject',
            'graded_by'
        ).order_by('-assessment__date')
        
        print(f"📊 Found {grades.count()} total grades")
        
        # Apply filters
        subject_id = request.query_params.get('subject')
        assessment_type = request.query_params.get('assessment_type')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        limit = int(request.query_params.get('limit', 20))
        
        if subject_id:
            grades = grades.filter(assessment__subject_id=subject_id)
        if assessment_type:
            grades = grades.filter(assessment__assessment_type=assessment_type)
        if start_date:
            grades = grades.filter(assessment__date__gte=start_date)
        if end_date:
            grades = grades.filter(assessment__date__lte=end_date)
        
        # Calculate statistics (only non-absent for average)
        total_grades = grades.count()
        graded = grades.filter(is_absent=False)
        avg_percentage = graded.aggregate(avg=Avg('percentage'))['avg']
        
        # Paginate
        grades_list = list(grades[:limit])
        print(f"📤 Returning {len(grades_list)} grades")
        
        serializer = ChildGradeSerializer(grades_list, many=True, context={'request': request})
        
        return Response({
            'student_id': student.id,
            'student_name': student.get_full_name(),
            'total_grades': total_grades,
            'average_percentage': float(avg_percentage) if avg_percentage else 0,
            'grades': serializer.data
        })
    
    # ===== Child Attendance =====
    
    @action(detail=False, methods=['get'], url_path='child/(?P<student_id>[^/.]+)/attendance')
    def child_attendance(self, request, student_id=None):
        """
        Get attendance records for a specific child.
        
        Query parameters:
        - class_id: Filter by class
        - start_date: Filter from date
        - end_date: Filter until date
        - status: Filter by status (present, absent, late)
        """
        try:
            student = User.objects.get(id=student_id, role=User.STUDENT)
        except User.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permission
        if not self.check_parent_access(request.user, student, 'can_view_attendance'):
            return Response(
                {'error': 'You do not have permission to view this student\'s attendance'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Fetch attendance
        attendance = Attendance.objects.filter(
            student=student
        ).select_related('class_assigned', 'recorded_by').order_by('-date')
        
        # Apply filters
        class_id = request.query_params.get('class_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        att_status = request.query_params.get('status')
        
        if class_id:
            attendance = attendance.filter(class_assigned_id=class_id)
        if start_date:
            attendance = attendance.filter(date__gte=start_date)
        if end_date:
            attendance = attendance.filter(date__lte=end_date)
        if att_status:
            attendance = attendance.filter(status=att_status)
        
        # Calculate statistics
        total_records = attendance.count()
        present_count = attendance.filter(status='present').count()
        absent_count = attendance.filter(status='absent').count()
        late_count = attendance.filter(status='late').count()
        
        attendance_rate = (
            ((present_count + late_count) / total_records * 100)
            if total_records > 0 else 0
        )
        
        serializer = ChildAttendanceSerializer(attendance, many=True)
        
        return Response({
            'student_id': student.id,
            'student_name': student.get_full_name(),
            'total_records': total_records,
            'present': present_count,
            'absent': absent_count,
            'late': late_count,
            'attendance_rate': round(attendance_rate, 2),
            'records': serializer.data
        })
    
    # ===== Child Timetable =====
    
    @action(detail=False, methods=['get'], url_path='child/(?P<student_id>[^/.]+)/timetable')
    def child_timetable(self, request, student_id=None):
        """
        Get timetable for a specific child's classes.
        """
        try:
            student = User.objects.get(id=student_id, role=User.STUDENT)
        except User.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permission
        if not self.check_parent_access(request.user, student, 'can_view_timetable'):
            return Response(
                {'error': 'You do not have permission to view this student\'s timetable'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get student's classes
        from academics.models import Class
        classes = student.classes_joined.all()
        
        # Get timetable for these classes
        timetable = Timetable.objects.filter(
            class_assigned__in=classes
        ).select_related('subject', 'teacher', 'class_assigned').order_by('day', 'start_time')
        
        # Serialize
        timetable_data = []
        for entry in timetable:
            timetable_data.append({
                'id': entry.id,
                'day': entry.get_day_display(),
                'day_code': entry.day,
                'start_time': entry.start_time,
                'end_time': entry.end_time,
                'subject_name': entry.subject.name,
                'subject_code': entry.subject.code,
                'teacher_name': entry.teacher.get_full_name() if entry.teacher else 'TBD',
                'class_name': entry.class_assigned.name
            })
        
        return Response({
            'student_id': student.id,
            'student_name': student.get_full_name(),
            'total_classes': classes.count(),
            'timetable_entries': len(timetable_data),
            'timetable': timetable_data
        })
    
    # ===== Child Performance Summary =====
    
    @action(detail=False, methods=['get'], url_path='child/(?P<student_id>[^/.]+)/performance-summary')
    def child_performance_summary(self, request, student_id=None):
        """
        Get comprehensive performance summary for a specific child.
        Includes grades, attendance, and performance metrics.
        
        URL: /api/academics/parent/child/{student_id}/performance-summary/
        """
        print(f"🔍 Performance Summary Request - Student ID: {student_id}")
        print(f"👤 Requesting User: {request.user.username} (Role: {request.user.role})")
        
        # Validate student_id
        if not student_id:
            print("❌ No student_id provided")
            return Response(
                {'error': 'student_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student = User.objects.get(id=student_id, role=User.STUDENT)
            print(f"✅ Found student: {student.username}")
        except User.DoesNotExist:
            print(f"❌ Student not found with ID: {student_id}")
            return Response(
                {'error': f'Student with ID {student_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError:
            print(f"❌ Invalid student_id format: {student_id}")
            return Response(
                {'error': 'Invalid student ID format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check parent-student relationship
        try:
            relationship = ParentStudentRelationship.objects.get(
                parent=request.user,
                student=student
            )
            print(f"✅ Found relationship: {relationship}")
            
            # Check permissions
            can_view = relationship.can_view_grades or relationship.can_view_attendance
            if not can_view:
                print(f"❌ Permission denied: No view permissions")
                return Response(
                    {'error': 'You do not have permission to view this student\'s data'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except ParentStudentRelationship.DoesNotExist:
            print(f"❌ No relationship found between parent {request.user.username} and student {student.username}")
            return Response(
                {'error': 'You are not linked to this student'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        print("📊 Calculating performance statistics...")
        
        # Calculate grades stats with safe defaults
        grades = Grade.objects.filter(
            student=student,
            is_absent=False
        )
        
        grades_stats = grades.aggregate(
            total=Count('id'),
            avg_percentage=Avg('percentage')
        )
        
        total_assessments = grades_stats['total'] or 0
        avg_percentage = float(grades_stats['avg_percentage'] or 0)
        
        print(f"📝 Grades: {total_assessments} assessments, avg: {avg_percentage}%")
        
        # Count absent grades
        absent_count = Grade.objects.filter(
            student=student,
            is_absent=True
        ).count()
        
        # Calculate attendance stats with safe division
        attendance = Attendance.objects.filter(
            student=student
        ).aggregate(
            total=Count('id'),
            present=Count('id', filter=Q(status='present')),
            absent=Count('id', filter=Q(status='absent')),
            late=Count('id', filter=Q(status='late'))
        )
        
        total_attendance = attendance['total'] or 0
        present_count = attendance['present'] or 0
        absent_attendance_count = attendance['absent'] or 0
        late_count = attendance['late'] or 0
        
        # Safe attendance rate calculation
        if total_attendance > 0:
            attendance_rate = round(((present_count + late_count) / total_attendance) * 100, 2)
        else:
            attendance_rate = 0.0
        
        print(f"✅ Attendance: {present_count}/{total_attendance} present, rate: {attendance_rate}%")
        
        # Get recent grades safely
        recent_grades = Grade.objects.filter(
            student=student,
            is_absent=False
        ).select_related('assessment').order_by('-graded_at')[:5]
        
        recent_grades_data = []
        for g in recent_grades:
            try:
                recent_grades_data.append({
                    'assessment_name': g.assessment.name,
                    'marks_obtained': float(g.marks_obtained or 0),
                    'total_marks': float(g.assessment.total_marks),
                    'percentage': float(g.percentage or 0),
                    'grade_letter': g.grade_letter or 'N/A',
                    'date': g.graded_at.date().isoformat()
                })
            except Exception as e:
                print(f"⚠️ Error processing grade {g.id}: {e}")
                continue
        
        print(f"📚 Recent grades: {len(recent_grades_data)} items")
        
        # Determine performance category safely
        if avg_percentage >= 90:
            category = 'Excellent'
        elif avg_percentage >= 80:
            category = 'Very Good'
        elif avg_percentage >= 70:
            category = 'Good'
        elif avg_percentage >= 60:
            category = 'Satisfactory'
        else:
            category = 'Needs Improvement'
        
        # Calculate GPA (simple 4.0 scale)
        if avg_percentage >= 90:
            gpa = 4.0
        elif avg_percentage >= 80:
            gpa = 3.5
        elif avg_percentage >= 70:
            gpa = 3.0
        elif avg_percentage >= 60:
            gpa = 2.5
        elif avg_percentage >= 50:
            gpa = 2.0
        else:
            gpa = 1.0
        
        response_data = {
            'student_id': student.id,
            'student_name': student.get_full_name(),
            'overall_percentage': round(avg_percentage, 2),
            'overall_gpa': round(gpa, 2),
            'total_assessments': total_assessments,
            'graded_count': total_assessments,
            'absent_count': absent_count,
            'total_attendance': total_attendance,
            'present_count': present_count,
            'absent_attendance_count': absent_attendance_count,
            'late_count': late_count,
            'attendance_rate': attendance_rate,
            'performance_category': category,
            'recent_grades': recent_grades_data
        }
        
        print(f"✅ Successfully generated performance summary")
        print(f"📦 Response data: {response_data}")
        
        return Response(response_data)


# backend/academics/views.py (ADD THIS)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_performance_analytics(request):
    """
    Get comprehensive student performance analytics.
    
    Query params:
    - student_id: Required for teachers/admins, ignored for students (uses request.user)
    """
    user = request.user
    
    # Get student ID
    if user.role == 'student':
        student_id = user.id
    elif user.role == 'parent':
        # Parents can view their children's analytics
        student_id = request.query_params.get('student_id')
        if not student_id:
            return Response(
                {'error': 'student_id is required for parents'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # TODO: Verify parent-student relationship
    else:
        # Teachers and admins
        student_id = request.query_params.get('student_id')
        if not student_id:
            return Response(
                {'error': 'student_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    try:
        analytics = StudentPerformanceAnalytics(student_id)
        data = analytics.get_comprehensive_analytics()
        
        return Response(data, status=status.HTTP_200_OK)
    
    except User.DoesNotExist:
        return Response(
            {'error': 'Student not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_analytics_pdf(request):
    """Export analytics to PDF"""
    user = request.user
    
    # Get student ID
    if user.role == 'student':
        student_id = user.id
    else:
        student_id = request.query_params.get('student_id')
        if not student_id:
            return Response(
                {'error': 'student_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    try:
        analytics = StudentPerformanceAnalytics(student_id)
        data = analytics.get_comprehensive_analytics()
        
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title = Paragraph(
            f"<b>Performance Analytics: {data['student_info']['name']}</b>",
            styles['Title']
        )
        elements.append(title)
        elements.append(Spacer(1, 0.3*inch))
        
        # Overall Metrics
        metrics = data['overall_metrics']
        elements.append(Paragraph("<b>Overall Performance</b>", styles['Heading2']))
        metrics_data = [
            ['Total Assessments', str(metrics['total_assessments'])],
            ['Average Score', f"{metrics['average_score']}%"],
            ['GPA', str(metrics['gpa'])],
            ['Rank Percentile', f"{metrics['rank_percentile']}%"]
        ]
        metrics_table = Table(metrics_data, colWidths=[3*inch, 2*inch])
        metrics_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))
        elements.append(metrics_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Strengths and Weaknesses
        sw = data['strengths_weaknesses']
        elements.append(Paragraph("<b>Strengths & Weaknesses</b>", styles['Heading2']))
        
        if sw['strengths']:
            elements.append(Paragraph("<b>Strengths:</b>", styles['Normal']))
            for s in sw['strengths']:
                elements.append(Paragraph(
                    f"• {s['subject']}: {s['average']}%",
                    styles['Normal']
                ))
        
        if sw['weaknesses']:
            elements.append(Paragraph("<b>Weaknesses:</b>", styles['Normal']))
            for w in sw['weaknesses']:
                elements.append(Paragraph(
                    f"• {w['subject']}: {w['average']}%",
                    styles['Normal']
                ))
        
        elements.append(Spacer(1, 0.3*inch))
        
        # Recommendations
        elements.append(Paragraph("<b>Recommendations</b>", styles['Heading2']))
        for rec in data['recommendations'][:5]:
            elements.append(Paragraph(
                f"• [{rec['priority'].upper()}] {rec['message']}",
                styles['Normal']
            ))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        # Return response
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="analytics_{student_id}.pdf"'
        return response
    
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
