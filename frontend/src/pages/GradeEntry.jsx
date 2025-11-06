// frontend/src/pages/GradeEntry.jsx
import React, { useState, useEffect, useContext } from 'react';
import { 
  Save, Users, CheckCircle, XCircle, AlertCircle, Download,
  RefreshCw, TrendingUp, Award, Calculator, Edit2, Trash2
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

export default function GradeEntry() {
  const { user } = useContext(AuthContext);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchAssessments();
  }, []);

  useEffect(() => {
    if (selectedAssessment) {
      fetchStudents();
    }
  }, [selectedAssessment]);

  useEffect(() => {
    if (grades.length > 0 && assessmentData) {
      calculateStatistics();
    }
  }, [grades, assessmentData]);

  const fetchAssessments = async () => {
    try {
      const res = await api.get('/academics/assessments/');
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setAssessments(data);
    } catch (error) {
      showMessage('error', 'Failed to load assessments');
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/academics/assessments/${selectedAssessment}/student-list/`);
      setAssessmentData(res.data.assessment);
      
      const initialGrades = res.data.students.map(student => ({
        student: student.id,
        student_name: student.full_name,
        assessment: selectedAssessment,
        marks_obtained: student.grade?.marks_obtained || '',
        is_absent: student.grade?.is_absent || false,
        remarks: student.grade?.remarks || '',
        id: student.grade?.id || null
      }));
      
      setGrades(initialGrades);
    } catch (error) {
      showMessage('error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = () => {
    const totalMarks = assessmentData.total_marks;
    const gradedStudents = grades.filter(g => !g.is_absent && g.marks_obtained !== '');
    const absentStudents = grades.filter(g => g.is_absent);
    const ungradedStudents = grades.filter(g => !g.is_absent && g.marks_obtained === '');
    
    if (gradedStudents.length === 0) {
      setStats(null);
      return;
    }
    
    const marks = gradedStudents.map(g => parseFloat(g.marks_obtained));
    const average = marks.reduce((a, b) => a + b, 0) / marks.length;
    const highest = Math.max(...marks);
    const lowest = Math.min(...marks);
    const passingMarks = totalMarks * 0.4;
    const passed = marks.filter(m => m >= passingMarks).length;
    const passPercentage = (passed / gradedStudents.length) * 100;
    
    setStats({
      total: grades.length,
      graded: gradedStudents.length,
      absent: absentStudents.length,
      ungraded: ungradedStudents.length,
      average: average.toFixed(2),
      highest: highest.toFixed(2),
      lowest: lowest.toFixed(2),
      passPercentage: passPercentage.toFixed(1)
    });
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleGradeChange = (index, field, value) => {
    setGrades(prev => prev.map((grade, i) => {
      if (i === index) {
        if (field === 'is_absent' && value) {
          return { ...grade, is_absent: true, marks_obtained: '' };
        }
        if (field === 'marks_obtained' && value !== '') {
          return { ...grade, marks_obtained: value, is_absent: false };
        }
        return { ...grade, [field]: value };
      }
      return grade;
    }));
  };

  const validateGrades = () => {
    const errors = [];
    grades.forEach((grade, index) => {
      if (!grade.is_absent && grade.marks_obtained !== '') {
        const marks = parseFloat(grade.marks_obtained);
        if (isNaN(marks)) {
          errors.push(`Row ${index + 1}: Invalid marks`);
        } else if (marks < 0) {
          errors.push(`Row ${index + 1}: Marks cannot be negative`);
        } else if (marks > assessmentData.total_marks) {
          errors.push(`Row ${index + 1}: Marks exceed maximum`);
        }
      }
    });
    return errors;
  };

  const handleSave = async () => {
    const errors = validateGrades();
    if (errors.length > 0) {
      showMessage('error', errors.join('. '));
      return;
    }
    
    setSaving(true);
    try {
      const toUpdate = grades.filter(g => g.id);
      const toCreate = grades.filter(g => !g.id && (g.marks_obtained !== '' || g.is_absent));
      
      if (toUpdate.length > 0) {
        await api.put('/academics/grades/bulk-update/', { grades: toUpdate });
      }
      
      if (toCreate.length > 0) {
        await api.post('/academics/grades/bulk-create/', { grades: toCreate });
      }
      
      showMessage('success', `Successfully saved ${toUpdate.length + toCreate.length} grades!`);
      await fetchStudents();
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  // Filter grades
  const filteredGrades = grades.filter(grade => {
    const matchesSearch = grade.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'graded' && (grade.marks_obtained !== '' || grade.is_absent)) ||
      (filter === 'ungraded' && grade.marks_obtained === '' && !grade.is_absent);
    return matchesSearch && matchesFilter;
  });

  const getGradeColor = (marks) => {
    if (!marks || marks === '') return 'text-gray-500';
    const percentage = (parseFloat(marks) / assessmentData.total_marks) * 100;
    if (percentage >= 80) return 'text-green-600 font-bold';
    if (percentage >= 60) return 'text-blue-600 font-semibold';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600 font-semibold';
  };

  // Only show to teachers and admins
  if (user?.role !== 'admin' && user?.role !== 'teacher') {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Rest of the component JSX - use the artifact above as reference */}
      {/* Copy the entire JSX from the artifact */}
    </div>
  );
}