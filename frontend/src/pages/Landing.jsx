import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('sunset1.jpeg')" }}
    >
      {/* Top-right Login button */}
      <div className="absolute top-6 right-8">
        <Link
          to="/login"
          className="text-white border border-white px-4 py-2 rounded hover:bg-white hover:text-blue-600 transition"
        >
          Login
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl shadow-lg p-10 max-w-md w-full text-center animate-fadeIn">
        <h1 className="text-4xl font-bold mb-4 text-white">Welcome to APOLLO-KEY</h1>
        <p className="text-white mb-8 text-lg">Your ultimate School Management System</p>
        <Link
          to="/register"
          className="bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded font-bold text-lg transform hover:scale-105 transition"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
