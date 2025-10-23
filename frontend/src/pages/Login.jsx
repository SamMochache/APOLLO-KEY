import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);

      const token = localStorage.getItem("access_token");
      let role = null;
      if (token) {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        role = decoded.role;
      }

      switch (role) {
        case "admin":
          navigate("/admin");
          break;
        case "teacher":
          navigate("/dashboard/teacher");
          break;
        case "student":
          navigate("/dashboard/student");
          break;
        case "parent":
          navigate("/dashboard/parent");
          break;
        case "staff":
          navigate("/dashboard/staff");
          break;
        default:
          navigate("/dashboard");
      }
    } catch (err) {
      setError(err.detail || "Login failed");
    }
  };

  return (
    <div
      className="h-screen w-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url('sunset1.jpeg')` }}
    >
      <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl shadow-lg p-8 max-w-full sm:max-w-sm w-full mx-4 animate-fadeIn">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">Login</h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="p-3 rounded bg-white/50 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="p-3 rounded bg-white/50 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-bold transform hover:scale-105 transition"
          >
            Login
          </button>
        </form>

        {/* Link to Register */}
        <div className="text-center mt-4 text-white">
          Don’t have an account?{" "}
          <Link to="/register" className="text-green-300 hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
