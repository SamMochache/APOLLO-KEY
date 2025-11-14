import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Award } from 'lucide-react';

export default function GradeTrendChart({ data, detailed = false }) {
  if (!data || !data.timeline_data || data.timeline_data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 h-80 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No grade data available for trend analysis</p>
        </div>
      </div>
    );
  }

  // Prepare data for chart
  const chartData = data.timeline_data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    percentage: item.percentage,
    subject: item.subject,
    fullDate: item.date
  }));

  // Calculate average line data
  const averageGrade = chartData.reduce((sum, item) => sum + item.percentage, 0) / chartData.length;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          <p className="text-sm text-gray-600">
            {payload[0].payload.subject}
          </p>
          <p className="text-blue-600 font-bold">
            {payload[0].value}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Grade Trends Over Time
          </h3>
          <p className="text-sm text-gray-600">Performance progression across assessments</p>
        </div>
        {data.trend_direction && (
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            data.trend_direction === 'improving' ? 'bg-green-100 text-green-800' :
            data.trend_direction === 'declining' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {data.trend_direction.toUpperCase()}
          </div>
        )}
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="percentage" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
              name="Grade Percentage"
            />
            <Line 
              type="monotone" 
              dataKey={() => averageGrade}
              stroke="#6b7280"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Average"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {detailed && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{averageGrade.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Overall Average</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{data.consistency_score.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Consistency Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{data.timeline_data.length}</p>
            <p className="text-sm text-gray-600">Total Assessments</p>
          </div>
        </div>
      )}
    </div>
  );
}