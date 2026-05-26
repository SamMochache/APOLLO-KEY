/**
 * Navbar Component
 * Professional navigation bar for authenticated users
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '@hooks';
import { Button } from '@components/ui';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="h-16 px-6 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <Link to="/dashboard" className="flex items-center gap-2 hidden sm:flex">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AK</span>
            </div>
            <span className="font-semibold text-gray-900">Apollo Key</span>
          </Link>
        </div>

        {/* Right section - User menu */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-700">
                  {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.first_name || user?.username}
                </p>
                <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <div className="border-t border-gray-200 my-2" />
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-red-600 text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
