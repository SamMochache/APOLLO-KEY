// frontend/src/components/ChildAttendanceCalendar.jsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';

/**
 * Calendar view of child's attendance
 * @param {Object} attendanceData - Attendance records from API
 * @param {Boolean} loading - Loading state
 */
export default function ChildAttendanceCalendar({ attendanceData, loading }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceMap, setAttendanceMap] = useState({});

  useEffect(() => {
    if (attendanceData?.records) {
      const map = {};
      attendanceData.records.forEach(record => {
        map[record.date] = record.status;
      });
      setAttendanceMap(map);
    }
  }, [attendanceData]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Empty cells before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const formatDate = (day) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, day).toISOString().split('T')[0];
  };

  const getStatusColor = (status) => {
    const colors = {
      'present': 'bg-green-500 text-white hover:bg-green-600',
      'absent': 'bg-red-500 text-white hover:bg-red-600',
      'late': 'bg-yellow-500 text-white hover:bg-yellow-600'
    };
    return colors[status] || 'bg-gray-100 text-gray-600 hover:bg-gray-200';
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          Attendance Calendar
        </h2>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={today}
            className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-lg transition"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Month/Year Display */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{monthYear}</h3>
      </div>

      {/* Calendar Grid */}
      <div className="mb-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dateStr = formatDate(day);
            const status = attendanceMap[dateStr];
            const isToday = dateStr === todayStr;
            
            return (
              <div
                key={day}
                className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  status
                    ? getStatusColor(status)
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                } ${
                  isToday ? 'ring-2 ring-blue-500' : ''
                }`}
                title={status ? `${status.charAt(0).toUpperCase() + status.slice(1)}` : 'No record'}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="pt-4 border-t">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-medium text-gray-700">Legend:</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-gray-600">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-gray-600">Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            <span className="text-gray-600">Late</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div>
            <span className="text-gray-600">No record</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {attendanceData && (
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{attendanceData.present || 0}</p>
            <p className="text-xs text-gray-600">Present</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{attendanceData.absent || 0}</p>
            <p className="text-xs text-gray-600">Absent</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{attendanceData.attendance_rate || 0}%</p>
            <p className="text-xs text-gray-600">Rate</p>
          </div>
        </div>
      )}
    </div>
  );
}