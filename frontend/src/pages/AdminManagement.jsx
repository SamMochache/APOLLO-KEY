// frontend/src/pages/AdminManagement.jsx
import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save, X, Users, BookOpen } from "lucide-react";
import api from "../api/axios";

export default function AdminManagement() {
  const [activeTab, setActiveTab] = useState("classes");
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState({ show: false, type: "", data: null });
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "classes") {
        const res = await api.get("/academics/classes/");
        setClasses(Array.isArray(res.data) ? res.data : res.data.results || []);
      } else {
        const res = await api.get("/academics/subjects/");
        setSubjects(Array.isArray(res.data) ? res.data : res.data.results || []);
      }
    } catch (error) {
      showMessage("error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleEdit = (type, item) => {
    setEditModal({ show: true, type, data: item });
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      await api.delete(`/academics/${type === "class" ? "classes" : "subjects"}/${id}/`);
      showMessage("success", `${type} deleted successfully`);
      fetchData();
    } catch (error) {
      showMessage("error", `Failed to delete ${type}`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const endpoint = editModal.type === "class" ? "classes" : "subjects";
      
      if (editModal.data?.id) {
        await api.put(`/academics/${endpoint}/${editModal.data.id}/`, data);
        showMessage("success", `${editModal.type} updated successfully`);
      } else {
        await api.post(`/academics/${endpoint}/`, data);
        showMessage("success", `${editModal.type} created successfully`);
      }

      setEditModal({ show: false, type: "", data: null });
      fetchData();
    } catch (error) {
      showMessage("error", error.response?.data?.detail || `Failed to save ${editModal.type}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🎓 Admin Management</h1>
        <p className="text-gray-600">Manage classes and subjects</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition ${
              activeTab === "classes"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            <Users className="w-5 h-5" />
            Classes
          </button>
          <button
            onClick={() => setActiveTab("subjects")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition ${
              activeTab === "subjects"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Subjects
          </button>
        </div>

        <div className="p-6">
          <button
            onClick={() => handleEdit(activeTab === "classes" ? "class" : "subject", null)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mb-4"
          >
            <Plus className="w-4 h-4" />
            Add {activeTab === "classes" ? "Class" : "Subject"}
          </button>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : activeTab === "classes" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="border rounded-lg p-4 hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold mb-2">{cls.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">
                    Teacher: {cls.teacher_name || "Not assigned"}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Students: {cls.student_count || 0}
                  </p>
                  {cls.description && (
                    <p className="text-sm text-gray-500 mb-4">{cls.description}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit("class", cls)}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete("class", cls.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subj) => (
                <div
                  key={subj.id}
                  className="border rounded-lg p-4 hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold mb-1">{subj.name}</h3>
                  <p className="text-sm text-blue-600 mb-2">Code: {subj.code}</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Teacher: {subj.teacher_name || "Not assigned"}
                  </p>
                  {subj.description && (
                    <p className="text-sm text-gray-500 mb-4">{subj.description}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit("subject", subj)}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete("subject", subj.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editModal.data ? "Edit" : "Add"} {editModal.type}
              </h3>
              <button
                onClick={() => setEditModal({ show: false, type: "", data: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {editModal.type === "class" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Class Name *</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editModal.data?.name || ""}
                      required
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Grade 10A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      name="description"
                      defaultValue={editModal.data?.description || ""}
                      rows="3"
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional class description"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject Name *</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editModal.data?.name || ""}
                      required
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject Code *</label>
                    <input
                      type="text"
                      name="code"
                      defaultValue={editModal.data?.code || ""}
                      required
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., MATH101"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      name="description"
                      defaultValue={editModal.data?.description || ""}
                      rows="3"
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional subject description"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save {editModal.type}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}