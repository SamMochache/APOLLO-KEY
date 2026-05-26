/**
 * Sidebar Component
 * Navigation sidebar for authenticated users
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  ChevronDown,
  X,
} from 'lucide-react';
import { useAuth } from '@hooks';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Academics',
    href: '/academics',
    icon: <BookOpen className="h-5 w-5" />,
    roles: ['admin', 'teacher'],
  },
  {
    label: 'Attendance',
    href: '/attendance',
    icon: <CalendarDays className="h-5 w-5" />,
    roles: ['admin', 'teacher'],
  },
  {
    label: 'Grades',
    href: '/grades/entry',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['admin', 'teacher'],
  },
  {
    label: 'Analytics',
    href: '/analytics/performance',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['parent', 'student'],
  },
  {
    label: 'Messages',
    href: '/messages',
    icon: <MessageSquare className="h-5 w-5" />,
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  });

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 w-64 overflow-y-auto transition-transform z-40 lg:relative lg:top-0 lg:h-screen lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center lg:hidden">
            <h2 className="font-semibold text-gray-900">Navigation</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2">
            {filteredItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive(item.href)
                    ? 'bg-primary-50 text-primary-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};
