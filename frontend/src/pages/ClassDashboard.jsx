import { useEffect, useState } from "react";
import { getClasses } from "../api/academicsApi";

export default function ClassDashboard() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await getClasses();
        console.log("API Response:", data); // Debug log
        
        // Handle both array and paginated response
        if (Array.isArray(data)) {
          setClasses(data);
        } else if (data.results && Array.isArray(data.results)) {
          setClasses(data.results);
        } else {
          setClasses([]);
        }
      } catch (error) {
        console.error("Failed to fetch classes:", error);
        setError("Failed to load classes");
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  if (loading) return <div className="p-6">Loading classes...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">📘 Classes Overview</h1>
      {classes.length === 0 ? (
        <p className="text-gray-500">No classes found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="p-4 bg-white shadow rounded-2xl border hover:shadow-lg transition"
            >
              <h2 className="text-lg font-semibold">{cls.name}</h2>
              <p className="text-sm text-gray-600">
                Teacher: {cls.teacher_name || "N/A"}
              </p>
              <p className="text-sm text-gray-600">
                Students: {cls.student_count || 0}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}