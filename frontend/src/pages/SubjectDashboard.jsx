import { useEffect, useState } from "react";
import { getSubjects } from "../api/academicsApi";

export default function SubjectDashboard() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await getSubjects();
        console.log("API Response:", data); // Debug log
        
        // Handle both array and paginated response
        if (Array.isArray(data)) {
          setSubjects(data);
        } else if (data.results && Array.isArray(data.results)) {
          setSubjects(data.results);
        } else {
          setSubjects([]);
        }
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
        setError("Failed to load subjects");
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  if (loading) return <div className="p-6">Loading subjects...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">📚 Subjects</h1>
      {subjects.length === 0 ? (
        <p className="text-gray-500">No subjects found</p>
      ) : (
        <ul className="space-y-3">
          {subjects.map((subj) => (
            <li
              key={subj.id}
              className="p-4 bg-white rounded-2xl shadow-sm border hover:bg-gray-50 transition"
            >
              <p className="font-semibold">{subj.name}</p>
              <p className="text-sm text-gray-600">
                Code: {subj.code} | Teacher: {subj.teacher_name || "N/A"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}