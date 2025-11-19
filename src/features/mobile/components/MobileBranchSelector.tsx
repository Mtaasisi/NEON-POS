import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useMobileBranch } from '../hooks/useMobileBranch';

interface MobileBranchSelectorProps {
  className?: string;
}

/**
 * Mobile branch selector component - iOS 17 style
 * Allows users to switch between branches in the mobile app
 */
const MobileBranchSelector: React.FC<MobileBranchSelectorProps> = ({ className = '' }) => {
  const { currentBranch, availableBranches, loading, switchBranch } = useMobileBranch();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const dropdownWidth = Math.max(rect.width, 280); // At least 280px wide
      const leftPosition = Math.min(rect.left, viewportWidth - dropdownWidth - 16); // 16px margin from edge
      
      setDropdownPosition({
        top: rect.bottom, // No gap - joined to button
        left: leftPosition,
        width: dropdownWidth
      });
    }
  }, [isOpen]);

  if (loading || !currentBranch) {
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
        <div className="animate-pulse h-4 bg-gray-200 rounded-md w-32"></div>
      </div>
    );
  }

  // If only one branch, show it without dropdown (iOS 17 search style)
  if (availableBranches.length <= 1) {
    return (
      <div className={`flex items-center px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-normal text-gray-900 truncate">
            {currentBranch.name}
          </div>
        </div>
      </div>
    );
  }

  const handleBranchSelect = async (branchId: string) => {
    await switchBranch(branchId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Branch Selector Button - iOS 17 Search Style */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 shadow-sm active:bg-gray-50 transition-all ${
          isOpen 
            ? 'rounded-t-xl border-b-0' // Joined top, no bottom border when open
            : 'rounded-xl' // Fully rounded when closed
        } ${className}`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[15px] font-normal text-gray-900 truncate">
            {currentBranch.name}
          </div>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          strokeWidth={2} 
        />
      </button>

      {/* Dropdown Menu - iOS 17 Search Style (drops down from button) */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
        <div 
            className="fixed inset-0 z-[9998]"
          onClick={() => setIsOpen(false)}
            style={{ backgroundColor: 'transparent' }}
          />
          
          {/* Dropdown - Joined to Button */}
          <div 
            className="fixed z-[9999] bg-white rounded-b-xl border border-gray-200 border-t-0 shadow-2xl overflow-hidden animate-dropdown"
            style={{ 
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxHeight: '320px'
            }}
          >
            {/* Branch List - Scrollable */}
            <div className="overflow-y-auto max-h-[320px]">
              {availableBranches.map((branch, index) => {
                const isSelected = branch.id === currentBranch.id;
                const isLast = index === availableBranches.length - 1;

                return (
                  <button
                    key={branch.id}
                    onClick={() => handleBranchSelect(branch.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 active:bg-gray-50 transition-colors ${
                      !isLast ? 'border-b border-gray-100' : ''
                    } ${isSelected ? 'bg-blue-50/50' : 'bg-white'}`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {/* Branch Info */}
                    <div className="flex-1 text-left pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[15px] ${
                          isSelected ? 'font-medium text-gray-900' : 'font-normal text-gray-900'
                        }`}>
                          {branch.name}
                        </span>
                        {branch.is_main && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-bold uppercase rounded">
                            MAIN
                          </span>
                        )}
                      </div>
                      {branch.city && (
                        <div className="text-[13px] text-gray-500 mt-0.5">
                          {branch.city}
                          {branch.code && ` • ${branch.code}`}
                        </div>
                      )}
                    </div>

                    {/* Selected Check - iOS 17 Style */}
                    {isSelected && (
                      <Check 
                        size={18} 
                        className="text-blue-500 flex-shrink-0" 
                        strokeWidth={2.5} 
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes dropdown {
          from {
            opacity: 0;
            transform: scaleY(0.95);
            transform-origin: top;
          }
          to {
            opacity: 1;
            transform: scaleY(1);
            transform-origin: top;
          }
        }
        .animate-dropdown {
          animation: dropdown 0.15s ease-out;
        }
      `}</style>
    </>
  );
};

export default MobileBranchSelector;

