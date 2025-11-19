import React from 'react';
import { BackButton } from '../../shared/components/ui/BackButton';
import ExpenseManagement from '../components/ExpenseManagement';

const ExpensesPage: React.FC = () => {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <BackButton />
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Expense Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Track and manage all your business expenses
            </p>
          </div>
        </div>

        {/* Expense Management Component */}
        <ExpenseManagement />
      </div>
    </div>
  );
};

export default ExpensesPage;

