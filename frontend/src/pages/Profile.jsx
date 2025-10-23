import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
  const [username, setUsername] = useState(user?.username || "");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [preview, setPreview] = useState(user?.profile_photo || null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!user) return <p className="p-4 text-gray-600">Loading...</p>;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setProfilePhoto(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("username", username);
    if (profilePhoto) formData.append("profile_photo", profilePhoto);

    try {
      await api.put("/auth/me/update/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Profile updated successfully!");
    } catch (err) {
      setMessage("Failed to update profile.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-lg mx-auto bg-white shadow-lg rounded-2xl p-6">
        <h1 className="text-3xl font-bold mb-4 text-center">My Profile</h1>

        <div className="flex flex-col items-center mb-6">
          {preview ? (
            <img
              src={preview}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
            />
          ) : (
            <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center text-3xl text-gray-700">
              {user.username?.charAt(0).toUpperCase()}
            </div>
          )}

          <label
            htmlFor="file"
            className="mt-3 text-blue-600 cursor-pointer hover:underline"
          >
            Change Photo
          </label>
          <input
            id="file"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full p-3 border rounded-lg bg-gray-100"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Role</label>
            <input
              type="text"
              value={user.role}
              disabled
              className="w-full p-3 border rounded-lg bg-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition transform hover:scale-105"
          >
            {loading ? "Updating..." : "Save Changes"}
          </button>

          {message && (
            <p className="text-center mt-4 text-sm text-gray-700">{message}</p>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={logout}
            className="text-red-600 hover:underline text-sm font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
