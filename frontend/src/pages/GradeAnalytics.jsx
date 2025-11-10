import React, { useState, useEffect, useContext } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Award, AlertCircle, Download, Filter,
  Users, BookOpen, Target, Calendar
} from 'lucide-react';

// Mock API - Replace with actual API calls
const mockApi = {
  getGradeStatistics: async (filters) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      overview: {
        totalAssessments: 12,
        totalStudents: 45,
        averageScore: 78.5,
        passRate: 85.5
      },
      gradeDistribution: [
        { grade: 'A', count: 12, percentage: 26.7 },
        { grade: 'B', count: 18, percentage: 40.0 },
        { grade: 'C', count: 10, percentage: 22.2 },
        { grade: 'D', count: 3, percentage: 6.7 },
        { grade: 'F', count: 2, percentage: 4.4 }
      ],
      assessmentPerformance: [
        { name: 'Quiz 1', average: 82, type: 'quiz' },
        { name: 'Midterm', average: 75, type: 'exam' },
        { name: 'Project 1', average: 88, type: 'project' },
        { name: 'Quiz 2', average: 79, type: 'quiz' },
        { name: 'Assignment 1', average: 85, type: 'assignment' },
        { name: 'Final', average: 72, type: 'exam' }
      ],
      topPerformers: [
        { id: 1, name: 'Alice Johnson', average: 95.2, grade: 'A' },
        { id: 2, name: 'Bob Smith', average: 92.8, grade: 'A' },
        { id: 3, name: 'Carol Davis', average: 90.5, grade: 'A' },
        { id: 4, name: 'David Lee', average: 88.3, grade: 'B' },
        { id: 5, name: 'Emma Wilson', average: 87.1, grade: 'B' }
      ],
      needsAttention: [
        { id: 6, name: 'Frank Brown', average: 58.2, grade: 'F', trend: 'declining' },
        { id: 7, name: 'Grace Taylor', average: 62.5, grade: 'D', trend: 'stable' },
        { id: 8, name: 'Henry Miller', average: 65.8, grade: 'D', trend: 'improving' }
      ],
      subjectComparison: [
        { subject: 'Mathematics', average: 78.5, count: 45 },
        { subject: 'Physics', average: 75.2, count: 42 },
        { subject: 'Chemistry', average: 81.3, count: 40 },
        { subject: 'Biology', average: 79.8, count: 43 }
      ]
    };
  }
};

export default function GradeAnalyticsDashboard() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    subject: '',
    class: '',
    startDate: '',
    endDate: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const data = await mockApi.getGradeStatistics(filters);
      setStatistics(data);
    } catch (error) {
      showMessage('error', 'Failed to load statistics');
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

  const exportReport = () => {
    showMessage('success', 'Report exported successfully!');
  };

  const COLORS = {
    A: '#10b981',
    B: '#3b82f6',
    C: '#f59e0b',
    D: '#f97316',
    F: '#ef4444'
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!statistics) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <TrendingUp className="text-blue-600 w-8 h-8" />
          Grade Analytics Dashboard
        </h1>
        <p className="text-gray-600">Comprehensive performance insights and trends</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <AlertCircle className="w-5 h-5" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <select
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.subject}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
            >
              <option value="">All Subjects</option>
              <option value="1">Mathematics</option>
              <option value="2">Physics</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Class</label>
            <select
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.class}
              onChange={(e) => handleFilterChange('class', e.target.value)}
            >
              <option value="">All Classes</option>
              <option value="1">Grade 10A</option>
              <option value="2">Grade 10B</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>

          <button
            onClick={fetchStatistics}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Assessments</p>
              <p className="text-3xl font-bold text-blue-600">{statistics.overview.totalAssessments}</p>
            </div>
            <BookOpen className="w-12 h-12 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Students</p>
              <p className="text-3xl font-bold text-green-600">{statistics.overview.totalStudents}</p>
            </div>
            <Users className="w-12 h-12 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Score</p>
              <p className="text-3xl font-bold text-purple-600">{statistics.overview.averageScore}%</p>
            </div>
            <Target className="w-12 h-12 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pass Rate</p>
              <p className="text-3xl font-bold text-yellow-600">{statistics.overview.passRate}%</p>
            </div>
            <Award className="w-12 h-12 text-yellow-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Grade Distribution */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Grade Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statistics.gradeDistribution}
                dataKey="count"
                nameKey="grade"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({grade, percentage}) => `${grade}: ${percentage}%`}
              >
                {statistics.gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.grade]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Assessment Performance */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Assessment Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statistics.assessmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="average" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Students Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Award className="text-green-600" />
            Top Performers
          </h2>
          <div className="space-y-3">
            {statistics.topPerformers.map((student, index) => (
              <div key={student.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-green-600">#{index + 1}</span>
                  <div>
                    <p className="font-semibold">{student.name}</p>
                    <p className="text-sm text-gray-600">Grade: {student.grade}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600">{student.average}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertCircle className="text-red-600" />
            Needs Attention
          </h2>
          <div className="space-y-3">
            {statistics.needsAttention.map((student) => (
              <div key={student.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getTrendIcon(student.trend)}</span>
                  <div>
                    <p className="font-semibold">{student.name}</p>
                    <p className="text-sm text-gray-600">Grade: {student.grade} • {student.trend}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-red-600">{student.average}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subject Comparison */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Subject Comparison</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={statistics.subjectComparison}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="subject" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="average" fill="#8b5cf6" name="Average Score" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Export Button */}
      <div className="bg-white rounded-xl shadow-md p-4 flex justify-end">
        <button
          onClick={exportReport}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-5 h-5" />
          Export Full Report
        </button>
      </div>
    </div>
  );
}