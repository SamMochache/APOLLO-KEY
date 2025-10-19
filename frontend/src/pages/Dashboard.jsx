import React from "react";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = React.useContext(AuthContext);

  if (!user) return <p className="p-4 text-gray-600">Loading user...</p>;


  const sections = {
    admin: [
      { title: "Manage Users", description: "Add, edit or remove users", color: "bg-blue-500" },
      { title: "System Settings", description: "Configure the system", color: "bg-purple-500" },
      { title: "Reports", description: "View reports and analytics", color: "bg-green-500" },
    ],
    teacher: [
      { title: "My Classes", description: "View and manage your classes", color: "bg-blue-500" },
      { title: "Assignments", description: "Create and grade assignments", color: "bg-purple-500" },
    ],
    student: [
      { title: "Courses", description: "View your enrolled courses", color: "bg-blue-500" },
      { title: "Assignments", description: "Check and submit assignments", color: "bg-purple-500" },
    ],
    parent: [
      { title: "Child Progress", description: "Monitor your child's performance", color: "bg-blue-500" },
      { title: "School Updates", description: "View announcements and events", color: "bg-purple-500" },
    ],
    staff: [
      { title: "Admin Tools", description: "Access administrative tools", color: "bg-blue-500" },
      { title: "Reports", description: "Generate and view reports", color: "bg-purple-500" },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Welcome, {user.username}</h1>
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded font-semibold transition transform hover:scale-105"
        >
          Logout
        </button>
      </div>

      <p className="mb-6 text-gray-700">Role: {user.role}</p>

      {/* Dashboard cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {sections[user.role]?.map((section, idx) => (
          <div
            key={idx}
            className={`${section.color} text-white rounded-xl p-6 shadow-lg transform transition hover:scale-105`}
          >
            <h2 className="text-xl font-bold mb-2">{section.title}</h2>
            <p>{section.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
