/**
 * Dashboard Page
 * Main dashboard for authenticated users
 */

import React from 'react';
import { useAuth } from '@hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui';
import { BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';

const StatsCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; direction: 'up' | 'down' };
}> = ({ icon, label, value, trend }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.first_name || user?.username}! 👋
        </h1>
        <p className="text-gray-600 mt-2">Here's what's happening in your academy today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon={<BarChart3 className="h-6 w-6" />}
          label="Total Students"
          value="1,234"
          trend={{ value: 5, direction: 'up' }}
        />
        <StatsCard
          icon={<Users className="h-6 w-6" />}
          label="Active Teachers"
          value="45"
          trend={{ value: 2, direction: 'up' }}
        />
        <StatsCard
          icon={<Calendar className="h-6 w-6" />}
          label="Classes Today"
          value="12"
          trend={{ value: 0, direction: 'up' }}
        />
        <StatsCard
          icon={<TrendingUp className="h-6 w-6" />}
          label="Avg. Attendance"
          value="94.5%"
          trend={{ value: 3, direction: 'up' }}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your academy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-gray-900">New grade submitted</p>
                  <p className="text-sm text-gray-600">Mathematics - Grade 10A</p>
                </div>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
