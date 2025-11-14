import React, { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

export default function AttendanceHeatmap({ data }) {
  const [selectedView, setSelectedView] = useState('patterns');

  if (!data || !data.correlation_data || data.correlation_data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 h-80 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No attendance data available for analysis</p>
        </div>
      </div>
    );
  }

  const { correlation_data, correlation_score, attendance_impact, heatmap_data } = data;

  // Calculate overall stats
  const overallAttendance = correlation_data.reduce((sum, item) => sum + item.attendance_rate, 0) / correlation_data.length;
  const overallGrade = correlation_data.reduce((sum, item) => sum + item.average_grade, 0) / correlation_data.length;

  const CorrelationView = () => (
    <div className="space-y-6">
      {/* Correlation Score */}
      <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="flex items-center justify-center gap-3 mb-4">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {Math.abs(correlation_score * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">
              {correlation_score > 0 ? 'Positive' : 'Negative'} Correlation
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700">
          {correlation_score > 0.3 
            ? 'Strong positive relationship between attendance and grades'
            : correlation_score > 0.1
            ? 'Moderate relationship between attendance and grades'
            : 'Weak relationship between attendance and grades'
          }
        </p>
      </div>

      {/* Monthly Correlation Chart */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800">Monthly Attendance vs Grades</h4>
        {correlation_data.map((month, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-gray-800">{month.month}</p>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {month.attendance_rate.toFixed(1)}% Attendance
                </span>
                <span className="text-sm text-blue-600">
                  {month.average_grade.toFixed(1)}% Average Grade
                </span>
              </div>
            </div>
            <div className={`w-16 h-2 bg-gray-200 rounded-full overflow-hidden`}>
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
                style={{ width: `${month.attendance_rate}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ImpactView = () => (
    <div className="space-y-6">
      {/* Impact Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">High Attendance Impact</span>
          </div>
          <p className="text-sm text-green-700">
            {attendance_impact?.high_attendance_benefit || 'Consistent attendance shows positive impact on learning outcomes'}
          </p>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-orange-800">Attendance Patterns</span>
          </div>
          <p className="text-sm text-orange-700">
            {attendance_impact?.pattern_analysis || 'Regular attendance correlates with stable performance'}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{overallAttendance.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Overall Attendance</p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <p className="text-2xl font-bold text-purple-600">{overallGrade.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Average Grade</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Attendance & Performance Correlation
          </h3>
          <p className="text-sm text-gray-600">Relationship between attendance patterns and academic performance</p>
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedView('patterns')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedView === 'patterns' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Patterns
          </button>
          <button
            onClick={() => setSelectedView('impact')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedView === 'impact' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Impact
          </button>
        </div>
      </div>

      <div className="min-h-80">
        {selectedView === 'patterns' ? <CorrelationView /> : <ImpactView />}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">
            {Math.round(overallAttendance)}%
          </p>
          <p className="text-xs text-gray-600">Attendance Rate</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">
            {correlation_data.length}
          </p>
          <p className="text-xs text-gray-600">Months Analyzed</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-purple-600">
            {correlation_score > 0 ? '+' : ''}{correlation_score.toFixed(2)}
          </p>
          <p className="text-xs text-gray-600">Correlation</p>
        </div>
      </div>
    </div>
  );
}