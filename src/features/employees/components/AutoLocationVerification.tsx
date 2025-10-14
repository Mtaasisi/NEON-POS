import React, { useState, useEffect } from 'react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { MapPin, Compass, CheckCircle, AlertTriangle, Loader2, Wifi } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAttendanceSettings } from '../../../hooks/useAttendanceSettings';

interface AutoLocationVerificationProps {
  onVerificationSuccess: (officeInfo: any) => void;
  onVerificationFailed: () => void;
  employeeName: string;
}

const AutoLocationVerification: React.FC<AutoLocationVerificationProps> = ({
  onVerificationSuccess,
  onVerificationFailed,
  employeeName
}) => {
  const { detectNearestOfficeByLocation, settings: attendanceSettings, getAllOffices } = useAttendanceSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [detectedOffice, setDetectedOffice] = useState<any>(null);
  const [distance, setDistance] = useState<number>(0);
  const [isWithinRange, setIsWithinRange] = useState(false);

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  const detectOffice = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Get current GPS location
      const position = await getCurrentLocation();
      
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      setCurrentLocation(userLocation);

      // Auto-detect nearest office
      const detection = await detectNearestOfficeByLocation(userLocation.lat, userLocation.lng);

      if (!detection.office) {
        setError('No office locations configured. Please contact your administrator.');
        onVerificationFailed();
        return;
      }

      setDetectedOffice(detection.office);
      setDistance(detection.distance);
      setIsWithinRange(detection.isWithinRange);

      if (detection.isWithinRange) {
        toast.success(`Detected: ${detection.office.name} (${Math.round(detection.distance)}m away)`);
        onVerificationSuccess({
          office: detection.office,
          userLocation,
          distance: detection.distance,
          detectionMethod: 'auto'
        });
      } else {
        setError(`You are ${Math.round(detection.distance)}m away from ${detection.office.name}. Please come within ${detection.office.radius}m to check in.`);
        onVerificationFailed();
      }

    } catch (err: any) {
      console.error('📍 Auto office detection failed:', err);
      
      if (err.code === 1) {
        setError('Location access denied. Please enable location services and try again.');
      } else if (err.code === 2) {
        setError('Location unavailable. Please check your GPS signal and try again.');
      } else if (err.code === 3) {
        setError('Location request timed out. Please try again.');
      } else {
        setError('Failed to detect office location. Please try again.');
      }
      
      onVerificationFailed();
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualOfficeSelection = (office: any) => {
    setDetectedOffice(office);
    toast.success(`Office selected: ${office.name}`);
    onVerificationSuccess({
      office,
      userLocation: null,
      distance: 0,
      detectionMethod: 'manual'
    });
  };

  useEffect(() => {
    // Auto-start detection when component mounts
    detectOffice();
  }, []);

  return (
    <GlassCard className="p-6">
      <div className="text-center space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center gap-3">
          <MapPin className="w-8 h-8 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900">Auto Office Detection</h3>
        </div>
        
        <p className="text-gray-600">
          We're automatically detecting which office you're at using your GPS location.
        </p>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-gray-700">Detecting nearest office...</span>
            </div>
            <div className="text-sm text-gray-500">
              Getting your location and finding the closest office
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && !showManualSelection && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <span className="font-medium">Detection Failed</span>
            </div>
            <p className="text-red-600 text-sm">{error}</p>
            <div className="flex gap-3">
              <GlassButton
                onClick={detectOffice}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Compass className="w-4 h-4 mr-2" />
                Try Again
              </GlassButton>
              <GlassButton
                onClick={() => setShowManualSelection(true)}
                className="flex-1 bg-gray-600 text-white hover:bg-gray-700"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Select Manually
              </GlassButton>
            </div>
          </div>
        )}

        {/* Manual Office Selection */}
        {showManualSelection && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-blue-600">
              <MapPin className="w-6 h-6" />
              <span className="font-medium">Select Your Office</span>
            </div>
            <p className="text-gray-600 text-sm">
              Choose the office location where you're currently working
            </p>
            <div className="space-y-2">
              {getAllOffices().map((office, index) => (
                <div
                  key={index}
                  onClick={() => handleManualOfficeSelection(office)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">{office.name}</h4>
                      <p className="text-sm text-gray-600">{office.address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {office.networks.length} WiFi network(s) • {office.radius}m check-in radius
                      </p>
                    </div>
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              ))}
            </div>
            <GlassButton
              onClick={() => setShowManualSelection(false)}
              variant="ghost"
              className="text-gray-600"
            >
              <Compass className="w-4 h-4 mr-2" />
              Back to Auto-Detect
            </GlassButton>
          </div>
        )}

        {/* Success State */}
        {detectedOffice && isWithinRange && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-green-600">
              <CheckCircle className="w-6 h-6" />
              <span className="font-medium">Office Detected!</span>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">{detectedOffice.name}</h4>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Address:</strong> {detectedOffice.address}</p>
                <p><strong>Distance:</strong> {Math.round(distance)}m away</p>
                <p><strong>Check-in radius:</strong> {detectedOffice.radius}m</p>
                <p><strong>WiFi networks:</strong> {detectedOffice.networks.length} configured</p>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              ✅ You're within the check-in range for this office
            </div>
          </div>
        )}

        {/* Out of Range State */}
        {detectedOffice && !isWithinRange && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-orange-600">
              <AlertTriangle className="w-6 h-6" />
              <span className="font-medium">Too Far Away</span>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 mb-2">{detectedOffice.name}</h4>
              <div className="space-y-1 text-sm text-orange-700">
                <p><strong>Address:</strong> {detectedOffice.address}</p>
                <p><strong>Your distance:</strong> {Math.round(distance)}m away</p>
                <p><strong>Required:</strong> Within {detectedOffice.radius}m</p>
              </div>
            </div>

            <div className="text-sm text-orange-600">
              ⚠️ Please move closer to the office to check in
            </div>
          </div>
        )}

        {/* Location Info */}
        {currentLocation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Your Location</h4>
            <div className="space-y-1 text-sm text-blue-700">
              <p><strong>Coordinates:</strong> {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}</p>
              <p><strong>GPS Accuracy:</strong> ±{Math.round(currentLocation.accuracy)}m</p>
            </div>
          </div>
        )}

        {/* Office Networks Info */}
        {detectedOffice && detectedOffice.networks.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Available WiFi Networks
            </h4>
            <div className="space-y-1 text-sm text-purple-700">
              {detectedOffice.networks.map((network: any, index: number) => (
                <p key={index}>
                  <strong>{network.ssid}</strong>
                  {network.description && ` - ${network.description}`}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!showManualSelection && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">How It Works</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>📍 Uses your GPS location to find the nearest office</p>
              <p>📏 Checks if you're within the office's check-in radius</p>
              <p>📶 Shows available WiFi networks for that office</p>
              <p>✅ Automatically proceeds if you're in range</p>
              <p>🏢 Can't detect? Select your office manually instead</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default AutoLocationVerification;
