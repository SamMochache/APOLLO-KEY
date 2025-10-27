// frontend/src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await api.post("/auth/password-reset/", { email });
      setMessage(
        "If an account with that email exists, a password reset link has been sent. Please check your inbox."
      );
      setEmail("");
    } catch (err) {
      setError("Something went wrong. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-screen w-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url('/sunset1.jpeg')` }}
    >
      <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl shadow-lg p-8 max-w-md w-full mx-4 animate-fadeIn">
        <h2 className="text-2xl font-bold mb-2 text-white text-center">
          Forgot Password?
        </h2>
        <p className="text-white/90 text-sm text-center mb-6">
          Enter your email and we'll send you a reset link
        </p>

        {message && (
          <div className="bg-green-500/20 border border-green-400 text-white p-3 rounded mb-4 text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-400 text-white p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Enter your email"
            className="p-3 rounded bg-white/50 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-3 rounded font-bold transform hover:scale-105 transition"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="text-center mt-6 text-white">
          <Link to="/login" className="text-blue-300 hover:underline text-sm">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}