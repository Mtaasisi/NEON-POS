import React, { useState, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  content: ReactNode;
  validate?: () => boolean | Promise<boolean>;
  optional?: boolean;
}

interface FormWizardProps {
  steps: WizardStep[];
  onComplete: () => void;
  onCancel?: () => void;
  initialStep?: number;
  showProgress?: boolean;
  showStepList?: boolean;
  allowSkip?: boolean;
  className?: string;
}

const FormWizard: React.FC<FormWizardProps> = ({
  steps,
  onComplete,
  onCancel,
  initialStep = 0,
  showProgress = true,
  showStepList = true,
  allowSkip = false,
  className = '',
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [validationErrors, setValidationErrors] = useState<string | null>(null);

  const totalSteps = steps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = async () => {
    const currentStepData = steps[currentStep];
    
    // Validate current step if validation function exists
    if (currentStepData.validate) {
      try {
        const isValid = await currentStepData.validate();
        if (!isValid) {
          setValidationErrors('Please complete all required fields correctly');
          return;
        }
      } catch (error) {
        setValidationErrors('Validation failed. Please check your inputs.');
        return;
      }
    }

    setValidationErrors(null);
    setCompletedSteps(prev => new Set([...prev, currentStep]));

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setValidationErrors(null);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow clicking on completed steps or current step
    if (completedSteps.has(stepIndex) || stepIndex <= currentStep) {
      setValidationErrors(null);
      setCurrentStep(stepIndex);
    }
  };

  const handleSkip = () => {
    if (allowSkip && !isLastStep) {
      setValidationErrors(null);
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step List */}
      {showStepList && (
        <div className="flex items-center justify-between mb-6 overflow-x-auto">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === currentStep;
            const isAccessible = isCompleted || index <= currentStep;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={!isAccessible}
                  className={`flex flex-col items-center gap-2 min-w-[100px] transition-all ${
                    isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  {/* Step Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={20} />
                    ) : step.icon ? (
                      step.icon
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Step Title */}
                  <div className="text-center">
                    <div
                      className={`text-xs font-medium ${
                        isCurrent ? 'text-blue-600' : 'text-gray-600'
                      }`}
                    >
                      {step.title}
                    </div>
                    {step.optional && (
                      <div className="text-xs text-gray-400">(Optional)</div>
                    )}
                  </div>
                </button>

                {/* Connector Line */}
                {index < totalSteps - 1 && (
                  <div className="flex-1 mx-2">
                    <div
                      className={`h-1 rounded transition-all ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Current Step Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {steps[currentStep].title}
        </h2>
        {steps[currentStep].description && (
          <p className="text-gray-600">{steps[currentStep].description}</p>
        )}
      </div>

      {/* Validation Error */}
      {validationErrors && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{validationErrors}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto mb-6">
        {steps[currentStep].content}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex gap-3">
          {!isFirstStep && (
            <button
              type="button"
              onClick={handlePrevious}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={18} />
              Previous
            </button>
          )}

          {isFirstStep && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex gap-3">
          {allowSkip && !isLastStep && steps[currentStep].optional && (
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Skip
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {isLastStep ? (
              <>
                <Check size={18} />
                Complete
              </>
            ) : (
              <>
                Next
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormWizard;

