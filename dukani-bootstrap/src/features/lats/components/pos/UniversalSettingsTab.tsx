// Universal Settings Tab Component
import React from 'react';
import { RefreshCw } from 'lucide-react';

interface UniversalSettingsTabProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onSave?: () => void;
  onReset?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  isLoading?: boolean;
}

const UniversalSettingsTab: React.FC<UniversalSettingsTabProps> = ({
  title,
  description,
  icon,
  children,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};

export default UniversalSettingsTab;
