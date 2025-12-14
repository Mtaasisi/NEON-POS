import React from 'react';
import { useError } from '../context/ErrorContext';
import ErrorPanel from './ErrorPanel';

/**
 * Error Manager Component
 * Displays error panels
 */
export const ErrorManager: React.FC = () => {
  const { showErrorPanel, currentError } = useError();

  return (
    <>
      {/* Error Panel */}
      {showErrorPanel && currentError && <ErrorPanel />}
    </>
  );
};

export default ErrorManager;

