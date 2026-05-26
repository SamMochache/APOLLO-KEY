import React from 'react';
import { ChevronDown, User } from 'lucide-react';

interface Child {
  id: number;
  student: number;
  student_name: string;
  relationship_type_display: string;
  related_student?: { id: number; name: string } | null;
  is_primary_contact?: boolean;
}

interface Props {
  children: Child[];
  selectedChild: number | null;
  onChildChange: (id: number) => void;
  loading?: boolean;
}

export default function ChildSelector({ children, selectedChild, onChildChange, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <p className="text-yellow-800 flex items-center gap-2">
          <User className="w-5 h-5" />
          No children linked to your account. Contact your school administrator.
        </p>
      </div>
    );
  }

  const currentChild = children.find(c => c.student === selectedChild);

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6">
      <label className="block text-sm font-semibold mb-2 text-gray-700">
        Select Child
      </label>
      <div className="relative">
        <select
          className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer bg-white hover:border-blue-400 transition-colors"
          value={selectedChild || ''}
          onChange={(e) => onChildChange(parseInt(e.target.value))}
          disabled={children.length === 1}
        >
          {children.map(child => (
            <option 
              key={child.id} 
              value={child.student}
            >
              {child.student_name} ({child.relationship_type_display})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      {currentChild && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Relationship:</span>
            <span className="font-medium text-gray-800">
              {currentChild.relationship_type_display}
            </span>
          </div>
          {currentChild.is_primary_contact && (
            <div className="mt-1 text-xs text-blue-600 font-medium">
              ⭐ Primary Contact
            </div>
          )}
        </div>
      )}
    </div>
  );
}
