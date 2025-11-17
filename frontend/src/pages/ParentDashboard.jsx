// frontend/src/pages/ParentDashboard.jsx - FIXED VERSION
import React, { useState, useEffect, useContext } from 'react';
import { TrendingUp, Award, CheckCircle, Calendar, AlertCircle, Loader } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import parentService from '../api/parentService';

// Import components
import ChildSelector from '../components/ChildSelector';
import ChildPerformanceCard from '../components/ChildPerformanceCard';
import ChildAttendanceCalendar from '../components/ChildAttendanceCalendar';
import ChildGradesTable from '../components/ChildGradesTable';
import ChildTimetableView from '../components/ChildTimetableView';

export default function ParentDashboard() {
  const { user } = useContext(AuthContext);
  
  // ✅ FIX 1: Initialize all state with proper default values
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // ✅ FIX 2: Initialize data states with null (not undefined)
  const [perfData, setPerfData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [gradesData, setGradesData] = useState(null);
  const [timetableData, setTimetableData] = useState(null);
  
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch children on mount
  useEffect(() => {
    fetchChildren();
  }, []);

  // Fetch child data when selected child or tab changes
  useEffect(() => {
    if (selectedChild) {
      fetchChildData();
    }
  }, [selectedChild, activeTab]);

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const data = await parentService.getMyChildren();
      
      // ✅ FIX 3: Safe array access with fallback
      const childrenArray = data?.children || [];
      setChildren(childrenArray);
      
      // ✅ FIX 4: Only set selected child if array has items
      if (childrenArray.length > 0) {
        setSelectedChild(childrenArray[0].student);
      }
    } catch (error) {
      showMessage('error', error?.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = async () => {
    if (!selectedChild) return;
    
    setLoading(true);
    try {
      // ✅ FIX 5: Clear previous data before fetching new
      setPerfData(null);
      setGradesData(null);
      setAttendanceData(null);
      setTimetableData(null);

      // Fetch based on active tab
      if (activeTab === 'overview') {
        const perf = await parentService.getChildPerformanceSummary(selectedChild);
        // ✅ FIX 6: Validate response before setting
        setPerfData(perf || null);
      } else if (activeTab === 'grades') {
        const grades = await parentService.getChildGrades(selectedChild, { limit: 50 });
        // ✅ FIX 7: Ensure grades data has expected structure
        setGradesData({
          student_id: grades?.student_id || selectedChild,
          student_name: grades?.student_name || '',
          total_grades: grades?.total_grades || 0,
          average_percentage: grades?.average_percentage || 0,
          grades: Array.isArray(grades?.grades) ? grades.grades : []
        });
      } else if (activeTab === 'attendance') {
        const att = await parentService.getChildAttendance(selectedChild);
        // ✅ FIX 8: Ensure attendance data has records array
        setAttendanceData({
          student_id: att?.student_id || selectedChild,
          student_name: att?.student_name || '',
          total_records: att?.total_records || 0,
          present: att?.present || 0,
          absent: att?.absent || 0,
          late: att?.late || 0,
          attendance_rate: att?.attendance_rate || 0,
          records: Array.isArray(att?.records) ? att.records : []
        });
      } else if (activeTab === 'timetable') {
        const tt = await parentService.getChildTimetable(selectedChild);
        // ✅ FIX 9: Ensure timetable has array
        setTimetableData({
          student_id: tt?.student_id || selectedChild,
          student_name: tt?.student_name || '',
          total_classes: tt?.total_classes || 0,
          timetable_entries: tt?.timetable_entries || 0,
          timetable: Array.isArray(tt?.timetable) ? tt.timetable : []
        });
      }
    } catch (error) {
      console.error('Error fetching child data:', error);
      showMessage('error', error?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleChildChange = (childId) => {
    setSelectedChild(childId);
    
    // Clear all data when child changes
    setPerfData(null);
    setGradesData(null);
    setAttendanceData(null);
    setTimetableData(null);
  };

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'grades', label: 'Grades', icon: Award },
    { id: 'attendance', label: 'Attendance', icon: CheckCircle },
    { id: 'timetable', label: 'Schedule', icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <TrendingUp className="text-blue-600 w-8 h-8" />
          Parent Portal
        </h1>
        <p className="text-gray-600">Monitor your child's academic progress</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 animate-fadeIn ${
          message.type === 'success'
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Loading State (Initial) */}
      {loading && !children.length ? (
        <div className="text-center py-12">
          <Loader className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : (
        <>
          {/* Child Selector Component */}
          <ChildSelector
            children={children}
            selectedChild={selectedChild}
            onChildChange={handleChildChange}
            loading={false}
          />

          {/* ✅ FIX 10: Conditional rendering when child is selected */}
          {selectedChild ? (
            <>
              {/* Tabs */}
              <div className="bg-white rounded-xl shadow-md mb-6 border-b">
                <div className="flex border-b bg-gray-50 overflow-x-auto">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'border-b-3 border-blue-600 text-blue-600 bg-white'
                            : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <>
                    {/* ✅ FIX 11: Pass loading state to component */}
                    <ChildPerformanceCard data={perfData} loading={loading} />
                    
                    {/* ✅ FIX 12: Safe array check before mapping */}
                    {perfData?.recent_grades && Array.isArray(perfData.recent_grades) && perfData.recent_grades.length > 0 && (
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5 text-blue-600" />
                          Recent Assessments
                        </h3>
                        <div className="space-y-3">
                          {perfData.recent_grades.map((grade, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                              <div className="flex-1">
                                <p className="font-medium">{grade?.assessment_name || 'Unknown Assessment'}</p>
                                <p className="text-xs text-gray-600">
                                  {grade?.date ? new Date(grade.date).toLocaleDateString() : 'No date'}
                                </p>
                              </div>
                              <div className="text-right">
                                {/* ✅ FIX 13: Safe number access with fallback */}
                                <p className="text-2xl font-bold text-blue-600">
                                  {grade?.percentage ? grade.percentage.toFixed(1) : '0.0'}%
                                </p>
                                <p className="text-xs text-gray-500">
                                  {grade?.marks || 0}/{grade?.total_marks || 0}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Grades Tab */}
                {activeTab === 'grades' && (
                  <ChildGradesTable gradesData={gradesData} loading={loading} />
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                  <ChildAttendanceCalendar 
                    attendanceData={attendanceData} 
                    loading={loading} 
                  />
                )}

                {/* Timetable Tab */}
                {activeTab === 'timetable' && (
                  <ChildTimetableView 
                    timetableData={timetableData} 
                    loading={loading} 
                  />
                )}
              </div>
            </>
          ) : (
            // ✅ FIX 14: Show message when no child selected
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Please select a child to view their information</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}