import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('sunset1.jpeg')" }}
    >
      <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl shadow-lg p-8 max-w-md w-full text-center animate-fadeIn">
        <h1 className="text-4xl font-bold mb-6 text-white">Welcome to APOLLO-KEY</h1>
        <p className="text-white mb-8">Your ultimate School Management System</p>
        <div className="flex flex-col gap-4">
          <Link
            to="/login"
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-bold transition"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="bg-green-500 hover:bg-green-600 text-white py-2 rounded font-bold transition"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
