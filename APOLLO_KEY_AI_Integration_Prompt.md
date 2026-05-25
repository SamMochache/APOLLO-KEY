# APOLLO-KEY AI Integration — Master Engineering Prompt

## Project Context

You are building AI-powered features for **APOLLO-KEY**, a school management system
serving admins, teachers, students, and parents in a Kenyan school context. The stack is:

- **Backend:** Django 5.2 + Django REST Framework, PostgreSQL, JWT auth (SimpleJWT + Djoser)
- **Frontend:** React 19 + Vite + Tailwind CSS
- **Containerized:** Docker + Docker Compose
- **AI SDK:** `anthropic` Python package (server-side), Anthropic API via `fetch` (client artifacts)
- **Model to use:** `claude-opus-4-6` for all AI calls unless otherwise noted

The codebase already has:
- `backend/academics/analytics.py` — `StudentPerformanceAnalytics` class with grade trends,
  subject comparison, attendance correlation, predictions, strengths/weaknesses, recommendations
- `backend/academics/report_generator.py` — `ReportCardGenerator` class producing PDF report cards
- `backend/academics/models.py` — `Grade`, `Assessment`, `Attendance`, `Class`, `Subject`,
  `Timetable`, `GradeConfig`, `ParentStudentRelationship`
- `backend/users/models.py` — custom `User` with roles: `admin`, `teacher`, `student`,
  `parent`, `staff`
- `backend/messaging/models.py` — `Message` with sender/recipient role validation

---

## Global Implementation Rules

Apply these rules to every endpoint you implement:

1. **File location:** All AI views go in `backend/academics/ai_views.py`. Register them in
   `backend/academics/urls.py` under the prefix `ai/`.

2. **Anthropic client setup:**
```python
# backend/academics/ai_views.py
import anthropic
from django.conf import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
```
   Add `ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')` to `backend/config/settings.py`
   and add `ANTHROPIC_API_KEY=your_key_here` to the root `.env` file.

3. **Authentication:** Every endpoint must use `@permission_classes([IsAuthenticated])`.
   Apply role guards where specified using `request.user.role`.

4. **Error handling:** Wrap all Anthropic calls in try/except. Return structured JSON errors:
```python
return Response(
    {'error': 'AI service unavailable', 'detail': str(e)},
    status=status.HTTP_503_SERVICE_UNAVAILABLE
)
```

5. **Caching:** Use Django's cache framework (`from django.core.cache import cache`) with a
   10-minute TTL for all GET endpoints. Cache key pattern:
   `ai_{endpoint_name}_{primary_id}_{hash_of_filters}`.

6. **Token limits:** Set `max_tokens=800` for short responses (narratives, messages, feedback),
   `max_tokens=1500` for longer ones (study plans, school insights).

7. **Prompt discipline:** Every system prompt must include:
   - School context (Kenyan school, APOLLO-KEY)
   - Output format constraints (plain text vs JSON, length limits)
   - Instruction to never fabricate data — only use what is passed in the prompt
   - Tone guidance per endpoint (professional/encouraging/analytical)

8. **URL registration pattern in `academics/urls.py`:**
```python
from .ai_views import (
    generate_report_narrative, detect_at_risk_students,
    draft_parent_message, resolve_timetable_conflict,
    generate_assessment_feedback, generate_study_plan,
    detect_attendance_anomalies, predict_grades_ai,
    school_insights, parent_chatbot
)

urlpatterns += [
    path('ai/generate-report-narrative/', generate_report_narrative),
    path('ai/at-risk-students/',          detect_at_risk_students),
    path('ai/draft-message/',             draft_parent_message),
    path('ai/resolve-timetable-conflict/',resolve_timetable_conflict),
    path('ai/generate-assessment-feedback/', generate_assessment_feedback),
    path('ai/study-plan/',                generate_study_plan),
    path('ai/attendance-anomalies/',      detect_attendance_anomalies),
    path('ai/predict-grades/',            predict_grades_ai),
    path('ai/school-insights/',           school_insights),
    path('ai/parent-chat/',               parent_chatbot),
]
```

---

## Endpoint 1 — AI Report Card Narrative

### What it does
Replaces the generic performance summary text in `ReportCardGenerator._build_performance_summary()`
and `_build_remarks()` with a Claude-generated, data-grounded paragraph per student.

### HTTP contract
```
POST /api/academics/ai/generate-report-narrative/
Authorization: Bearer <token>
Roles allowed: admin, teacher

Request body:
{
  "student_id": 12,
  "class_id": 3,          // optional
  "term": "Term 2",       // optional
  "academic_year": "2024-2025"  // optional
}

Response 200:
{
  "student_id": 12,
  "student_name": "John Mwangi",
  "narrative": "John has demonstrated commendable ...",
  "performance_category": "Good",
  "overall_average": 74.5,
  "generated_at": "2025-05-25T10:30:00Z"
}
```

### Implementation
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_report_narrative(request):
    if request.user.role not in ['admin', 'teacher']:
        return Response({'error': 'Forbidden'}, status=403)

    student_id    = request.data.get('student_id')
    class_id      = request.data.get('class_id')
    term          = request.data.get('term', '')
    academic_year = request.data.get('academic_year', '')

    if not student_id:
        return Response({'error': 'student_id is required'}, status=400)

    # --- pull data using existing analytics class ---
    from .analytics import StudentPerformanceAnalytics
    analytics   = StudentPerformanceAnalytics(student_id)
    metrics     = analytics._get_overall_metrics()
    sw          = analytics._analyze_strengths_weaknesses()
    attendance  = analytics._get_attendance_correlation()
    student     = analytics.student

    # --- cache check ---
    cache_key   = f"ai_narrative_{student_id}_{term}_{academic_year}"
    cached      = cache.get(cache_key)
    if cached:
        return Response(cached)

    # --- build prompt ---
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
Overall average: {metrics['average_score']}%
Performance category: {sw['overall']}
Highest score: {metrics['highest_score']}%
Lowest score: {metrics['lowest_score']}%
GPA: {metrics['gpa']} / 4.0
Attendance rate: {attendance['attendance_rate']}%
Strongest subjects: {[s['subject'] for s in sw['strengths']]}
Subjects needing improvement: {[w['subject'] for w in sw['weaknesses']]}
Total assessments completed: {metrics['total_assessments']}
"""

    try:
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=800,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        narrative = message.content[0].text.strip()
    except Exception as e:
        return Response({'error': 'AI service unavailable', 'detail': str(e)}, status=503)

    result = {
        'student_id':           student_id,
        'student_name':         student.get_full_name(),
        'narrative':            narrative,
        'performance_category': sw['overall'],
        'overall_average':      metrics['average_score'],
        'generated_at':         timezone.now().isoformat(),
    }
    cache.set(cache_key, result, 60 * 10)
    return Response(result)
```

### Frontend integration point
In `frontend/src/pages/GradeAnalytics.jsx`, after the student report section, add a
"Generate AI Narrative" button that POSTs to this endpoint and displays the returned
`narrative` field in a styled card.

---

## Endpoint 2 — At-Risk Student Detection

### What it does
Analyses all students in a class and returns a prioritised list of students who need
intervention, with Claude providing a plain-English reason for each flag.

### HTTP contract
```
GET /api/academics/ai/at-risk-students/?class_id=3&threshold=70
Authorization: Bearer <token>
Roles allowed: admin, teacher

Response 200:
{
  "class_id": 3,
  "class_name": "Grade 10A",
  "total_students": 28,
  "at_risk_count": 5,
  "generated_at": "...",
  "students": [
    {
      "student_id": 12,
      "student_name": "John Mwangi",
      "risk_level": "high",        // "high" | "medium" | "low"
      "risk_reason": "...",        // Claude-generated plain English
      "average_score": 38.5,
      "attendance_rate": 61.0,
      "trend": "declining"
    }
  ]
}
```

### Implementation
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detect_at_risk_students(request):
    if request.user.role not in ['admin', 'teacher']:
        return Response({'error': 'Forbidden'}, status=403)

    class_id  = request.query_params.get('class_id')
    threshold = float(request.query_params.get('threshold', 70))

    if not class_id:
        return Response({'error': 'class_id is required'}, status=400)

    cache_key = f"ai_at_risk_{class_id}_{threshold}"
    cached    = cache.get(cache_key)
    if cached:
        return Response(cached)

    from .models import Class
    from .analytics import StudentPerformanceAnalytics
    from django.db.models import Avg

    try:
        cls      = Class.objects.get(id=class_id)
        students = cls.students.filter(role='student')
    except Class.DoesNotExist:
        return Response({'error': 'Class not found'}, status=404)

    at_risk = []
    for student in students:
        analytics  = StudentPerformanceAnalytics(student.id)
        metrics    = analytics._get_overall_metrics()
        attendance = analytics._get_attendance_correlation()
        trends     = analytics._get_grade_trends()

        avg   = metrics.get('average_score', 0) or 0
        att   = attendance.get('attendance_rate', 0) or 0
        trend = trends.get('trend', 'stable')

        # Rule-based pre-filter before calling Claude
        if avg >= threshold and att >= 80 and trend != 'declining':
            continue

        # Determine risk level
        if avg < 40 or att < 60:
            risk_level = 'high'
        elif avg < 55 or att < 70 or trend == 'declining':
            risk_level = 'medium'
        else:
            risk_level = 'low'

        # Build Claude prompt for this student
        prompt = f"""A teacher needs a brief (2-3 sentence) plain-English explanation of why 
this student may need academic intervention. Use only the data below. Be specific.

Student: {student.get_full_name()}
Average score: {avg}% (threshold is {threshold}%)
Attendance rate: {att}%
Grade trend: {trend}
Risk level assessed: {risk_level}
Total assessments: {metrics.get('total_assessments', 0)}"""

        try:
            msg    = client.messages.create(
                model="claude-opus-4-6",
                max_tokens=200,
                system="You write brief academic risk summaries for teachers. Plain text only.",
                messages=[{"role": "user", "content": prompt}]
            )
            reason = msg.content[0].text.strip()
        except Exception:
            reason = f"Average score {avg}%, attendance {att}%, trend {trend}."

        at_risk.append({
            'student_id':      student.id,
            'student_name':    student.get_full_name(),
            'risk_level':      risk_level,
            'risk_reason':     reason,
            'average_score':   avg,
            'attendance_rate': att,
            'trend':           trend,
        })

    # Sort: high first
    order = {'high': 0, 'medium': 1, 'low': 2}
    at_risk.sort(key=lambda x: order[x['risk_level']])

    result = {
        'class_id':      int(class_id),
        'class_name':    cls.name,
        'total_students':students.count(),
        'at_risk_count': len(at_risk),
        'generated_at':  timezone.now().isoformat(),
        'students':      at_risk,
    }
    cache.set(cache_key, result, 60 * 10)
    return Response(result)
```

### Frontend integration point
Add an "AI Risk Report" button in `frontend/src/pages/AttendanceDashboard.jsx` and
`frontend/src/pages/GradeAnalytics.jsx`. Display results in a colour-coded card list
(red = high, amber = medium, yellow = low) with the `risk_reason` text visible.

---

## Endpoint 3 — Parent Message Drafter

### What it does
Generates a professional draft message from a teacher to a parent, grounded in the
child's actual data. The teacher reviews and sends it via the existing messaging system.

### HTTP contract
```
POST /api/academics/ai/draft-message/
Authorization: Bearer <token>
Roles allowed: admin, teacher

Request body:
{
  "teacher_id": 5,
  "parent_id": 8,
  "student_id": 12,
  "context_type": "low_attendance"
  // context_type options:
  //   "low_attendance" | "grade_drop" | "positive_update"
  //   "exam_reminder" | "behaviour_concern" | "general_update"
}

Response 200:
{
  "draft_subject": "Attendance Update — John Mwangi",
  "draft_body": "Dear Mrs. Mwangi, ...",
  "context_type": "low_attendance",
  "student_name": "John Mwangi",
  "data_used": { "attendance_rate": 61, "average_score": 54 }
}
```

### Implementation
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def draft_parent_message(request):
    if request.user.role not in ['admin', 'teacher']:
        return Response({'error': 'Forbidden'}, status=403)

    student_id   = request.data.get('student_id')
    parent_id    = request.data.get('parent_id')
    context_type = request.data.get('context_type', 'general_update')

    if not student_id or not parent_id:
        return Response({'error': 'student_id and parent_id are required'}, status=400)

    from .analytics import StudentPerformanceAnalytics
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        parent  = User.objects.get(id=parent_id, role='parent')
        student = User.objects.get(id=student_id, role='student')
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    analytics  = StudentPerformanceAnalytics(student_id)
    metrics    = analytics._get_overall_metrics()
    attendance = analytics._get_attendance_correlation()
    trends     = analytics._get_grade_trends()

    context_map = {
        'low_attendance':   'The student has concerning attendance. Express care, state the facts, ask for collaboration.',
        'grade_drop':       'The student\'s grades have declined recently. Be supportive, not accusatory. Suggest a meeting.',
        'positive_update':  'Share genuinely good news about the student\'s progress. Specific and warm.',
        'exam_reminder':    'Upcoming exams. Encourage preparation, share the student\'s current standing.',
        'behaviour_concern':'There is a behavioural concern. Professional, factual, solution-focused.',
        'general_update':   'Routine progress update. Balanced, informative.',
    }
    context_instruction = context_map.get(context_type, context_map['general_update'])

    teacher_name = request.user.get_full_name()
    parent_name  = parent.get_full_name()
    student_name = student.get_full_name()

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
Student first name: {student.first_name or student_name}
Overall average: {metrics['average_score']}%
Grade trend: {trends['trend']}
Attendance rate: {attendance['attendance_rate']}%
Total assessments completed: {metrics['total_assessments']}
Message purpose: {context_type.replace('_', ' ')}
"""

    try:
        msg  = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=800,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        body = msg.content[0].text.strip()
    except Exception as e:
        return Response({'error': 'AI service unavailable', 'detail': str(e)}, status=503)

    subject_map = {
        'low_attendance': f"Attendance Update — {student.first_name}",
        'grade_drop':     f"Academic Progress — {student.first_name}",
        'positive_update':f"Great News About {student.first_name}!",
        'exam_reminder':  f"Upcoming Exams — {student.first_name}",
        'general_update': f"Progress Update — {student.first_name}",
    }

    return Response({
        'draft_subject': subject_map.get(context_type, f"Update — {student.first_name}"),
        'draft_body':    body,
        'context_type':  context_type,
        'student_name':  student_name,
        'data_used': {
            'attendance_rate': attendance['attendance_rate'],
            'average_score':   metrics['average_score'],
            'trend':           trends['trend'],
        }
    })
```

### Frontend integration point
In `frontend/src/components/ComposeMessage.jsx`, add a "✨ AI Draft" button next to the
subject field. When clicked, opens a small modal to pick `context_type`, calls this
endpoint, then pre-fills `formData.subject` and `formData.body`. Teacher can edit before
sending through the existing `messagingService.sendMessage()` flow.

---

## Endpoint 4 — Timetable Conflict Resolver

### What it does
When scheduling conflicts are detected, Claude suggests the best alternative time slots
by reasoning over teacher availability and existing schedule density.

### HTTP contract
```
POST /api/academics/ai/resolve-timetable-conflict/
Authorization: Bearer <token>
Roles allowed: admin, teacher

Request body:
{
  "class_id": 3,
  "conflicting_entry": {
    "subject_id": 7,
    "teacher_id": 4,
    "day": "MON",
    "start_time": "09:00",
    "end_time": "10:00"
  }
}

Response 200:
{
  "conflict_summary": "...",
  "suggestions": [
    {
      "day": "TUE",
      "start_time": "10:00",
      "end_time": "11:00",
      "reason": "Teacher is free and class has no session at this time"
    }
  ],
  "generated_at": "..."
}
```

### Implementation
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_timetable_conflict(request):
    if request.user.role not in ['admin', 'teacher']:
        return Response({'error': 'Forbidden'}, status=403)

    class_id          = request.data.get('class_id')
    conflicting_entry = request.data.get('conflicting_entry', {})

    if not class_id or not conflicting_entry:
        return Response({'error': 'class_id and conflicting_entry are required'}, status=400)

    from .models import Timetable, Class, Subject
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        cls = Class.objects.get(id=class_id)
    except Class.DoesNotExist:
        return Response({'error': 'Class not found'}, status=404)

    # Gather existing schedule for context
    existing = Timetable.objects.filter(class_assigned=cls).values(
        'day', 'start_time', 'end_time', 'subject__name', 'teacher__username'
    )
    existing_list = list(existing)

    # Teacher's full schedule if teacher_id provided
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
  "conflict_summary": "one sentence describing the conflict",
  "suggestions": [
    {"day": "MON", "start_time": "08:00", "end_time": "09:00",
     "reason": "why this slot works"}
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
{existing_list}

Teacher's other commitments:
{teacher_schedule}

Available days: MON, TUE, WED, THU, FRI
Standard time slots: 08:00-09:00, 09:00-10:00, 10:00-11:00,
                     11:00-12:00, 13:00-14:00, 14:00-15:00, 15:00-16:00

Suggest 3 conflict-free alternatives for this entry.
"""

    try:
        msg      = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=600,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        import json
        result = json.loads(msg.content[0].text.strip())
        result['generated_at'] = timezone.now().isoformat()
        return Response(result)
    except (json.JSONDecodeError, Exception) as e:
        return Response({'error': 'AI service unavailable', 'detail': str(e)}, status=503)
```

### Frontend integration point
In `frontend/src/pages/TimetableBuilder.jsx`, when `handleSaveCell` receives a 400
conflict error, instead of just showing the error message, add a "Get AI Suggestions"
button. On click, POST to this endpoint and render the `suggestions` array as clickable
cards that auto-populate the cell form with the suggested day/time.

---

## Endpoint 5 — Assessment Feedback Generator

### What it does
Generates personalised written feedback for a student's grade on a specific assessment,
populating the currently-blank `Grade.remarks` field.

### HTTP contract
```
POST /api/academics/ai/generate-assessment-feedback/
Authorization: Bearer <token>
Roles allowed: admin, teacher

Request body:
{
  "assessment_id": 15,
  "student_id": 12
}

Response 200:
{
  "student_id": 12,
  "assessment_id": 15,
  "feedback": "...",
  "grade_letter": "B+",
  "percentage": 78.5
}
```

### Implementation
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_assessment_feedback(request):
    if request.user.role not in ['admin', 'teacher']:
        return Response({'error': 'Forbidden'}, status=403)

    assessment_id = request.data.get('assessment_id')
    student_id    = request.data.get('student_id')

    if not assessment_id or not student_id:
        return Response({'error': 'assessment_id and student_id are required'}, status=400)

    from .models import Grade, Assessment
    try:
        grade      = Grade.objects.select_related('assessment', 'student').get(
            assessment_id=assessment_id, student_id=student_id
        )
        assessment = grade.assessment
    except Grade.DoesNotExist:
        return Response({'error': 'Grade not found'}, status=404)

    cache_key = f"ai_feedback_{assessment_id}_{student_id}"
    cached    = cache.get(cache_key)
    if cached:
        return Response(cached)

    if grade.is_absent:
        return Response({'error': 'Student was absent — no feedback to generate'}, status=400)

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
        msg      = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=400,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        feedback = msg.content[0].text.strip()
    except Exception as e:
        return Response({'error': 'AI service unavailable', 'detail': str(e)}, status=503)

    result = {
        'student_id':    student_id,
        'assessment_id': assessment_id,
        'feedback':      feedback,
        'grade_letter':  grade.grade_letter,
        'percentage':    float(grade.percentage),
    }
    cache.set(cache_key, result, 60 * 10)
    return Response(result)
```

### Frontend integration point
In `frontend/src/pages/GradeEntry.jsx`, add a small "✨" icon button in the remarks
column of each graded row. On click, call this endpoint and pre-fill the remarks input
with the returned `feedback`. The teacher can edit before saving.

---

## Endpoint 6 — Personalised Study Plan

### What it does
Generates a structured weekly study plan for a student based on their current performance
data, weaknesses, and upcoming assessments.

### HTTP contract
```
GET /api/academics/ai/study-plan/?student_id=12
Authorization: Bearer <token>
Roles allowed: admin, teacher, student (own ID only for student role)

Response 200:
{
  "student_id": 12,
  "student_name": "John Mwangi",
  "study_plan": "...",    // plain text, structured weekly plan
  "focus_subjects": ["Mathematics", "Physics"],
  "overall_category": "satisfactory",
  "generated_at": "..."
}
```

### Implementation
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_study_plan(request):
    user       = request.user
    student_id = request.query_params.get('student_id')

    if user.role == 'student':
        student_id = user.id
    elif user.role in ['admin', 'teacher']:
        if not student_id:
            return Response({'error': 'student_id is required'}, status=400)
    else:
        return Response({'error': 'Forbidden'}, status=403)

    cache_key = f"ai_study_plan_{student_id}"
    cached    = cache.get(cache_key)
    if cached:
        return Response(cached)

    from .analytics import StudentPerformanceAnalytics
    analytics   = StudentPerformanceAnalytics(student_id)
    metrics     = analytics._get_overall_metrics()
    sw          = analytics._analyze_strengths_weaknesses()
    trends      = analytics._get_grade_trends()
    predictions = analytics._predict_final_grades()
    attendance  = analytics._get_attendance_correlation()
    student     = analytics.student

    focus_subjects = [w['subject'] for w in sw['weaknesses']]

    system_prompt = """You are an academic coach for a Kenyan secondary school student.
Create a practical 5-day study plan (Monday to Friday).
Format:
- One paragraph introduction with honest assessment of current standing.
- For each day: Day name, 2-3 specific study tasks (subject + topic/activity).
- One closing paragraph with motivation and a single key tip.
Rules:
- Use only the subjects and data provided.
- Be specific about what to study (e.g. "Revise quadratic equations" not "study maths").
- Allocate more time to weak subjects.
- Plain text. No markdown symbols or bullet points."""

    user_content = f"""
Student: {student.first_name or student.username}
Overall average: {metrics['average_score']}%
Performance category: {sw['overall']}
Grade trend: {trends['trend']}
Attendance rate: {attendance['attendance_rate']}%

Strong subjects (spend less time):
{[s['subject'] + ' (' + str(s['average']) + '%)' for s in sw['strengths']]}

Weak subjects (prioritise):
{[w['subject'] + ' (' + str(w['average']) + '%)' for w in sw['weaknesses']]}

Predicted final grades:
{[(p['subject'] + ': predicted ' + str(p['predicted_final']) + '%') for p in predictions]}
"""

    try:
        msg  = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1200,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        plan = msg.content[0].text.strip()
    except Exception as e:
        return Response({'error': 'AI service unavailable', 'detail': str(e)}, status=503)

    result = {
        'student_id':       int(student_id),
        'student_name':     student.get_full_name(),
        'study_plan':       plan,
        'focus_subjects':   focus_subjects,
        'overall_category': sw['overall'],
        'generated_at':     timezone.now().isoformat(),
    }
    cache.set(cache_key, result, 60 * 10)
    return Response(result)
```

### Frontend integration point
Add a "My Study Plan" card in `frontend/src/pages/Dashboard.jsx` for students, and in
`frontend/src/pages/StudentAnalytics.jsx` alongside the recommendations section. Display
the `study_plan` text in a readable card with `focus_subjects` shown as tags.

---

## Endpoint 7 — Attendance Anomaly Detection

### What it does
Detects non-obvious patterns in attendance data across a class — systematic absences,
group patterns, exam-period drops — that a simple rate calculation would miss.

### HTTP contract
```
GET /api/academics/ai/attendance-anomalies/?class_id=3&days=30
Authorization: Bearer <token>
Roles allowed: admin, teacher

Response 200:
{
  "class_id": 3,
  "class_name": "Grade 10A",
  "period_days": 30,
  "anomalies": [
    {
      "type": "day_pattern",
      "description": "...",
      "affected_students": ["John M.", "Mary K."],
      "severity": "medium"
    }
  ],
  "summary": "...",
  "generated_at": "..."
}
```

### Implementation
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detect_attendance_anomalies(request):
    if request.user.role not in ['admin', 'teacher']:
        return Response({'error': 'Forbidden'}, status=403)

    class_id = request.query_params.get('class_id')
    days     = int(request.query_params.get('days', 30))

    if not class_id:
        return Response({'error': 'class_id is required'}, status=400)

    cache_key = f"ai_anomalies_{class_id}_{days}"
    cached    = cache.get(cache_key)
    if cached:
        return Response(cached)

    from .models import Attendance, Class
    from django.utils import timezone as tz
    from datetime import timedelta
    import json

    try:
        cls = Class.objects.get(id=class_id)
    except Class.DoesNotExist:
        return Response({'error': 'Class not found'}, status=404)

    since     = tz.now().date() - timedelta(days=days)
    records   = Attendance.objects.filter(
        class_assigned=cls,
        date__gte=since
    ).select_related('student').values(
        'student__username', 'student__first_name', 'student__last_name',
        'date', 'status'
    )

    # Aggregate for prompt: student → {day_of_week: [statuses]}
    from collections import defaultdict
    day_map = defaultdict(lambda: defaultdict(list))
    for r in records:
        name    = (r['student__first_name'] or r['student__username'])[:15]
        weekday = r['date'].strftime('%A')
        day_map[name][weekday].append(r['status'])

    # Summarise for prompt (keep token count manageable)
    summary_data = {}
    for student, days_data in list(day_map.items())[:30]:  # max 30 students
        summary_data[student] = {
            day: f"{v.count('absent')}abs/{v.count('present')}pres/{v.count('late')}late"
            for day, v in days_data.items()
        }

    system_prompt = """You are an attendance analyst for a school.
Identify non-obvious patterns in the attendance data provided.
Respond ONLY with valid JSON in this exact format:
{
  "anomalies": [
    {
      "type": "day_pattern|group_pattern|exam_pattern|chronic_absence|other",
      "description": "plain English description of the pattern",
      "affected_students": ["name1", "name2"],
      "severity": "high|medium|low"
    }
  ],
  "summary": "2-3 sentence overall summary for the teacher"
}
Return an empty anomalies list if no patterns are found. No text outside JSON."""

    user_content = f"""
Class: {cls.name}
Period: last {days} days
Student attendance by day of week (format: absences/present/late per day):
{json.dumps(summary_data, indent=2)}
"""

    try:
        msg    = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        result = json.loads(msg.content[0].text.strip())
        result.update({
            'class_id':    int(class_id),
            'class_name':  cls.name,
            'period_days': days,
            'generated_at':timezone.now().isoformat(),
        })
    except (json.JSONDecodeError, Exception) as e:
        return Response({'error': 'AI service unavailable', 'detail': str(e)}, status=503)

    cache.set(cache_key, result, 60 * 10)
    return Response(result)
```

### Frontend integration point
Add an "AI Anomaly Scan" button in `frontend/src/pages/AttendanceRankings.jsx` and
`frontend/src/pages/AttendanceDashboard.jsx`. Render anomalies as alert cards with
severity colour-coding and the list of affected students.

---

## Endpoint 8 — AI Grade Predictor

### What it does
Replaces the simple weighted-average prediction in `StudentPerformanceAnalytics._predict_final_grades()`
with Claude reasoning over the full grade history context, producing predictions with
narrative confidence explanations.

### HTTP contract
```
GET /api/academics/ai/predict-grades/?student_id=12
Authorization: Bearer <token>
Roles allowed: admin, teacher, student (own only)

Response 200:
{
  "student_id": 12,
  "student_name": "John Mwangi",
  "predictions": [
    {
      "subject": "Mathematics",
      "current_average": 62.5,
      "predicted_final": 67.0,
      "predicted_grade": "C+",
      "confidence": "medium",
      "reasoning": "Upward trend in last 3 assessments suggests continued improvement..."
    }
  ],
  "overall_prediction": 68.2,
  "generated_at": "..."
}
```

### Implementation
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predict_grades_ai(request):
    user       = request.user
    student_id = request.query_params.get('student_id')

    if user.role == 'student':
        student_id = user.id
    elif user.role in ['admin', 'teacher']:
        if not student_id:
            return Response({'error': 'student_id is required'}, status=400)
    else:
        return Response({'error': 'Forbidden'}, status=403)

    cache_key = f"ai_predict_{student_id}"
    cached    = cache.get(cache_key)
    if cached:
        return Response(cached)

    from .analytics import StudentPerformanceAnalytics
    from .models import Grade
    import json

    analytics      = StudentPerformanceAnalytics(student_id)
    subject_data   = analytics._get_subject_comparison()
    trends         = analytics._get_grade_trends()
    attendance     = analytics._get_attendance_correlation()
    student        = analytics.student

    # Build per-subject grade sequence for Claude
    grade_sequences = {}
    grades = Grade.objects.filter(
        student_id=student_id, is_absent=False
    ).select_related('assessment__subject').order_by('assessment__date')

    for g in grades:
        subj = g.assessment.subject.name
        if subj not in grade_sequences:
            grade_sequences[subj] = []
        grade_sequences[subj].append(float(g.percentage))

    system_prompt = """You are an academic prediction engine for a school.
Predict final exam grades based on performance history.
Respond ONLY with valid JSON:
{
  "predictions": [
    {
      "subject": "subject name",
      "current_average": 0.0,
      "predicted_final": 0.0,
      "predicted_grade": "A",
      "confidence": "high|medium|low",
      "reasoning": "1-2 sentences explaining the prediction"
    }
  ],
  "overall_prediction": 0.0
}
No text outside JSON. Confidence: high if 5+ data points, medium if 3-4, low if 1-2."""

    user_content = f"""
Student: {student.get_full_name()}
Attendance rate: {attendance['attendance_rate']}%
Overall grade trend: {trends['trend']}

Grade sequences by subject (chronological percentages):
{json.dumps(grade_sequences, indent=2)}

Subject summary statistics:
{json.dumps([{
    'subject':     s['subject'],
    'average':     s['average'],
    'consistency': s['consistency'],
    'count':       s['count']
} for s in subject_data], indent=2)}
"""

    try:
        msg    = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1200,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        result = json.loads(msg.content[0].text.strip())
        result.update({
            'student_id':   int(student_id),
            'student_name': student.get_full_name(),
            'generated_at': timezone.now().isoformat(),
        })
    except (json.JSONDecodeError, Exception) as e:
        return Response({'error': 'AI service unavailable', 'detail': str(e)}, status=503)

    cache.set(cache_key, result, 60 * 10)
    return Response(result)
```

### Frontend integration point
Replace the existing "Predicted Final Grades" section in `frontend/src/pages/StudentAnalytics.jsx`
with data from this endpoint. Show the `reasoning` text as a tooltip or expandable section
under each subject prediction card.

---

## Endpoint 9 — School-Wide Insight Dashboard

### What it does
Admin-only endpoint. Claude synthesises patterns across all classes and surfaces
actionable insights — curriculum gaps, teacher performance patterns, seasonal trends —
that are invisible in per-student views.

### HTTP contract
```
GET /api/academics/ai/school-insights/
Authorization: Bearer <token>
Roles allowed: admin only

Response 200:
{
  "insights": [
    {
      "category": "curriculum|teacher|seasonal|attendance|grading",
      "title": "Mathematics performance 15% lower in Term 3",
      "detail": "...",
      "severity": "high|medium|low",
      "affected_classes": ["Grade 10A", "Grade 10B"]
    }
  ],
  "executive_summary": "...",
  "data_period": "last 90 days",
  "generated_at": "..."
}
```

### Implementation
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def school_insights(request):
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=403)

    cache_key = "ai_school_insights"
    cached    = cache.get(cache_key)
    if cached:
        return Response(cached)

    from .models import Grade, Attendance, Class, Subject
    from django.db.models import Avg, Count, Q
    from django.utils import timezone as tz
    from datetime import timedelta
    import json

    since = tz.now().date() - timedelta(days=90)

    # Aggregate class performance
    class_stats = []
    for cls in Class.objects.all()[:20]:  # cap for token management
        grades = Grade.objects.filter(
            assessment__class_assigned=cls,
            is_absent=False,
            assessment__date__gte=since
        )
        att = Attendance.objects.filter(class_assigned=cls, date__gte=since)
        if not grades.exists():
            continue

        avg = grades.aggregate(a=Avg('percentage'))['a']
        att_total   = att.count()
        att_present = att.filter(status='present').count()

        class_stats.append({
            'class':         cls.name,
            'average':       round(float(avg), 1),
            'student_count': cls.students.count(),
            'attendance':    round((att_present / att_total * 100), 1) if att_total else 0,
            'teacher':       cls.teacher.get_full_name() if cls.teacher else 'Unassigned',
        })

    # Subject averages across school
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
  "insights": [
    {
      "category": "curriculum|teacher|attendance|grading|infrastructure",
      "title": "short title (max 10 words)",
      "detail": "2-3 sentences with specific data points",
      "severity": "high|medium|low",
      "affected_classes": ["class names or 'school-wide'"]
    }
  ],
  "executive_summary": "3-4 sentence summary for the principal"
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
        msg    = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1500,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}]
        )
        result = json.loads(msg.content[0].text.strip())
        result.update({
            'data_period': 'last 90 days',
            'generated_at': timezone.now().isoformat(),
        })
    except (json.JSONDecodeError, Exception) as e:
        return Response({'error': 'AI service unavailable', 'detail': str(e)}, status=503)

    cache.set(cache_key, result, 60 * 30)  # 30 min — heavier computation
    return Response(result)
```

### Frontend integration point
Add an "AI Insights" panel in `frontend/src/pages/Dashboard.jsx` visible only when
`user.role === 'admin'`. Render `executive_summary` prominently, then each insight as
a colour-coded card sorted by severity. Add a "Refresh Insights" button that clears the
cache (`DELETE /api/academics/ai/school-insights/cache/` or just re-calls with a
`?refresh=true` param that skips cache).

---

## Endpoint 10 — Parent Scoped Chatbot

### What it does
A conversational endpoint for parents. Claude answers questions about their linked
children using only actual data from the database — attendance, grades, timetable.
No fabrication. Conversation history is passed by the client (stateless on server).

### HTTP contract
```
POST /api/academics/ai/parent-chat/
Authorization: Bearer <token>
Roles allowed: parent only

Request body:
{
  "student_id": 12,
  "message": "Why is John's maths grade dropping?",
  "conversation_history": [
    {"role": "user",      "content": "How is John doing overall?"},
    {"role": "assistant", "content": "John has an overall average of 67%..."}
  ]
}

Response 200:
{
  "reply": "...",
  "student_id": 12,
  "student_name": "John Mwangi"
}
```

### Implementation
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parent_chatbot(request):
    if request.user.role != 'parent':
        return Response({'error': 'Parent access only'}, status=403)

    student_id   = request.data.get('student_id')
    user_message = request.data.get('message', '').strip()
    history      = request.data.get('conversation_history', [])

    if not student_id or not user_message:
        return Response({'error': 'student_id and message are required'}, status=400)

    from .models import ParentStudentRelationship
    from .analytics import StudentPerformanceAnalytics
    from django.contrib.auth import get_user_model
    User = get_user_model()

    # Verify parent-student link
    try:
        relationship = ParentStudentRelationship.objects.get(
            parent=request.user, student_id=student_id
        )
        student = relationship.student
    except ParentStudentRelationship.DoesNotExist:
        return Response({'error': 'You are not linked to this student'}, status=403)

    # Gather student context
    analytics  = StudentPerformanceAnalytics(student_id)
    metrics    = analytics._get_overall_metrics()
    sw         = analytics._analyze_strengths_weaknesses()
    trends     = analytics._get_grade_trends()
    attendance = analytics._get_attendance_correlation()
    subjects   = analytics._get_subject_comparison()
    recent     = analytics._predict_final_grades()

    student_context = f"""
Student name: {student.get_full_name()}
Overall average: {metrics['average_score']}%
GPA: {metrics['gpa']}
Performance category: {sw['overall']}
Grade trend: {trends['trend']}
Attendance rate: {attendance['attendance_rate']}%
Total assessments: {metrics['total_assessments']}
Strongest subjects: {[s['subject'] + ' (' + str(s['average']) + '%)' for s in sw['strengths']]}
Weakest subjects:  {[w['subject'] + ' (' + str(w['average']) + '%)' for w in sw['weaknesses']]}
Subject breakdown: {[(s['subject'] + ': ' + str(s['average']) + '%') for s in subjects]}
Predicted finals:  {[(p['subject'] + ': ' + str(p['predicted_final']) + '%') for p in recent]}
"""

    system_prompt = f"""You are a helpful school assistant chatting with a parent
about their child's academic progress.

CHILD DATA (use ONLY this data — do not invent any information):
{student_context}

Rules:
- Answer only questions about this student's academics, attendance, and schedule.
- If asked something you don't have data for, say "I don't have that information,
  please contact the school directly."
- Be warm, clear, and reassuring.
- Keep responses concise (3-6 sentences max unless a detailed explanation is needed).
- Do not discuss other students."""

    # Build message list with history
    messages = []
    for h in history[-6:]:  # last 6 turns max for token control
        if h.get('role') in ['user', 'assistant']:
            messages.append({'role': h['role'], 'content': h['content']})
    messages.append({'role': 'user', 'content': user_message})

    try:
        msg   = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=600,
            system=system_prompt,
            messages=messages
        )
        reply = msg.content[0].text.strip()
    except Exception as e:
        return Response({'error': 'AI service unavailable', 'detail': str(e)}, status=503)

    return Response({
        'reply':        reply,
        'student_id':   int(student_id),
        'student_name': student.get_full_name(),
    })
```

### Frontend integration point
Add a floating chat bubble in `frontend/src/pages/ParentDashboard.jsx`, visible only
when `user.role === 'parent'`. Use `useState` to manage `conversationHistory` locally
(client owns the history as per the stateless design). Display messages in a slide-up
chat panel styled similarly to your existing dark theme CSS variables.

---

## Environment & Settings Checklist

Add to `backend/config/settings.py`:
```python
# AI Configuration
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
AI_CACHE_TIMEOUT  = int(os.getenv('AI_CACHE_TIMEOUT', 600))  # 10 min default
AI_MAX_TOKENS     = int(os.getenv('AI_MAX_TOKENS', 800))
```

Add to root `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
AI_CACHE_TIMEOUT=600
```

Add to `backend/requirements.txt`:
```
anthropic>=0.40.0
```

---

## Testing Each Endpoint

```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@school.com","password":"pass"}' | jq -r .access)

# 2. Test report narrative
curl -X POST http://localhost:8000/api/academics/ai/generate-report-narrative/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1, "term": "Term 2", "academic_year": "2024-2025"}'

# 3. Test at-risk detection
curl "http://localhost:8000/api/academics/ai/at-risk-students/?class_id=1&threshold=65" \
  -H "Authorization: Bearer $TOKEN"

# 4. Test parent chat (use parent token)
curl -X POST http://localhost:8000/api/academics/ai/parent-chat/ \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1, "message": "How is my child doing in maths?", "conversation_history": []}'
```

---

## Implementation Order (Recommended)

| Priority | Endpoint | Why first |
|---|---|---|
| 1 | Report Narrative (#1) | Direct user value, humans review output, zero risk |
| 2 | Parent Message Drafter (#3) | Saves teacher time every day, plugs into existing messaging |
| 3 | Assessment Feedback (#5) | Fills the currently-empty `remarks` field at scale |
| 4 | At-Risk Detection (#2) | High impact for student outcomes |
| 5 | Parent Chatbot (#10) | Parent engagement differentiator |
| 6 | Study Plan (#6) | Student-facing value |
| 7 | Grade Predictor (#8) | Replaces existing rule-based version |
| 8 | Anomaly Detection (#7) | Requires sufficient historical data |
| 9 | Conflict Resolver (#4) | Nice-to-have UX improvement |
| 10 | School Insights (#9) | Needs data volume to be meaningful |
