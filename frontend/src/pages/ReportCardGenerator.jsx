// frontend/src/components/ReportCardGenerator.jsx
import React, { useState, useEffect, useContext } from 'react';
import { 
  Download, FileText, Users, Calendar, 
  AlertCircle, CheckCircle, Loader
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import reportService from '../api/reportService';
import api from '../api/axios';

export default function ReportCardGenerator() {
  const { user } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filters, setFilters] = useState({
    student_id: '',
    class_id: '',
    term: '',
    academic_year: new Date().getFullYear()
  });

  // Fetch reference data
  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (filters.class_id) {
      fetchStudents();
    }
  }, [filters.class_id]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/academics/classes/');
      const data = Array.isArray(response.data) 
        ? response.data 
        : response.data.results || [];
      setClasses(data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/academics/attendance/students-by-class/?class_id=${filters.class_id}`
      );
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateReport = async () => {
    if (!filters.student_id && !filters.class_id) {
      showMessage('error', 'Please select a student or class');
      return;
    }

    setGenerating(true);
    try {
      if (filters.student_id) {
        // Single report
        await reportService.generateReport({
          student_id: filters.student_id,
          class_id: filters.class_id || undefined,
          term: filters.term || undefined,
          academic_year: filters.academic_year || undefined
        });
        showMessage('success', 'Report card downloaded successfully!');
      } else {
        // Bulk reports
        const result = await reportService.generateBulkReports({
          class_id: filters.class_id,
          term: filters.term || undefined,
          academic_year: filters.academic_year || undefined
        });
        showMessage('success', `Generated ${result.count} report cards successfully!`);
      }
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setGenerating(false);
    }
  };

  // Permission check
  if (user?.role !== 'admin' && user?.role !== 'teacher') {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <p className="text-red-600 text-xl font-semibold">Access Denied</p>
        <p className="text-gray-600 mt-2">Only teachers and admins can generate report cards.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b">
        <div className="p-3 bg-blue-100 rounded-lg">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Generate Report Cards</h2>
          <p className="text-sm text-gray-600">Create PDF report cards for students</p>
        </div>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 animate-fadeIn ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Class Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              <Users className="inline w-4 h-4 mr-1" />
              Class
            </label>
            <select
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.class_id}
              onChange={(e) => handleFilterChange('class_id', e.target.value)}
            >
              <option value="">-- Select Class --</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.student_count || 0} students)
                </option>
              ))}
            </select>
          </div>

          {/* Student Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Student (Optional for Single Report)
            </label>
            <select
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.student_id}
              onChange={(e) => handleFilterChange('student_id', e.target.value)}
              disabled={!filters.class_id || loading}
            >
              <option value="">-- All Students (Bulk) --</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.full_name || student.username}
                </option>
              ))}
            </select>
          </div>

          {/* Term Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              <Calendar className="inline w-4 h-4 mr-1" />
              Term (Optional)
            </label>
            <select
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.term}
              onChange={(e) => handleFilterChange('term', e.target.value)}
            >
              <option value="">-- Select Term --</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
              <option value="Semester 1">Semester 1</option>
              <option value="Semester 2">Semester 2</option>
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Academic Year
            </label>
            <input
              type="text"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.academic_year}
              onChange={(e) => handleFilterChange('academic_year', e.target.value)}
              placeholder="e.g., 2024-2025"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleGenerateReport}
          disabled={generating || (!filters.student_id && !filters.class_id)}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all ${
            generating || (!filters.student_id && !filters.class_id)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
          }`}
        >
          {generating ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              {filters.student_id ? 'Generate Single Report' : 'Generate Bulk Reports'}
            </>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Tip:</strong> {' '}
          {filters.student_id 
            ? 'A single PDF report will be downloaded for the selected student.'
            : 'Select a class without choosing a student to generate reports for all students in that class.'
          }
        </p>
      </div>
    </div>
  );
}