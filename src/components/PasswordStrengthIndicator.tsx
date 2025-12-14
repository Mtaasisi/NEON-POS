/**
 * Password Strength Indicator Component
 * 
 * Visual feedback for password strength with real-time validation
 */

import React, { useEffect, useState } from 'react';
import { 
  validatePassword, 
  getPasswordStrengthColor,
  getPasswordRequirementsText,
  DEFAULT_PASSWORD_POLICY,
  type PasswordValidationResult,
  type PasswordPolicyConfig
} from '../utils/passwordPolicy';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  policy?: PasswordPolicyConfig;
  userData?: string[]; // User's name, email etc to prevent personal info in password
  showRequirements?: boolean;
  onChange?: (result: PasswordValidationResult) => void;
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  policy = DEFAULT_PASSWORD_POLICY,
  userData = [],
  showRequirements = true,
  onChange,
  className = ''
}) => {
  const [validation, setValidation] = useState<PasswordValidationResult | null>(null);

  useEffect(() => {
    if (!password) {
      setValidation(null);
      onChange?.(null as any);
      return;
    }

    const result = validatePassword(password, policy, userData);
    setValidation(result);
    onChange?.(result);
  }, [password, policy, userData, onChange]);

  if (!password) {
    return null;
  }

  const strengthColor = getPasswordStrengthColor(validation?.score || 0);
  const requirements = getPasswordRequirementsText(policy);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Password Strength:</span>
          <span className={`font-medium ${strengthColor.text}`}>
            {strengthColor.label}
          </span>
        </div>
        
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strengthColor.bg}`}
            style={{ width: `${((validation?.score || 0) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Feedback Messages */}
      {validation && validation.feedback.length > 0 && (
        <div className="space-y-1">
          {validation.feedback.map((message, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Requirements Checklist */}
      {showRequirements && validation && (
        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
          <p className="text-sm font-medium text-gray-700">Password Requirements:</p>
          <div className="space-y-1">
            <RequirementItem
              met={validation.requirements.minLength}
              text={`At least ${policy.minLength} characters`}
            />
            
            {policy.requireUppercase && (
              <RequirementItem
                met={validation.requirements.hasUppercase}
                text="One uppercase letter (A-Z)"
              />
            )}
            
            {policy.requireLowercase && (
              <RequirementItem
                met={validation.requirements.hasLowercase}
                text="One lowercase letter (a-z)"
              />
            )}
            
            {policy.requireNumber && (
              <RequirementItem
                met={validation.requirements.hasNumber}
                text="One number (0-9)"
              />
            )}
            
            {policy.requireSpecialChar && (
              <RequirementItem
                met={validation.requirements.hasSpecialChar}
                text="One special character (!@#$%^&*...)"
              />
            )}
            
            {policy.preventCommon && (
              <RequirementItem
                met={validation.requirements.notCommon}
                text="Not a common password"
              />
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {validation?.isValid && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
          <CheckCircle className="w-4 h-4" />
          <span>Password meets all requirements!</span>
        </div>
      )}
    </div>
  );
};

const RequirementItem: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
  <div className="flex items-center gap-2 text-sm">
    {met ? (
      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
    ) : (
      <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
    )}
    <span className={met ? 'text-green-700' : 'text-gray-600'}>{text}</span>
  </div>
);

export default PasswordStrengthIndicator;

