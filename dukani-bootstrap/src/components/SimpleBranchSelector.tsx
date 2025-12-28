/**
 * SimpleBranchSelector Component - Bootstrap Version
 * Simplified branch selector for bootstrap
 */

import React, { useState } from 'react';

const SimpleBranchSelector: React.FC = () => {
  const [selectedBranch, setSelectedBranch] = useState('Main Branch');
  const [isOpen, setIsOpen] = useState(false);

  const branches = [
    'Main Branch',
    'Downtown Store',
    'Mall Location',
    'Warehouse'
  ];

  const handleBranchSelect = (branch: string) => {
    setSelectedBranch(branch);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-sm font-medium text-gray-700">{selectedBranch}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {branches.map((branch) => (
              <button
                key={branch}
                onClick={() => handleBranchSelect(branch)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                  branch === selectedBranch ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    branch === selectedBranch ? 'bg-blue-500' : 'bg-gray-300'
                  }`}></div>
                  {branch}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleBranchSelector;
