import React, { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  respectsSidebar?: boolean;
}

const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'lg',
  showCloseButton = true,
  closeOnBackdropClick = true,
  respectsSidebar = true
}) => {
  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  // Size mappings
  const sizeClasses = {
    sm: 'max-w-[95vw] sm:max-w-md',
    md: 'max-w-[95vw] sm:max-w-lg md:max-w-2xl',
    lg: 'max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl',
    xl: 'max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl',
    full: 'max-w-[95vw]'
  };

  const backdropStyle = respectsSidebar ? {
    left: 'var(--sidebar-width, 0px)',
    top: 'var(--topbar-height, 64px)',
    right: 0,
    bottom: 0
  } : undefined;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed bg-black/50 z-[35]"
        onClick={closeOnBackdropClick ? onClose : undefined}
        style={backdropStyle}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed flex items-center justify-center p-2 sm:p-4 z-[50] pointer-events-none"
        style={backdropStyle}
      >
        <div 
          className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[95vh] overflow-hidden flex flex-col pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                {icon && (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    {icon}
                  </div>
                )}
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h3>
                  {subtitle && (
                    <p className="text-xs text-gray-500 hidden sm:block">{subtitle}</p>
                  )}
                </div>
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {children}
            </div>
          </div>

          {/* Fixed Footer (if provided) */}
          {footer && (
            <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ResponsiveModal;

