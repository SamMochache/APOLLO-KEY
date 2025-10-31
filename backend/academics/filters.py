# backend/academics/filters.py
import django_filters
from .models import Attendance

class AttendanceFilter(django_filters.FilterSet):
    """Filter attendance by date range, class, student, and status."""
    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    class_id = django_filters.NumberFilter(field_name="class_assigned__id", lookup_expr="exact")
    student_id = django_filters.NumberFilter(field_name="student__id", lookup_expr="exact")
    status = django_filters.CharFilter(field_name="status", lookup_expr="iexact")

    class Meta:
        model = Attendance
        fields = ["date_from", "date_to", "class_id", "student_id", "status"]
