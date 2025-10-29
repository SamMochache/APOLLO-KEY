// src/components/Sidebar.jsx
import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  CalendarCog,
  ClipboardList,
  Settings,
  User,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const links = {
    admin: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/academics", label: "Classes & Subjects", icon: BookOpen },
      { to: "/timetable", label: "View Timetable", icon: Calendar },
      { to: "/timetable/builder", label: "Build Timetable", icon: CalendarCog },
      { to: "/users", label: "Manage Users", icon: Users },
      { to: "/reports", label: "Reports", icon: ClipboardList },
    ],
    teacher: [
      { to: "/dashboard", label: "My Dashboard", icon: LayoutDashboard },
      { to: "/academics", label: "Classes & Subjects", icon: BookOpen },
      { to: "/timetable", label: "My Timetable", icon: Calendar },
      { to: "/timetable/builder", label: "Manage Schedule", icon: CalendarCog },
    ],
    student: [
      { to: "/dashboard", label: "My Dashboard", icon: LayoutDashboard },
      { to: "/academics", label: "My Classes", icon: BookOpen },
      { to: "/timetable", label: "My Schedule", icon: Calendar },
      { to: "/tasks", label: "Assignments", icon: ClipboardList },
    ],
    parent: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/academics", label: "Child's Classes", icon: BookOpen },
      { to: "/updates", label: "School Updates", icon: ClipboardList },
    ],
    staff: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/academics", label: "Academic Info", icon: BookOpen },
      { to: "/reports", label: "Reports", icon: ClipboardList },
    ],
  };

  const roleLinks = links[user?.role] || [];

  return (
    <aside className="bg-gradient-to-b from-gray-900 to-gray-800 text-white w-64 min-h-screen p-5 flex flex-col justify-between shadow-xl">
      <div>
        {/* Logo/Brand */}
        <div className="mb-8 pb-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-blue-400">APOLLO-KEY</h2>
          <p className="text-xs text-gray-400 mt-1 capitalize">{user?.role} Panel</p>
        </div>

        {/* Navigation Links */}
        <nav>
          <ul className="space-y-2">
            {roleLinks.map((link, idx) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              
              return (
                <li key={idx}>
                  <Link
                    to={link.to}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg transition-all duration-200
                      ${active 
                        ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                        : 'hover:bg-gray-700 text-gray-300 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Bottom Section - Profile & Logout */}
      <div className="border-t border-gray-700 pt-4 space-y-2">
        <Link
          to="/profile"
          className={`
            flex items-center gap-3 p-3 rounded-lg transition-all duration-200
            ${isActive('/profile')
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'hover:bg-gray-700 text-gray-300 hover:text-white'
            }
          `}
        >
          <User className="w-5 h-5" />
          <span className="font-medium">My Profile</span>
        </Link>
        
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-red-600 text-gray-300 hover:text-white"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}