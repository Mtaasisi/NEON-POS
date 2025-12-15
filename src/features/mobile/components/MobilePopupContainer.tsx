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
      <div className="fixed inset-0 z-50 flex items-end">
        {/* Full screen on mobile, centered modal on desktop */}
        <div className="w-full h-full bg-white rounded-t-3xl flex flex-col shadow-lg animate-slide-up">
          
          {/* iOS Status Bar Spacer - 44px (h-11) */}
          <div className="h-11 bg-white flex-shrink-0" />
          
          {/* Header Bar - Exact dimensions from image */}
          <div className="bg-white border-b border-neutral-200 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between h-[44px]">
              {/* Left Button (Cancel) */}
              <button
                onClick={onClose}
                disabled={leftButtonDisabled}
                className="text-primary-500 font-normal text-[17px] disabled:opacity-50 min-w-[70px] text-left"
              >
                {leftButtonText}
              </button>

              {/* Center Title + Subtitle */}
              <div className="flex-1 text-center px-4">
                <h2 className="text-[17px] font-semibold text-neutral-900 leading-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-[11px] text-neutral-500 mt-0.5 font-normal">
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
                    ? 'text-neutral-400'
                    : 'text-primary-500'
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
            <div className="flex-shrink-0 py-2 bg-white">
              <div className="w-[134px] h-[5px] bg-neutral-300 rounded-full mx-auto" />
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </>
  );
};

export default MobilePopupContainer;
