// frontend/src/pages/TimetableBuilder.jsx
import React, { useState, useEffect } from "react";
import { Plus, Save, Trash2, AlertCircle, Check, X, Edit2 } from "lucide-react";
import api from "../api/axios";

const DAYS = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];

const TIME_SLOTS = [
  { start: "08:00", end: "09:00", label: "8:00 - 9:00 AM" },
  { start: "09:00", end: "10:00", label: "9:00 - 10:00 AM" },
  { start: "10:00", end: "11:00", label: "10:00 - 11:00 AM" },
  { start: "11:00", end: "12:00", label: "11:00 AM - 12:00 PM" },
  { start: "12:00", end: "13:00", label: "12:00 - 1:00 PM (Lunch)" },
  { start: "13:00", end: "14:00", label: "1:00 - 2:00 PM" },
  { start: "14:00", end: "15:00", label: "2:00 - 3:00 PM" },
  { start: "15:00", end: "16:00", label: "3:00 - 4:00 PM" },
];

export default function TimetableBuilder() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editingCell, setEditingCell] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchTimetable();
      checkConflicts();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/academics/classes/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setClasses(data);
    } catch (error) {
      showMessage("error", "Failed to load classes");
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get("/academics/subjects/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setSubjects(data);
    } catch (error) {
      showMessage("error", "Failed to load subjects");
    }
  };

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/academics/timetable/?class_id=${selectedClass}`);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setTimetable(data);
    } catch (error) {
      showMessage("error", "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = async () => {
    if (!selectedClass) return;
    
    try {
      const res = await api.get(`/academics/timetable/conflicts/?class_id=${selectedClass}`);
      setConflicts(res.data.conflicts || []);
      
      if (res.data.has_conflicts) {
        showMessage("warning", `${res.data.conflicts.length} scheduling conflicts detected`);
      }
    } catch (error) {
      console.error("Failed to check conflicts:", error);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const getEntry = (day, timeSlot) => {
    return timetable.find(
      (entry) =>
        entry.day === day &&
        entry.start_time === timeSlot.start &&
        entry.end_time === timeSlot.end
    );
  };

  const handleCellClick = (day, timeSlot) => {
    const entry = getEntry(day, timeSlot);
    setEditingCell({
      day,
      timeSlot,
      entry: entry || null,
      subject: entry?.subject || "",
      teacher: entry?.teacher || "",
    });
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;

    const { day, timeSlot, entry, subject, teacher } = editingCell;

    if (!subject) {
      showMessage("error", "Please select a subject");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        class_assigned: selectedClass,
        subject,
        teacher: teacher || null,
        day,
        start_time: timeSlot.start,
        end_time: timeSlot.end,
      };

      if (entry) {
        // Update existing entry
        await api.put(`/academics/timetable/${entry.id}/`, payload);
        showMessage("success", "Entry updated successfully");
      } else {
        // Create new entry
        await api.post("/academics/timetable/", payload);
        showMessage("success", "Entry created successfully");
      }

      setEditingCell(null);
      await fetchTimetable();
      await checkConflicts();
    } catch (error) {
      showMessage("error", error.response?.data?.detail || "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCell = async () => {
    if (!editingCell?.entry) return;

    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    setSaving(true);

    try {
      await api.delete(`/academics/timetable/${editingCell.entry.id}/`);
      showMessage("success", "Entry deleted successfully");
      setEditingCell(null);
      await fetchTimetable();
      await checkConflicts();
    } catch (error) {
      showMessage("error", "Failed to delete entry");
    } finally {
      setSaving(false);
    }
  };

  const getCellColor = (entry) => {
    if (!entry) return "bg-gray-50";
    
    const hasConflict = conflicts.some(
      (c) => c.entry.id === entry.id || c.conflicts_with.some((cw) => cw.id === entry.id)
    );
    
    if (hasConflict) return "bg-red-100 border-red-300";
    return "bg-blue-50 border-blue-200";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📅 Timetable Builder</h1>
        <p className="text-gray-600">Create and manage class schedules</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : message.type === "error"
              ? "bg-red-100 text-red-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Class Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium mb-2">Select Class</label>
        <select
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          value={selectedClass || ""}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">-- Choose a class --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} - {cls.teacher_name || "No teacher"}
            </option>
          ))}
        </select>
      </div>

      {/* Timetable Grid */}
      {selectedClass && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left font-semibold">Time</th>
                {DAYS.map((day) => (
                  <th key={day.value} className="border p-3 text-center font-semibold">
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((timeSlot) => (
                <tr key={timeSlot.start}>
                  <td className="border p-3 text-sm font-medium bg-gray-50">
                    {timeSlot.label}
                  </td>
                  {DAYS.map((day) => {
                    const entry = getEntry(day.value, timeSlot);
                    return (
                      <td
                        key={day.value}
                        className={`border p-2 cursor-pointer hover:bg-gray-100 transition ${getCellColor(
                          entry
                        )}`}
                        onClick={() => handleCellClick(day.value, timeSlot)}
                      >
                        {entry ? (
                          <div className="text-sm">
                            <div className="font-semibold text-blue-700">
                              {entry.subject_name}
                            </div>
                            <div className="text-gray-600 text-xs">
                              {entry.teacher_name || "No teacher"}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-400 text-center text-sm">
                            <Plus className="w-4 h-4 mx-auto" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editingCell.entry ? "Edit" : "Add"} Timetable Entry
              </h3>
              <button
                onClick={() => setEditingCell(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Day</label>
                <input
                  type="text"
                  value={DAYS.find((d) => d.value === editingCell.day)?.label}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input
                  type="text"
                  value={editingCell.timeSlot.label}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Subject *</label>
                <select
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  value={editingCell.subject}
                  onChange={(e) =>
                    setEditingCell({ ...editingCell, subject: e.target.value })
                  }
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map((subj) => (
                    <option key={subj.id} value={subj.id}>
                      {subj.name} ({subj.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Teacher</label>
                <select
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  value={editingCell.teacher}
                  onChange={(e) =>
                    setEditingCell({ ...editingCell, teacher: e.target.value })
                  }
                >
                  <option value="">-- Select Teacher (Optional) --</option>
                  {subjects
                    .find((s) => s.id === parseInt(editingCell.subject))
                    ?.teacher && (
                    <option
                      value={
                        subjects.find((s) => s.id === parseInt(editingCell.subject))
                          ?.teacher
                      }
                    >
                      {
                        subjects.find((s) => s.id === parseInt(editingCell.subject))
                          ?.teacher_name
                      }
                    </option>
                  )}
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSaveCell}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save"}
                </button>

                {editingCell.entry && (
                  <button
                    onClick={handleDeleteCell}
                    disabled={saving}
                    className="px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedClass && (
        <div className="text-center py-12 text-gray-500">
          <p>Please select a class to manage its timetable</p>
        </div>
      )}
    </div>
  );
}