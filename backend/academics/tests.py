# backend/academics/tests.py - COMPLETE TEST SUITE
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import date, time
from .models import Class, Subject, Timetable, Attendance

User = get_user_model()


class UserModelTestCase(TestCase):
    """Test User model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            first_name='John',
            last_name='Doe',
            role=User.STUDENT
        )
    
    def test_user_creation(self):
        """Test user is created correctly"""
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertEqual(self.user.role, User.STUDENT)
        self.assertTrue(self.user.check_password('testpass123'))
    
    def test_get_full_name(self):
        """Test get_full_name method"""
        self.assertEqual(self.user.get_full_name(), 'John Doe')
        
        # Test with no first/last name
        user2 = User.objects.create_user(
            email='test2@example.com',
            username='noname',
            password='pass123'
        )
        self.assertEqual(user2.get_full_name(), 'noname')
    
    def test_is_admin(self):
        """Test is_admin method"""
        admin = User.objects.create_user(
            email='admin@example.com',
            username='admin',
            password='pass123',
            role=User.ADMIN
        )
        self.assertTrue(admin.is_admin())
        self.assertFalse(self.user.is_admin())


class ClassModelTestCase(TestCase):
    """Test Class model"""
    
    def setUp(self):
        self.teacher = User.objects.create_user(
            email='teacher@example.com',
            username='teacher',
            password='pass123',
            role=User.TEACHER
        )
        self.student = User.objects.create_user(
            email='student@example.com',
            username='student',
            password='pass123',
            role=User.STUDENT
        )
        self.class_obj = Class.objects.create(
            name='Class 10A',
            teacher=self.teacher,
            description='Mathematics class'
        )
        self.class_obj.students.add(self.student)
    
    def test_class_creation(self):
        """Test class is created correctly"""
        self.assertEqual(self.class_obj.name, 'Class 10A')
        self.assertEqual(self.class_obj.teacher, self.teacher)
        self.assertEqual(self.class_obj.students.count(), 1)
    
    def test_class_str(self):
        """Test class string representation"""
        self.assertEqual(str(self.class_obj), 'Class 10A')


class AttendanceModelTestCase(TestCase):
    """Test Attendance model"""
    
    def setUp(self):
        self.teacher = User.objects.create_user(
            email='teacher@example.com',
            username='teacher',
            password='pass123',
            role=User.TEACHER
        )
        self.student = User.objects.create_user(
            email='student@example.com',
            username='student',
            password='pass123',
            role=User.STUDENT
        )
        self.class_obj = Class.objects.create(
            name='Class 10A',
            teacher=self.teacher
        )
        self.class_obj.students.add(self.student)
    
    def test_attendance_creation(self):
        """Test attendance record is created correctly"""
        attendance = Attendance.objects.create(
            student=self.student,
            class_assigned=self.class_obj,
            date=date.today(),
            status=Attendance.PRESENT,
            recorded_by=self.teacher,
            notes='On time'
        )
        self.assertEqual(attendance.student, self.student)
        self.assertEqual(attendance.status, Attendance.PRESENT)
        self.assertEqual(attendance.recorded_by, self.teacher)
    
    def test_attendance_unique_constraint(self):
        """Test unique constraint (student, class, date)"""
        Attendance.objects.create(
            student=self.student,
            class_assigned=self.class_obj,
            date=date.today(),
            status=Attendance.PRESENT,
            recorded_by=self.teacher
        )
        
        # Try to create duplicate
        with self.assertRaises(Exception):
            Attendance.objects.create(
                student=self.student,
                class_assigned=self.class_obj,
                date=date.today(),
                status=Attendance.ABSENT,
                recorded_by=self.teacher
            )


class AttendanceAPITestCase(APITestCase):
    """Test Attendance API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.admin = User.objects.create_user(
            email='admin@example.com',
            username='admin',
            password='admin123',
            role=User.ADMIN
        )
        self.teacher = User.objects.create_user(
            email='teacher@example.com',
            username='teacher',
            password='teacher123',
            role=User.TEACHER
        )
        self.student = User.objects.create_user(
            email='student@example.com',
            username='student',
            password='student123',
            role=User.STUDENT
        )
        
        # Create class
        self.class_obj = Class.objects.create(
            name='Class 10A',
            teacher=self.teacher
        )
        self.class_obj.students.add(self.student)
        
        # Create attendance record
        self.attendance = Attendance.objects.create(
            student=self.student,
            class_assigned=self.class_obj,
            date=date.today(),
            status=Attendance.PRESENT,
            recorded_by=self.teacher
        )
    
    def test_list_attendance_unauthorized(self):
        """Test listing attendance without authentication"""
        response = self.client.get('/api/academics/attendance/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_attendance_as_admin(self):
        """Test admin can list all attendance"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/academics/attendance/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_list_attendance_as_student(self):
        """Test student can only see their own attendance"""
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/academics/attendance/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check only returns student's records
        data = response.json()
        if isinstance(data, list):
            results = data
        else:
            results = data.get('results', [])
        
        for record in results:
            self.assertEqual(record['student'], self.student.id)
    
    def test_create_attendance_as_teacher(self):
        """Test teacher can create attendance"""
        self.client.force_authenticate(user=self.teacher)
        
        student2 = User.objects.create_user(
            email='student2@example.com',
            username='student2',
            password='pass123',
            role=User.STUDENT
        )
        self.class_obj.students.add(student2)
        
        data = {
            'student': student2.id,
            'class_assigned': self.class_obj.id,
            'date': date.today(),
            'status': 'present',
            'notes': 'Test attendance'
        }
        
        response = self.client.post('/api/academics/attendance/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_attendance_summary(self):
        """Test attendance summary endpoint"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/academics/attendance/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertIn('total_records', data)
        self.assertIn('present', data)
        self.assertIn('absent', data)
        self.assertIn('late', data)
    
    def test_bulk_create_attendance(self):
        """Test bulk create attendance"""
        self.client.force_authenticate(user=self.teacher)
        
        student2 = User.objects.create_user(
            email='student2@example.com',
            username='student2',
            password='pass123',
            role=User.STUDENT
        )
        self.class_obj.students.add(student2)
        
        data = {
            'records': [
                {
                    'student': student2.id,
                    'class_assigned': self.class_obj.id,
                    'date': '2024-01-15',
                    'status': 'present',
                    'notes': 'Bulk test 1'
                }
            ]
        }
        
        response = self.client.post('/api/academics/attendance/bulk-create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        result = response.json()
        self.assertTrue(result.get('success'))


# ============================================
# Run tests with:
# python manage.py test academics
# 
# Run with coverage:
# pip install coverage
# coverage run --source='.' manage.py test academics
# coverage report
# coverage html  # Creates htmlcov/index.html
# ============================================