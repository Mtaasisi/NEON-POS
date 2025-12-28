import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: string;
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({ 
  content, 
  position = 'top',
  maxWidth = '300px'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && buttonRef.current) {
      const tooltip = tooltipRef.current;
      const button = buttonRef.current;
      const rect = button.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      // Check if tooltip goes off screen and adjust position
      let newPosition = position;
      
      if (position === 'top' && rect.top < tooltipRect.height + 10) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && window.innerHeight - rect.bottom < tooltipRect.height + 10) {
        newPosition = 'top';
      } else if (position === 'left' && rect.left < tooltipRect.width + 10) {
        newPosition = 'right';
      } else if (position === 'right' && window.innerWidth - rect.right < tooltipRect.width + 10) {
        newPosition = 'left';
      }
      
      setAdjustedPosition(newPosition);
    }
  }, [isVisible, position]);

  const getPositionClasses = () => {
    switch (adjustedPosition) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (adjustedPosition) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent';
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
        className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-[9999] ${getPositionClasses()}`}
          style={{ maxWidth }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tooltip Content */}
          <div className="bg-gray-900 text-white text-sm rounded-lg shadow-xl p-3 leading-relaxed">
            {typeof content === 'string' ? (
              <p className="whitespace-pre-line">{content}</p>
            ) : (
              content
            )}
          </div>
          
          {/* Arrow */}
          <div 
            className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}
          />
        </div>
      )}
    </div>
  );
};

export default HelpTooltip;

