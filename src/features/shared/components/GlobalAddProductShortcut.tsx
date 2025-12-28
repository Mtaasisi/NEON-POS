import React, { useEffect } from 'react';

interface GlobalAddProductShortcutProps {
  onAddProduct: () => void;
  disabled?: boolean;
}

const GlobalAddProductShortcut: React.FC<GlobalAddProductShortcutProps> = ({
  onAddProduct,
  disabled = false
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+P (Windows/Linux) or Cmd+P (Mac) for Add Product
      if (!disabled && (event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        event.stopPropagation();
        console.log('🛠️ [GlobalAddProductShortcut] Ctrl+P pressed - opening add product modal');
        onAddProduct();
      }
    };

    // Use capture phase to intercept before other handlers
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onAddProduct, disabled]);

  return null; // This component doesn't render anything
};

export default GlobalAddProductShortcut;
