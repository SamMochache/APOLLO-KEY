# backend/academics/analytics.py
from django.db.models import Avg, Count, Q, Max, Min, StdDev
from django.core.cache import cache
from datetime import datetime, timedelta
from decimal import Decimal
from .models import Grade, Attendance, Assessment, GradeConfig, User
import json

class StudentPerformanceAnalytics:
    """Advanced analytics for student performance"""
    
    def __init__(self, student_id):
        self.student_id = student_id
        self.student = User.objects.get(id=student_id)
        self.cache_duration = 300  # 5 minutes
    
    def get_cache_key(self, suffix):
        """Generate cache key for student analytics"""
        return f"student_analytics_{self.student_id}_{suffix}"
    
    def get_comprehensive_analytics(self):
        """Get all analytics data with caching"""
        cache_key = self.get_cache_key('comprehensive')
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data
        
        data = {
            'student_info': self._get_student_info(),
            'grade_trends': self._get_grade_trends(),
            'subject_comparison': self._get_subject_comparison(),
            'attendance_correlation': self._get_attendance_correlation(),
            'predicted_grades': self._predict_final_grades(),
            'strengths_weaknesses': self._analyze_strengths_weaknesses(),
            'recommendations': self._generate_recommendations(),
            'overall_metrics': self._get_overall_metrics()
        }
        
        cache.set(cache_key, data, self.cache_duration)
        return data
    
    def _get_student_info(self):
        """Get basic student information"""
        return {
            'id': self.student.id,
            'name': self.student.get_full_name(),
            'email': self.student.email,
            'username': self.student.username
        }
    
    def _get_grade_trends(self):
        """Calculate grade trends over time"""
        grades = Grade.objects.filter(
            student=self.student,
            is_absent=False
        ).select_related('assessment').order_by('assessment__date')
        
        if not grades.exists():
            return {'data': [], 'trend': 'insufficient_data'}
        
        # Group by month
        monthly_data = {}
        for grade in grades:
            month_key = grade.assessment.date.strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    'grades': [],
                    'date': grade.assessment.date.strftime('%Y-%m-%d')
                }
            monthly_data[month_key]['grades'].append(float(grade.percentage))
        
        # Calculate averages
        trend_data = []
        for month_key in sorted(monthly_data.keys()):
            data = monthly_data[month_key]
            avg = sum(data['grades']) / len(data['grades'])
            trend_data.append({
                'date': month_key,
                'average': round(avg, 2),
                'count': len(data['grades'])
            })
        
        # Determine trend direction
        if len(trend_data) >= 2:
            recent_avg = sum(d['average'] for d in trend_data[-3:]) / min(3, len(trend_data))
            older_avg = sum(d['average'] for d in trend_data[:3]) / min(3, len(trend_data))
            
            if recent_avg > older_avg + 5:
                trend = 'improving'
            elif recent_avg < older_avg - 5:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'
        
        return {
            'data': trend_data,
            'trend': trend
        }
    
    def _get_subject_comparison(self):
        """Compare performance across subjects"""
        grades = Grade.objects.filter(
            student=self.student,
            is_absent=False
        ).select_related('assessment__subject')
        
        if not grades.exists():
            return []
        
        # Group by subject
        subject_data = {}
        for grade in grades:
            subject = grade.assessment.subject
            if subject.id not in subject_data:
                subject_data[subject.id] = {
                    'subject': subject.name,
                    'subject_code': subject.code,
                    'grades': []
                }
            subject_data[subject.id]['grades'].append(float(grade.percentage))
        
        # Calculate statistics
        comparison = []
        for subject_id, data in subject_data.items():
            grades_list = data['grades']
            comparison.append({
                'subject': data['subject'],
                'subject_code': data['subject_code'],
                'average': round(sum(grades_list) / len(grades_list), 2),
                'highest': round(max(grades_list), 2),
                'lowest': round(min(grades_list), 2),
                'count': len(grades_list),
                'consistency': self._calculate_consistency(grades_list)
            })
        
        # Sort by average descending
        comparison.sort(key=lambda x: x['average'], reverse=True)
        return comparison
    
    def _get_attendance_correlation(self):
        """Analyze correlation between attendance and grades"""
        # Get attendance stats
        attendance = Attendance.objects.filter(student=self.student)
        total_attendance = attendance.count()
        
        if total_attendance == 0:
            return {
                'correlation': 'insufficient_data',
                'attendance_rate': 0,
                'grade_average': 0,
                'insight': 'No attendance data available'
            }
        
        present = attendance.filter(status='present').count()
        attendance_rate = (present / total_attendance) * 100
        
        # Get grade average
        grades = Grade.objects.filter(
            student=self.student,
            is_absent=False
        )
        
        if not grades.exists():
            return {
                'correlation': 'insufficient_data',
                'attendance_rate': round(attendance_rate, 2),
                'grade_average': 0,
                'insight': 'No grade data available'
            }
        
        grade_avg = grades.aggregate(avg=Avg('percentage'))['avg']
        
        # Simple correlation insight
        if attendance_rate >= 90 and grade_avg >= 80:
            correlation = 'strong_positive'
            insight = 'Excellent attendance correlates with strong academic performance'
        elif attendance_rate < 70 and grade_avg < 60:
            correlation = 'negative'
            insight = 'Low attendance may be impacting academic performance'
        elif attendance_rate >= 80:
            correlation = 'moderate'
            insight = 'Good attendance supports academic success'
        else:
            correlation = 'weak'
            insight = 'Attendance patterns need improvement'
        
        return {
            'correlation': correlation,
            'attendance_rate': round(attendance_rate, 2),
            'grade_average': round(float(grade_avg), 2),
            'insight': insight,
            'monthly_data': self._get_monthly_attendance_grades()
        }
    
    def _get_monthly_attendance_grades(self):
        """Get monthly attendance and grade data for correlation chart"""
        grades = Grade.objects.filter(
            student=self.student,
            is_absent=False
        ).select_related('assessment')
        
        attendance = Attendance.objects.filter(student=self.student)
        
        # Group by month
        monthly = {}
        
        for grade in grades:
            month = grade.assessment.date.strftime('%Y-%m')
            if month not in monthly:
                monthly[month] = {'grades': [], 'attendance': []}
            monthly[month]['grades'].append(float(grade.percentage))
        
        for att in attendance:
            month = att.date.strftime('%Y-%m')
            if month not in monthly:
                monthly[month] = {'grades': [], 'attendance': []}
            monthly[month]['attendance'].append(1 if att.status == 'present' else 0)
        
        # Calculate averages
        result = []
        for month in sorted(monthly.keys()):
            data = monthly[month]
            result.append({
                'month': month,
                'grade_avg': round(sum(data['grades']) / len(data['grades']), 2) if data['grades'] else 0,
                'attendance_rate': round((sum(data['attendance']) / len(data['attendance']) * 100), 2) if data['attendance'] else 0
            })
        
        return result
    
    def _predict_final_grades(self):
        """Predict final grades based on current performance"""
        grades = Grade.objects.filter(
            student=self.student,
            is_absent=False
        ).select_related('assessment__subject')
        
        if not grades.exists():
            return []
        
        # Group by subject
        subject_predictions = {}
        for grade in grades:
            subject = grade.assessment.subject
            if subject.id not in subject_predictions:
                subject_predictions[subject.id] = {
                    'subject': subject.name,
                    'grades': [],
                    'weightages': []
                }
            subject_predictions[subject.id]['grades'].append(float(grade.percentage))
            subject_predictions[subject.id]['weightages'].append(
                float(grade.assessment.weightage)
            )
        
        # Calculate predictions
        predictions = []
        for subject_id, data in subject_predictions.items():
            grades_list = data['grades']
            weightages = data['weightages']
            
            # Weighted average
            if sum(weightages) > 0:
                weighted_avg = sum(
                    g * w for g, w in zip(grades_list, weightages)
                ) / sum(weightages)
            else:
                weighted_avg = sum(grades_list) / len(grades_list)
            
            # Trend adjustment
            if len(grades_list) >= 3:
                recent_trend = sum(grades_list[-3:]) / 3
                adjustment = (recent_trend - weighted_avg) * 0.3
                predicted = weighted_avg + adjustment
            else:
                predicted = weighted_avg
            
            # Clamp between 0-100
            predicted = max(0, min(100, predicted))
            
            # Determine grade letter
            predicted_letter = self._get_grade_letter(predicted)
            confidence = self._calculate_prediction_confidence(len(grades_list))
            
            predictions.append({
                'subject': data['subject'],
                'current_average': round(weighted_avg, 2),
                'predicted_final': round(predicted, 2),
                'predicted_grade': predicted_letter,
                'confidence': confidence,
                'trend': 'improving' if predicted > weighted_avg else 'stable'
            })
        
        return predictions
    
    def _analyze_strengths_weaknesses(self):
        """Identify student strengths and weaknesses"""
        comparison = self._get_subject_comparison()
        
        if not comparison:
            return {
                'strengths': [],
                'weaknesses': [],
                'overall': 'insufficient_data'
            }
        
        # Calculate overall average
        overall_avg = sum(s['average'] for s in comparison) / len(comparison)
        
        # Identify strengths (above average)
        strengths = [
            {
                'subject': s['subject'],
                'average': s['average'],
                'reason': f"Consistently strong performance ({s['consistency']})"
            }
            for s in comparison if s['average'] > overall_avg + 10
        ][:3]  # Top 3
        
        # Identify weaknesses (below average)
        weaknesses = [
            {
                'subject': s['subject'],
                'average': s['average'],
                'reason': f"Needs improvement ({s['consistency']})"
            }
            for s in comparison if s['average'] < overall_avg - 10
        ][:3]  # Bottom 3
        
        # Overall assessment
        if overall_avg >= 80:
            overall = 'excellent'
        elif overall_avg >= 70:
            overall = 'good'
        elif overall_avg >= 60:
            overall = 'satisfactory'
        else:
            overall = 'needs_improvement'
        
        return {
            'strengths': strengths,
            'weaknesses': weaknesses,
            'overall': overall,
            'overall_average': round(overall_avg, 2)
        }
    
    def _generate_recommendations(self):
        """Generate personalized recommendations"""
        recommendations = []
        
        # Get analytics data
        trends = self._get_grade_trends()
        comparison = self._get_subject_comparison()
        attendance = self._get_attendance_correlation()
        strengths_weaknesses = self._analyze_strengths_weaknesses()
        
        # Attendance-based recommendations
        if attendance['attendance_rate'] < 80:
            recommendations.append({
                'category': 'attendance',
                'priority': 'high',
                'message': f"Improve attendance (current: {attendance['attendance_rate']}%). Regular attendance is crucial for academic success.",
                'action': 'Aim for at least 90% attendance rate'
            })
        
        # Trend-based recommendations
        if trends['trend'] == 'declining':
            recommendations.append({
                'category': 'performance',
                'priority': 'high',
                'message': 'Recent grades show a declining trend. Consider seeking additional support.',
                'action': 'Schedule a meeting with teachers or tutors'
            })
        elif trends['trend'] == 'improving':
            recommendations.append({
                'category': 'performance',
                'priority': 'low',
                'message': 'Great progress! Keep up the good work.',
                'action': 'Continue current study habits'
            })
        
        # Subject-specific recommendations
        for weakness in strengths_weaknesses['weaknesses']:
            recommendations.append({
                'category': 'subject',
                'priority': 'medium',
                'message': f"Focus more on {weakness['subject']} (current average: {weakness['average']}%)",
                'action': f"Allocate extra study time for {weakness['subject']}"
            })
        
        # Consistency recommendations
        inconsistent_subjects = [
            s for s in comparison if s['consistency'] == 'inconsistent'
        ]
        if inconsistent_subjects:
            recommendations.append({
                'category': 'consistency',
                'priority': 'medium',
                'message': f"Work on consistency in: {', '.join(s['subject'] for s in inconsistent_subjects[:2])}",
                'action': 'Develop regular study routines'
            })
        
        return recommendations
    
    def _get_overall_metrics(self):
        """Calculate overall performance metrics"""
        grades = Grade.objects.filter(
            student=self.student,
            is_absent=False
        )
        
        if not grades.exists():
            return {
                'total_assessments': 0,
                'average_score': 0,
                'highest_score': 0,
                'lowest_score': 0,
                'gpa': 0,
                'rank_percentile': 0
            }
        
        stats = grades.aggregate(
            avg=Avg('percentage'),
            max=Max('percentage'),
            min=Min('percentage'),
            count=Count('id')
        )
        
        # Calculate GPA (simple 4.0 scale)
        avg_pct = float(stats['avg'])
        if avg_pct >= 90:
            gpa = 4.0
        elif avg_pct >= 80:
            gpa = 3.5
        elif avg_pct >= 70:
            gpa = 3.0
        elif avg_pct >= 60:
            gpa = 2.5
        elif avg_pct >= 50:
            gpa = 2.0
        else:
            gpa = 1.0
        
        return {
            'total_assessments': stats['count'],
            'average_score': round(float(stats['avg']), 2),
            'highest_score': round(float(stats['max']), 2),
            'lowest_score': round(float(stats['min']), 2),
            'gpa': gpa,
            'rank_percentile': self._calculate_rank_percentile()
        }
    
    def _calculate_consistency(self, grades_list):
        """Calculate consistency of grades"""
        if len(grades_list) < 3:
            return 'insufficient_data'
        
        # Calculate standard deviation
        mean = sum(grades_list) / len(grades_list)
        variance = sum((x - mean) ** 2 for x in grades_list) / len(grades_list)
        std_dev = variance ** 0.5
        
        if std_dev < 5:
            return 'very_consistent'
        elif std_dev < 10:
            return 'consistent'
        elif std_dev < 15:
            return 'somewhat_consistent'
        else:
            return 'inconsistent'
    
    def _get_grade_letter(self, percentage):
        """Get grade letter from percentage"""
        grade_config = GradeConfig.objects.filter(
            min_percentage__lte=percentage,
            max_percentage__gte=percentage
        ).first()
        
        return grade_config.grade_letter if grade_config else 'N/A'
    
    def _calculate_prediction_confidence(self, sample_size):
        """Calculate confidence level for predictions"""
        if sample_size >= 10:
            return 'high'
        elif sample_size >= 5:
            return 'medium'
        else:
            return 'low'
    
    def _calculate_rank_percentile(self):
        """Calculate student's rank percentile"""
        # Get all students' averages
        all_students = Grade.objects.filter(
            is_absent=False
        ).values('student').annotate(
            avg=Avg('percentage')
        ).order_by('-avg')
        
        # Find this student's position
        student_avg = Grade.objects.filter(
            student=self.student,
            is_absent=False
        ).aggregate(avg=Avg('percentage'))['avg']
        
        if not student_avg:
            return 0
        
        rank = 1
        for idx, s in enumerate(all_students, 1):
            if s['avg'] < student_avg:
                rank = idx
                break
        
        total = len(all_students)
        percentile = ((total - rank + 1) / total * 100) if total > 0 else 0
        
        return round(percentile, 2)