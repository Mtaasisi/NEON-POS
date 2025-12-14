import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

/**
 * Global keyboard shortcut component for creating purchase orders
 * Listens for Ctrl+Shift+O (Windows/Linux) or Cmd+Shift+O (Mac)
 * O = Order
 */
const GlobalPurchaseOrderShortcut: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+O (Windows/Linux) or Cmd+Shift+O (Mac)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        event.stopPropagation();
        
        // Don't navigate if already on the PO create page
        if (location.pathname === '/lats/purchase-order/create') {
          toast('You are already on the Purchase Order page', { icon: '📋' });
          return;
        }
        
        // Navigate to purchase order creation page
        navigate('/lats/purchase-order/create');
        toast.success('Opening Purchase Order creation...', { icon: '🚀' });
      }
    };

    // Use capture phase to intercept before other handlers
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [navigate, location]);

  return null; // This component doesn't render anything
};

export default GlobalPurchaseOrderShortcut;

