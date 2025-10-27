// frontend/src/pages/ResetPassword.jsx
import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== newPassword2) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/password-reset-confirm/", {
        uid,
        token,
        new_password: newPassword,
        new_password2: newPassword2,
      });
      setMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.token?.[0] || 
                       err.response?.data?.uid?.[0] || 
                       "Invalid or expired reset link. Please request a new one.";
      setError(errorMsg);
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
          Reset Your Password
        </h2>
        <p className="text-white/90 text-sm text-center mb-6">
          Enter your new password below
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
            type="password"
            placeholder="New Password"
            className="p-3 rounded bg-white/50 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />

          <input
            type="password"
            placeholder="Confirm New Password"
            className="p-3 rounded bg-white/50 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
            required
            minLength={8}
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-3 rounded font-bold transform hover:scale-105 transition"
          >
            {loading ? "Resetting..." : "Reset Password"}
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