import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  LogOut,
  CheckSquare,
  TrendingUp,
  Mail,
  Edit2,
} from "lucide-react";

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const navItems = {
    admin: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/academics", label: "Classes", icon: BookOpen },
      { to: "/timetable", label: "Timetable", icon: Calendar },
      { to: "/attendance", label: "Attendance", icon: CheckSquare },
      { to: "/grades/entry", label: "Grade Entry", icon: Edit2 },
      { to: "/grades/analytics", label: "Analytics", icon: TrendingUp },
      { to: "/messages", label: "Messages", icon: Mail },
    ],
    teacher: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/timetable", label: "Timetable", icon: Calendar },
      { to: "/attendance", label: "Attendance", icon: CheckSquare },
      { to: "/grades/entry", label: "Grade Entry", icon: Edit2 },
      { to: "/grades/analytics", label: "Analytics", icon: TrendingUp },
      { to: "/messages", label: "Messages", icon: Mail },
    ],
    student: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/timetable", label: "Schedule", icon: Calendar },
      { to: "/attendance", label: "Attendance", icon: CheckSquare },
      { to: "/messages", label: "Messages", icon: Mail },
    ],
    parent: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/parent-portal", label: "Parent Portal", icon: Users },
      { to: "/messages", label: "Messages", icon: Mail },
    ],
    staff: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/attendance", label: "Attendance", icon: CheckSquare },
      { to: "/messages", label: "Messages", icon: Mail },
    ],
  };

  const activePath = location.pathname;
  const links = navItems[user?.role] || [];

  return (
    <aside className="min-h-screen w-[220px] bg-[var(--bg-surface)] border-r border-[rgba(255,255,255,0.07)] p-5 flex flex-col justify-between">
      <div>
        <div className="mb-8 border-b border-[rgba(255,255,255,0.07)] pb-5">
          <span className="text-sm uppercase tracking-[0.24em] text-[var(--text-3)]">
            APOLLO·KEY
          </span>
          <h1 className="mt-4 text-2xl font-medium text-[var(--text-1)]">
            Management
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-[var(--text-3)]">
            {user?.role || "Guest"}
          </p>
        </div>

        <nav className="space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-3 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[var(--accent-dim)] text-[var(--text-1)] border-l-2 border-[var(--accent)]"
                    : "text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-[rgba(255,255,255,0.07)]">
        <div className="mb-4 text-sm text-[var(--text-2)]">Signed in as</div>
        <div className="rounded-[var(--radius-sm)] border border-[rgba(255,255,255,0.07)] bg-[var(--bg-surface-2)] p-4">
          <div className="text-sm font-medium text-[var(--text-1)]">{user?.username || "User"}</div>
          <div className="text-xs text-[var(--text-3)]">{user?.email || "no-email@apollo.com"}</div>
        </div>
        <button
          onClick={logout}
          className="mt-4 w-full btn-ghost text-[var(--text-1)]"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>
    </aside>
  );
}
