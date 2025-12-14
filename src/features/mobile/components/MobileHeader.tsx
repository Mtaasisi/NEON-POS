import React, { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  action?: ReactNode;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  title, 
  subtitle, 
  showBack = false, 
  onBack,
  action 
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBack && (
            <button 
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900 flex-shrink-0"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0 ml-3">{action}</div>}
      </div>
    </div>
  );
};

export default MobileHeader;

