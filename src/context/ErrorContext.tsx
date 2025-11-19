import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

export interface ErrorDetails {
  id: string;
  title: string;
  message: string;
  code?: string;
  type: 'database' | 'network' | 'validation' | 'auth' | 'api' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  context?: string;
  stack?: string;
  fixSuggestions?: FixSuggestion[];
  technicalDetails?: Record<string, any>;
  affectedFeature?: string;
}

export interface FixSuggestion {
  title: string;
  description: string;
  steps: string[];
  sqlFix?: string;
  autoFixAvailable?: boolean;
  onAutoFix?: () => Promise<void>;
}

interface ErrorContextType {
  errors: ErrorDetails[];
  currentError: ErrorDetails | null;
  addError: (error: Partial<ErrorDetails>) => string;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  getErrorsByType: (type: ErrorDetails['type']) => ErrorDetails[];
  showErrorPanel: boolean;
  setShowErrorPanel: (show: boolean) => void;
  showDiagnostics: boolean;
  setShowDiagnostics: (show: boolean) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
  maxErrors?: number;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ 
  children,
  maxErrors = 50 
}) => {
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [currentError, setCurrentError] = useState<ErrorDetails | null>(null);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const addError = useCallback((error: Partial<ErrorDetails>): string => {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullError: ErrorDetails = {
      id: errorId,
      title: error.title || 'An error occurred',
      message: error.message || 'An unexpected error occurred',
      code: error.code,
      type: error.type || 'unknown',
      severity: error.severity || 'medium',
      timestamp: new Date(),
      context: error.context,
      stack: error.stack,
      fixSuggestions: error.fixSuggestions || [],
      technicalDetails: error.technicalDetails,
      affectedFeature: error.affectedFeature,
    };

    setErrors(prev => {
      const updated = [fullError, ...prev];
      // Keep only the most recent errors
      return updated.slice(0, maxErrors);
    });

    setCurrentError(fullError);
    
    // Auto-show error panel for high/critical errors
    if (fullError.severity === 'high' || fullError.severity === 'critical') {
      setShowErrorPanel(true);
    }

    // Show toast notification
    const toastMessage = `${fullError.title}: ${fullError.message}`;
    if (fullError.severity === 'critical') {
      toast.error(toastMessage, { duration: 6000 });
    } else if (fullError.severity === 'high') {
      toast.error(toastMessage, { duration: 4000 });
    } else if (fullError.severity === 'medium') {
      toast.error(toastMessage, { duration: 3000 });
    } else {
      toast(toastMessage, { duration: 2000 });
    }

    // Log to console
    console.group(`🚨 ${fullError.severity.toUpperCase()} Error: ${fullError.title}`);
    console.error('Message:', fullError.message);
    console.error('Type:', fullError.type);
    console.error('Code:', fullError.code);
    console.error('Context:', fullError.context);
    if (fullError.technicalDetails) {
      console.error('Technical Details:', fullError.technicalDetails);
    }
    if (fullError.stack) {
      console.error('Stack:', fullError.stack);
    }
    if (fullError.fixSuggestions?.length) {
      console.info('💡 Fix Suggestions:', fullError.fixSuggestions);
    }
    console.groupEnd();

    return errorId;
  }, [maxErrors]);

  const removeError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
    setCurrentError(prev => prev?.id === errorId ? null : prev);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
    setCurrentError(null);
    setShowErrorPanel(false);
  }, []);

  const getErrorsByType = useCallback((type: ErrorDetails['type']) => {
    return errors.filter(e => e.type === type);
  }, [errors]);

  const value: ErrorContextType = {
    errors,
    currentError,
    addError,
    removeError,
    clearErrors,
    getErrorsByType,
    showErrorPanel,
    setShowErrorPanel,
    showDiagnostics,
    setShowDiagnostics,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};

export default ErrorProvider;

