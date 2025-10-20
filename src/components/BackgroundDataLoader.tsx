import React, { useState, useEffect, useContext } from 'react';
import { useInventoryStore } from '../features/lats/stores/useInventoryStore';
import { CustomersContext } from '../context/CustomersContext';
import { Package, CheckCircle, Users, Smartphone, Settings } from 'lucide-react';
import { useCyclingLoadingMessage } from '../hooks/useCyclingLoadingMessage';

const BackgroundDataLoader: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const { products, categories, suppliers, isLoading: storeLoading } = useInventoryStore();
  
  // Use useContext instead of useCustomers hook to avoid the provider requirement
  const customersContext = useContext(CustomersContext);
  const customers = customersContext?.customers || [];
  
  // Cycling loading messages
  const { currentMessage } = useCyclingLoadingMessage({
    enabled: isLoading,
    interval: 2500
  });

  // Track loading states for different data types
  const [dataStates, setDataStates] = useState({
    inventory: false,
    customers: false,
    devices: false,
    settings: false
  });

  useEffect(() => {
    // Check if data is being loaded
    if (storeLoading) {
      setIsLoading(true);
      setIsComplete(false);
      setProgress(0);
    } else if ((products?.length > 0) || (categories?.length > 0) || (suppliers?.length > 0) || (customers?.length > 0)) {
      // Data has been loaded
      setIsLoading(false);
      setIsComplete(true);
      setProgress(100);
      
      // Hide the indicator after 3 seconds
      setTimeout(() => {
        setIsComplete(false);
      }, 3000);
    }
  }, [storeLoading, products?.length, categories?.length, suppliers?.length, customers?.length]);

  // Calculate progress based on loaded data
  useEffect(() => {
    if (isLoading) {
      const totalItems = 6; // products, categories, suppliers, customers, devices, settings
      const loadedItems = [
        products?.length > 0,
        categories?.length > 0,
        suppliers?.length > 0,
        customers?.length > 0,
        dataStates.devices,
        dataStates.settings
      ].filter(Boolean).length;
      
      setProgress((loadedItems / totalItems) * 100);
    }
  }, [isLoading, products?.length, categories?.length, suppliers?.length, customers?.length, dataStates]);

  if (!isLoading && !isComplete) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 max-w-xs">
        <div className="flex items-center space-x-3">
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-700"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  {currentMessage.text}
                </p>
                <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                  <div 
                    className="bg-gray-700 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-gray-700" />
              <div>
                <p className="text-sm text-gray-700">Data loaded</p>
                <p className="text-xs text-gray-500">
                  {products?.length || 0} products • {customers?.length || 0} customers
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackgroundDataLoader;
