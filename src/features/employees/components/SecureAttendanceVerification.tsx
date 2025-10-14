import React, { useState } from 'react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import LocationVerification from './LocationVerification';
import NetworkVerification from './NetworkVerification';
import PhotoVerification from './PhotoVerification';
import AutoLocationVerification from './AutoLocationVerification';
import { Shield, CheckCircle, Lock, Target, MapPin, Wifi, Camera, X, RotateCcw, ArrowLeft, SkipForward } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAttendanceSettings } from '../../../hooks/useAttendanceSettings';

interface SecureAttendanceVerificationProps {
  onAllVerificationsComplete: () => void;
  onVerificationFailed: () => void;
  employeeName: string;
  officeLocation: {
    lat: number;
    lng: number;
    radius: number;
    address: string;
  };
  officeNetworks: {
    ssid: string;
    bssid?: string;
    description: string;
  }[];
}

type VerificationStep = 'location' | 'network' | 'photo' | 'complete';

interface VerificationStatus {
  location: boolean;
  network: boolean;
  photo: boolean;
}

const SecureAttendanceVerification: React.FC<SecureAttendanceVerificationProps> = ({
  onAllVerificationsComplete,
  onVerificationFailed,
  employeeName,
  officeLocation,
  officeNetworks
}) => {
  const { settings: attendanceSettings } = useAttendanceSettings();
  
  // Employee's selected security mode (stored in localStorage)
  const [selectedSecurityMode, setSelectedSecurityMode] = useState<string>(() => {
    if (attendanceSettings.allowEmployeeChoice) {
      const saved = localStorage.getItem('employeeSecurityMode');
      return saved || attendanceSettings.defaultSecurityMode;
    }
    return attendanceSettings.defaultSecurityMode;
  });

  const [showModeSelector, setShowModeSelector] = useState(false);
  
  // Determine initial step based on security mode
  const getInitialStepForMode = () => {
    const mode = selectedSecurityMode;
    if (mode === 'photo-only') return 'photo';
    if (mode === 'wifi-only') return 'network';
    return 'location'; // For all location-based modes
  };
  
  const [currentStep, setCurrentStep] = useState<VerificationStep>(getInitialStepForMode());
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    location: false,
    network: false,
    photo: false
  });
  const requiresLocation = 
    selectedSecurityMode === 'auto-location' || 
    selectedSecurityMode === 'manual-location' || 
    selectedSecurityMode === 'location-and-wifi' || 
    selectedSecurityMode === 'all-security';
    
  const requiresNetwork = 
    selectedSecurityMode === 'wifi-only' || 
    selectedSecurityMode === 'location-and-wifi' || 
    selectedSecurityMode === 'all-security';
    
  const requiresPhoto = 
    attendanceSettings.requirePhoto && (
      selectedSecurityMode === 'photo-only' || 
      selectedSecurityMode === 'all-security' ||
      selectedSecurityMode === 'auto-location' ||
      selectedSecurityMode === 'manual-location' ||
      selectedSecurityMode === 'wifi-only' ||
      selectedSecurityMode === 'location-and-wifi'
    );

  // State for auto-detected office
  const [detectedOffice, setDetectedOffice] = useState<any>(null);

  const handleLocationSuccess = () => {
    setVerificationStatus(prev => ({ ...prev, location: true }));
    
    // Determine next step based on requirements
    if (requiresNetwork) {
      setCurrentStep('network');
      toast.success('Location verified! Moving to network verification.');
    } else if (requiresPhoto) {
      setCurrentStep('photo');
      toast.success('Location verified! Moving to photo verification.');
    } else {
      setCurrentStep('complete');
      toast.success('Location verified! All checks complete.');
      onAllVerificationsComplete();
    }
  };

  const handleLocationFailed = () => {
    setVerificationStatus(prev => ({ ...prev, location: false }));
    onVerificationFailed();
  };

  const handleAutoLocationSuccess = (officeInfo: any) => {
    setDetectedOffice(officeInfo.office);
    setVerificationStatus(prev => ({ ...prev, location: true }));
    
    // Determine next step based on requirements
    if (requiresNetwork) {
      setCurrentStep('network');
      toast.success(`Office detected: ${officeInfo.office.name}! Moving to network verification.`);
    } else if (requiresPhoto) {
      setCurrentStep('photo');
      toast.success(`Office detected: ${officeInfo.office.name}! Moving to photo verification.`);
    } else {
      setCurrentStep('complete');
      toast.success(`Office detected: ${officeInfo.office.name}! All checks complete.`);
      onAllVerificationsComplete();
    }
  };

  const handleAutoLocationFailed = () => {
    setVerificationStatus(prev => ({ ...prev, location: false }));
    // Don't close the modal immediately - let the user try again or select manually
    // onVerificationFailed(); 
  };

  const handleNetworkSuccess = () => {
    setVerificationStatus(prev => ({ ...prev, network: true }));
    
    // Determine next step based on requirements
    if (requiresPhoto) {
      setCurrentStep('photo');
      toast.success('Network verified! Moving to photo verification.');
    } else {
      setCurrentStep('complete');
      toast.success('Network verified! All checks complete.');
      onAllVerificationsComplete();
    }
  };

  const handleNetworkFailed = () => {
    setVerificationStatus(prev => ({ ...prev, network: false }));
    onVerificationFailed();
  };

  const handlePhotoSuccess = (photoData: string) => {
    setVerificationStatus(prev => ({ ...prev, photo: true }));
    setCurrentStep('complete');
    toast.success('All security checks passed!');
    onAllVerificationsComplete();
  };

  const handlePhotoFailed = () => {
    setVerificationStatus(prev => ({ ...prev, photo: false }));
    onVerificationFailed();
  };

  const getStepIcon = (step: VerificationStep) => {
    switch (step) {
      case 'location':
        return '📍';
      case 'network':
        return '📶';
      case 'photo':
        return '📷';
      case 'complete':
        return '✅';
      default:
        return '🔒';
    }
  };

  const getStepTitle = (step: VerificationStep) => {
    switch (step) {
      case 'location':
        return 'Location Verification';
      case 'network':
        return 'Network Verification';
      case 'photo':
        return 'Photo Verification';
      case 'complete':
        return 'All Verifications Complete';
      default:
        return 'Security Verification';
    }
  };

  const getStepDescription = (step: VerificationStep) => {
    switch (step) {
      case 'location':
        return 'Verify you are physically present at the office location.';
      case 'network':
        return 'Confirm you are connected to the office WiFi network.';
      case 'photo':
        return 'Take a photo to verify your identity and presence.';
      case 'complete':
        return 'All security verifications have been completed successfully.';
      default:
        return 'Multi-factor security verification process.';
    }
  };

  const getProgressPercentage = () => {
    const requiredSteps = [requiresLocation, requiresNetwork, requiresPhoto].filter(Boolean).length;
    const completedSteps = [
      requiresLocation && verificationStatus.location,
      requiresNetwork && verificationStatus.network,
      requiresPhoto && verificationStatus.photo
    ].filter(Boolean).length;
    
    return requiredSteps > 0 ? (completedSteps / requiredSteps) * 100 : 0;
  };

  const getSecurityModeDisplay = () => {
    switch (selectedSecurityMode) {
      case 'auto-location':
        return { icon: Target, name: 'Auto-Location', desc: 'GPS auto-detection', color: 'text-blue-600' };
      case 'manual-location':
        return { icon: MapPin, name: 'Manual Location', desc: 'Manual office selection', color: 'text-indigo-600' };
      case 'wifi-only':
        return { icon: Wifi, name: 'WiFi Only', desc: 'Network verification', color: 'text-purple-600' };
      case 'location-and-wifi':
        return { icon: Lock, name: 'Location + WiFi', desc: 'GPS and WiFi required', color: 'text-orange-600' };
      case 'photo-only':
        return { icon: Camera, name: 'Photo Only', desc: 'Photo verification', color: 'text-pink-600' };
      case 'all-security':
        return { icon: Shield, name: 'Maximum Security', desc: 'All methods required', color: 'text-red-600' };
      default:
        return { icon: Lock, name: 'Secure Mode', desc: 'Security verification', color: 'text-gray-600' };
    }
  };

  const securityModeInfo = getSecurityModeDisplay();

  const handleSecurityModeChange = (mode: string) => {
    setSelectedSecurityMode(mode);
    localStorage.setItem('employeeSecurityMode', mode);
    setShowModeSelector(false);
    toast.success(`Security mode changed to ${getSecurityModeDisplay().name}`);
    // Reset verification flow
    setCurrentStep(getInitialStepForMode());
    setVerificationStatus({ location: false, network: false, photo: false });
  };

  const handleSkipStep = () => {
    // Skip to next step if current step is optional
    if (currentStep === 'location' && requiresNetwork) {
      setCurrentStep('network');
      toast('Location verification skipped', { icon: 'ℹ️' });
    } else if (currentStep === 'network' && requiresPhoto) {
      setCurrentStep('photo');
      toast('Network verification skipped', { icon: 'ℹ️' });
    } else if (currentStep === 'photo') {
      setCurrentStep('complete');
      toast('Photo verification skipped', { icon: 'ℹ️' });
    }
  };

  const handleRetryStep = () => {
    // Force re-render of current verification component
    toast('Retrying verification...', { icon: '🔄' });
    const temp = currentStep;
    setCurrentStep('location');
    setTimeout(() => setCurrentStep(temp), 10);
  };

  const handleGoBack = () => {
    if (currentStep === 'network' && requiresLocation) {
      setCurrentStep('location');
      setVerificationStatus(prev => ({ ...prev, network: false }));
    } else if (currentStep === 'photo') {
      if (requiresNetwork) {
        setCurrentStep('network');
        setVerificationStatus(prev => ({ ...prev, photo: false }));
      } else if (requiresLocation) {
        setCurrentStep('location');
        setVerificationStatus(prev => ({ ...prev, photo: false }));
      }
    }
  };

  const canGoBack = () => {
    if (currentStep === 'network' && requiresLocation) return true;
    if (currentStep === 'photo' && (requiresNetwork || requiresLocation)) return true;
    return false;
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Single Unified Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <Shield className="w-7 h-7" />
              <div>
                <h1 className="text-2xl font-bold">Check In Verification</h1>
                <div className="flex items-center gap-2 mt-1">
                  <securityModeInfo.icon className="w-4 h-4" />
                  <span className="text-sm opacity-90">{securityModeInfo.name}</span>
                  {attendanceSettings.allowEmployeeChoice && (
                    <>
                      <span className="text-sm opacity-50">•</span>
                      <button
                        onClick={() => setShowModeSelector(!showModeSelector)}
                        className="text-sm hover:underline opacity-90 hover:opacity-100 transition-opacity"
                      >
                        Change Mode
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onVerificationFailed}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Cancel"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress Section */}
        <div className="px-6 py-5 bg-gray-50 border-b border-gray-200">
        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-gray-200 rounded-full mb-4 overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>

        {/* Progress Steps - Horizontal */}
        <div className="flex items-center justify-between">
          {(() => {
            const steps: VerificationStep[] = [];
            if (requiresLocation) steps.push('location');
            if (requiresNetwork) steps.push('network');
            if (requiresPhoto) steps.push('photo');
            
            return steps.map((step, index) => {
              const isCompleted = verificationStatus[step as keyof VerificationStatus];
              const isCurrent = currentStep === step;
              
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                        : isCurrent
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 ring-4 ring-blue-100'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : index + 1}
                    </div>
                    <span className={`text-xs mt-1.5 font-medium ${
                      isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.charAt(0).toUpperCase() + step.slice(1)}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 mt-[-20px] ${
                      isCompleted ? 'bg-green-400' : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              );
            });
          })()}
        </div>
      </div>

        {/* Current Step Header */}
        {currentStep !== 'complete' && (
          <div className="px-6 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-3xl">{getStepIcon(currentStep)}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{getStepTitle(currentStep)}</h3>
                  <p className="text-sm text-gray-600">{getStepDescription(currentStep)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verification Components */}
        <div className="px-6 py-6">
          {currentStep === 'location' && requiresLocation && (
            selectedSecurityMode === 'auto-location' || selectedSecurityMode === 'all-security' ? (
              <AutoLocationVerification
                onVerificationSuccess={handleAutoLocationSuccess}
                onVerificationFailed={handleAutoLocationFailed}
                employeeName={employeeName}
              />
            ) : (
              <LocationVerification
                onVerificationSuccess={handleLocationSuccess}
                onVerificationFailed={handleLocationFailed}
                officeLocation={officeLocation}
              />
            )
          )}

          {currentStep === 'network' && requiresNetwork && (
            <NetworkVerification
              onVerificationSuccess={handleNetworkSuccess}
              onVerificationFailed={handleNetworkFailed}
              officeNetworks={detectedOffice?.networks || officeNetworks}
            />
          )}

          {currentStep === 'photo' && requiresPhoto && (
            <PhotoVerification
              onVerificationSuccess={handlePhotoSuccess}
              onVerificationFailed={handlePhotoFailed}
              employeeName={employeeName}
            />
          )}

          {currentStep === 'complete' && (
            <div className="text-center space-y-6">
              {/* Success Icon with Animation */}
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-green-100">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">All Set! 🎉</h3>
                <p className="text-gray-600">
                  All security checks passed successfully
                </p>
              </div>

              {/* Verification Summary */}
              <div className="bg-green-50 rounded-xl p-4 space-y-2 border border-green-200">
                {requiresLocation && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Location verified</span>
                  </div>
                )}
                {requiresNetwork && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Network verified</span>
                  </div>
                )}
                {requiresPhoto && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Photo verified</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        {currentStep !== 'complete' && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-2">
            {canGoBack() && (
              <button
                onClick={handleGoBack}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleRetryStep}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 rounded-lg border border-blue-300 transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
            {!attendanceSettings.requirePhoto && currentStep === 'photo' && (
              <button
                onClick={handleSkipStep}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors ml-auto shadow-sm"
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </button>
            )}
            <button
              onClick={onVerificationFailed}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-600 bg-white hover:bg-red-50 rounded-lg border border-red-300 transition-colors ml-auto shadow-sm"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="px-6 py-5 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onAllVerificationsComplete}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-green-200 hover:shadow-xl transition-all"
              >
                <CheckCircle className="w-5 h-5" />
                Complete Check In
              </button>
              <button
                onClick={onVerificationFailed}
                className="px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border-2 border-gray-300 transition-colors shadow-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Mode Selector Modal */}
      {showModeSelector && attendanceSettings.allowEmployeeChoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Security Method</h3>
              </div>
              <button
                onClick={() => setShowModeSelector(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {attendanceSettings.availableSecurityModes.map((mode) => {
                const modeInfo = (() => {
                  switch (mode) {
                    case 'auto-location':
                      return { icon: Target, name: 'Auto-Location', desc: 'GPS auto-detection', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
                    case 'manual-location':
                      return { icon: MapPin, name: 'Manual Location', desc: 'Manual office selection', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' };
                    case 'wifi-only':
                      return { icon: Wifi, name: 'WiFi Only', desc: 'Network verification', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' };
                    case 'location-and-wifi':
                      return { icon: Lock, name: 'Location + WiFi', desc: 'GPS and WiFi required', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
                    case 'photo-only':
                      return { icon: Camera, name: 'Photo Only', desc: 'Photo verification', color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' };
                    case 'all-security':
                      return { icon: Shield, name: 'Maximum Security', desc: 'All methods required', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
                    default:
                      return { icon: Lock, name: mode, desc: '', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
                  }
                })();

                const isSelected = selectedSecurityMode === mode;

                return (
                  <button
                    key={mode}
                    onClick={() => handleSecurityModeChange(mode)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? `${modeInfo.borderColor} ${modeInfo.bgColor} shadow-md`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                        <modeInfo.icon className={`w-5 h-5 ${isSelected ? modeInfo.color : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{modeInfo.name}</div>
                        <div className="text-xs text-gray-600">{modeInfo.desc}</div>
                      </div>
                      {isSelected && (
                        <CheckCircle className={`w-5 h-5 ${modeInfo.color}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureAttendanceVerification;
