import React, { useState } from 'react';
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
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black/50"
        onClick={onClose}
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 35
        }}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed flex items-center justify-center p-4"
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header - Matching CBM Calculator Style */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Check In Verification</h3>
                <p className="text-xs text-gray-500">Secure attendance verification process</p>
              </div>
            </div>
            <button
              onClick={onVerificationFailed}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Progress
            </label>
            <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>

          {/* Verification Content */}
          <div className="space-y-6">
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
              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Verification Status</p>
                    <p className="text-4xl font-bold text-green-600">
                      ✅ Complete
                    </p>
                  </div>
                  <CheckCircle className="w-16 h-16 text-green-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  All security checks passed successfully
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons - Matching CBM Calculator Style */}
          {currentStep !== 'complete' && (
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleRetryStep}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onVerificationFailed}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onAllVerificationsComplete}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Complete Check In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Security Mode Selector Modal - Matching CBM Style */}
      {showModeSelector && attendanceSettings.allowEmployeeChoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[70vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Security Method</h3>
                    <p className="text-xs text-gray-500">Choose verification method</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModeSelector(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                {attendanceSettings.availableSecurityModes.map((mode) => {
                  const modeInfo = (() => {
                    switch (mode) {
                      case 'auto-location':
                        return { icon: Target, name: 'Auto-Location', color: 'text-blue-600' };
                      case 'manual-location':
                        return { icon: MapPin, name: 'Manual Location', color: 'text-indigo-600' };
                      case 'wifi-only':
                        return { icon: Wifi, name: 'WiFi Only', color: 'text-purple-600' };
                      case 'location-and-wifi':
                        return { icon: Lock, name: 'Location + WiFi', color: 'text-orange-600' };
                      case 'photo-only':
                        return { icon: Camera, name: 'Photo Only', color: 'text-pink-600' };
                      case 'all-security':
                        return { icon: Shield, name: 'Maximum Security', color: 'text-red-600' };
                      default:
                        return { icon: Lock, name: mode, color: 'text-gray-600' };
                    }
                  })();

                  const isSelected = selectedSecurityMode === mode;

                  return (
                    <button
                      key={mode}
                      onClick={() => handleSecurityModeChange(mode)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <modeInfo.icon className={`w-5 h-5 ${isSelected ? modeInfo.color : 'text-gray-400'}`} />
                        <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                          {modeInfo.name}
                        </span>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-blue-600 ml-auto" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </>
  );
};

export default SecureAttendanceVerification;
