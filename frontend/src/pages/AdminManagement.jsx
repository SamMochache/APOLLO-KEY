// frontend/src/pages/AdminManagement.jsx
import React, { useState, useEffect, useContext } from "react";
import { Plus, Edit2, Trash2, Save, X, Users, BookOpen, Search, Filter } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";

export default function AdminManagement() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("classes");
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState({ show: false, type: "", data: null });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [searchTerm, setSearchTerm] = useState("");

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
      console.error(error);
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
      console.error(error);
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
      console.error(error);
    }
  };

  // Filter data based on search
  const filteredClasses = classes.filter(cls => 
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubjects = subjects.filter(subj => 
    subj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subj.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subj.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Determine if user can edit (admin or teacher)
  const canEdit = user?.role === 'admin' || user?.role === 'teacher';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">
          📚 Academic Management
        </h1>
        <p className="text-gray-600">
          {canEdit ? "Manage classes and subjects" : "View classes and subjects"}
        </p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div
          className={`mb-4 p-4 rounded-lg animate-fadeIn ${
            message.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => {
              setActiveTab("classes");
              setSearchTerm("");
            }}
            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
              activeTab === "classes"
                ? "border-b-3 border-blue-600 text-blue-600 bg-white"
                : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
            }`}
          >
            <Users className="w-5 h-5" />
            Classes
            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
              {classes.length}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("subjects");
              setSearchTerm("");
            }}
            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
              activeTab === "subjects"
                ? "border-b-3 border-blue-600 text-blue-600 bg-white"
                : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Subjects
            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
              {subjects.length}
            </span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-6 bg-gray-50 border-b flex flex-wrap gap-4 justify-between items-center">
          {/* Search Bar */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Add Button - Only for admin/teacher */}
          {canEdit && (
            <button
              onClick={() => handleEdit(activeTab === "classes" ? "class" : "subject", null)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Add {activeTab === "classes" ? "Class" : "Subject"}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-500">Loading...</p>
            </div>
          ) : activeTab === "classes" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  {searchTerm ? "No classes found matching your search" : "No classes available"}
                </div>
              ) : (
                filteredClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-800">{cls.name}</h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        Class
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Teacher: {cls.teacher_name || "Not assigned"}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Students: {cls.student_count || 0}
                      </p>
                    </div>
                    
                    {cls.description && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{cls.description}</p>
                    )}
                    
                    {canEdit && (
                      <div className="flex gap-2 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleEdit("class", cls)}
                          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete("class", cls.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubjects.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  {searchTerm ? "No subjects found matching your search" : "No subjects available"}
                </div>
              ) : (
                filteredSubjects.map((subj) => (
                  <div
                    key={subj.id}
                    className="border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-purple-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-800">{subj.name}</h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        Subject
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium text-blue-600">Code: {subj.code}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Teacher: {subj.teacher_name || "Not assigned"}
                      </p>
                    </div>
                    
                    {subj.description && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{subj.description}</p>
                    )}
                    
                    {canEdit && (
                      <div className="flex gap-2 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleEdit("subject", subj)}
                          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete("subject", subj.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                {editModal.data ? "Edit" : "Add"} {editModal.type}
              </h3>
              <button
                onClick={() => setEditModal({ show: false, type: "", data: null })}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {editModal.type === "class" ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Class Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editModal.data?.name || ""}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Grade 10A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={editModal.data?.description || ""}
                      rows="3"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional class description"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editModal.data?.name || ""}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Subject Code *
                    </label>
                    <input
                      type="text"
                      name="code"
                      defaultValue={editModal.data?.code || ""}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., MATH101"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={editModal.data?.description || ""}
                      rows="3"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional subject description"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
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