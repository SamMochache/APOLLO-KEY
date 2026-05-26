import React, { useState, useMemo } from 'react';
import { Award, Filter, Search, TrendingUp, Download } from 'lucide-react';

interface Props {
  gradesData?: any;
  loading?: boolean;
}

export default function ChildGradesTable({ gradesData, loading }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const grades = gradesData?.grades || [];
  const totalGrades = gradesData?.total_grades || 0;
  const averagePercentage = gradesData?.average_percentage || 0;

  const filteredGrades = useMemo(() => {
    if (!Array.isArray(grades) || grades.length === 0) return [];
    let filtered = [...grades];
    if (searchTerm) {
      filtered = filtered.filter(grade => {
        const assessmentName = grade?.assessment_name?.toLowerCase() || '';
        const subjectName = grade?.subject_name?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return assessmentName.includes(search) || subjectName.includes(search);
      });
    }
    if (filterType !== 'all') {
      filtered = filtered.filter(grade => grade?.assessment_type === filterType);
    }
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case 'date':
          aVal = new Date(a?.graded_at || 0);
          bVal = new Date(b?.graded_at || 0);
          break;
        case 'percentage':
          aVal = parseFloat(a?.percentage || 0);
          bVal = parseFloat(b?.percentage || 0);
          break;
        case 'subject':
          aVal = a?.subject_name || '';
          bVal = b?.subject_name || '';
          break;
        default:
          return 0;
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return filtered;
  }, [grades, searchTerm, filterType, sortBy, sortOrder]);

  const getGradeBadgeColor = (percentage: any) => {
    const pct = parseFloat(percentage);
    if (isNaN(pct)) return 'bg-gray-100 text-gray-800';
    if (pct >= 80) return 'bg-green-100 text-green-800';
    if (pct >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const exportToCSV = () => {
    if (!filteredGrades.length) return;
    const headers = ['Assessment', 'Subject', 'Type', 'Marks', 'Percentage', 'Grade', 'Date'];
    const rows = filteredGrades.map(g => [
      g?.assessment_name || '',
      g?.subject_name || '',
      g?.assessment_type || '',
      `${g?.marks_obtained || 0}/${g?.total_marks || 0}`,
      `${parseFloat(g?.percentage || 0).toFixed(1)}%`,
      g?.grade_letter || 'N/A',
      g?.graded_at ? new Date(g.graded_at).toLocaleDateString() : ''
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!gradesData || !grades || grades.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No grades available yet</p>
      </div>
    );
  }

  const assessmentTypes: string[] = Array.from(new Set(grades.map((g: any) => g?.assessment_type).filter(Boolean)));

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-600" />
              Grade History
            </h3>
            <p className="text-sm text-gray-600 mt-1">Total: {totalGrades} assessments</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Average Score</p>
            <p className="text-3xl font-bold text-blue-600">{averagePercentage.toFixed(1)}%</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search assessments or subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="all">All Types</option>
            {assessmentTypes.map((type: string) => (
              <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
            ))}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="date">Sort by Date</option>
            <option value="percentage">Sort by Score</option>
            <option value="subject">Sort by Subject</option>
          </select>

          <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition" title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}>
            <TrendingUp className={`w-4 h-4 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} />
          </button>

          <button onClick={exportToCSV} disabled={filteredGrades.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Assessment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Marks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Percentage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Grade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredGrades.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No grades match your filters</td>
              </tr>
            ) : (
              filteredGrades.map((grade: any, idx: number) => (
                <tr key={grade?.id || idx} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">{grade?.assessment_name || 'Unknown'}</div>
                    {grade?.remarks && (<div className="text-xs text-gray-500 mt-1">{grade.remarks}</div>)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{grade?.subject_name || 'N/A'}</td>
                  <td className="px-6 py-4"><span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{grade?.assessment_type || 'N/A'}</span></td>
                  <td className="px-6 py-4 text-sm font-medium">{grade?.is_absent ? (<span className="text-red-600">Absent</span>) : (`${grade?.marks_obtained || 0}/${grade?.total_marks || 0}`)}</td>
                  <td className="px-6 py-4">{grade?.is_absent ? (<span className="text-red-600 text-sm">N/A</span>) : (<span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getGradeBadgeColor(grade?.percentage)}`}>{parseFloat(grade?.percentage || 0).toFixed(1)}%</span>)}</td>
                  <td className="px-6 py-4"><span className="text-lg font-bold text-blue-600">{grade?.grade_letter || 'N/A'}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{grade?.graded_at ? new Date(grade.graded_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-600">Showing {filteredGrades.length} of {grades.length} grades</div>
    </div>
  );
}
