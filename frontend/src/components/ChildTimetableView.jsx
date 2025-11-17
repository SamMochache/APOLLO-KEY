// frontend/src/components/ChildTimetableView.jsx
import React, { useState } from 'react';
import { Calendar, Clock, BookOpen, User, ChevronRight } from 'lucide-react';

/**
 * Enhanced timetable view with daily schedule
 * @param {Object} timetableData - Timetable data from API
 * @param {Boolean} loading - Loading state
 */
export default function ChildTimetableView({ timetableData, loading }) {
  const [selectedDay, setSelectedDay] = useState(getCurrentDay());

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!timetableData?.timetable?.length) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No timetable available</p>
      </div>
    );
  }

  // Group timetable by day
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const groupedByDay = {};
  
  timetableData.timetable.forEach(entry => {
    if (!groupedByDay[entry.day]) {
      groupedByDay[entry.day] = [];
    }
    groupedByDay[entry.day].push(entry);
  });

  // Sort entries by time
  Object.keys(groupedByDay).forEach(day => {
    groupedByDay[day].sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    );
  });

  const availableDays = dayOrder.filter(day => groupedByDay[day]);
  const currentDaySchedule = groupedByDay[selectedDay] || [];

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-blue-600" />
          Weekly Schedule
        </h3>
        <p className="text-sm text-gray-600">
          Total Classes: {timetableData.timetable_entries || timetableData.timetable.length}
        </p>
      </div>

      {/* Day Tabs */}
      <div className="flex overflow-x-auto bg-gray-50 border-b">
        {availableDays.map(day => {
          const isSelected = day === selectedDay;
          const isToday = day === getCurrentDay();
          const entriesCount = groupedByDay[day]?.length || 0;
          
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-shrink-0 px-6 py-4 font-semibold transition-all border-b-3 ${
                isSelected
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span>{day}</span>
                <span className="text-xs font-normal">
                  {entriesCount} {entriesCount === 1 ? 'class' : 'classes'}
                </span>
                {isToday && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                    Today
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Schedule Content */}
      <div className="p-6">
        {currentDaySchedule.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No classes scheduled for {selectedDay}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentDaySchedule.map((entry, index) => {
              const duration = calculateDuration(entry.start_time, entry.end_time);
              
              return (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all bg-gradient-to-r from-white to-blue-50"
                >
                  {/* Time */}
                  <div className="flex-shrink-0 text-center w-24">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                      <p className="text-sm font-bold text-blue-600">
                        {formatTime(entry.start_time)}
                      </p>
                      <ChevronRight className="w-4 h-4 mx-auto my-1 text-gray-400" />
                      <p className="text-sm font-bold text-blue-600">
                        {formatTime(entry.end_time)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {duration} min
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-purple-600" />
                          {entry.subject_name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {entry.class_name}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        getSubjectColor(entry.subject_name)
                      }`}>
                        {entry.subject_code || 'Subject'}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span className="font-medium">
                        {entry.teacher_name || 'Teacher not assigned'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {currentDaySchedule.length} {currentDaySchedule.length === 1 ? 'class' : 'classes'} scheduled for {selectedDay}
          </span>
          {currentDaySchedule.length > 0 && (
            <span className="text-gray-600">
              Total: {calculateTotalDuration(currentDaySchedule)} minutes
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getCurrentDay() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

function formatTime(time) {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function calculateDuration(startTime, endTime) {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  return endMinutes - startMinutes;
}

function calculateTotalDuration(schedule) {
  return schedule.reduce((total, entry) => {
    return total + calculateDuration(entry.start_time, entry.end_time);
  }, 0);
}

function getSubjectColor(subjectName) {
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-purple-100 text-purple-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800'
  ];
  
  // Simple hash to consistently assign color
  const hash = subjectName.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  return colors[hash % colors.length];
}