from django.contrib import admin
from .models import Class, Subject, Timetable, Attendance, GradeConfig, Assessment, Grade, ParentStudentRelationship

@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ("name", "teacher")
    search_fields = ("name", "teacher__username")

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "teacher")
    search_fields = ("name", "code", "teacher__username")


@admin.register(Timetable)
class TimetableAdmin(admin.ModelAdmin):
    list_display = ("class_assigned", "subject", "teacher", "day", "start_time", "end_time")
    list_filter = ("day", "class_assigned", "teacher")
    search_fields = ("class_assigned__name", "subject__name", "teacher__username")

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("student", "class_assigned", "date", "status", "recorded_by")
    list_filter = ("status", "date", "class_assigned")
    search_fields = (
        "student__username",
        "class_assigned__name",
        "recorded_by__username",
    )
    ordering = ("-date",)
    date_hierarchy = "date"

@admin.register(GradeConfig)
class GradeConfigAdmin(admin.ModelAdmin):
    list_display = ("grade_letter", "min_percentage", "max_percentage", "gpa_value")
    ordering = ("-min_percentage",)

@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ("name", "assessment_type", "subject", "class_assigned", "date", "total_marks", "weightage")
    list_filter = ("assessment_type", "date", "subject", "class_assigned")
    search_fields = ("name", "subject__name", "class_assigned__name")
    date_hierarchy = "date"

@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ("student", "assessment", "marks_obtained", "grade_letter", "percentage", "is_absent")
    list_filter = ("is_absent", "grade_letter", "assessment__assessment_type")
    search_fields = ("student__username", "assessment__name")
    ordering = ("-graded_at",)

@admin.register(ParentStudentRelationship)
class ParentStudentRelationshipAdmin(admin.ModelAdmin):
    """Admin interface for managing parent-student relationships."""
    
    list_display = (
        'parent', 'student', 'relationship_type',
        'is_primary_contact', 'can_view_grades', 'can_view_attendance'
    )
    list_filter = (
        'relationship_type', 'is_primary_contact',
        'can_view_grades', 'can_view_attendance', 'created_at'
    )
    search_fields = (
        'parent__username', 'parent__email',
        'student__username', 'student__email'
    )
    ordering = ('-is_primary_contact', '-created_at')
    
    fieldsets = (
        ('Relationship', {
            'fields': ('parent', 'student', 'relationship_type', 'is_primary_contact')
        }),
        ('Permissions', {
            'fields': (
                'can_view_grades', 'can_view_attendance',
                'can_view_timetable', 'can_receive_notifications'
            ),
            'description': 'Grant or restrict access to specific information'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        queryset = super().get_queryset(request)
        return queryset.select_related('parent', 'student')
    
    def get_search_results(self, request, queryset, search_term):
        """Enhance search to include parent and student names."""
        queryset, use_distinct = super().get_search_results(
            request, queryset, search_term
        )
        return queryset, use_distinct