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
    <div className="space-y-4">
      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-6">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Detecting office...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && !showManualSelection && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Too Far Away</span>
          </div>
          <p className="text-red-600 text-sm">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={detectOffice}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Try Again
            </button>
            <button
              onClick={() => setShowManualSelection(true)}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              Select Manually
            </button>
          </div>
        </div>
      )}

      {/* Manual Office Selection */}
      {showManualSelection && !isLoading && (
        <div className="space-y-3">
          <h4 className="text-center text-gray-900 font-medium">Select Your Office</h4>
          <div className="space-y-2">
            {getAllOffices().map((office, index) => (
              <button
                key={index}
                onClick={() => handleManualOfficeSelection(office)}
                className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
              >
                <div className="font-medium text-gray-900">{office.name}</div>
                <div className="text-sm text-gray-600">{office.address}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowManualSelection(false)}
            className="w-full py-2 text-gray-600 text-sm hover:text-gray-800"
          >
            ← Back to Auto-Detect
          </button>
        </div>
      )}

      {/* Success State */}
      {detectedOffice && isWithinRange && !isLoading && (
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h4 className="font-medium text-gray-900 mb-1">{detectedOffice.name}</h4>
          <p className="text-sm text-green-600">✓ Within range ({Math.round(distance)}m away)</p>
        </div>
      )}

      {/* Out of Range State */}
      {detectedOffice && !isWithinRange && !isLoading && (
        <div className="text-center py-4">
          <AlertTriangle className="w-12 h-12 text-orange-600 mx-auto mb-3" />
          <h4 className="font-medium text-gray-900 mb-1">{detectedOffice.name}</h4>
          <p className="text-sm text-orange-600">⚠️ {Math.round(distance)}m away (need to be within {detectedOffice.radius}m)</p>
        </div>
      )}
    </div>
  );
};

export default AutoLocationVerification;
