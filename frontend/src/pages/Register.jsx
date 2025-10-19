import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Register() {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    password2: "",
    role: "student",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(
        formData.email,
        formData.username,
        formData.password,
        formData.password2,
        formData.role
      );

      // Redirect to login after successful registration
      navigate("/login");
    } catch (err) {
      setError(err.detail || "Registration failed");
    }
  };

  return (
    <div
      className="h-screen w-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url('/public/laake.jpg')` }}
    >
      <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl shadow-lg p-8 max-w-full sm:max-w-md w-full mx-4 sm:mx-0 animate-fadeIn">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">
          Register
        </h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="p-3 rounded bg-white/50 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="username"
            placeholder="Username"
            className="p-3 rounded bg-white/50 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="p-3 rounded bg-white/50 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password2"
            placeholder="Confirm Password"
            className="p-3 rounded bg-white/50 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={formData.password2}
            onChange={handleChange}
            required
          />
          <select
            name="role"
            className="p-3 rounded bg-white/50 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white py-2 rounded font-bold transform hover:scale-105 transition"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
}
