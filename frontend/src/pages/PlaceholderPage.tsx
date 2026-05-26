/**
 * Placeholder Page Component
 * Used for pages that need to be implemented
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  const location = useLocation();
  const pageTitle = title || location.pathname.split('/').pop() || 'Page';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 capitalize">{pageTitle}</h1>
        <p className="text-gray-600 mt-2">This page is under development.</p>
      </div>

      <Card>
        <CardContent className="pt-12 flex flex-col items-center justify-center text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Construction className="h-8 w-8 text-gray-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-gray-600">We're working on this feature. Check back soon!</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
