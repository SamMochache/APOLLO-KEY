// frontend/src/pages/ParentDashboard.jsx - UPDATED WITH NEW COMPONENTS
import React, { useState, useEffect, useContext } from 'react';
import { TrendingUp, Award, CheckCircle, Calendar, AlertCircle, Loader } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import parentService from '../api/parentService';

// Import new components
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
      setChildren(data.children || []);
      
      if (data.children && data.children.length > 0) {
        setSelectedChild(data.children[0].student);
      }
    } catch (error) {
      showMessage('error', error.message);
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

      // Fetch based on active tab
      if (activeTab === 'overview') {
        const perf = await parentService.getChildPerformanceSummary(selectedChild);
        setPerfData(perf);
      } else if (activeTab === 'grades') {
        const grades = await parentService.getChildGrades(selectedChild, { limit: 50 });
        setGradesData(grades);
      } else if (activeTab === 'attendance') {
        const att = await parentService.getChildAttendance(selectedChild);
        setAttendanceData(att);
      } else if (activeTab === 'timetable') {
        const tt = await parentService.getChildTimetable(selectedChild);
        setTimetableData(tt);
      }
    } catch (error) {
      showMessage('error', error.message || 'Failed to load data');
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

          {selectedChild && (
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
                    <ChildPerformanceCard data={perfData} loading={loading} />
                    
                    {perfData?.recent_grades && perfData.recent_grades.length > 0 && (
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5 text-blue-600" />
                          Recent Assessments
                        </h3>
                        <div className="space-y-3">
                          {perfData.recent_grades.map((grade, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                              <div className="flex-1">
                                <p className="font-medium">{grade.assessment_name}</p>
                                <p className="text-xs text-gray-600">
                                  {new Date(grade.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-blue-600">
                                  {grade.percentage.toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-500">
                                  {grade.marks}/{grade.total_marks}
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
                  <ChildGradesTable data={gradesData} loading={loading} />
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
          )}
        </>
      )}
    </div>
  );
}