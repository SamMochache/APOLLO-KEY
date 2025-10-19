import React, { createContext, useState, useEffect } from "react";
import api from "../api/axios";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem("access_token");
      return token ? jwtDecode(token) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // ✅ Register
  const register = async (email, username, password, password2, role) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/register/", {
        email,
        username,
        password,
        password2,
        role,
      });
      return res.data;
    } catch (err) {
      throw err.response?.data || err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Login (includes username & role)
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/token/", { email, password });
      const { access, refresh, username, role } = res.data;

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      // Prefer backend’s response first, fallback to JWT decode
      const decoded = jwtDecode(access);
      setUser({
        username: username || decoded.username,
        role: role || decoded.role,
      });
    } catch (err) {
      console.error("Login failed:", err);
      throw err.response?.data || err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Logout
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  // ✅ Auto refresh token every 25 mins
  useEffect(() => {
    const interval = setInterval(async () => {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await api.post("/auth/token/refresh/", { refresh });
          const newAccess = res.data.access;
          localStorage.setItem("access_token", newAccess);

          const decoded = jwtDecode(newAccess);
          setUser(decoded);
        } catch (err) {
          console.warn("Auto refresh failed:", err);
          logout();
        }
      }
    }, 1000 * 60 * 25);

    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
