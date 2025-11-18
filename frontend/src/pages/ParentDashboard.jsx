// frontend/src/pages/ParentDashboard.jsx - FIXED OVERVIEW TAB
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
  
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(false);
  
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
      const childrenArray = data?.children || [];
      setChildren(childrenArray);
      
      if (childrenArray.length > 0) {
        setSelectedChild(childrenArray[0].student);
      }
    } catch (error) {
      console.error('❌ Error fetching children:', error);
      showMessage('error', error?.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = async () => {
    if (!selectedChild) return;
    
    setLoading(true);
    try {
      // Clear previous data
      setPerfData(null);
      setGradesData(null);
      setAttendanceData(null);
      setTimetableData(null);

      console.log(`🔍 Fetching data for tab: ${activeTab}, child: ${selectedChild}`);

      // Fetch based on active tab
      if (activeTab === 'overview') {
        console.log('📊 Fetching performance summary...');
        const perf = await parentService.getChildPerformanceSummary(selectedChild);
        console.log('✅ Performance data received:', perf);
        
        // ✅ FIX: Ensure all required fields exist with defaults
        const normalizedPerf = {
          student_id: perf?.student_id || selectedChild,
          student_name: perf?.student_name || '',
          overall_percentage: parseFloat(perf?.overall_percentage || 0),
          overall_gpa: parseFloat(perf?.overall_gpa || 0),
          total_assessments: parseInt(perf?.total_assessments || 0),
          graded_count: parseInt(perf?.graded_count || 0),
          absent_count: parseInt(perf?.absent_count || 0),
          total_attendance: parseInt(perf?.total_attendance || 0),
          present_count: parseInt(perf?.present_count || 0),
          absent_attendance_count: parseInt(perf?.absent_attendance_count || 0),
          attendance_rate: parseFloat(perf?.attendance_rate || 0),
          recent_grades: Array.isArray(perf?.recent_grades) ? perf.recent_grades : [],
          performance_category: perf?.performance_category || 'N/A'
        };
        
        console.log('📦 Normalized performance data:', normalizedPerf);
        setPerfData(normalizedPerf);
        
      } else if (activeTab === 'grades') {
        console.log('📝 Fetching grades...');
        const grades = await parentService.getChildGrades(selectedChild, { limit: 50 });
        console.log('✅ Grades data received:', grades);
        
        setGradesData({
          student_id: grades?.student_id || selectedChild,
          student_name: grades?.student_name || '',
          total_grades: grades?.total_grades || 0,
          average_percentage: grades?.average_percentage || 0,
          grades: Array.isArray(grades?.grades) ? grades.grades : []
        });
        
      } else if (activeTab === 'attendance') {
        console.log('✅ Fetching attendance...');
        const att = await parentService.getChildAttendance(selectedChild);
        console.log('✅ Attendance data received:', att);
        
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
        console.log('📅 Fetching timetable...');
        const tt = await parentService.getChildTimetable(selectedChild);
        console.log('✅ Timetable data received:', tt);
        
        setTimetableData({
          student_id: tt?.student_id || selectedChild,
          student_name: tt?.student_name || '',
          total_classes: tt?.total_classes || 0,
          timetable_entries: tt?.timetable_entries || 0,
          timetable: Array.isArray(tt?.timetable) ? tt.timetable : []
        });
      }
      
      console.log('✅ Data fetch completed successfully');
      
    } catch (error) {
      console.error('❌ Error fetching child data:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
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
    console.log(`🔄 Changing tab to: ${tabId}`);
    setActiveTab(tabId);
  };

  const handleChildChange = (childId) => {
    console.log(`👤 Changing child to: ${childId}`);
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
                    {/* Performance Card */}
                    <ChildPerformanceCard data={perfData} loading={loading} />
                    
                    {/* Recent Assessments */}
                    {perfData?.recent_grades && Array.isArray(perfData.recent_grades) && perfData.recent_grades.length > 0 && (
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5 text-blue-600" />
                          Recent Assessments
                        </h3>
                        <div className="space-y-3">
                          {perfData.recent_grades.map((grade, idx) => {
                            const percentage = grade?.percentage ? parseFloat(grade.percentage) : 0;
                            const marks = grade?.marks_obtained || 0;
                            const totalMarks = grade?.total_marks || 0;
                            
                            return (
                              <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                                <div className="flex-1">
                                  <p className="font-medium">{grade?.assessment_name || 'Unknown Assessment'}</p>
                                  <p className="text-xs text-gray-600">
                                    {grade?.date ? new Date(grade.date).toLocaleDateString() : 'No date'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-blue-600">
                                    {percentage.toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {marks}/{totalMarks}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Show message if no recent grades */}
                    {perfData && (!perfData.recent_grades || perfData.recent_grades.length === 0) && (
                      <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No recent assessments available</p>
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