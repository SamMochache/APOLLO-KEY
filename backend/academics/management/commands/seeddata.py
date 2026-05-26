from datetime import date, time

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from academics.models import (
    Assessment,
    Attendance,
    Class,
    Grade,
    GradeConfig,
    ParentStudentRelationship,
    Subject,
    Timetable,
)
from messaging.models import Message


class Command(BaseCommand):
    help = "Seed the database with representative users, classes, subjects, attendance, grades, and messages."

    def handle(self, *args, **options):
        User = get_user_model()

        self.stdout.write(self.style.NOTICE("Starting seed data load..."))

        # Users
        users = {
            'admin': self._get_or_create_user(
                User,
                email='alice.admin@school.edu',
                username='aliceadmin',
                first_name='Alice',
                last_name='Admin',
                role=User.ADMIN,
                password='AdminPass123!'
            ),
            'teacher_john': self._get_or_create_user(
                User,
                email='john.doe@school.edu',
                username='johndoe',
                first_name='John',
                last_name='Doe',
                role=User.TEACHER,
                password='TeacherPass123!'
            ),
            'teacher_maria': self._get_or_create_user(
                User,
                email='maria.lee@school.edu',
                username='marialee',
                first_name='Maria',
                last_name='Lee',
                role=User.TEACHER,
                password='TeacherPass123!'
            ),
            'student_emily': self._get_or_create_user(
                User,
                email='emily.smith@student.school.edu',
                username='emilysmith',
                first_name='Emily',
                last_name='Smith',
                role=User.STUDENT,
                password='StudentPass123!'
            ),
            'student_david': self._get_or_create_user(
                User,
                email='david.chen@student.school.edu',
                username='davidchen',
                first_name='David',
                last_name='Chen',
                role=User.STUDENT,
                password='StudentPass123!'
            ),
            'parent_mark': self._get_or_create_user(
                User,
                email='mark.smith@parent.school.edu',
                username='marksmith',
                first_name='Mark',
                last_name='Smith',
                role=User.PARENT,
                password='ParentPass123!'
            ),
            'parent_laura': self._get_or_create_user(
                User,
                email='laura.chen@parent.school.edu',
                username='laurachen',
                first_name='Laura',
                last_name='Chen',
                role=User.PARENT,
                password='ParentPass123!'
            ),
            'staff_linda': self._get_or_create_user(
                User,
                email='linda.wong@school.edu',
                username='lindawong',
                first_name='Linda',
                last_name='Wong',
                role=User.STAFF,
                password='StaffPass123!'
            ),
        }

        self.stdout.write(self.style.SUCCESS("Created users."))

        # Classes
        grade_5a = Class.objects.get_or_create(
            name='Grade 5A',
            defaults={
                'teacher': users['teacher_john'],
                'description': 'Grade 5 class focused on foundational literacy and numeracy.',
            },
        )[0]
        grade_6a = Class.objects.get_or_create(
            name='Grade 6A',
            defaults={
                'teacher': users['teacher_maria'],
                'description': 'Grade 6 class with a strong STEM orientation.',
            },
        )[0]

        grade_5a.students.add(users['student_emily'])
        grade_6a.students.add(users['student_david'])

        self.stdout.write(self.style.SUCCESS("Created classes and added students."))

        # Subjects
        math = Subject.objects.get_or_create(
            name='Mathematics',
            code='MATH101',
            defaults={
                'teacher': users['teacher_john'],
                'description': 'Foundational mathematics including arithmetic and problem solving.',
            },
        )[0]

        science = Subject.objects.get_or_create(
            name='Science',
            code='SCI101',
            defaults={
                'teacher': users['teacher_maria'],
                'description': 'Life and physical sciences with experiments and inquiry-based learning.',
            },
        )[0]

        english = Subject.objects.get_or_create(
            name='English',
            code='ENG101',
            defaults={
                'teacher': users['teacher_john'],
                'description': 'Reading, writing, and comprehension skills for young learners.',
            },
        )[0]

        math.classes.set([grade_5a, grade_6a])
        science.classes.set([grade_5a, grade_6a])
        english.classes.set([grade_5a])

        self.stdout.write(self.style.SUCCESS("Created subjects and assigned them to classes."))

        # Timetable
        timetable_definitions = [
            {
                'class_assigned': grade_5a,
                'subject': math,
                'teacher': users['teacher_john'],
                'day': 'MON',
                'start_time': time(9, 0),
                'end_time': time(9, 45),
            },
            {
                'class_assigned': grade_5a,
                'subject': science,
                'teacher': users['teacher_maria'],
                'day': 'MON',
                'start_time': time(10, 0),
                'end_time': time(10, 45),
            },
            {
                'class_assigned': grade_5a,
                'subject': english,
                'teacher': users['teacher_john'],
                'day': 'TUE',
                'start_time': time(9, 0),
                'end_time': time(9, 45),
            },
            {
                'class_assigned': grade_6a,
                'subject': math,
                'teacher': users['teacher_john'],
                'day': 'MON',
                'start_time': time(10, 0),
                'end_time': time(10, 45),
            },
            {
                'class_assigned': grade_6a,
                'subject': science,
                'teacher': users['teacher_maria'],
                'day': 'MON',
                'start_time': time(11, 0),
                'end_time': time(11, 45),
            },
        ]

        for entry in timetable_definitions:
            Timetable.objects.filter(
                class_assigned=entry['class_assigned'],
                subject=entry['subject'],
                day=entry['day'],
            ).delete()
            Timetable.objects.create(
                class_assigned=entry['class_assigned'],
                subject=entry['subject'],
                teacher=entry['teacher'],
                day=entry['day'],
                start_time=entry['start_time'],
                end_time=entry['end_time'],
            )

        self.stdout.write(self.style.SUCCESS("Created timetable entries."))

        # Grade configuration
        grade_configs = [
            {'grade_letter': 'A+', 'min_percentage': 90.00, 'max_percentage': 100.00, 'gpa_value': 4.0, 'description': 'Excellent performance'},
            {'grade_letter': 'A', 'min_percentage': 80.00, 'max_percentage': 89.99, 'gpa_value': 3.5, 'description': 'Very good performance'},
            {'grade_letter': 'B+', 'min_percentage': 70.00, 'max_percentage': 79.99, 'gpa_value': 3.0, 'description': 'Good performance'},
            {'grade_letter': 'B', 'min_percentage': 60.00, 'max_percentage': 69.99, 'gpa_value': 2.5, 'description': 'Satisfactory performance'},
            {'grade_letter': 'C', 'min_percentage': 50.00, 'max_percentage': 59.99, 'gpa_value': 2.0, 'description': 'Needs improvement'},
            {'grade_letter': 'D', 'min_percentage': 40.00, 'max_percentage': 49.99, 'gpa_value': 1.5, 'description': 'Barely passing'},
            {'grade_letter': 'F', 'min_percentage': 0.00, 'max_percentage': 39.99, 'gpa_value': 0.0, 'description': 'Failing'},
        ]

        for config in grade_configs:
            GradeConfig.objects.update_or_create(
                grade_letter=config['grade_letter'],
                defaults={
                    'min_percentage': config['min_percentage'],
                    'max_percentage': config['max_percentage'],
                    'gpa_value': config['gpa_value'],
                    'description': config['description'],
                },
            )

        self.stdout.write(self.style.SUCCESS("Created grade configuration."))

        # Assessments
        assessments = [
            {
                'name': 'Math Quiz 1',
                'assessment_type': 'quiz',
                'subject': math,
                'class_assigned': grade_5a,
                'date': date(2026, 9, 5),
                'total_marks': 20,
                'weightage': 10,
                'passing_marks': 8,
                'created_by': users['teacher_john'],
            },
            {
                'name': 'Science Project',
                'assessment_type': 'project',
                'subject': science,
                'class_assigned': grade_5a,
                'date': date(2026, 9, 12),
                'total_marks': 50,
                'weightage': 20,
                'passing_marks': 25,
                'created_by': users['teacher_maria'],
            },
            {
                'name': 'Math Exam',
                'assessment_type': 'exam',
                'subject': math,
                'class_assigned': grade_6a,
                'date': date(2026, 9, 15),
                'total_marks': 100,
                'weightage': 40,
                'passing_marks': 40,
                'created_by': users['teacher_john'],
            },
        ]

        created_assessments = {}
        for data in assessments:
            assessment, _ = Assessment.objects.update_or_create(
                name=data['name'],
                class_assigned=data['class_assigned'],
                defaults={
                    'assessment_type': data['assessment_type'],
                    'subject': data['subject'],
                    'date': data['date'],
                    'total_marks': data['total_marks'],
                    'weightage': data['weightage'],
                    'passing_marks': data['passing_marks'],
                    'created_by': data['created_by'],
                },
            )
            created_assessments[data['name']] = assessment

        self.stdout.write(self.style.SUCCESS("Created assessments."))

        # Grades
        Grade.objects.update_or_create(
            assessment=created_assessments['Math Quiz 1'],
            student=users['student_emily'],
            defaults={
                'marks_obtained': 18,
                'is_absent': False,
                'remarks': 'Strong performance on basic arithmetic.',
                'graded_by': users['teacher_john'],
            },
        )

        Grade.objects.update_or_create(
            assessment=created_assessments['Science Project'],
            student=users['student_emily'],
            defaults={
                'marks_obtained': 42,
                'is_absent': False,
                'remarks': 'Good project presentation and concept.',
                'graded_by': users['teacher_maria'],
            },
        )

        Grade.objects.update_or_create(
            assessment=created_assessments['Math Exam'],
            student=users['student_david'],
            defaults={
                'marks_obtained': 84,
                'is_absent': False,
                'remarks': 'Well prepared for the exam.',
                'graded_by': users['teacher_john'],
            },
        )

        self.stdout.write(self.style.SUCCESS("Created grades."))

        # Attendance
        attendance_entries = [
            {
                'student': users['student_emily'],
                'class_assigned': grade_5a,
                'date': date(2026, 9, 5),
                'status': 'present',
                'recorded_by': users['teacher_john'],
                'notes': 'Arrived on time',
            },
            {
                'student': users['student_emily'],
                'class_assigned': grade_5a,
                'date': date(2026, 9, 6),
                'status': 'absent',
                'recorded_by': users['teacher_john'],
                'notes': 'Parent notified in advance',
            },
            {
                'student': users['student_david'],
                'class_assigned': grade_6a,
                'date': date(2026, 9, 5),
                'status': 'present',
                'recorded_by': users['teacher_maria'],
                'notes': 'Participated actively in science.',
            },
        ]

        for entry in attendance_entries:
            Attendance.objects.update_or_create(
                student=entry['student'],
                class_assigned=entry['class_assigned'],
                date=entry['date'],
                defaults={
                    'status': entry['status'],
                    'recorded_by': entry['recorded_by'],
                    'notes': entry['notes'],
                },
            )

        self.stdout.write(self.style.SUCCESS("Created attendance records."))

        # Parent/Student relationships
        ParentStudentRelationship.objects.update_or_create(
            parent=users['parent_mark'],
            student=users['student_emily'],
            defaults={
                'relationship_type': 'father',
                'is_primary_contact': True,
                'can_view_grades': True,
                'can_view_attendance': True,
                'can_view_timetable': True,
                'can_receive_notifications': True,
            },
        )

        ParentStudentRelationship.objects.update_or_create(
            parent=users['parent_laura'],
            student=users['student_david'],
            defaults={
                'relationship_type': 'mother',
                'is_primary_contact': True,
                'can_view_grades': True,
                'can_view_attendance': True,
                'can_view_timetable': True,
                'can_receive_notifications': True,
            },
        )

        self.stdout.write(self.style.SUCCESS("Created parent-student relationships."))

        # Messages
        messages = [
            {
                'sender': users['teacher_john'],
                'recipient': users['parent_mark'],
                'related_student': users['student_emily'],
                'subject': 'Upcoming Math Quiz',
                'body': 'Hello Mark, just a reminder that Emily has a Math Quiz on 5 September. Please ensure she reviews the multiplication and division topics.',
                'priority': 'normal',
            },
            {
                'sender': users['parent_laura'],
                'recipient': users['teacher_maria'],
                'related_student': users['student_david'],
                'subject': 'Question about Science Project',
                'body': 'Hi Maria, could you please confirm the expectations for David’s science project due next week?',
                'priority': 'high',
            },
            {
                'sender': users['student_emily'],
                'recipient': users['teacher_john'],
                'related_student': users['student_emily'],
                'subject': 'Homework clarification',
                'body': 'Hi Mr. Doe, I wanted to ask if extra credit is available for the quiz revision exercise.',
                'priority': 'normal',
            },
        ]

        for message_data in messages:
            Message.objects.update_or_create(
                sender=message_data['sender'],
                recipient=message_data['recipient'],
                subject=message_data['subject'],
                defaults={
                    'body': message_data['body'],
                    'priority': message_data['priority'],
                    'related_student': message_data['related_student'],
                },
            )

        self.stdout.write(self.style.SUCCESS("Created sample messages."))

        self.stdout.write(self.style.SUCCESS("Seed data load complete."))

    def _get_or_create_user(self, User, email, username, first_name, last_name, role, password):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'first_name': first_name,
                'last_name': last_name,
                'role': role,
            },
        )

        if created:
            user.set_password(password)
            if role == User.ADMIN:
                user.is_staff = True
                user.is_superuser = True
            user.save()

        return user
