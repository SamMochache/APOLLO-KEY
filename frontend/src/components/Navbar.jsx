// src/components/Navbar.jsx
import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-blue-600">APOLLO-KEY</h1>

      {user && (
        <div className="flex items-center space-x-4">
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
