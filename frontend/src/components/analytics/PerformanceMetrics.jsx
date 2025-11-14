import React from 'react';
import { Award, Target, TrendingUp, Clock, Zap, Brain } from 'lucide-react';

export default function PerformanceMetrics({ data }) {
  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center text-gray-500">
          <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No performance metrics available</p>
        </div>
      </div>
    );
  }

  const { performance_metrics, grade_trends, strengths_weaknesses, predicted_grades } = data;

  const metrics = [
    {
      icon: Award,
      label: 'Overall Performance',
      value: `${performance_metrics?.average_grade?.toFixed(1) || 0}%`,
      description: 'Average across all subjects',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: TrendingUp,
      label: 'Learning Velocity',
      value: `${performance_metrics?.learning_velocity || 'N/A'}`,
      description: 'Pace of improvement',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: Clock,
      label: 'Consistency',
      value: `${grade_trends?.consistency_score?.toFixed(1) || 0}%`,
      description: 'Performance stability',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Zap,
      label: 'Knowledge Retention',
      value: `${performance_metrics?.knowledge_retention || 'N/A'}`,
      description: 'Long-term learning',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: Target,
      label: 'Predicted Final',
      value: `${predicted_grades?.predicted_final_grade?.toFixed(1) || 'N/A'}%`,
      description: 'Based on current trends',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      icon: Brain,
      label: 'Performance Rank',
      value: `#${performance_metrics?.performance_rank || 'N/A'}`,
      description: 'Among peers',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
        <Target className="w-5 h-5 text-blue-600" />
        Performance Metrics
      </h3>

      <div className="space-y-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <Icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-sm">{metric.label}</p>
                <p className="text-xs text-gray-600">{metric.description}</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${metric.color}`}>{metric.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Strengths & Weaknesses Summary */}
      {(strengths_weaknesses?.strengths?.length > 0 || strengths_weaknesses?.weaknesses?.length > 0) && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-semibold text-gray-800 mb-3">Key Areas</h4>
          <div className="space-y-2">
            {strengths_weaknesses.strengths.slice(0, 2).map((strength, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-700 font-medium">{strength.subject}</span>
                <span className="text-gray-600">({strength.average_score.toFixed(1)}%)</span>
              </div>
            ))}
            {strengths_weaknesses.weaknesses.slice(0, 2).map((weakness, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-orange-700 font-medium">{weakness.subject}</span>
                <span className="text-gray-600">({weakness.average_score.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}