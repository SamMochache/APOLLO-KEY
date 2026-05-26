/**
 * Unauthorized Page
 * Shown when user doesn't have required permissions
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@components/ui';
import { LockIcon } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <LockIcon className="h-8 w-8 text-yellow-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-8">
          You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
        </p>
        <Link to="/dashboard">
          <Button variant="primary" fullWidth>
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
