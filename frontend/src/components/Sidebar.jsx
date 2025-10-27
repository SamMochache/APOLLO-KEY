// src/components/Sidebar.jsx
import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Sidebar() {
  const { user } = useContext(AuthContext);

  const links = {
    admin: [
      { to: "/admin", label: "Dashboard" },
      { to: "/users", label: "Manage Users" },
      { to: "/reports", label: "Reports" },
      { to: "/classes", label: "Classes" },
      { to: "/subjects", label: "Subjects" },
      { to: "/timetable", label: "Timetable" },
    ],
    teacher: [
      { to: "/teacher", label: "My Classes" },
      { to: "/assignments", label: "Assignments" },
      { to: "/classes", label: "Classes" },
      { to: "/subjects", label: "Subjects" },
      { to: "/timetable", label: "Timetable" },
    ],
    student: [
      { to: "/student", label: "My Courses" },
      { to: "/tasks", label: "Assignments" },
      { to: "/classes", label: "Classes" },
      { to: "/subjects", label: "Subjects" },
      { to: "/timetable", label: "Timetable" },
    ],
    parent: [
      { to: "/parent", label: "Child Progress" },
      { to: "/updates", label: "School Updates" },
    ],
    staff: [
      { to: "/staff", label: "Admin Tools" },
      { to: "/reports", label: "Reports" },
    ],
  };

  const roleLinks = links[user?.role] || [];

  return (
    <aside className="bg-gray-800 text-white w-64 min-h-screen p-5 flex flex-col justify-between">
      <div>
        <h2 className="text-lg font-semibold mb-6 capitalize">{user?.role} Panel</h2>
        <ul className="space-y-3">
          {roleLinks.map((link, idx) => (
            <li key={idx}>
              <Link
                to={link.to}
                className="block p-2 rounded hover:bg-gray-700 transition"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* ✅ Universal Section at Bottom */}
      <div className="mt-8 border-t border-gray-700 pt-4">
        <ul className="space-y-3">
          <li>
            <Link
              to="/profile"
              className="block p-2 rounded hover:bg-gray-700 transition text-sm"
            >
              👤 My Profile
            </Link>
          </li>
          <li>
            <Link
              to="/logout"
              className="block p-2 rounded hover:bg-gray-700 transition text-sm text-red-400"
            >
              🚪 Logout
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  );
}
