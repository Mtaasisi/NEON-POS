import React, { ReactNode } from 'react';

interface MobilePopupContainerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  leftButtonText?: string;
  leftButtonDisabled?: boolean;
  rightButtonText?: string;
  rightButtonDisabled?: boolean;
  onRightButtonClick?: () => void;
  children: ReactNode;
  showHomeIndicator?: boolean;
}

/**
 * MobilePopupContainer
 * 
 * A reusable popup container that exactly matches the iOS-style popup from the reference image.
 * 
 * Features:
 * - Full screen on mobile, centered modal on desktop
 * - iOS status bar spacer (44px)
 * - Header with left/right buttons and centered title/subtitle
 * - Scrollable content area
 * - iOS home indicator
 * - Smooth animations
 * 
 * Usage:
 * ```tsx
 * <MobilePopupContainer
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Add items"
 *   subtitle="TZS 0"
 *   leftButtonText="Cancel"
 *   rightButtonText="Add"
 *   onRightButtonClick={handleAdd}
 * >
 *   {/* Your content here *\/}
 * </MobilePopupContainer>
 * ```
 */
const MobilePopupContainer: React.FC<MobilePopupContainerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = '',
  leftButtonText = 'Cancel',
  leftButtonDisabled = false,
  rightButtonText = 'Done',
  rightButtonDisabled = false,
  onRightButtonClick,
  children,
  showHomeIndicator = true
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
        {/* Full screen on mobile, centered modal on desktop */}
        <div className="w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] bg-white sm:rounded-2xl flex flex-col sm:shadow-2xl animate-slide-up">
          
          {/* iOS Status Bar Spacer - 44px (h-11) */}
          <div className="h-11 bg-white flex-shrink-0 sm:hidden" />
          
          {/* Header Bar - Exact dimensions from image */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between h-11">
              {/* Left Button (Cancel) */}
              <button
                onClick={onClose}
                disabled={leftButtonDisabled}
                className="text-blue-500 font-normal text-[17px] disabled:opacity-50 min-w-[70px] text-left"
              >
                {leftButtonText}
              </button>

              {/* Center Title + Subtitle */}
              <div className="flex-1 text-center px-4">
                <h2 className="text-[17px] font-semibold text-gray-900 leading-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-[11px] text-gray-500 mt-0.5 font-normal">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Right Button (Add/Done) */}
              <button
                onClick={onRightButtonClick || onClose}
                disabled={rightButtonDisabled}
                className={`font-normal text-[17px] transition-colors min-w-[70px] text-right ${
                  rightButtonDisabled
                    ? 'text-gray-400'
                    : 'text-blue-500'
                }`}
              >
                {rightButtonText}
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto bg-white">
            {children}
          </div>

          {/* iOS Home Indicator - Black rounded line at bottom */}
          {showHomeIndicator && (
            <div className="flex-shrink-0 py-2 bg-white sm:hidden">
              <div className="w-32 h-1 bg-gray-300 rounded-full mx-auto" />
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Desktop fade-in animation */
        @media (min-width: 640px) {
          .animate-slide-up {
            animation: fade-in 0.2s ease-out;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default MobilePopupContainer;

