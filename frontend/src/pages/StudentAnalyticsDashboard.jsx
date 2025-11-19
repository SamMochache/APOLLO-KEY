import React, { useState, useEffect, useContext } from 'react';
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Award, AlertCircle, Download, RefreshCw,
  Target, BookOpen, Calendar, Lightbulb, CheckCircle, Users
} from 'lucide-react';
import analyticsService from '../api/analyticsService';
import { AuthContext } from '../context/AuthContext';

export default function StudentAnalyticsDashboard() {
  const { user } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    initializeAnalytics();
  }, [user]);

  useEffect(() => {
    if (selectedStudent) {
      fetchAnalytics();
    }
  }, [selectedStudent]);

  const initializeAnalytics = async () => {
    // For students, show their own analytics
    if (user?.role === 'student') {
      setSelectedStudent(user.id);
    }
    
    // For teachers/admins, fetch student list
    if (user?.role === 'teacher' || user?.role === 'admin') {
      await fetchStudentList();
    }
    
    // For parents, fetch children
    if (user?.role === 'parent') {
      await fetchParentChildren();
    }
  };

  const fetchStudentList = async () => {
    try {
      // Use the service method instead of raw fetch
      const studentList = await analyticsService.fetchStudentList();
      setStudents(studentList);
      
      if (studentList.length > 0) {
        setSelectedStudent(studentList[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
      // The service will handle fallback to mock data
    }
  };

  const fetchParentChildren = async () => {
    try {
      // Use the service method instead of raw fetch
      const children = await analyticsService.fetchParentChildren();
      setStudents(children);
      
      if (children.length > 0) {
        setSelectedStudent(children[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
      // The service will handle fallback to mock data
    }
  };

  const fetchAnalytics = async (refresh = false) => {
    if (!selectedStudent) return;
    
    setLoading(true);
    if (refresh) setRefreshing(true);
    
    try {
      const data = await analyticsService.getStudentPerformance(selectedStudent, refresh);
      setAnalytics(data);
      showMessage('success', 'Analytics loaded successfully');
    } catch (error) {
      showMessage('error', error.message);
      
      // Add this fallback for demo data
      if (error.message.includes('Failed to load student analytics')) {
        loadDemoAnalytics();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Add this helper method for demo data fallback
  const loadDemoAnalytics = () => {
    const demoData = {
      student_id: selectedStudent,
      student_name: students.find(s => s.id === selectedStudent)?.name || 'Demo Student',
      grade_trends: [
        { month: '2024-01', average: 75, highest: 85, lowest: 65, assessments_count: 3 },
        { month: '2024-02', average: 78, highest: 88, lowest: 68, assessments_count: 4 },
        { month: '2024-03', average: 82, highest: 92, lowest: 72, assessments_count: 5 },
        { month: '2024-04', average: 80, highest: 90, lowest: 70, assessments_count: 4 },
        { month: '2024-05', average: 85, highest: 95, lowest: 75, assessments_count: 6 },
        { month: '2024-06', average: 88, highest: 98, lowest: 78, assessments_count: 5 }
      ],
      subject_performance: [
        { subject: 'Mathematics', average: 92, highest: 98, lowest: 85, consistency: 88, assessments_count: 8 },
        { subject: 'Science', average: 88, highest: 95, lowest: 80, consistency: 85, assessments_count: 7 },
        { subject: 'English', average: 85, highest: 92, lowest: 78, consistency: 82, assessments_count: 6 },
        { subject: 'History', average: 78, highest: 88, lowest: 68, consistency: 75, assessments_count: 5 },
        { subject: 'Geography', average: 82, highest: 90, lowest: 74, consistency: 80, assessments_count: 6 }
      ],
      attendance_impact: {
        total_days: 120,
        present_days: 108,
        late_days: 5,
        absent_days: 7,
        attendance_rate: 94.17,
        average_grade: 85.0,
        correlation_strength: 'strong_positive',
        impact_description: 'Excellent attendance is positively impacting academic performance'
      },
      strengths_weaknesses: {
        strengths: [
          { subject: 'Mathematics', average: 92, reason: 'Consistently high performance' },
          { subject: 'Science', average: 88, reason: 'Strong conceptual understanding' }
        ],
        weaknesses: [
          { subject: 'History', average: 78, reason: 'Below average performance' },
          { subject: 'Geography', average: 82, reason: 'Room for improvement' }
        ],
        improvement_areas: [
          { subject: 'History', current_average: 78, target_average: 85, improvement_needed: 7 },
          { subject: 'Geography', current_average: 82, target_average: 85, improvement_needed: 3 }
        ]
      },
      predictions: {
        predicted_final_average: 90.5,
        current_average: 85.0,
        trend_direction: 'improving',
        confidence: 'high',
        subject_predictions: [
          { subject: 'Mathematics', current: 92, predicted: 94 },
          { subject: 'Science', current: 88, predicted: 90 },
          { subject: 'English', current: 85, predicted: 87 }
        ]
      },
      recommendations: [
        {
          category: 'strength',
          priority: 'positive',
          title: 'Keep Up the Great Work!',
          description: "You're excelling in Mathematics. Consider helping peers or taking advanced topics."
        },
        {
          category: 'academic',
          priority: 'medium',
          title: 'Focus on History',
          description: 'Current average is 78.0%. Consider extra practice or tutoring in this subject.'
        },
        {
          category: 'consistency',
          priority: 'low',
          title: 'Improve Consistency in Geography',
          description: 'Performance varies significantly. Regular study habits can help.'
        }
      ],
      overall_stats: {
        total_assessments: 32,
        overall_average: 85.0,
        gpa: 3.5,
        highest_score: 98.0,
        lowest_score: 65.0
      }
    };
    
    setAnalytics(demoData);
    showMessage('info', 'Loaded demo analytics data');
  };

  const handleRefresh = () => {
    analyticsService.clearCache();
    fetchAnalytics(true);
  };

  const handleExport = async () => {
    try {
      const filename = `analytics_${analytics.student_name}_${new Date().toISOString().split('T')[0]}.pdf`;
      await analyticsService.exportAnalyticsPDF(selectedStudent, filename);
      showMessage('success', 'Report exported successfully!');
    } catch (error) {
      showMessage('error', 'Failed to export report');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
          Student Performance Analytics
        </h1>
        <p className="text-gray-600">Comprehensive insights into academic performance</p>
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

      {/* Student Selector & Actions */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
        {(user?.role !== 'student') && students.length > 0 && (
          <div className="flex-1 min-w-64">
            <select
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={selectedStudent || ''}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">-- Select Student --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.username}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {!analytics ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Select a student to view analytics</p>
        </div>
      ) : (
        <>
          {/* Overall Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">Overall Average</p>
              <p className="text-3xl font-bold text-blue-600">
                {analytics.overall_stats.overall_average}%
              </p>
              <p className="text-xs text-gray-500 mt-1">GPA: {analytics.overall_stats.gpa}</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {analytics.attendance_impact.attendance_rate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.attendance_impact.present_days}/{analytics.attendance_impact.total_days} days
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-1">Total Assessments</p>
              <p className="text-3xl font-bold text-purple-600">
                {analytics.overall_stats.total_assessments}
              </p>
              <p className="text-xs text-gray-500 mt-1">Completed</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
              <p className="text-sm text-gray-600 mb-1">Predicted Final</p>
              <p className="text-3xl font-bold text-yellow-600">
                {analytics.predictions.predicted_final_average || 'N/A'}%
              </p>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                {analyticsService.getTrendIcon(analytics.predictions.trend_direction)}
                {analytics.predictions.trend_direction}
              </p>
            </div>
          </div>

          {/* Grade Trends Chart */}
          {analytics.grade_trends.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="text-blue-600" />
                Grade Trends Over Time
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsService.formatTrendsForLineChart(analytics.grade_trends)}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="average" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAvg)" name="Average" />
                  <Area type="monotone" dataKey="highest" stroke="#10b981" fill="none" name="Highest" />
                  <Area type="monotone" dataKey="lowest" stroke="#ef4444" fill="none" name="Lowest" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Subject Performance Radar */}
          {analytics.subject_performance.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target className="text-purple-600" />
                Subject Performance Comparison
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={analyticsService.formatSubjectDataForRadar(analytics.subject_performance)}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Performance" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Award className="text-green-600" />
                Strengths
              </h2>
              {analytics.strengths_weaknesses.strengths.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No notable strengths identified yet</p>
              ) : (
                <div className="space-y-3">
                  {analytics.strengths_weaknesses.strengths.map((strength, idx) => (
                    <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-green-800">{strength.subject}</span>
                        <span className="text-2xl font-bold text-green-600">{strength.average}%</span>
                      </div>
                      <p className="text-sm text-green-700">{strength.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="text-red-600" />
                Areas for Improvement
              </h2>
              {analytics.strengths_weaknesses.weaknesses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">All subjects performing well!</p>
              ) : (
                <div className="space-y-3">
                  {analytics.strengths_weaknesses.weaknesses.map((weakness, idx) => (
                    <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-red-800">{weakness.subject}</span>
                        <span className="text-2xl font-bold text-red-600">{weakness.average}%</span>
                      </div>
                      <p className="text-sm text-red-700">{weakness.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {analytics.recommendations.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="text-yellow-600" />
                Personalized Recommendations
              </h2>
              <div className="space-y-3">
                {analytics.recommendations.map((rec, idx) => {
                  const priorityColors = {
                    high: 'bg-red-50 border-red-300 text-red-800',
                    medium: 'bg-yellow-50 border-yellow-300 text-yellow-800',
                    low: 'bg-blue-50 border-blue-300 text-blue-800',
                    positive: 'bg-green-50 border-green-300 text-green-800'
                  };
                  
                  return (
                    <div key={idx} className={`p-4 rounded-lg border ${priorityColors[rec.priority]}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold mb-1">{rec.title}</p>
                          <p className="text-sm">{rec.description}</p>
                        </div>
                        <span className="ml-3 px-2 py-1 text-xs rounded-full bg-white border">
                          {rec.category}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attendance Impact */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="text-indigo-600" />
              Attendance Impact Analysis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: 'Present', value: analytics.attendance_impact.present_days, fill: '#10b981' },
                    { name: 'Late', value: analytics.attendance_impact.late_days, fill: '#f59e0b' },
                    { name: 'Absent', value: analytics.attendance_impact.absent_days, fill: '#ef4444' }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex flex-col justify-center">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Correlation Strength</p>
                  <p className="text-2xl font-bold text-indigo-600 capitalize">
                    {analytics.attendance_impact.correlation_strength.replace('_', ' ')}
                  </p>
                </div>
                <p className="text-sm text-gray-700 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                  {analytics.attendance_impact.impact_description}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}