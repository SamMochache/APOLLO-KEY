// frontend/src/components/ChildPerformanceCard.jsx
import React from 'react';
import { TrendingUp, Award, Calendar, Target, AlertCircle } from 'lucide-react';

/**
 * Performance summary card for a child
 * @param {Object} data - Performance data from API
 * @param {Boolean} loading - Loading state
 */
export default function ChildPerformanceCard({ data, loading }) {
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

  if (!data) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500 mb-6">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No performance data available</p>
      </div>
    );
  }

  const perfCategory = getPerformanceCategory(data.overall_percentage);
  const attCategory = getAttendanceCategory(data.attendance_rate);

  const cards = [
    {
      title: 'Overall Score',
      value: `${data.overall_percentage?.toFixed(1) || 0}%`,
      subtitle: perfCategory.label,
      icon: Target,
      color: 'blue',
      textColor: perfCategory.color
    },
    {
      title: 'Attendance Rate',
      value: `${data.attendance_rate || 0}%`,
      subtitle: `${data.present || 0}/${data.total_attendance || 0} days`,
      icon: Calendar,
      color: 'green',
      textColor: 'text-green-600'
    },
    {
      title: 'Assessments',
      value: data.total_assessments || 0,
      subtitle: `${data.graded_count || 0} graded`,
      icon: Award,
      color: 'purple',
      textColor: 'text-purple-600'
    },
    {
      title: 'Performance',
      value: getPerformanceEmoji(data.performance_category),
      subtitle: data.performance_category || 'N/A',
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

// Helper functions
function getPerformanceCategory(percentage) {
  if (!percentage) return { label: 'N/A', color: 'text-gray-500' };
  if (percentage >= 90) return { label: 'Excellent', color: 'text-green-600' };
  if (percentage >= 80) return { label: 'Very Good', color: 'text-blue-600' };
  if (percentage >= 70) return { label: 'Good', color: 'text-yellow-600' };
  if (percentage >= 60) return { label: 'Satisfactory', color: 'text-orange-600' };
  return { label: 'Needs Improvement', color: 'text-red-600' };
}

function getAttendanceCategory(rate) {
  if (!rate) return { label: 'N/A', color: 'text-gray-500' };
  if (rate >= 90) return { label: 'Excellent', color: 'text-green-600' };
  if (rate >= 80) return { label: 'Good', color: 'text-blue-600' };
  if (rate >= 70) return { label: 'Average', color: 'text-yellow-600' };
  if (rate >= 60) return { label: 'Below Average', color: 'text-orange-600' };
  return { label: 'Poor', color: 'text-red-600' };
}

function getPerformanceEmoji(category) {
  const emojis = {
    'Excellent': '⭐',
    'Very Good': '✨',
    'Good': '👍',
    'Satisfactory': '📚',
    'Needs Improvement': '💪'
  };
  return emojis[category] || '📊';
}