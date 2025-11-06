from django.contrib import admin
from .models import Class, Subject, Timetable, Attendance, GradeConfig, Assessment, Grade

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