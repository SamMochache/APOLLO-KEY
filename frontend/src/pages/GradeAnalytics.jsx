// frontend/src/pages/GradeAnalytics.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Award, AlertCircle, Download, Filter,
  Users, BookOpen, Target, RefreshCw
} from 'lucide-react';
import gradeAnalyticsService from '../api/gradeService';
import ReportCardGenerator from '../pages/ReportCardGenerator';

export default function GradeAnalyticsDashboard() {
  const [statistics, setStatistics] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    subject: '',
    class: '',
    startDate: '',
    endDate: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch subjects and classes on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [subs, cls] = await Promise.all([
          gradeAnalyticsService.getSubjects(),
          gradeAnalyticsService.getClasses()
        ]);
        setSubjects(subs);
        setClasses(cls);
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    };
    fetchInitialData();
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const data = await gradeAnalyticsService.getStatistics(filters);
      setStatistics(data);
      
      if (data.overview.totalAssessments === 0) {
        showMessage('info', 'No grade data available for the selected filters');
      }
    } catch (error) {
      console.error(error);
      showMessage('error', error.message || 'Failed to load statistics');
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

  const handleApplyFilters = () => {
    fetchStatistics();
  };

  const handleClearFilters = () => {
    setFilters({
      subject: '',
      class: '',
      startDate: '',
      endDate: ''
    });
    // Fetch with cleared filters
    gradeAnalyticsService.getStatistics({}).then(data => {
      setStatistics(data);
    });
  };

  const exportReport = async () => {
    try {
      await gradeAnalyticsService.exportStatistics(filters);
      showMessage('success', 'Report exported successfully!');
    } catch (error) {
      showMessage('error', 'Failed to export report');
    }
  };

  const COLORS = {
    'A+': '#10b981',
    'A': '#10b981',
    'A-': '#3b82f6',
    'B+': '#3b82f6',
    'B': '#3b82f6',
    'B-': '#f59e0b',
    'C+': '#f59e0b',
    'C': '#f59e0b',
    'C-': '#f97316',
    'D': '#f97316',
    'F': '#ef4444'
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
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 animate-fadeIn ${
          message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 
          message.type === 'info' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
          'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <AlertCircle className="w-5 h-5" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <select
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.subject}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
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
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
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
            onClick={handleApplyFilters}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 justify-center"
          >
            <Filter className="w-4 h-4" />
            Apply
          </button>

          <button
            onClick={handleClearFilters}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2 justify-center"
          >
            <RefreshCw className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {!statistics ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No grade data available</p>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          {statistics.overview && (
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
          )}

          {/* Grade Distribution & Assessment Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Grade Distribution</h2>
              {statistics.gradeDistribution && statistics.gradeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statistics.gradeDistribution}
                      dataKey="count"
                      nameKey="grade"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                    >
                      {statistics.gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.grade] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">No grade distribution data</div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Assessment Performance</h2>
              {statistics.assessmentPerformance && statistics.assessmentPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statistics.assessmentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">No assessment data</div>
              )}
            </div>
          </div>

          {/* Top & At-Risk Students */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Award className="text-green-600" />
                Top Performers
              </h2>
              {statistics.topPerformers && statistics.topPerformers.length > 0 ? (
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
              ) : (
                <div className="text-center py-8 text-gray-500">No data available</div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="text-red-600" />
                Needs Attention
              </h2>
              {statistics.needsAttention && statistics.needsAttention.length > 0 ? (
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
              ) : (
                <div className="text-center py-8 text-gray-500">No data available</div>
              )}
            </div>
          </div>

          {/* Subject Comparison */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Subject Comparison</h2>
            {statistics.subjectComparison && statistics.subjectComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statistics.subjectComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average" fill="#8b5cf6" name="Average Score" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">No subject comparison data</div>
            )}
          </div>

          {/* Export Button */}
          <div className="bg-white rounded-xl shadow-md p-4 flex justify-end">
            {/* Report Card Generator */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <ReportCardGenerator />
            </div>
          </div>
        </>
      )}
    </div>
  );
}