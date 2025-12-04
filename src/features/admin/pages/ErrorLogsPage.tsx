/**
 * Error Logs Management Page
 * 
 * Admin page for viewing and managing cache error logs from offline operations
 */

import React from 'react';
import { CacheErrorLogViewer } from '../../../components/CacheErrorLogViewer';

export const ErrorLogsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CacheErrorLogViewer />
    </div>
  );
};

export default ErrorLogsPage;

