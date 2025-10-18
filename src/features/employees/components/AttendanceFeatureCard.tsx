import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AttendanceFeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText?: string;
  isAdded?: boolean;
  onClick?: () => void;
  className?: string;
}

const AttendanceFeatureCard: React.FC<AttendanceFeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  buttonText = '+ Add Integration',
  isAdded = false,
  onClick,
  className = ''
}) => {
  return (
    <div 
      className={`
        bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors
        ${isAdded ? 'bg-gray-50' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Icon and Title - Minimal Layout */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Action Button - Minimal */}
      <div className="mt-4">
        {isAdded ? (
          <div className="w-full px-3 py-2 bg-gray-100 rounded-md text-center">
            <span className="text-xs font-medium text-gray-700">Already Added</span>
          </div>
        ) : (
          <button 
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <span className="text-base">+</span>
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default AttendanceFeatureCard;
