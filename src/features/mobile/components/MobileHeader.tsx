import React, { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  action?: ReactNode;
  centerTitle?: boolean;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  title, 
  subtitle, 
  showBack = false, 
  onBack,
  action,
  centerTitle = false,
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
    <div className="bg-white border-b border-neutral-200 px-4 py-3 safe-area-inset-top">
      <div className={`flex items-center ${
        centerTitle ? 'justify-between relative' : 'justify-start gap-3'
      }`}>
          {showBack && (
            <button 
              onClick={handleBack}
            className="flex items-center gap-1 text-primary-500 active:text-primary-600 transition-colors"
            >
            <ArrowLeft size={20} strokeWidth={2.5} />
            {!centerTitle && <span className="text-[17px]">Back</span>}
            </button>
          )}
        {centerTitle && (
          <h1 className="text-[17px] font-semibold text-neutral-900 absolute left-1/2 transform -translate-x-1/2">
            {title}
          </h1>
        )}
        <div className={`flex-1 min-w-0 ${showBack && !centerTitle ? 'ml-3' : ''}`}>
          {!centerTitle && (
            <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight truncate">{title}</h1>
          )}
            {subtitle && (
            <p className="text-[15px] text-neutral-500 mt-0.5 truncate">{subtitle}</p>
            )}
        </div>
        {action && <div className={`flex-shrink-0 ${centerTitle ? '' : 'ml-3'}`}>{action}</div>}
        {centerTitle && !action && <div className="w-[50px]" /> /* Placeholder for spacing */}
      </div>
    </div>
  );
};

export default MobileHeader;
