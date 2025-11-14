from django.db.models import Avg, Count, Q, F, Window
from django.db.models.functions import Lag, Lead, ExtractMonth
from django.core.cache import cache
from .models import Grade, Attendance, Assessment, Subject, User, Class
from decimal import Decimal
import statistics
from datetime import datetime, timedelta
import numpy as np
from sklearn.linear_model import LinearRegression
import json

class StudentPerformanceAnalyzer:
    """Advanced analytics engine that complements existing GradeViewSet"""
    
    def __init__(self, student_id, start_date=None, end_date=None):
        self.student_id = student_id
        self.start_date = start_date
        self.end_date = end_date
        self.cache_key = f"student_analytics_{student_id}_{start_date}_{end_date}"
    
    def get_comprehensive_analytics(self):
        """Get all analytics data - cached for performance"""
        cached_data = cache.get(self.cache_key)
        if cached_data:
            return cached_data
        
        analytics = {
            'grade_trends': self._calculate_grade_trends(),
            'subject_comparison': self._subject_performance_comparison(),
            'attendance_correlation': self._attendance_grade_correlation(),
            'predicted_grades': self._predict_final_grades(),
            'strengths_weaknesses': self._identify_strengths_weaknesses(),
            'learning_insights': self._generate_learning_insights(),
            'study_recommendations': self._generate_recommendations(),
            'performance_metrics': self._calculate_performance_metrics()
        }
        
        # Cache for 1 hour
        cache.set(self.cache_key, analytics, 3600)
        return analytics
    
    def _calculate_grade_trends(self):
        """Calculate grade trends over time with enhanced analytics"""
        grades = Grade.objects.filter(
            student_id=self.student_id,
            is_absent=False
        ).select_related('assessment', 'assessment__subject').order_by('assessment__date')
        
        timeline_data = []
        monthly_averages = {}
        
        for grade in grades:
            percentage = float(grade.percentage) if grade.percentage else 0
            month_key = grade.assessment.date.strftime('%Y-%m')
            
            # Timeline data for line chart
            timeline_data.append({
                'date': grade.assessment.date.isoformat(),
                'percentage': percentage,
                'assessment_name': grade.assessment.name,
                'subject': grade.assessment.subject.name,
                'type': grade.assessment.assessment_type
            })
            
            # Monthly averages
            if month_key not in monthly_averages:
                monthly_averages[month_key] = []
            monthly_averages[month_key].append(percentage)
        
        # Calculate monthly trends
        monthly_trends = []
        for month, scores in monthly_averages.items():
            monthly_trends.append({
                'month': month,
                'average_score': statistics.mean(scores),
                'assessments_count': len(scores)
            })
        
        monthly_trends.sort(key=lambda x: x['month'])
        
        return {
            'timeline_data': timeline_data,
            'monthly_trends': monthly_trends,
            'trend_direction': self._calculate_trend_direction(timeline_data),
            'consistency_score': self._calculate_consistency(timeline_data),
            'volatility': self._calculate_volatility([d['percentage'] for d in timeline_data])
        }
    
    def _subject_performance_comparison(self):
        """Enhanced subject comparison with radar chart data"""
        subjects_data = []
        subjects = Subject.objects.filter(
            assessments__grades__student_id=self.student_id
        ).distinct()
        
        overall_avg = Grade.objects.filter(
            student_id=self.student_id,
            is_absent=False
        ).aggregate(avg=Avg('percentage'))['avg'] or 0
        
        for subject in subjects:
            subject_grades = Grade.objects.filter(
                student_id=self.student_id,
                assessment__subject=subject,
                is_absent=False
            )
            
            avg_percentage = subject_grades.aggregate(avg=Avg('percentage'))['avg'] or 0
            grade_count = subject_grades.count()
            recent_trend = self._calculate_subject_trend(subject_grades)
            
            subjects_data.append({
                'subject': subject.name,
                'subject_id': subject.id,
                'average_score': float(avg_percentage),
                'assessments_count': grade_count,
                'performance_category': self._categorize_performance(float(avg_percentage)),
                'vs_average': float(avg_percentage - overall_avg),
                'recent_trend': recent_trend,
                'strength_level': self._calculate_strength_level(float(avg_percentage))
            })
        
        return sorted(subjects_data, key=lambda x: x['average_score'], reverse=True)
    
    def _attendance_grade_correlation(self):
        """Advanced attendance-grade correlation analysis"""
        attendance = Attendance.objects.filter(
            student_id=self.student_id
        ).select_related('class_assigned')
        
        grades = Grade.objects.filter(
            student_id=self.student_id,
            is_absent=False
        ).select_related('assessment')
        
        # Calculate attendance patterns
        attendance_by_month = {}
        for record in attendance:
            month_key = record.date.strftime('%Y-%m')
            if month_key not in attendance_by_month:
                attendance_by_month[month_key] = {'present': 0, 'total': 0}
            
            attendance_by_month[month_key]['total'] += 1
            if record.status == 'present':
                attendance_by_month[month_key]['present'] += 1
        
        # Calculate grades by month
        grades_by_month = {}
        for grade in grades:
            month_key = grade.assessment.date.strftime('%Y-%m')
            if month_key not in grades_by_month:
                grades_by_month[month_key] = []
            grades_by_month[month_key].append(float(grade.percentage))
        
        # Correlation analysis
        correlation_data = []
        for month in set(list(attendance_by_month.keys()) + list(grades_by_month.keys())):
            if month in attendance_by_month and month in grades_by_month:
                att_rate = (attendance_by_month[month]['present'] / attendance_by_month[month]['total']) * 100
                avg_grade = statistics.mean(grades_by_month[month])
                correlation_data.append({
                    'month': month,
                    'attendance_rate': att_rate,
                    'average_grade': avg_grade
                })
        
        return {
            'correlation_data': correlation_data,
            'correlation_score': self._calculate_correlation_score(correlation_data),
            'attendance_impact': self._analyze_attendance_impact(attendance, grades),
            'heatmap_data': self._generate_attendance_heatmap(attendance)
        }
    
    def _predict_final_grades(self):
        """Enhanced ML prediction using linear regression"""
        grades = Grade.objects.filter(
            student_id=self.student_id,
            is_absent=False
        ).select_related('assessment', 'assessment__subject').order_by('assessment__date')
        
        if grades.count() < 3:
            return {
                'prediction': 'Insufficient data for prediction',
                'confidence': 0,
                'required_assessments': 3 - grades.count()
            }
        
        # Prepare data for ML
        timeline_data = []
        for i, grade in enumerate(grades):
            timeline_data.append({
                'sequence': i + 1,
                'percentage': float(grade.percentage),
                'date': grade.assessment.date,
                'subject': grade.assessment.subject.name
            })
        
        # Simple linear regression
        X = np.array([d['sequence'] for d in timeline_data]).reshape(-1, 1)
        y = np.array([d['percentage'] for d in timeline_data])
        
        model = LinearRegression()
        model.fit(X, y)
        
        # Predict next 3 assessments
        next_sequences = np.array([len(timeline_data) + 1, len(timeline_data) + 2, len(timeline_data) + 3]).reshape(-1, 1)
        predictions = model.predict(next_sequences)
        
        # Subject-wise predictions
        subject_predictions = self._predict_subject_grades(grades)
        
        return {
            'predicted_final_grade': float(np.mean(predictions)),
            'confidence_level': self._calculate_confidence([d['percentage'] for d in timeline_data]),
            'trend': 'improving' if model.coef_[0] > 0 else 'declining',
            'next_predictions': [float(p) for p in predictions],
            'subject_predictions': subject_predictions,
            'improvement_suggestions': self._generate_improvement_suggestions(timeline_data)
        }
    
    def _identify_strengths_weaknesses(self):
        """Comprehensive strength/weakness analysis"""
        subject_data = self._subject_performance_comparison()
        
        strengths = [s for s in subject_data if s['average_score'] >= 80]
        weaknesses = [s for s in subject_data if s['average_score'] < 60]
        average_subjects = [s for s in subject_data if 60 <= s['average_score'] < 80]
        
        return {
            'strengths': strengths[:3],
            'weaknesses': weaknesses[:3],
            'average_areas': average_subjects,
            'improvement_areas': self._suggest_improvement_areas(subject_data),
            'skill_gaps': self._identify_skill_gaps(subject_data)
        }
    
    def _generate_recommendations(self):
        """AI-powered personalized recommendations"""
        analytics = self.get_comprehensive_analytics()
        recommendations = []
        
        # Academic recommendations
        weaknesses = analytics['strengths_weaknesses']['weaknesses']
        if weaknesses:
            weak_subjects = [s['subject'] for s in weaknesses]
            recommendations.append({
                'type': 'academic_focus',
                'priority': 'high',
                'message': f"Focus improvement efforts on: {', '.join(weak_subjects)}",
                'action': 'Create study plan for weak subjects'
            })
        
        # Attendance recommendations
        attendance_rate = analytics['attendance_correlation'].get('attendance_rate', 0)
        if attendance_rate < 85:
            recommendations.append({
                'type': 'attendance',
                'priority': 'medium',
                'message': f"Improve attendance (current: {attendance_rate:.1f}%)",
                'action': 'Aim for 90%+ attendance rate'
            })
        
        # Study habit recommendations
        consistency = analytics['grade_trends']['consistency_score']
        if consistency < 70:
            recommendations.append({
                'type': 'consistency',
                'priority': 'medium', 
                'message': "Work on maintaining consistent performance",
                'action': 'Develop regular study schedule'
            })
        
        return sorted(recommendations, key=lambda x: {'high': 0, 'medium': 1, 'low': 2}[x['priority']])
    
    def _calculate_performance_metrics(self):
        """Comprehensive performance metrics"""
        grades = Grade.objects.filter(
            student_id=self.student_id,
            is_absent=False
        )
        
        total_assessments = grades.count()
        avg_grade = grades.aggregate(avg=Avg('percentage'))['avg'] or 0
        
        # Calculate grade distribution
        grade_distribution = grades.values('grade_letter').annotate(
            count=Count('id')
        ).order_by('grade_letter')
        
        return {
            'total_assessments': total_assessments,
            'average_grade': float(avg_grade),
            'grade_distribution': list(grade_distribution),
            'performance_rank': self._calculate_performance_rank(),
            'learning_velocity': self._calculate_learning_velocity(),
            'knowledge_retention': self._estimate_knowledge_retention()
        }
    
    # Enhanced helper methods
    def _calculate_trend_direction(self, data):
        if len(data) < 2:
            return 'stable'
        
        recent = data[-5:] if len(data) >= 5 else data
        percentages = [item['percentage'] for item in recent]
        
        if len(percentages) < 2:
            return 'stable'
            
        # Use linear regression for trend
        X = np.array(range(len(percentages))).reshape(-1, 1)
        y = np.array(percentages)
        
        model = LinearRegression()
        model.fit(X, y)
        
        slope = model.coef_[0]
        if slope > 1:
            return 'improving'
        elif slope < -1:
            return 'declining'
        else:
            return 'stable'
    
    def _calculate_correlation_score(self, correlation_data):
        if len(correlation_data) < 2:
            return 0
        
        attendance_rates = [d['attendance_rate'] for d in correlation_data]
        grades = [d['average_grade'] for d in correlation_data]
        
        try:
            correlation = np.corrcoef(attendance_rates, grades)[0, 1]
            return float(correlation) if not np.isnan(correlation) else 0
        except:
            return 0
    
    def _generate_attendance_heatmap(self, attendance):
        """Generate heatmap data for attendance patterns"""
        heatmap_data = {}
        for record in attendance:
            week_key = record.date.isocalendar()[1]  # Week number
            day_key = record.date.weekday()          # Day of week (0-6)
            
            if week_key not in heatmap_data:
                heatmap_data[week_key] = {}
            
            heatmap_data[week_key][day_key] = {
                'status': record.status,
                'date': record.date.isoformat()
            }
        
        return heatmap_data
    
    def _predict_subject_grades(self, grades):
        """Predict grades for each subject"""
        subject_grades = {}
        for grade in grades:
            subject_name = grade.assessment.subject.name
            if subject_name not in subject_grades:
                subject_grades[subject_name] = []
            subject_grades[subject_name].append(float(grade.percentage))
        
        predictions = {}
        for subject, scores in subject_grades.items():
            if len(scores) >= 2:
                X = np.array(range(len(scores))).reshape(-1, 1)
                y = np.array(scores)
                model = LinearRegression()
                model.fit(X, y)
                next_grade = model.predict([[len(scores)]])[0]
                predictions[subject] = {
                    'predicted_grade': float(next_grade),
                    'trend': 'improving' if model.coef_[0] > 0 else 'declining',
                    'confidence': min(90, len(scores) * 15)  # More data = more confidence
                }
        
        return predictions

    # Additional helper methods...
    def _calculate_consistency(self, data):
        if len(data) < 2:
            return 100
        percentages = [d['percentage'] for d in data]
        std_dev = statistics.stdev(percentages)
        return max(0, 100 - (std_dev * 2))
    
    def _calculate_volatility(self, percentages):
        if len(percentages) < 2:
            return 0
        return statistics.stdev(percentages)
    
    def _categorize_performance(self, score):
        if score >= 90: return 'excellent'
        if score >= 80: return 'very_good'
        if score >= 70: return 'good'
        if score >= 60: return 'satisfactory'
        return 'needs_improvement'
    
    def _calculate_strength_level(self, score):
        return min(100, max(0, (score - 50) * 2))  # Convert 50-100 to 0-100 scale