import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { BookOpen, Target, Award } from 'lucide-react';

export default function SubjectRadarChart({ data, detailed = false }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 h-80 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No subject data available for comparison</p>
        </div>
      </div>
    );
  }

  // Prepare data for radar chart
  const radarData = data.map(subject => ({
    subject: subject.subject.length > 10 ? subject.subject.substring(0, 10) + '...' : subject.subject,
    fullSubject: subject.subject,
    score: subject.average_score,
    strength: subject.strength_level,
    assessments: subject.assessments_count,
    performance: subject.performance_category
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const subjectData = radarData.find(d => d.subject === label);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{subjectData.fullSubject}</p>
          <p className="text-blue-600 font-bold">{payload[0].value}% Average</p>
          <p className="text-sm text-gray-600 capitalize">{subjectData.performance.replace('_', ' ')}</p>
          <p className="text-sm text-gray-600">{subjectData.assessments} assessments</p>
        </div>
      );
    }
    return null;
  };

  // Identify strongest and weakest subjects
  const strongestSubject = [...data].sort((a, b) => b.average_score - a.average_score)[0];
  const weakestSubject = [...data].sort((a, b) => a.average_score - b.average_score)[0];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Subject Performance Comparison
          </h3>
          <p className="text-sm text-gray-600">Relative performance across all subjects</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">Subjects: {data.length}</p>
          <p className="text-xs text-gray-600">Radar visualization</p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} angle={90} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Performance"
              dataKey="score"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {detailed && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-800">Strongest Subject</span>
            </div>
            <p className="text-lg font-bold text-green-700">{strongestSubject.subject}</p>
            <p className="text-sm text-green-600">{strongestSubject.average_score.toFixed(1)}% Average</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-orange-800">Focus Area</span>
            </div>
            <p className="text-lg font-bold text-orange-700">{weakestSubject.subject}</p>
            <p className="text-sm text-orange-600">{weakestSubject.average_score.toFixed(1)}% Average</p>
          </div>
        </div>
      )}

      {/* Performance Legend */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {['excellent', 'very_good', 'good', 'satisfactory', 'needs_improvement'].map((category) => {
          const count = data.filter(s => s.performance_category === category).length;
          if (count === 0) return null;
          
          const colors = {
            excellent: 'bg-green-100 text-green-800',
            very_good: 'bg-blue-100 text-blue-800',
            good: 'bg-yellow-100 text-yellow-800',
            satisfactory: 'bg-orange-100 text-orange-800',
            needs_improvement: 'bg-red-100 text-red-800'
          };
          
          return (
            <span
              key={category}
              className={`px-2 py-1 rounded-full text-xs font-medium ${colors[category]}`}
            >
              {category.replace('_', ' ')}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}