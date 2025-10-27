import { useEffect, useState } from "react";
import { getTimetable } from "../api/academicsApi";

export default function TimetableDashboard() {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const data = await getTimetable();
        console.log("API Response:", data); // Debug log
        
        // Handle both array and paginated response
        if (Array.isArray(data)) {
          setTimetable(data);
        } else if (data.results && Array.isArray(data.results)) {
          setTimetable(data.results);
        } else {
          setTimetable([]);
        }
      } catch (error) {
        console.error("Failed to fetch timetable:", error);
        setError("Failed to load timetable");
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, []);

  if (loading) return <div className="p-6">Loading timetable...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">🕓 Timetable</h1>
      {timetable.length === 0 ? (
        <p className="text-gray-500">No timetable entries found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white border rounded-2xl shadow">
            <thead className="bg-gray-100 text-left text-sm uppercase text-gray-600">
              <tr>
                <th className="p-3">Day</th>
                <th className="p-3">Class</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Teacher</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {timetable.map((item) => (
                <tr key={item.id} className="border-b text-gray-700">
                  <td className="p-3">{item.day}</td>
                  <td className="p-3">{item.class_assigned_name}</td>
                  <td className="p-3">{item.subject_name}</td>
                  <td className="p-3">{item.teacher_name}</td>
                  <td className="p-3">
                    {item.start_time} - {item.end_time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}