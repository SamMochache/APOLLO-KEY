import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { AuthContext } from "../context/AuthContext";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const roleMessages = {
    admin: "Admins only! This section is restricted to system administrators.",
    teacher: "Teachers only! Students and parents can’t access this area.",
    student: "Students can’t access this section. Please go back to your dashboard.",
    parent: "Parents can’t access this section. Please return to your dashboard.",
    staff: "Staff only! Please contact admin if you need elevated access.",
  };

  const userRole = user?.role || "guest";
  const message =
    roleMessages[userRole] ||
    "You don’t have permission to access this page.";

  // Determine where to redirect
  const redirectRoutes = {
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
    parent: "/parent",
    staff: "/staff",
    guest: "/login",
  };

  const redirectPath = redirectRoutes[userRole] || "/dashboard";

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(redirectPath);
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate, redirectPath]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="bg-gray-800 shadow-2xl rounded-2xl p-10 text-center max-w-md border border-gray-700">
        <div className="flex justify-center mb-6">
          <div className="bg-red-500/20 p-4 rounded-full">
            <ShieldAlert className="text-red-400 w-12 h-12" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-3">
          Access Denied ❌
        </h1>
        <p className="text-gray-400 mb-4">{message}</p>
        <p className="text-sm text-gray-500 mb-8">
          Redirecting you to your dashboard in 5 seconds...
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-5 rounded-lg transition-all"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate(redirectPath)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg transition-all"
          >
            Go Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
