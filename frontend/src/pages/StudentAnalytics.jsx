// frontend/src/pages/StudentAnalytics.jsx
import React, { useState, useEffect, useContext } from 'react';
import {
  TrendingUp, BarChart3, Target, Calendar, Download,
  Filter, RefreshCw, AlertCircle, CheckCircle, Users,
  Award, Clock, BookOpen, Lightbulb, TrendingDown
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useStudentAnalytics } from '../hooks/useStudentAnalytics';

// Import chart components (kept as you had them)
import GradeTrendChart from '../components/analytics/GradeTrendChart';
import SubjectRadarChart from '../components/analytics/SubjectRadarChart';
import AttendanceHeatmap from '../components/analytics/AttendanceHeatmap';
import PerformanceMetrics from '../components/analytics/PerformanceMetrics';
import RecommendationsWidget from '../components/analytics/RecommendationsWidget';
import parentService from '../api/parentService';

export default function StudentAnalytics() {
  const { user } = useContext(AuthContext);

  // If the logged in user is a student, default select them
  const [selectedStudent, setSelectedStudent] = useState(
    user?.role === 'student' ? Number(user.id) : null
  );

  const [children, setChildren] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState({ type: '', text: '' });

  // Custom analytics hook
  const {
    analytics,
    loading,
    error,
    filters,
    updateFilters,
    clearAllFilters,
    refresh,
    exportPDF,
    hasData,
    isEmpty
  } = useStudentAnalytics(selectedStudent, {}, true);

  // -- Fetch children for parent users --
  // Run only when user.role changes to avoid loops.
  useEffect(() => {
    if (user?.role !== 'parent') return;

    let mounted = true;
    const fetchChildren = async () => {
      try {
        const res = await parentService.getMyChildren();
        // parentService may return either an array or { children: [...] }
        const list = Array.isArray(res) ? res : res?.children || [];

        if (!mounted) return;
        setChildren(list);

        // Auto-select first student only if none selected
        if (!selectedStudent && list.length > 0) {
          // FIX: use child.student (actual student id), not parent-child id
          const first = list[0];
          const studentId = first?.student ?? first?.student_id ?? first?.id ?? null;
          if (studentId != null) setSelectedStudent(Number(studentId));
        }
      } catch (err) {
        // keep console.error for dev visibility; UI shows error via hook if applicable
        console.error('Failed to fetch children:', err);
      }
    };

    fetchChildren();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]); // only when role changes

  const handleExportPDF = async () => {
    setExporting(true);
    setExportMessage({ type: '', text: '' });

    try {
      const result = await exportPDF();
      if (result?.success) {
        setExportMessage({
          type: 'success',
          text: `Report downloaded: ${result.filename}`
        });
      } else {
        setExportMessage({
          type: 'error',
          text: result?.error || 'Export failed'
        });
      }
    } catch (err) {
      setExportMessage({
        type: 'error',
        text: 'Failed to export report'
      });
    } finally {
      setExporting(false);
      setTimeout(() => setExportMessage({ type: '', text: '' }), 5000);
    }
  };

  // Loading page (initial)
  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center py-12">
          <RefreshCw className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Error page (if hook reports error and no data)
  if (error && !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Load Analytics</h2>
          <p className="text-gray-600 mb-4">{error?.message || 'Unexpected error'}</p>
          <button
            onClick={refresh}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <TrendingUp className="text-blue-600 w-8 h-8" />
              Performance Analytics
            </h1>
            <p className="text-gray-600">
              Deep insights into academic performance and learning patterns
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 md:mt-0">
            {/* Date Filters */}
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => updateFilters({ startDate: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => updateFilters({ endDate: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
                placeholder="End Date"
              />
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportPDF}
              disabled={exporting || !hasData}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>

            {/* Refresh Button */}
            <button
              onClick={refresh}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Export Message */}
        {exportMessage.text && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
            exportMessage.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {exportMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm">{exportMessage.text}</span>
          </div>
        )}
      </div>

      {/* Student Selector (for parents/teachers/admins) */}
      {(user?.role === 'parent' || user?.role === 'teacher' || user?.role === 'admin') && (
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <label className="block text-sm font-semibold mb-2">Select Student</label>
          <div className="flex items-center gap-4">
            <select
              className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={selectedStudent ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedStudent(v ? Number(v) : null);
              }}
            >
              <option value="">Select a student...</option>
              {(children || []).map((child) => {
                // Use child.student if present (this is the actual student ID),
                // fallback to child.student_id or child.id
                const id = child?.student ?? child?.student_id ?? child?.id;
                const name = child?.student_full_name
                  ?? child?.student_name
                  ?? `${child?.first_name ?? ''} ${child?.last_name ?? ''}`.trim()
                  ?? `Student ${id}`;
                return (
                  <option key={child?.id ?? id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>
            <Users className="text-gray-400 w-5 h-5" />
          </div>
        </div>
      )}

      {/* Analytics Content */}
      {!hasData && isEmpty ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 text-lg">No analytics data available</p>
          <p className="text-gray-500 text-sm mt-2">
            {selectedStudent ? 'No data found for selected student and filters' : 'Select a student to view analytics'}
          </p>
        </div>
      ) : (
        <>
          {/* Quick Stats Overview */}
          {analytics?.analytics?.performance_metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Overall Average</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(analytics.analytics.performance_metrics.average_grade ?? 0).toFixed(1)}%
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {analytics.analytics.performance_metrics.total_assessments ?? 0} assessments
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Performance Trend</p>
                    <p className="text-2xl font-bold text-green-600 capitalize">
                      {analytics.analytics.grade_trends?.trend_direction ?? 'N/A'}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Consistency: {(analytics.analytics.grade_trends?.consistency_score ?? 0).toFixed(1)}%
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Strengths</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {(analytics.analytics.strengths_weaknesses?.strengths?.length ?? 0)}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-purple-500" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Subjects excelling in
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Recommendations</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {(analytics.analytics.study_recommendations?.length ?? 0)}
                    </p>
                  </div>
                  <Lightbulb className="w-8 h-8 text-orange-500" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Personalized suggestions
                </p>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="bg-white rounded-xl shadow-md mb-6 border-b">
            <div className="flex border-b bg-gray-50 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'trends', label: 'Grade Trends', icon: TrendingUp },
                { id: 'subjects', label: 'Subjects', icon: BookOpen },
                { id: 'attendance', label: 'Attendance', icon: Calendar },
                { id: 'recommendations', label: 'Recommendations', icon: Lightbulb }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-b-3 border-blue-600 text-blue-600 bg-white'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {loading && (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
                <p className="text-gray-600 mt-2">Updating analytics...</p>
              </div>
            )}

            {activeTab === 'overview' && analytics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GradeTrendChart data={analytics.analytics.grade_trends} />
                  <SubjectRadarChart data={analytics.analytics.subject_comparison} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <PerformanceMetrics data={analytics.analytics} />
                  <RecommendationsWidget data={analytics.analytics.study_recommendations} />
                </div>
              </div>
            )}

            {activeTab === 'trends' && analytics && (
              <div className="space-y-6">
                <GradeTrendChart
                  data={analytics.analytics.grade_trends}
                  detailed={true}
                />
              </div>
            )}

            {activeTab === 'subjects' && analytics && (
              <div className="space-y-6">
                <SubjectRadarChart
                  data={analytics.analytics.subject_comparison}
                  detailed={true}
                />
              </div>
            )}

            {activeTab === 'attendance' && analytics && (
              <div className="space-y-6">
                <AttendanceHeatmap data={analytics.analytics.attendance_correlation} />
              </div>
            )}

            {activeTab === 'recommendations' && analytics && (
              <RecommendationsWidget
                data={analytics.analytics.study_recommendations}
                detailed={true}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
