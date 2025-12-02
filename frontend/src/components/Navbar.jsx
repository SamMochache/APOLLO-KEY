// frontend/src/components/Navbar.jsx - ADD UNREAD COUNTER
import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import UnreadMessageCounter from "./UnreadMessageCounter";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-blue-600">APOLLO-KEY</h1>

      {user && (
        <div className="flex items-center space-x-4">
          {/* Unread Message Counter */}
          <Link 
            to="/messages" 
            className="relative hover:bg-gray-100 p-2 rounded-lg transition"
            title="Messages"
          >
            <UnreadMessageCounter />
          </Link>
          
          <span className="text-gray-600">👋 {user.username}</span>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}