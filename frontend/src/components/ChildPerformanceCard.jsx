// frontend/src/components/ChildPerformanceCard.jsx - FIXED VERSION
import React from 'react';
import { TrendingUp, Award, Calendar, Target, AlertCircle } from 'lucide-react';

export default function ChildPerformanceCard({ data, loading }) {
  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  // ✅ FIX 1: No data state
  if (!data) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500 mb-6">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No performance data available</p>
      </div>
    );
  }

  // ✅ FIX 2: Safe access to all data properties with defaults
  const overallPercentage = parseFloat(data?.overall_percentage || 0);
  const attendanceRate = parseFloat(data?.attendance_rate || 0);
  const totalAssessments = parseInt(data?.total_assessments || 0);
  const gradedCount = parseInt(data?.graded_count || 0);
  const presentCount = parseInt(data?.present_count || 0);
  const totalAttendance = parseInt(data?.total_attendance || 0);
  const performanceCategory = data?.performance_category || 'N/A';

  // ✅ FIX 3: Helper functions with null safety
  const getPerformanceCategory = (percentage) => {
    const pct = parseFloat(percentage);
    if (isNaN(pct)) return { label: 'N/A', color: 'text-gray-500' };
    if (pct >= 90) return { label: 'Excellent', color: 'text-green-600' };
    if (pct >= 80) return { label: 'Very Good', color: 'text-blue-600' };
    if (pct >= 70) return { label: 'Good', color: 'text-yellow-600' };
    if (pct >= 60) return { label: 'Satisfactory', color: 'text-orange-600' };
    return { label: 'Needs Improvement', color: 'text-red-600' };
  };

  const getPerformanceEmoji = (category) => {
    const emojis = {
      'Excellent': '⭐',
      'Very Good': '✨',
      'Good': '👍',
      'Satisfactory': '📚',
      'Needs Improvement': '💪'
    };
    return emojis[category] || '📊';
  };

  const perfCategory = getPerformanceCategory(overallPercentage);

  const cards = [
    {
      title: 'Overall Score',
      value: `${overallPercentage.toFixed(1)}%`,
      subtitle: perfCategory.label,
      icon: Target,
      color: 'blue',
      textColor: perfCategory.color
    },
    {
      title: 'Attendance Rate',
      value: `${attendanceRate.toFixed(1)}%`,
      subtitle: `${presentCount}/${totalAttendance} days`,
      icon: Calendar,
      color: 'green',
      textColor: 'text-green-600'
    },
    {
      title: 'Assessments',
      value: totalAssessments,
      subtitle: `${gradedCount} graded`,
      icon: Award,
      color: 'purple',
      textColor: 'text-purple-600'
    },
    {
      title: 'Performance',
      value: getPerformanceEmoji(performanceCategory),
      subtitle: performanceCategory,
      icon: TrendingUp,
      color: 'yellow',
      textColor: 'text-yellow-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div 
            key={index}
            className={`bg-white rounded-xl shadow-md p-6 border-l-4 border-${card.color}-500 hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className={`text-3xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
              </div>
              <Icon className={`w-12 h-12 text-${card.color}-500 opacity-50`} />
            </div>
            <p className="text-xs text-gray-500">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}