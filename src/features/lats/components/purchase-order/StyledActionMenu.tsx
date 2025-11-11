import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Copy, FileText, CreditCard, PackageCheck } from 'lucide-react';

export interface ActionMenuItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
  onClick: () => void;
  divider?: boolean; // Show a divider before this item
}

interface StyledActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
  items?: ActionMenuItem[];
  triggerRef?: React.RefObject<HTMLElement>;
}

const defaultItems: ActionMenuItem[] = [
  {
    id: 'view',
    label: 'View Details',
    description: 'See complete order information',
    icon: <Eye className="w-5 h-5" />,
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-50',
    onClick: () => console.log('View details')
  },
  {
    id: 'duplicate',
    label: 'Duplicate Order',
    description: 'Create a copy of this order',
    icon: <Copy className="w-5 h-5" />,
    color: 'bg-purple-500',
    hoverColor: 'hover:bg-purple-50',
    onClick: () => console.log('Duplicate')
  },
  {
    id: 'pdf',
    label: 'Generate PDF',
    description: 'Download order as PDF document',
    icon: <FileText className="w-5 h-5" />,
    color: 'bg-orange-500',
    hoverColor: 'hover:bg-orange-50',
    onClick: () => console.log('Generate PDF')
  },
  {
    id: 'payment',
    label: 'Manage Payment',
    description: 'Record or update payment status',
    icon: <CreditCard className="w-5 h-5" />,
    color: 'bg-indigo-500',
    hoverColor: 'hover:bg-indigo-50',
    onClick: () => console.log('Manage payment')
  },
  {
    id: 'quality',
    label: 'Quality Check',
    description: 'Mark items as quality verified',
    icon: <PackageCheck className="w-5 h-5" />,
    color: 'bg-teal-500',
    hoverColor: 'hover:bg-teal-50',
    onClick: () => console.log('Quality check')
  }
];

const StyledActionMenu: React.FC<StyledActionMenuProps> = ({ 
  isOpen, 
  onClose, 
  position = 'right',
  items = defaultItems,
  triggerRef
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, right: 'auto' });
  const closingRef = useRef(false); // Prevent duplicate close calls

  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 320; // w-80 = 20rem = 320px
      const spacing = 12; // mt-3 = 12px

      let left = 'auto';
      let right = 'auto';
      
      if (position === 'right') {
        // Align to the right edge of trigger
        right = `${window.innerWidth - triggerRect.right}px`;
      } else {
        // Align to the left edge of trigger
        left = `${triggerRect.left}px`;
      }

      setMenuPosition({
        top: triggerRect.bottom + spacing,
        left: left as any,
        right: right as any
      });
      
      // Reset closing flag when menu opens
      closingRef.current = false;
    }
  }, [isOpen, triggerRef, position]);

  // Wrapped close handler to prevent duplicates
  const handleClose = useCallback(() => {
    if (closingRef.current) return; // Already closing
    closingRef.current = true;
    onClose();
    // Reset after a short delay
    setTimeout(() => {
      closingRef.current = false;
    }, 100);
  }, [onClose]);

  if (!isOpen) return null;

  const menuContent = (
    <>
      {/* Backdrop - transparent overlay to detect outside clicks */}
      <div 
        className="fixed inset-0 z-[998] bg-transparent" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }}
      />
      
      {/* Menu - Using fixed positioning */}
      <div 
        ref={menuRef}
        className="fixed w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[999] overflow-visible animate-in fade-in slide-in-from-top-2 duration-200"
        style={{
          top: `${menuPosition.top}px`,
          left: menuPosition.left !== 'auto' ? menuPosition.left : undefined,
          right: menuPosition.right !== 'auto' ? menuPosition.right : undefined,
          maxHeight: `calc(100vh - ${menuPosition.top}px - 20px)`,
          overflowY: 'auto'
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="py-3">
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {/* Divider */}
              {item.divider && (
                <div className="my-2 mx-4 border-t border-gray-200" />
              )}
              
              <button
                onClick={() => {
                  item.onClick();
                  handleClose();
                }}
                className={`w-full flex items-start gap-4 px-5 py-3.5 transition-all duration-200 ${item.hoverColor} group`}
              >
                {/* Circular Icon */}
                <div className={`${item.color} rounded-full p-2.5 flex-shrink-0 group-hover:scale-110 transition-transform duration-200 shadow-md`}>
                  <div className="text-white">
                    {item.icon}
                  </div>
                </div>
                
                {/* Text Content */}
                <div className="flex-1 text-left pt-0.5">
                  <div className="font-semibold text-gray-900 text-sm mb-0.5 group-hover:text-gray-900">
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    {item.description}
                  </div>
                </div>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );

  // Use portal to render at document body level
  return createPortal(menuContent, document.body);
};

export default StyledActionMenu;

