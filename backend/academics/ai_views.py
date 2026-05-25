import json
from datetime import timedelta

import anthropic
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .analytics import StudentPerformanceAnalytics
from .models import Attendance, Assessment, Class, Grade, ParentStudentRelationship, Timetable

User = get_user_model()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def _cache_result(key, value, ttl=None):
    cache.set(key, value, ttl or settings.AI_CACHE_TIMEOUT)
    return value


def _build_cache_key(prefix, *parts):
    safe_parts = [str(p) for p in parts if p is not None]
    return f"ai_{prefix}_{'_'.join(safe_parts)}"


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_report_narrative(request):
    if request.user.role not in [User.ADMIN, User.TEACHER]:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    student_id = request.data.get('student_id')
    class_id = request.data.get('class_id')
    term = request.data.get('term', '')
    academic_year = request.data.get('academic_year', '')

    if not student_id:
        return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    analytics = StudentPerformanceAnalytics(student_id)
    metrics = analytics._get_overall_metrics()
    sw = analytics._analyze_strengths_weaknesses()
    attendance = analytics._get_attendance_correlation()
    student = analytics.student

    cache_key = _build_cache_key('narrative', student_id, class_id or 'none', term or 'current', academic_year or 'current')
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    system_prompt = """You are an academic report writer for a Kenyan school.
Write a single professional paragraph (4-6 sentences) for a student's report card.
Rules:
- Use only the data provided. Do not invent grades, subjects, or facts.
- Tone: encouraging but honest. Suitable for parents to read.
- Mention the student by first name only.
- Reference specific subjects for strengths and weaknesses if provided.
- End with one forward-looking sentence.
- Plain text only. No bullet points, no headings."""

    user_content = f"""
Student first name: {student.first_name or student.username}
Term/Period: {term or 'Current Term'} {academic_year}
Overall average: {metrics.get('average_score', 0)}%
Performance category: {sw.get('overall')}
Highest score: {metrics.get('highest_score', 0)}%
Lowest score: {metrics.get('lowest_score', 0)}%
GPA: {metrics.get('gpa', 0)} / 4.0
Attendance rate: {attendance.get('attendance_rate', 0)}%
Strongest subjects: {[s['subject'] for s in sw.get('strengths', [])]}
Subjects needing improvement: {[w['subject'] for w in sw.get('weaknesses', [])]}
Total assessments completed: {metrics.get('total_assessments', 0)}
"""

    try:
        message = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=800,
            system=system_prompt,
            messages=[{'role': 'user', 'content': user_content}]
        )
        narrative = message.content[0].text.strip()
    except Exception as e:
        return Response(
            {'error': 'AI service unavailable', 'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    result = {
        'student_id': int(student_id),
        'student_name': student.get_full_name(),
        'narrative': narrative,
        'performance_category': sw.get('overall'),
        'overall_average': metrics.get('average_score'),
        'generated_at': timezone.now().isoformat(),
    }
    _cache_result(cache_key, result)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detect_at_risk_students(request):
    if request.user.role not in [User.ADMIN, User.TEACHER]:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    class_id = request.query_params.get('class_id')
    threshold_raw = request.query_params.get('threshold', 70)
    try:
        threshold = float(threshold_raw)
    except (TypeError, ValueError):
        return Response({'error': 'threshold must be a number'}, status=status.HTTP_400_BAD_REQUEST)

    if not class_id:
        return Response({'error': 'class_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = _build_cache_key('at_risk', class_id, threshold)
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    try:
        cls = Class.objects.get(id=class_id)
        students = cls.students.filter(role=User.STUDENT)
    except Class.DoesNotExist:
        return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

    at_risk = []
    for student in students:
        analytics = StudentPerformanceAnalytics(student.id)
        metrics = analytics._get_overall_metrics()
        attendance = analytics._get_attendance_correlation()
        trends = analytics._get_grade_trends()

        avg = _safe_float(metrics.get('average_score'))
        att = _safe_float(attendance.get('attendance_rate'))
        trend = trends.get('trend', 'stable')

        if avg >= threshold and att >= 80 and trend != 'declining':
            continue

        if avg < 40 or att < 60:
            risk_level = 'high'
        elif avg < 55 or att < 70 or trend == 'declining':
            risk_level = 'medium'
        else:
            risk_level = 'low'

        prompt = f"""A teacher needs a brief (2-3 sentence) plain-English explanation of why this student may need academic intervention. Use only the data below. Be specific.

Student: {student.get_full_name()}
Average score: {avg}% (threshold is {threshold}%)
Attendance rate: {att}%
Grade trend: {trend}
Risk level assessed: {risk_level}
Total assessments: {metrics.get('total_assessments', 0)}"""

        try:
            msg = client.messages.create(
                model='claude-opus-4-6',
                max_tokens=200,
                system='You write brief academic risk summaries for teachers. Plain text only.',
                messages=[{'role': 'user', 'content': prompt}]
            )
            reason = msg.content[0].text.strip()
        except Exception:
            reason = f"Average score {avg}%, attendance {att}%, trend {trend}."

        at_risk.append({
            'student_id': student.id,
            'student_name': student.get_full_name(),
            'risk_level': risk_level,
            'risk_reason': reason,
            'average_score': avg,
            'attendance_rate': att,
            'trend': trend,
        })

    order = {'high': 0, 'medium': 1, 'low': 2}
    at_risk.sort(key=lambda x: order.get(x['risk_level'], 3))

    result = {
        'class_id': int(class_id),
        'class_name': cls.name,
        'total_students': students.count(),
        'at_risk_count': len(at_risk),
        'generated_at': timezone.now().isoformat(),
        'students': at_risk,
    }
    _cache_result(cache_key, result)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def draft_parent_message(request):
    if request.user.role not in [User.ADMIN, User.TEACHER]:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    student_id = request.data.get('student_id')
    parent_id = request.data.get('parent_id')
    context_type = request.data.get('context_type', 'general_update')

    if not student_id or not parent_id:
        return Response(
            {'error': 'student_id and parent_id are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        parent = User.objects.get(id=parent_id, role=User.PARENT)
        student = User.objects.get(id=student_id, role=User.STUDENT)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    analytics = StudentPerformanceAnalytics(student_id)
    metrics = analytics._get_overall_metrics()
    attendance = analytics._get_attendance_correlation()
    trends = analytics._get_grade_trends()

    context_map = {
        'low_attendance': 'The student has concerning attendance. Express care, state the facts, ask for collaboration.',
        'grade_drop': 'The student\'s grades have declined recently. Be supportive, not accusatory. Suggest a meeting.',
        'positive_update': 'Share genuinely good news about the student\'s progress. Specific and warm.',
        'exam_reminder': 'Upcoming exams. Encourage preparation, share the student\'s current standing.',
        'behaviour_concern': 'There is a behavioural concern. Professional, factual, solution-focused.',
        'general_update': 'Routine progress update. Balanced, informative.',
    }
    context_instruction = context_map.get(context_type, context_map['general_update'])

    teacher_name = request.user.get_full_name()
    parent_name = parent.get_full_name()
    student_name = student.first_name or student.get_full_name()

    system_prompt = f"""You are drafting a message from a teacher to a parent at a Kenyan school.
{context_instruction}
Rules:
- Address the parent by name.
- Reference the student by first name in the body.
- Include 1-2 specific data points (from what is provided).
- Professional but warm tone. 3-5 short paragraphs.
- End with teacher's name as signature.
- Plain text only. No markdown."""

    user_content = f"""
Teacher: {teacher_name}
Parent name: {parent_name}
Student first name: {student_name}
Overall average: {metrics.get('average_score', 0)}%
Grade trend: {trends.get('trend')}
Attendance rate: {attendance.get('attendance_rate', 0)}%
Total assessments completed: {metrics.get('total_assessments', 0)}
Message purpose: {context_type.replace('_', ' ')}
"""

    try:
        msg = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=800,
            system=system_prompt,
            messages=[{'role': 'user', 'content': user_content}]
        )
        body = msg.content[0].text.strip()
    except Exception as e:
        return Response(
            {'error': 'AI service unavailable', 'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    subject_map = {
        'low_attendance': f'Attendance Update — {student_name}',
        'grade_drop': f'Academic Progress — {student_name}',
        'positive_update': f'Great News About {student_name}!',
        'exam_reminder': f'Upcoming Exams — {student_name}',
        'behaviour_concern': f'Behavioural Update — {student_name}',
        'general_update': f'Progress Update — {student_name}',
    }

    return Response({
        'draft_subject': subject_map.get(context_type, f'Update — {student_name}'),
        'draft_body': body,
        'context_type': context_type,
        'student_name': student.get_full_name(),
        'data_used': {
            'attendance_rate': attendance.get('attendance_rate', 0),
            'average_score': metrics.get('average_score', 0),
            'trend': trends.get('trend'),
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_timetable_conflict(request):
    if request.user.role not in [User.ADMIN, User.TEACHER]:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    class_id = request.data.get('class_id')
    conflicting_entry = request.data.get('conflicting_entry', {})

    if not class_id or not conflicting_entry:
        return Response(
            {'error': 'class_id and conflicting_entry are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        cls = Class.objects.get(id=class_id)
    except Class.DoesNotExist:
        return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

    existing = list(
        Timetable.objects.filter(class_assigned=cls).values(
            'day', 'start_time', 'end_time', 'subject__name', 'teacher__username'
        )
    )

    teacher_schedule = []
    teacher_id = conflicting_entry.get('teacher_id')
    if teacher_id:
        teacher_schedule = list(
            Timetable.objects.filter(teacher_id=teacher_id).values(
                'day', 'start_time', 'end_time', 'class_assigned__name'
            )
        )

    system_prompt = """You are a school timetable scheduling assistant.
Analyse the conflict and suggest up to 3 alternative time slots.
Respond ONLY with valid JSON in this exact format:
{
  \"conflict_summary\": \"one sentence describing the conflict\",
  \"suggestions\": [
    {\"day\": \"MON\", \"start_time\": \"08:00\", \"end_time\": \"09:00\",\
     \"reason\": \"why this slot works\"}
  ]
}
No explanation outside the JSON."""

    user_content = f"""
Conflicting entry requested:
  Day: {conflicting_entry.get('day')}
  Time: {conflicting_entry.get('start_time')} - {conflicting_entry.get('end_time')}
  Subject ID: {conflicting_entry.get('subject_id')}
  Teacher ID: {teacher_id}

Class {cls.name} existing timetable:
{existing}

Teacher's other commitments:
{teacher_schedule}

Available days: MON, TUE, WED, THU, FRI
Standard time slots: 08:00-09:00, 09:00-10:00, 10:00-11:00,
                     11:00-12:00, 13:00-14:00, 14:00-15:00, 15:00-16:00

Suggest 3 conflict-free alternatives for this entry.
"""

    try:
        msg = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=600,
            system=system_prompt,
            messages=[{'role': 'user', 'content': user_content}]
        )
        payload = msg.content[0].text.strip()
        result = json.loads(payload)
        result['generated_at'] = timezone.now().isoformat()
        return Response(result)
    except (json.JSONDecodeError, Exception) as e:
        return Response(
            {'error': 'AI service unavailable', 'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_assessment_feedback(request):
    if request.user.role not in [User.ADMIN, User.TEACHER]:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    assessment_id = request.data.get('assessment_id')
    student_id = request.data.get('student_id')

    if not assessment_id or not student_id:
        return Response(
            {'error': 'assessment_id and student_id are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        grade = Grade.objects.select_related('assessment', 'student').get(
            assessment_id=assessment_id, student_id=student_id
        )
        assessment = grade.assessment
    except Grade.DoesNotExist:
        return Response({'error': 'Grade not found'}, status=status.HTTP_404_NOT_FOUND)

    if grade.is_absent:
        return Response(
            {'error': 'Student was absent — no feedback to generate'},
            status=status.HTTP_400_BAD_REQUEST
        )

    cache_key = _build_cache_key('feedback', assessment_id, student_id)
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    system_prompt = """You are a teacher writing personalised assessment feedback for a student.
Write 2-3 sentences of constructive, subject-specific feedback.
Rules:
- Reference the assessment name and subject.
- If score is high (>75%): affirm what went well, suggest how to maintain or extend.
- If score is mid (50-75%): acknowledge effort, identify one specific improvement area.
- If score is low (<50%): be encouraging, concrete about what to review, no blame.
- Plain text only. Address the student directly (use 'you')."""

    user_content = f"""
Student first name: {grade.student.first_name or grade.student.username}
Assessment: {assessment.name}
Subject: {assessment.subject.name}
Assessment type: {assessment.assessment_type}
Marks obtained: {grade.marks_obtained} / {assessment.total_marks}
Percentage: {grade.percentage}%
Grade letter: {grade.grade_letter}
Passing marks: {assessment.passing_marks or 'not set'}
Teacher's existing remarks (may be blank): {grade.remarks or 'none'}
"""

    try:
        msg = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=400,
            system=system_prompt,
            messages=[{'role': 'user', 'content': user_content}]
        )
        feedback = msg.content[0].text.strip()
    except Exception as e:
        return Response(
            {'error': 'AI service unavailable', 'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    result = {
        'student_id': int(student_id),
        'assessment_id': int(assessment_id),
        'feedback': feedback,
        'grade_letter': grade.grade_letter,
        'percentage': float(grade.percentage),
    }
    _cache_result(cache_key, result)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_study_plan(request):
    user = request.user
    student_id = request.query_params.get('student_id')

    if user.role == User.STUDENT:
        student_id = user.id
    elif user.role in [User.ADMIN, User.TEACHER]:
        if not student_id:
            return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    cache_key = _build_cache_key('study_plan', student_id)
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    analytics = StudentPerformanceAnalytics(student_id)
    metrics = analytics._get_overall_metrics()
    sw = analytics._analyze_strengths_weaknesses()
    trends = analytics._get_grade_trends()
    predictions = analytics._predict_final_grades()
    attendance = analytics._get_attendance_correlation()
    student = analytics.student

    focus_subjects = [w['subject'] for w in sw.get('weaknesses', [])]

    system_prompt = """You are an academic coach for a Kenyan secondary school student.
Create a practical 5-day study plan (Monday to Friday).
Format:
- One paragraph introduction with honest assessment of current standing.
- For each day: Day name, 2-3 specific study tasks (subject + topic/activity).
- One closing paragraph with motivation and a single key tip.
Rules:
- Use only the subjects and data provided.
- Be specific about what to study (e.g. \"Revise quadratic equations\" not \"study maths\").
- Allocate more time to weak subjects.
- Plain text. No markdown symbols or bullet points."""

    user_content = f"""
Student: {student.first_name or student.username}
Overall average: {metrics.get('average_score', 0)}%
Performance category: {sw.get('overall')}
Grade trend: {trends.get('trend')}
Attendance rate: {attendance.get('attendance_rate', 0)}%

Strong subjects (spend less time):
{[s['subject'] + ' (' + str(s['average']) + '%)' for s in sw.get('strengths', [])]}

Weak subjects (prioritise):
{[w['subject'] + ' (' + str(w['average']) + '%)' for w in sw.get('weaknesses', [])]}

Predicted final grades:
{[(p['subject'] + ': predicted ' + str(p['predicted_final']) + '%') for p in predictions]}
"""

    try:
        msg = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=1200,
            system=system_prompt,
            messages=[{'role': 'user', 'content': user_content}]
        )
        plan = msg.content[0].text.strip()
    except Exception as e:
        return Response(
            {'error': 'AI service unavailable', 'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    result = {
        'student_id': int(student_id),
        'student_name': student.get_full_name(),
        'study_plan': plan,
        'focus_subjects': focus_subjects,
        'overall_category': sw.get('overall'),
        'generated_at': timezone.now().isoformat(),
    }
    _cache_result(cache_key, result)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detect_attendance_anomalies(request):
    if request.user.role not in [User.ADMIN, User.TEACHER]:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    class_id = request.query_params.get('class_id')
    days_param = request.query_params.get('days', 30)
    try:
        days = int(days_param)
    except (TypeError, ValueError):
        return Response({'error': 'days must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

    if not class_id:
        return Response({'error': 'class_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = _build_cache_key('anomalies', class_id, days)
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    try:
        cls = Class.objects.get(id=class_id)
    except Class.DoesNotExist:
        return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

    since = timezone.now().date() - timedelta(days=days)
    records = Attendance.objects.filter(
        class_assigned=cls,
        date__gte=since
    ).select_related('student').values(
        'student__username', 'student__first_name', 'student__last_name',
        'date', 'status'
    )

    from collections import defaultdict

    day_map = defaultdict(lambda: defaultdict(list))
    for r in records:
        name = (r['student__first_name'] or r['student__username'])[:15]
        weekday = r['date'].strftime('%A')
        day_map[name][weekday].append(r['status'])

    summary_data = {}
    for student_name, days_data in list(day_map.items())[:30]:
        summary_data[student_name] = {
            day: f"{v.count('absent')}abs/{v.count('present')}pres/{v.count('late')}late"
            for day, v in days_data.items()
        }

    system_prompt = """You are an attendance analyst for a school.
Identify non-obvious patterns in the attendance data provided.
Respond ONLY with valid JSON in this exact format:
{
  \"anomalies\": [
    {
      \"type\": \"day_pattern|group_pattern|exam_pattern|chronic_absence|other\",
      \"description\": \"plain English description of the pattern\",
      \"affected_students\": [\"name1\", \"name2\"],
      \"severity\": \"high|medium|low\"
    }
  ],
  \"summary\": \"2-3 sentence overall summary for the teacher\"
}
Return an empty anomalies list if no patterns are found. No text outside JSON."""

    user_content = f"""
Class: {cls.name}
Period: last {days} days
Student attendance by day of week (format: absences/present/late per day):
{json.dumps(summary_data, indent=2)}
"""

    try:
        msg = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=1000,
            system=system_prompt,
            messages=[{'role': 'user', 'content': user_content}]
        )
        result = json.loads(msg.content[0].text.strip())
        result.update({
            'class_id': int(class_id),
            'class_name': cls.name,
            'period_days': days,
            'generated_at': timezone.now().isoformat(),
        })
    except (json.JSONDecodeError, Exception) as e:
        return Response(
            {'error': 'AI service unavailable', 'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    _cache_result(cache_key, result)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predict_grades_ai(request):
    user = request.user
    student_id = request.query_params.get('student_id')

    if user.role == User.STUDENT:
        student_id = user.id
    elif user.role in [User.ADMIN, User.TEACHER]:
        if not student_id:
            return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    cache_key = _build_cache_key('predict', student_id)
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    analytics = StudentPerformanceAnalytics(student_id)
    subject_data = analytics._get_subject_comparison()
    trends = analytics._get_grade_trends()
    attendance = analytics._get_attendance_correlation()
    student = analytics.student

    grade_sequences = {}
    grades = Grade.objects.filter(
        student_id=student_id, is_absent=False
    ).select_related('assessment__subject').order_by('assessment__date')

    for g in grades:
        subj = g.assessment.subject.name
        grade_sequences.setdefault(subj, []).append(float(g.percentage))

    system_prompt = """You are an academic prediction engine for a school.
Predict final exam grades based on performance history.
Respond ONLY with valid JSON:
{
  \"predictions\": [
    {
      \"subject\": \"subject name\",
      \"current_average\": 0.0,
      \"predicted_final\": 0.0,
      \"predicted_grade\": \"A\",
      \"confidence\": \"high|medium|low\",
      \"reasoning\": \"1-2 sentences explaining the prediction\"
    }
  ],
  \"overall_prediction\": 0.0
}
No text outside JSON. Confidence: high if 5+ data points, medium if 3-4, low if 1-2."""

    user_content = f"""
Student: {student.get_full_name()}
Attendance rate: {attendance.get('attendance_rate', 0)}%
Overall grade trend: {trends.get('trend')}

Grade sequences by subject (chronological percentages):
{json.dumps(grade_sequences, indent=2)}

Subject summary statistics:
{json.dumps([{
    'subject': s['subject'],
    'average': s['average'],
    'consistency': s['consistency'],
    'count': s['count']
} for s in subject_data], indent=2)}
"""

    try:
        msg = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=1200,
            system=system_prompt,
            messages=[{'role': 'user', 'content': user_content}]
        )
        result = json.loads(msg.content[0].text.strip())
        result.update({
            'student_id': int(student_id),
            'student_name': student.get_full_name(),
            'generated_at': timezone.now().isoformat(),
        })
    except (json.JSONDecodeError, Exception) as e:
        return Response(
            {'error': 'AI service unavailable', 'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    _cache_result(cache_key, result)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def school_insights(request):
    if request.user.role != User.ADMIN:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    cache_key = 'ai_school_insights'
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    from django.db.models import Avg, Count
    from django.utils import timezone as tz
    from datetime import timedelta

    since = tz.now().date() - timedelta(days=90)

    class_stats = []
    for cls in Class.objects.all()[:20]:
        grades = Grade.objects.filter(
            assessment__class_assigned=cls,
            is_absent=False,
            assessment__date__gte=since
        )
        att = Attendance.objects.filter(class_assigned=cls, date__gte=since)
        if not grades.exists():
            continue

        avg = grades.aggregate(a=Avg('percentage'))['a'] or 0
        att_total = att.count()
        att_present = att.filter(status=Attendance.PRESENT).count()

        class_stats.append({
            'class': cls.name,
            'average': round(float(avg), 1),
            'student_count': cls.students.count(),
            'attendance': round((att_present / att_total * 100), 1) if att_total else 0,
            'teacher': cls.teacher.get_full_name() if cls.teacher else 'Unassigned',
        })

    subject_stats = list(
        Grade.objects.filter(is_absent=False, assessment__date__gte=since)
        .values('assessment__subject__name')
        .annotate(avg=Avg('percentage'), count=Count('id'))
        .order_by('avg')[:15]
    )

    system_prompt = """You are an educational data analyst for a school principal.
Identify 3-6 actionable insights from the school-wide data.
Respond ONLY with valid JSON:
{
  \"insights\": [
    {
      \"category\": \"curriculum|teacher|attendance|grading|infrastructure\",
      \"title\": \"short title (max 10 words)\",
      \"detail\": \"2-3 sentences with specific data points\",
      \"severity\": \"high|medium|low\",
      \"affected_classes\": [\"class names or 'school-wide'\"]
    }
  ],
  \"executive_summary\": \"3-4 sentence summary for the principal\"
}
Be data-driven. No speculation. No text outside JSON."""

    user_content = f"""
School data — last 90 days

Class performance summary:
{json.dumps(class_stats, indent=2)}

Subject averages across school:
{json.dumps(subject_stats, indent=2)}
"""

    try:
        msg = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=1500,
            system=system_prompt,
            messages=[{'role': 'user', 'content': user_content}]
        )
        result = json.loads(msg.content[0].text.strip())
        result.update({
            'data_period': 'last 90 days',
            'generated_at': timezone.now().isoformat(),
        })
    except (json.JSONDecodeError, Exception) as e:
        return Response(
            {'error': 'AI service unavailable', 'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    cache.set(cache_key, result, 60 * 30)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parent_chatbot(request):
    if request.user.role != User.PARENT:
        return Response({'error': 'Parent access only'}, status=status.HTTP_403_FORBIDDEN)

    student_id = request.data.get('student_id')
    user_message = str(request.data.get('message', '')).strip()
    history = request.data.get('conversation_history', [])

    if not student_id or not user_message:
        return Response(
            {'error': 'student_id and message are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        relationship = ParentStudentRelationship.objects.get(
            parent=request.user,
            student_id=student_id
        )
        student = relationship.student
    except ParentStudentRelationship.DoesNotExist:
        return Response({'error': 'You are not linked to this student'}, status=status.HTTP_403_FORBIDDEN)

    analytics = StudentPerformanceAnalytics(student_id)
    metrics = analytics._get_overall_metrics()
    sw = analytics._analyze_strengths_weaknesses()
    trends = analytics._get_grade_trends()
    attendance = analytics._get_attendance_correlation()
    subjects = analytics._get_subject_comparison()
    recent = analytics._predict_final_grades()

    student_context = f"""
Student name: {student.get_full_name()}
Overall average: {metrics.get('average_score', 0)}%
GPA: {metrics.get('gpa', 0)}
Performance category: {sw.get('overall')}
Grade trend: {trends.get('trend')}
Attendance rate: {attendance.get('attendance_rate', 0)}%
Total assessments: {metrics.get('total_assessments', 0)}
Strongest subjects: {[s['subject'] + ' (' + str(s['average']) + '%)' for s in sw.get('strengths', [])]}
Weakest subjects: {[w['subject'] + ' (' + str(w['average']) + '%)' for w in sw.get('weaknesses', [])]}
Subject breakdown: {[(s['subject'] + ': ' + str(s['average']) + '%') for s in subjects]}
Predicted finals: {[(p['subject'] + ': ' + str(p['predicted_final']) + '%') for p in recent]}
"""

    system_prompt = f"""You are a helpful school assistant chatting with a parent about their child's academic progress.

CHILD DATA (use ONLY this data — do not invent any information):
{student_context}

Rules:
- Answer only questions about this student's academics, attendance, and schedule.
- If asked something you don't have data for, say \"I don't have that information, please contact the school directly.\"
- Be warm, clear, and reassuring.
- Keep responses concise (3-6 sentences max unless a detailed explanation is needed).
- Do not discuss other students."""

    messages = []
    for h in history[-6:]:
        if h.get('role') in ['user', 'assistant'] and 'content' in h:
            messages.append({'role': h['role'], 'content': h['content']})
    messages.append({'role': 'user', 'content': user_message})

    try:
        msg = client.messages.create(
            model='claude-opus-4-6',
            max_tokens=600,
            system=system_prompt,
            messages=messages
        )
        reply = msg.content[0].text.strip()
    except Exception as e:
        return Response(
            {'error': 'AI service unavailable', 'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    return Response({
        'reply': reply,
        'student_id': int(student_id),
        'student_name': student.get_full_name(),
    })
