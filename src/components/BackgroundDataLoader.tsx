import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '../features/lats/stores/useInventoryStore';

const BackgroundDataLoader: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const { isLoading: storeLoading } = useInventoryStore();

  useEffect(() => {
    // Show loading spinner when data is being loaded
    setIsLoading(storeLoading);
  }, [storeLoading]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-10">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500"></div>
          <p className="text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    </div>
  );
};

export default BackgroundDataLoader;
