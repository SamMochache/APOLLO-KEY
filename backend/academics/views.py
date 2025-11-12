# backend/academics/views.py - FIXED AttendanceViewSet only
from datetime import datetime
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Avg
from .models import Attendance, Class, User, Subject, Timetable, GradeConfig, Assessment, Grade
from .serializers import AttendanceSerializer, ClassSerializer, SubjectSerializer, TimetableSerializer, GradeConfigSerializer, AssessmentSerializer, GradeSerializer
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
    
    @action(detail=True, methods=['get'])
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
        
 