// frontend/src/pages/GradeEntry.jsx - COMPLETE VERSION
import React, { useState, useEffect, useContext } from 'react';
import { 
  Save, Users, CheckCircle, XCircle, AlertCircle, Download,
  RefreshCw, TrendingUp, Award, Calculator, Edit2, Trash2,
  FileSpreadsheet
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
    const passingMarks = totalMarks * 0.4; // 40% passing
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
          errors.push(`Row ${index + 1}: Marks exceed maximum (${assessmentData.total_marks})`);
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

  const exportToCSV = () => {
    if (!assessmentData || grades.length === 0) return;

    const headers = ["Student Name", "Marks Obtained", "Total Marks", "Percentage", "Status", "Remarks"];
    const rows = grades.map(g => {
      const percentage = g.marks_obtained && !g.is_absent 
        ? ((parseFloat(g.marks_obtained) / assessmentData.total_marks) * 100).toFixed(2)
        : 'N/A';
      
      return [
        g.student_name,
        g.is_absent ? 'Absent' : g.marks_obtained || 'Not graded',
        assessmentData.total_marks,
        percentage,
        g.is_absent ? 'Absent' : (g.marks_obtained ? 'Graded' : 'Pending'),
        g.remarks || ''
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grades_${assessmentData.name}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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

  // Permission check
  if (user?.role !== 'admin' && user?.role !== 'teacher') {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <p className="text-red-600 text-xl font-semibold">Access Denied</p>
        <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Edit2 className="text-blue-600 w-8 h-8" />
          Grade Entry
        </h1>
        <p className="text-gray-600">Enter and manage student grades for assessments</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 animate-fadeIn ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Assessment Selector */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <label className="block text-sm font-semibold mb-2">Select Assessment</label>
        <select
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          value={selectedAssessment || ''}
          onChange={(e) => setSelectedAssessment(e.target.value)}
        >
          <option value="">-- Choose an assessment --</option>
          {assessments.map(assessment => (
            <option key={assessment.id} value={assessment.id}>
              {assessment.name} - {assessment.subject_name} ({assessment.class_name}) - {assessment.date}
            </option>
          ))}
        </select>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 mb-1">Average Score</p>
            <p className="text-3xl font-bold text-blue-600">{stats.average}</p>
            <p className="text-xs text-gray-500 mt-1">out of {assessmentData.total_marks}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 mb-1">Pass Rate</p>
            <p className="text-3xl font-bold text-green-600">{stats.passPercentage}%</p>
            <p className="text-xs text-gray-500 mt-1">Students passing</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600 mb-1">Graded</p>
            <p className="text-3xl font-bold text-purple-600">{stats.graded}/{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.absent} absent, {stats.ungraded} pending</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600 mb-1">Range</p>
            <p className="text-xl font-bold text-yellow-600">{stats.lowest} - {stats.highest}</p>
            <p className="text-xs text-gray-500 mt-1">Lowest to Highest</p>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      {selectedAssessment && (
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              All ({grades.length})
            </button>
            <button
              onClick={() => setFilter('graded')}
              className={`px-4 py-2 rounded-lg ${filter === 'graded' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            >
              Graded
            </button>
            <button
              onClick={() => setFilter('ungraded')}
              className={`px-4 py-2 rounded-lg ${filter === 'ungraded' ? 'bg-yellow-600 text-white' : 'bg-gray-200'}`}
            >
              Pending
            </button>
          </div>

          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-64 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      )}

      {/* Grades Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Loading students...</p>
        </div>
      ) : !selectedAssessment ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500">
          <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Please select an assessment to start grading</p>
        </div>
      ) : filteredGrades.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500">
          <p>No students found matching your criteria</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Marks Obtained</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Absent</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredGrades.map((grade, index) => {
                  const percentage = grade.marks_obtained && !grade.is_absent
                    ? ((parseFloat(grade.marks_obtained) / assessmentData.total_marks) * 100).toFixed(2)
                    : null;

                  return (
                    <tr key={grade.student} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold mr-3">
                            {grade.student_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{grade.student_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={grade.marks_obtained}
                          onChange={(e) => handleGradeChange(index, 'marks_obtained', e.target.value)}
                          disabled={grade.is_absent}
                          min="0"
                          max={assessmentData.total_marks}
                          step="0.01"
                          placeholder="Enter marks"
                          className="w-24 p-2 border rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                        <span className="ml-2 text-sm text-gray-500">/ {assessmentData.total_marks}</span>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={grade.is_absent}
                          onChange={(e) => handleGradeChange(index, 'is_absent', e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={grade.remarks}
                          onChange={(e) => handleGradeChange(index, 'remarks', e.target.value)}
                          placeholder="Optional remarks"
                          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {grade.is_absent ? (
                          <span className="text-red-600 font-semibold">Absent</span>
                        ) : percentage ? (
                          <span className={getGradeColor(grade.marks_obtained)}>
                            {percentage}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Save Button */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all ${
                saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Saving Grades...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save All Grades
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}