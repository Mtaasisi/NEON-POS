/**
 * MyAttendancePage - Bootstrap Version
 * Simplified attendance page for bootstrap
 */

import React from 'react';

const MyAttendancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Attendance</h1>
          <p className="text-gray-600">
            Track your attendance and work hours.
          </p>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Attendance Tracking</h3>
            <p className="text-gray-600">
              This feature is available in the full version of Dukani Pro.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAttendancePage;
