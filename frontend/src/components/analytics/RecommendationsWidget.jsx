import React from 'react';
import { Lightbulb, Target, Clock, BookOpen, TrendingUp, CheckCircle } from 'lucide-react';

export default function RecommendationsWidget({ data, detailed = false }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center text-gray-500">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No recommendations available</p>
          <p className="text-sm mt-1">Complete more assessments to get personalized suggestions</p>
        </div>
      </div>
    );
  }

  const getPriorityIcon = (priority) => {
    const icons = {
      high: { icon: Target, color: 'text-red-600', bgColor: 'bg-red-50' },
      medium: { icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50' },
      low: { icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-50' }
    };
    return icons[priority] || icons.medium;
  };

  const getTypeIcon = (type) => {
    const icons = {
      academic_focus: TrendingUp,
      attendance: Clock,
      consistency: CheckCircle,
      study_habits: BookOpen,
      default: Lightbulb
    };
    return icons[type] || icons.default;
  };

  // Group recommendations by priority
  const highPriority = data.filter(rec => rec.priority === 'high');
  const mediumPriority = data.filter(rec => rec.priority === 'medium');
  const lowPriority = data.filter(rec => rec.priority === 'low');

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            Personalized Recommendations
          </h3>
          <p className="text-sm text-gray-600">AI-powered suggestions for improvement</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{data.length} Suggestions</p>
          <p className="text-xs text-gray-600">Based on your performance</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* High Priority */}
        {highPriority.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              High Priority ({highPriority.length})
            </h4>
            <div className="space-y-3">
              {highPriority.map((recommendation, index) => {
                const PriorityIcon = getPriorityIcon(recommendation.priority).icon;
                const TypeIcon = getTypeIcon(recommendation.type);
                return (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <PriorityIcon className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeIcon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {recommendation.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{recommendation.message}</p>
                        <p className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                          💡 {recommendation.action}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Medium Priority */}
        {mediumPriority.length > 0 && (
          <div>
            <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Medium Priority ({mediumPriority.length})
            </h4>
            <div className="space-y-3">
              {mediumPriority.map((recommendation, index) => {
                const PriorityIcon = getPriorityIcon(recommendation.priority).icon;
                const TypeIcon = getTypeIcon(recommendation.type);
                return (
                  <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <PriorityIcon className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 mb-2">{recommendation.message}</p>
                        <p className="text-xs text-gray-600">{recommendation.action}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Low Priority */}
        {lowPriority.length > 0 && (
          <div>
            <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Low Priority ({lowPriority.length})
            </h4>
            <div className="space-y-2">
              {lowPriority.map((recommendation, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-800">{recommendation.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {detailed && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-semibold text-gray-800 mb-3">Implementation Tips</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Focus on high-priority items first
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Set specific, measurable goals
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Track progress weekly
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Review and adjust strategies monthly
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}