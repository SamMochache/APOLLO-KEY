# backend/academics/report_generator.py
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, 
    Spacer, Image, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from django.conf import settings
from django.db.models import Avg, Sum, Count, Q
from .models import Grade, Assessment, GradeConfig, User, Class, Subject
from decimal import Decimal
import os
from datetime import datetime
from .analytics import StudentPerformanceAnalyzer


class ReportCardGenerator:
    """Generates professional PDF report cards for students"""
    
    def __init__(self):
        self.buffer = BytesIO()
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Create custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='SchoolName',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#374151'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='StudentInfo',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=6,
            fontName='Helvetica'
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading3'],
            fontSize=13,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=10,
            spaceBefore=15,
            fontName='Helvetica-Bold'
        ))
    
    def generate_report(self, student_id, class_id=None, term=None, academic_year=None):
        """
        Generate comprehensive report card for a student
        
        Args:
            student_id: Student ID
            class_id: Optional class filter
            term: Optional term filter
            academic_year: Optional academic year filter
        
        Returns:
            BytesIO buffer containing PDF
        """
        try:
            # Fetch student data
            student = User.objects.get(id=student_id, role=User.STUDENT)
            
            # Fetch grades
            grades = Grade.objects.filter(
                student=student,
                is_absent=False
            ).select_related(
                'assessment',
                'assessment__subject',
                'assessment__class_assigned'
            )
            
            # Apply filters
            if class_id:
                grades = grades.filter(assessment__class_assigned_id=class_id)
            
            # Create PDF document
            doc = SimpleDocTemplate(
                self.buffer,
                pagesize=A4,
                rightMargin=0.75*inch,
                leftMargin=0.75*inch,
                topMargin=0.75*inch,
                bottomMargin=0.75*inch
            )
            
            # Build document elements
            elements = []
            
            # Header
            elements.extend(self._build_header(student, academic_year, term))
            elements.append(Spacer(1, 0.3*inch))
            
            # Student Information
            elements.extend(self._build_student_info(student, class_id))
            elements.append(Spacer(1, 0.2*inch))
            
            # Academic Performance
            elements.extend(self._build_academic_performance(grades))
            elements.append(Spacer(1, 0.2*inch))
            
            # Subject-wise breakdown
            elements.extend(self._build_subject_breakdown(grades))
            elements.append(Spacer(1, 0.2*inch))
            
            # Performance Summary
            elements.extend(self._build_performance_summary(grades))
            elements.append(Spacer(1, 0.2*inch))
            
            # Teacher Remarks
            elements.extend(self._build_remarks(grades, student))
            elements.append(Spacer(1, 0.2*inch))
            
            # Footer
            elements.extend(self._build_footer())
            
            # Build PDF
            doc.build(elements)
            
            # Reset buffer position
            self.buffer.seek(0)
            self.buffer.flush()
            return self.buffer
            
        except User.DoesNotExist:
            raise ValueError(f"Student with ID {student_id} not found")
        except Exception as e:
            raise Exception(f"Error generating report: {str(e)}")
    
    def _build_header(self, student, academic_year, term):
        """Build report card header with school info"""
        elements = []
        
        # School name
        school_name = Paragraph("APOLLO-KEY ACADEMY", self.styles['SchoolName'])
        elements.append(school_name)
        
        # School tagline
        tagline = Paragraph(
            "Excellence in Education",
            self.styles['Normal']
        )
        tagline.alignment = TA_CENTER
        elements.append(tagline)
        elements.append(Spacer(1, 0.1*inch))
        
        # Report title
        title_text = "STUDENT REPORT CARD"
        if academic_year:
            title_text += f" - {academic_year}"
        if term:
            title_text += f" ({term})"
        
        title = Paragraph(title_text, self.styles['ReportTitle'])
        elements.append(title)
        
        # Divider line
        line_data = [['', '']]
        line_table = Table(line_data, colWidths=[6*inch])
        line_table.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#3b82f6'))
        ]))
        elements.append(line_table)
        
        return elements
    
    def _build_student_info(self, student, class_id):
        """Build student information section"""
        elements = []
        
        # Get class info
        class_obj = None
        if class_id:
            try:
                class_obj = Class.objects.get(id=class_id)
            except Class.DoesNotExist:
                pass
        
        # Student info table
        info_data = [
            ['Student Name:', student.get_full_name()],
            ['Student ID:', str(student.id)],
            ['Email:', student.email],
        ]
        
        if class_obj:
            info_data.append(['Class:', class_obj.name])
        
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(info_table)
        
        return elements
    
    def _build_academic_performance(self, grades):
        """Build academic performance overview"""
        elements = []
        
        # Section header
        header = Paragraph("Academic Performance Overview", self.styles['SectionHeader'])
        elements.append(header)
        
        if not grades.exists():
            no_data = Paragraph("No grades available for this period.", self.styles['Normal'])
            elements.append(no_data)
            return elements
        
        # Calculate statistics
        total_assessments = grades.values('assessment').distinct().count()
        avg_percentage = grades.aggregate(avg=Avg('percentage'))['avg'] or 0
        
        # Get grade letter distribution
        grade_dist = {}
        for grade in grades:
            letter = grade.grade_letter or 'N/A'
            grade_dist[letter] = grade_dist.get(letter, 0) + 1
        
        # Performance table
        perf_data = [
            ['Metric', 'Value'],
            ['Total Assessments', str(total_assessments)],
            ['Average Score', f"{avg_percentage:.2f}%"],
            ['Grade Distribution', ', '.join([f"{k}: {v}" for k, v in grade_dist.items()])],
        ]
        
        perf_table = Table(perf_data, colWidths=[2.5*inch, 3.5*inch])
        perf_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
            ('PADDING', (0, 0), (-1, -1), 12),
        ]))
        
        elements.append(perf_table)
        
        return elements
    
    def _build_subject_breakdown(self, grades):
        """Build subject-wise grade breakdown"""
        elements = []
        
        # Section header
        header = Paragraph("Subject-wise Performance", self.styles['SectionHeader'])
        elements.append(header)
        
        if not grades.exists():
            return elements
        
        # Group grades by subject
        subjects = {}
        for grade in grades.select_related('assessment__subject'):
            subject_name = grade.assessment.subject.name
            if subject_name not in subjects:
                subjects[subject_name] = []
            subjects[subject_name].append(grade)
        
        # Create table data
        table_data = [
            ['Subject', 'Assessments', 'Average', 'Highest', 'Lowest', 'Grade']
        ]
        
        for subject_name, subject_grades in subjects.items():
            count = len(subject_grades)
            avg = sum(float(g.percentage or 0) for g in subject_grades) / count
            highest = max(float(g.percentage or 0) for g in subject_grades)
            lowest = min(float(g.percentage or 0) for g in subject_grades)
            
            # Get most common grade letter
            grade_letters = [g.grade_letter for g in subject_grades if g.grade_letter]
            common_grade = max(set(grade_letters), key=grade_letters.count) if grade_letters else 'N/A'
            
            table_data.append([
                subject_name,
                str(count),
                f"{avg:.1f}%",
                f"{highest:.1f}%",
                f"{lowest:.1f}%",
                common_grade
            ])
        
        # Create table
        subject_table = Table(table_data, colWidths=[1.5*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.6*inch])
        subject_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(subject_table)
        
        return elements
    
    def _build_performance_summary(self, grades):
        """Build performance summary with insights"""
        elements = []
        
        # Section header
        header = Paragraph("Performance Summary", self.styles['SectionHeader'])
        elements.append(header)
        
        if not grades.exists():
            return elements
        
        # Calculate insights
        avg_percentage = grades.aggregate(avg=Avg('percentage'))['avg'] or 0
        
        # Determine performance category
        if avg_percentage >= 90:
            category = "Outstanding"
            color = colors.HexColor('#10b981')
        elif avg_percentage >= 80:
            category = "Excellent"
            color = colors.HexColor('#3b82f6')
        elif avg_percentage >= 70:
            category = "Good"
            color = colors.HexColor('#f59e0b')
        elif avg_percentage >= 60:
            category = "Satisfactory"
            color = colors.HexColor('#f97316')
        else:
            category = "Needs Improvement"
            color = colors.HexColor('#ef4444')
        
        # Summary text
        summary_text = f"""
        <b>Overall Performance:</b> {category} ({avg_percentage:.1f}%)<br/>
        <br/>
        This student has demonstrated <b>{category.lower()}</b> academic performance 
        across all subjects during this period. 
        {"Excellent work! Keep it up!" if avg_percentage >= 80 else 
         "Good effort shown. Continue working hard." if avg_percentage >= 60 else
         "Additional support and effort required to improve performance."}
        """
        
        summary = Paragraph(summary_text, self.styles['Normal'])
        
        # Summary box
        summary_data = [[summary]]
        summary_table = Table(summary_data, colWidths=[6*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
            ('BORDER', (0, 0), (-1, -1), 2, color),
            ('PADDING', (0, 0), (-1, -1), 12),
        ]))
        
        elements.append(summary_table)
        
        return elements
    
    def _build_remarks(self, grades, student):
        """Build teacher remarks section"""
        elements = []
        
        # Section header
        header = Paragraph("Teacher's Remarks", self.styles['SectionHeader'])
        elements.append(header)
        
        # Collect unique remarks from grades
        remarks = []
        for grade in grades:
            if grade.remarks and grade.remarks.strip():
                remarks.append(f"• {grade.remarks}")
        
        if remarks:
            remarks_text = "<br/>".join(remarks[:5])  # Limit to 5 most recent
        else:
            remarks_text = "No specific remarks recorded for this period."
        
        remarks_para = Paragraph(remarks_text, self.styles['Normal'])
        
        # Remarks box
        remarks_data = [[remarks_para]]
        remarks_table = Table(remarks_data, colWidths=[6*inch])
        remarks_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef3c7')),
            ('BORDER', (0, 0), (-1, -1), 1, colors.HexColor('#f59e0b')),
            ('PADDING', (0, 0), (-1, -1), 12),
        ]))
        
        elements.append(remarks_table)
        
        return elements
    
    def _build_footer(self):
        """Build report card footer"""
        elements = []
        
        elements.append(Spacer(1, 0.3*inch))
        
        # Signature section
        sig_data = [
            ['_____________________', '', '_____________________'],
            ['Class Teacher', '', 'Principal'],
        ]
        
        sig_table = Table(sig_data, colWidths=[2*inch, 2*inch, 2*inch])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        
        elements.append(sig_table)
        
        # Footer text
        elements.append(Spacer(1, 0.2*inch))
        footer_text = Paragraph(
            "<i>This is a computer-generated report card. No signature is required.</i>",
            self.styles['Normal']
        )
        footer_text.alignment = TA_CENTER
        elements.append(footer_text)
        
        return elements
    
    def generate_bulk_reports(self, class_id, term=None, academic_year=None):
        """
        Generate report cards for all students in a class
        
        Returns:
            List of tuples: [(student_id, buffer), ...]
        """
        try:
            class_obj = Class.objects.get(id=class_id)
            students = class_obj.students.filter(role=User.STUDENT)
            
            reports = []
            for student in students:
                generator = ReportCardGenerator()
                buffer = generator.generate_report(
                    student.id,
                    class_id=class_id,
                    term=term,
                    academic_year=academic_year
                )
                reports.append((student.id, buffer))
            
            return reports
            
        except Class.DoesNotExist:
            raise ValueError(f"Class with ID {class_id} not found")
        
class AnalyticsReportGenerator(ReportCardGenerator):
    """Extends your existing ReportCardGenerator for analytics reports"""
    
    def generate_analytics_report(self, student_id, start_date=None, end_date=None):
        """Generate PDF analytics report"""
        try:
            # Use the analytics engine
            analyzer = StudentPerformanceAnalyzer(student_id, start_date, end_date)
            analytics_data = analyzer.get_comprehensive_analytics()
            student = User.objects.get(id=student_id)
            
            # Create PDF document using your existing template
            doc = SimpleDocTemplate(
                self.buffer,
                pagesize=A4,
                rightMargin=0.75*inch,
                leftMargin=0.75*inch,
                topMargin=0.75*inch,
                bottomMargin=0.75*inch
            )
            
            elements = []
            
            # Header (reuse your existing header style)
            elements.extend(self._build_analytics_header(student, analytics_data))
            elements.append(Spacer(1, 0.3*inch))
            
            # Performance Overview
            elements.extend(self._build_performance_overview(analytics_data))
            elements.append(Spacer(1, 0.2*inch))
            
            # Grade Trends
            elements.extend(self._build_grade_trends_section(analytics_data))
            elements.append(Spacer(1, 0.2*inch))
            
            # Subject Analysis
            elements.extend(self._build_subject_analysis(analytics_data))
            elements.append(Spacer(1, 0.2*inch))
            
            # Recommendations
            elements.extend(self._build_recommendations(analytics_data))
            
            doc.build(elements)
            self.buffer.seek(0)
            return self.buffer
            
        except Exception as e:
            raise Exception(f"Error generating analytics report: {str(e)}")
    
    def _build_analytics_header(self, student, analytics):
        """Build analytics report header"""
        elements = []
        
        # School name (reuse your existing style)
        school_name = Paragraph("APOLLO-KEY ACADEMY", self.styles['SchoolName'])
        elements.append(school_name)
        
        # Report title
        title = Paragraph("STUDENT PERFORMANCE ANALYTICS REPORT", self.styles['ReportTitle'])
        elements.append(title)
        
        # Student info
        info_data = [
            ['Student Name:', student.get_full_name()],
            ['Report Period:', f"{analytics.get('start_date', 'All time')} to {analytics.get('end_date', 'Present')}"],
            ['Generated On:', datetime.now().strftime('%Y-%m-%d %H:%M')]
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(info_table)
        return elements
    
    def _build_performance_overview(self, analytics):
        """Build performance overview section"""
        elements = []
        
        header = Paragraph("Performance Overview", self.styles['SectionHeader'])
        elements.append(header)
        
        perf_metrics = analytics['performance_metrics']
        overview_data = [
            ['Metric', 'Value'],
            ['Overall Average', f"{perf_metrics['average_grade']:.1f}%"],
            ['Total Assessments', str(perf_metrics['total_assessments'])],
            ['Performance Trend', analytics['grade_trends']['trend_direction'].title()],
            ['Consistency Score', f"{analytics['grade_trends']['consistency_score']:.1f}%"]
        ]
        
        overview_table = Table(overview_data, colWidths=[2.5*inch, 3.5*inch])
        overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))
        
        elements.append(overview_table)
        return elements
    
    # Additional PDF building methods...
    def _build_grade_trends_section(self, analytics):
        """Build grade trends section"""
        # Implementation for trend charts in PDF
        pass
    
    def _build_subject_analysis(self, analytics):
        """Build subject analysis section"""
        # Implementation for subject comparison in PDF
        pass
    
    def _build_recommendations(self, analytics):
        """Build recommendations section"""
        # Implementation for recommendations in PDF
        pass