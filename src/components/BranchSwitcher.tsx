/**
 * Branch Switcher Component
 * Shows current branch and allows switching with loading state
 */

import React from 'react';
import { useBranch } from '../context/BranchContext';
import { ChevronDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface BranchSwitcherProps {
  className?: string;
}

export const BranchSwitcher: React.FC<BranchSwitcherProps> = ({ className = '' }) => {
  const {
    currentBranch,
    availableBranches,
    switchingBranch,
    switchBranch,
    canAccessBranch
  } = useBranch();

  const [isOpen, setIsOpen] = React.useState(false);

  const handleBranchSwitch = async (branchId: string) => {
    setIsOpen(false);
    await switchBranch(branchId);
  };

  if (!currentBranch) {
    return (
      <div className={`flex items-center px-3 py-2 bg-gray-100 rounded-md ${className}`}>
        <span className="text-sm text-gray-500">Loading branches...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switchingBranch}
        className={`
          flex items-center justify-between w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${switchingBranch ? 'bg-blue-50 border-blue-200' : ''}
        `}
      >
        <div className="flex items-center space-x-2">
          {switchingBranch && (
            <ArrowPathIcon className="w-4 h-4 text-blue-600 animate-spin" />
          )}
          <span className={`text-sm font-medium ${switchingBranch ? 'text-blue-700' : 'text-gray-900'}`}>
            {switchingBranch ? 'Switching...' : currentBranch.name}
          </span>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 z-20 w-64 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
                Switch Branch
              </div>

              {availableBranches
                .filter(branch => canAccessBranch(branch.id))
                .map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => handleBranchSwitch(branch.id)}
                    disabled={switchingBranch || branch.id === currentBranch.id}
                    className={`
                      w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${branch.id === currentBranch.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span>{branch.name}</span>
                      {branch.id === currentBranch.id && (
                        <span className="text-xs text-blue-600">Current</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {branch.city}, {branch.address}
                    </div>
                  </button>
                ))}
            </div>

            {switchingBranch && (
              <div className="px-3 py-2 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Syncing data...</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BranchSwitcher;