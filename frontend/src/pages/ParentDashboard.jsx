// frontend/src/pages/ParentDashboard.jsx

import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import parentService from "../api/parentService";

function ParentDashboard() {
  const { user } = useContext(AuthContext);

  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [data, setData] = useState({
    overview: null,
    grades: null,
    attendance: null,
    timetable: null,
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // ----------------------------------------------------
  // 🔥 Message System (Improved — errors stay visible)
  // ----------------------------------------------------
  const showMessage = (type, text) => {
    setMessage({ type, text });

    // Only auto-hide SUCCESS messages
    if (type === "success") {
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    }
  };

  // ----------------------------------------------------
  // 📌 Load children on mount
  // ----------------------------------------------------
  useEffect(() => {
    async function loadChildren() {
      try {
        setLoading(true);
        const response = await parentService.getChildren();
        setChildren(response);

        if (response.length > 0) {
          setSelectedChild(parseInt(response[0].student));
        }
      } catch (error) {
        showMessage("error", "Failed to load children.");
      } finally {
        setLoading(false);
      }
    }
    loadChildren();
  }, []);

  // ----------------------------------------------------
  // 📌 Load tab data whenever selected child OR tab changes
  // ----------------------------------------------------
  useEffect(() => {
    if (selectedChild) {
      handleTabChange(activeTab);
    }
  }, [selectedChild]);

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    await fetchTabData(tab);
  };

  // ----------------------------------------------------
  // 📌 Load data for the selected tab
  // ----------------------------------------------------
  const fetchTabData = async (tab) => {
    if (!selectedChild) return;

    setLoading(true);
    try {
      if (tab === "overview") {
        const response = await parentService.getStudentOverview(selectedChild);
        setData((prev) => ({ ...prev, overview: response }));
      }
      if (tab === "grades") {
        const response = await parentService.getStudentGrades(selectedChild);
        setData((prev) => ({ ...prev, grades: response }));
      }
      if (tab === "attendance") {
        const response = await parentService.getStudentAttendance(selectedChild);
        setData((prev) => ({ ...prev, attendance: response }));
      }
      if (tab === "timetable") {
        const response = await parentService.getStudentTimetable(selectedChild);
        setData((prev) => ({ ...prev, timetable: response }));
      }
    } catch (error) {
      showMessage("error", "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 🧒 Get current child details
  // ----------------------------------------------------
  const currentChild = children.find((c) => c.student === selectedChild);

  // ----------------------------------------------------
  // 🎨 Render UI
  // ----------------------------------------------------
  return (
    <div className="parent-dashboard">
      <h1>Parent Dashboard</h1>

      {/* ⚠️ Message Banner */}
      {message.text && (
        <div
          className={`message-banner ${message.type}`}
          style={{ marginBottom: "10px", padding: "10px", borderRadius: "5px" }}
        >
          {message.text}
        </div>
      )}

      {/* -------------------- CHILD SELECTOR -------------------- */}
      <div className="child-selector">
        <label>Select Child:</label>
        <select
          value={selectedChild || ""}
          onChange={(e) => setSelectedChild(parseInt(e.target.value))}
        >
          {children.map((child) => (
            <option key={child.id} value={child.student}>
              {child.student_name ||
                child.student_full_name ||
                child.name ||
                "Unnamed Student"}
            </option>
          ))}
        </select>
      </div>

      {/* -------------------- TABS -------------------- */}
      <div className="tabs">
        {["overview", "grades", "attendance", "timetable"].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => handleTabChange(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* -------------------- LOADING -------------------- */}
      {loading && <p>Loading...</p>}

      {/* -------------------- OVERVIEW TAB -------------------- */}
      {activeTab === "overview" && data.overview && (
        <div className="overview">
          <h2>Overview</h2>
          <p>Overall Grade: {data.overview.overall_percentage}%</p>
          <p>Attendance Rate: {data.overview.attendance_rate}%</p>

          <h3>Recent Grades</h3>
          {data.overview.recent_grades.map((g, index) => (
            <p key={index}>
              {g.subject}: {g.percentage}%
            </p>
          ))}
        </div>
      )}

      {/* -------------------- GRADES TAB -------------------- */}
      {activeTab === "grades" && data.grades && (
        <div className="grades">
          <h2>Grades</h2>
          {data.grades.map((grade, idx) => (
            <div key={idx} className="grade-item">
              <p>
                <strong>{grade.assessment_name}</strong> — {grade.percentage}%
              </p>
            </div>
          ))}
        </div>
      )}

      {/* -------------------- ATTENDANCE TAB -------------------- */}
      {activeTab === "attendance" && data.attendance && (
        <div className="attendance">
          <h2>Attendance</h2>

          {data.attendance.map((rec, idx) => (
            <p key={idx}>
              {rec.date} —{" "}
              <span style={{ color: rec.status === "Present" ? "green" : "red" }}>
                {rec.status}
              </span>
            </p>
          ))}
        </div>
      )}

      {/* -------------------- TIMETABLE TAB -------------------- */}
      {activeTab === "timetable" && data.timetable && (
        <div className="timetable">
          <h2>Weekly Timetable</h2>

          {Object.keys(data.timetable).map((day) => (
            <div key={day}>
              <h3>{day}</h3>

              {data.timetable[day].length === 0 ? (
                <p>No lessons.</p>
              ) : (
                data.timetable[day].map((lesson, idx) => (
                  <p key={idx}>
                    {lesson.start_time}–{lesson.end_time} — {lesson.subject_name}
                  </p>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ParentDashboard;
