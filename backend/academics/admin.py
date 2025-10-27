from django.contrib import admin
from .models import Class, Subject, Timetable

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
