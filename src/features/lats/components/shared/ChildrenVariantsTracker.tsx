import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, Smartphone, Check, Camera, StopCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { validateChildrenVariants } from '../../lib/childrenVariantsUtils';
import { Html5Qrcode } from 'html5-qrcode';

interface ChildrenVariantsTrackerProps {
  variant: {
    childrenVariants?: string[];
    useChildrenVariants?: boolean;
    stockQuantity?: number;
    quantity?: number; // For spare parts compatibility
  };
  variantIndex: number;
  onUpdate: (field: 'useChildrenVariants' | 'childrenVariants', value: any) => void;
  label?: string; // Custom label (default: "Part numbers")
  itemLabel?: string; // Custom item label (default: "Part number")
  allVariants?: Array<{ childrenVariants?: string[] }>; // For duplicate checking across variants
}

const ChildrenVariantsTracker: React.FC<ChildrenVariantsTrackerProps> = ({
  variant,
  variantIndex,
  onUpdate,
  label = 'Part numbers',
  itemLabel = 'Part number',
  allVariants = []
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'keyboard' | null>(null);
  const [scannerError, setScannerError] = useState<string>('');
  const [hasMoreFields, setHasMoreFields] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scanContainerId = `barcode-scanner-${variantIndex}`;
  const keyboardBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const lastScannedBarcodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  
  const stockQuantity = variant.stockQuantity || variant.quantity || 0;
  const useChildrenVariants = variant.useChildrenVariants || false;
  const childrenVariants = variant.childrenVariants || [];
  const childrenVariantsRef = useRef<string[]>(childrenVariants);

  const handleToggle = () => {
    const useChildren = !useChildrenVariants;
    onUpdate('useChildrenVariants', useChildren);
    if (useChildren) {
      // Initialize with all fields based on stock quantity
      if (stockQuantity > 0) {
        // Create array with stockQuantity number of empty fields
        const newChildren = Array(stockQuantity).fill('');
        onUpdate('childrenVariants', newChildren);
      } else {
        toast.error('Please set stock quantity first before tracking individual items.');
        // Don't enable if stock is 0
        onUpdate('useChildrenVariants', false);
      }
    } else {
      // Clear when disabling
      onUpdate('childrenVariants', []);
    }
  };

  const handleChildChange = (childIndex: number, value: string) => {
    // Ensure we maintain exactly stockQuantity fields
    const fieldsArray = Array.from({ length: stockQuantity }, (_, i) => childrenVariants[i] || '');
    fieldsArray[childIndex] = value;
    
    // Validate if we have all variants for duplicate checking
    if (allVariants.length > 0) {
      const validation = validateChildrenVariants(
        fieldsArray,
        stockQuantity,
        useChildrenVariants,
        allVariants,
        variantIndex,
        itemLabel
      );
      
      if (!validation.isValid) {
        if (validation.adjustedValue) {
          onUpdate('childrenVariants', validation.adjustedValue);
        }
        return;
      }
      
      onUpdate('childrenVariants', validation.adjustedValue || fieldsArray);
    } else {
      onUpdate('childrenVariants', fieldsArray);
    }
  };

  const handleClear = (childIndex: number) => {
    const fieldsArray = Array.from({ length: stockQuantity }, (_, i) => childrenVariants[i] || '');
    fieldsArray[childIndex] = '';
    onUpdate('childrenVariants', fieldsArray);
  };

  // Ensure we have exactly stockQuantity fields
  const fieldsToShow = stockQuantity > 0 
    ? Array.from({ length: stockQuantity }, (_, i) => childrenVariants[i] || '')
    : [];

  const filledCount = fieldsToShow.filter(c => c.trim()).length;

  // Update ref when childrenVariants changes
  useEffect(() => {
    childrenVariantsRef.current = childrenVariants;
  }, [childrenVariants]);

  // Check if there are more fields below (scrollable)
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const hasMore = scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 10;
        setHasMoreFields(hasMore);
      }
    };

    if (useChildrenVariants && scrollContainerRef.current) {
      // Initial check
      setTimeout(checkScroll, 100);
      
      scrollContainerRef.current.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      
      return () => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.removeEventListener('scroll', checkScroll);
        }
        window.removeEventListener('resize', checkScroll);
      };
    } else {
      setHasMoreFields(false);
    }
  }, [useChildrenVariants, fieldsToShow.length]);

  // Check if there are more fields below (scrollable)
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const hasMore = scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 10;
        setHasMoreFields(hasMore);
      }
    };

    if (useChildrenVariants && scrollContainerRef.current) {
      checkScroll();
      scrollContainerRef.current.addEventListener('scroll', checkScroll);
      // Also check on resize
      window.addEventListener('resize', checkScroll);
      
      return () => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.removeEventListener('scroll', checkScroll);
        }
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [useChildrenVariants, fieldsToShow.length]);

  // Stop scanning function
  const stopScanning = useCallback(async () => {
    if (scanMode === 'camera' && html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
      html5QrCodeRef.current = null;
    }

    setIsScanning(false);
    setScanMode(null);
    setScannerError('');
    keyboardBufferRef.current = '';
    toast.info('Scanner stopped');
  }, [scanMode]);

  // Handle barcode scan result - auto-fill next empty field
  const handleBarcodeScanned = useCallback((barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    // Prevent duplicate scans within 2 seconds (same barcode)
    const currentTime = Date.now();
    if (lastScannedBarcodeRef.current === cleanBarcode && 
        currentTime - lastScanTimeRef.current < 2000) {
      return; // Ignore duplicate scan
    }

    lastScannedBarcodeRef.current = cleanBarcode;
    lastScanTimeRef.current = currentTime;

    // Get current state from ref (always up-to-date)
    const currentFields = Array.from({ length: stockQuantity }, (_, i) => childrenVariantsRef.current[i] || '');
    const nextIndex = currentFields.findIndex(field => !field || field.trim() === '');
    
    if (nextIndex === -1) {
      toast.success(`All ${itemLabel}s are filled!`);
      stopScanning();
      return;
    }

    // Check for duplicates in existing fields
    const isDuplicate = currentFields.some((field, idx) => 
      idx !== nextIndex && field && field.trim() === cleanBarcode
    );

    if (isDuplicate) {
      toast.error(`This ${itemLabel} is already used. Please scan a different one.`);
      return;
    }

    // Fill the next empty field directly using onUpdate to ensure state is updated
    const fieldsArray = [...currentFields];
    fieldsArray[nextIndex] = cleanBarcode;
    
    // Validate if we have all variants for duplicate checking
    if (allVariants.length > 0) {
      const validation = validateChildrenVariants(
        fieldsArray,
        stockQuantity,
        useChildrenVariants,
        allVariants,
        variantIndex,
        itemLabel
      );
      
      if (!validation.isValid) {
        if (validation.adjustedValue) {
          onUpdate('childrenVariants', validation.adjustedValue);
        }
        return;
      }
      
      onUpdate('childrenVariants', validation.adjustedValue || fieldsArray);
    } else {
      onUpdate('childrenVariants', fieldsArray);
    }

    // Update ref immediately
    childrenVariantsRef.current = fieldsArray;
    
    toast.success(`${itemLabel} #${nextIndex + 1} scanned: ${cleanBarcode}`);

    // Check if all fields are filled
    const newFilledCount = fieldsArray.filter(f => f && f.trim()).length;

    if (newFilledCount >= stockQuantity) {
      toast.success(`All ${stockQuantity} ${itemLabel}s have been scanned!`);
      stopScanning();
    } else {
      // Auto-focus the next empty field after a short delay
      setTimeout(() => {
        const nextEmptyIndex = fieldsArray.findIndex(field => !field || field.trim() === '');
        if (nextEmptyIndex !== -1 && inputRefs.current[nextEmptyIndex]) {
          inputRefs.current[nextEmptyIndex]?.focus();
        }
      }, 100);
    }
  }, [stockQuantity, itemLabel, stopScanning, useChildrenVariants, allVariants, variantIndex, onUpdate]);

  // Start camera scanning
  const startCameraScanning = useCallback(async () => {
    if (isScanning) return;

    try {
      setIsScanning(true);
      setScanMode('camera');
      setScannerError('');

      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      // Wait a bit for the container to be rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if container exists
      const container = document.getElementById(scanContainerId);
      if (!container) {
        throw new Error('Scanner container not found');
      }

      // Initialize Html5Qrcode
      html5QrCodeRef.current = new Html5Qrcode(scanContainerId);

      // Try to get cameras and use the back camera if available
      let cameraConfig: any = { facingMode: 'environment' };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          // Prefer back camera (environment)
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
          if (backCamera) {
            cameraConfig = { deviceId: backCamera.id };
          } else {
            cameraConfig = { deviceId: devices[0].id };
          }
        }
      } catch (cameraError) {
        console.log('Could not get camera list, using default:', cameraError);
        // Fall back to facingMode
      }

      // Start scanning with better configuration
      await html5QrCodeRef.current.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: function(viewfinderWidth, viewfinderHeight) {
            // Make qrbox responsive - use 60% of the smaller dimension
            const minEdgePercentage = 0.6;
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return {
              width: qrboxSize,
              height: qrboxSize
            };
          },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText, decodedResult) => {
          // Handle successful scan
          console.log('Barcode scanned:', decodedText);
          handleBarcodeScanned(decodedText);
          // Don't stop scanning - continue for next scan
        },
        (errorMessage) => {
          // Ignore continuous scanning errors (these are normal)
          if (!errorMessage.includes('No QR code') && 
              !errorMessage.includes('NotFoundException') &&
              !errorMessage.includes('No MultiFormat Readers')) {
            console.log('Scan error:', errorMessage);
            // Only show critical errors
            if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowedError')) {
              setScannerError('Camera permission denied. Please allow camera access.');
            }
          }
        }
      );

      toast.success('Camera scanner started. Point at a barcode to scan.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start camera scanner';
      setScannerError(errorMessage);
      setIsScanning(false);
      setScanMode(null);
      
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          await html5QrCodeRef.current.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
        html5QrCodeRef.current = null;
      }
      
      toast.error(errorMessage);
    }
  }, [isScanning, scanContainerId, handleBarcodeScanned]);

  // Start keyboard scanning (for external USB scanners)
  const startKeyboardScanning = useCallback(() => {
    if (isScanning) return;

    setIsScanning(true);
    setScanMode('keyboard');
    setScannerError('');
    keyboardBufferRef.current = '';
    lastKeyTimeRef.current = Date.now();

    toast.success('Keyboard scanner active. Scan barcodes using your USB scanner or type manually.');
  }, [isScanning]);

  // Handle keyboard input for external scanners
  useEffect(() => {
    if (scanMode !== 'keyboard') return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // Clear buffer if too much time has passed (new scan)
      if (currentTime - lastKeyTimeRef.current > 100) {
        keyboardBufferRef.current = '';
      }
      
      lastKeyTimeRef.current = currentTime;

      // Handle Enter key (end of barcode)
      if (event.key === 'Enter') {
        event.preventDefault();
        const barcode = keyboardBufferRef.current.trim();
        keyboardBufferRef.current = '';
        
        if (barcode && barcode.length >= 3) {
          handleBarcodeScanned(barcode);
        }
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Add character to buffer
        keyboardBufferRef.current += event.key;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [scanMode, handleBarcodeScanned]);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current.clear().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="mt-4 border-2 border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Header Toggle */}
      <div 
        className="p-4 border-b border-gray-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={handleToggle}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              useChildrenVariants 
                ? 'bg-blue-500' 
                : 'bg-gray-200'
            }`}>
              <Smartphone className={`w-4 h-4 ${
                useChildrenVariants ? 'text-white' : 'text-gray-500'
              }`} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                Track Individual Items
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Add {label} for each unit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {useChildrenVariants && (
              <>
                {/* Scanner Buttons as Icons */}
                {!isScanning ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startCameraScanning();
                      }}
                      className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                      title="Camera Scanner"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startKeyboardScanning();
                      }}
                      className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
                      title="USB Scanner"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      stopScanning();
                    }}
                    className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                    title="Stop Scanner"
                  >
                    <StopCircle className="w-4 h-4" />
                  </button>
                )}
                <div className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  filledCount > stockQuantity
                    ? 'bg-red-100 text-red-700'
                    : filledCount === stockQuantity
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {filledCount} / {stockQuantity}
                </div>
              </>
            )}
            <div 
              className={`w-11 h-6 rounded-full transition-all duration-300 cursor-pointer ${
                useChildrenVariants ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              onClick={handleToggle}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition-transform duration-300 mt-0.5 ${
                useChildrenVariants ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Children Input Section */}
      {useChildrenVariants && (
        <div className="px-4 pb-4 space-y-3">
          {/* Scanner Status Section - Only show when scanning */}
          {isScanning && (
            <div className="mb-3 p-3 bg-gray-50 border border-gray-300 rounded-lg">
              <div className="space-y-2">
                {scanMode === 'camera' && (
                  <div className="relative">
                    <div 
                      id={scanContainerId} 
                      className="w-full rounded-lg overflow-hidden bg-black flex items-center justify-center" 
                      style={{ minHeight: '300px', position: 'relative' }}
                    />
                    <p className="text-xs text-gray-700 mt-2 text-center">
                      Point camera at barcode. Scans will auto-fill the next empty field.
                    </p>
                    <p className="text-xs text-gray-600 mt-1 text-center">
                      Field will auto-focus after each scan
                    </p>
                  </div>
                )}
                {scanMode === 'keyboard' && (
                  <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
                    <p className="text-xs font-semibold text-gray-900 text-center">
                      ✓ Keyboard scanner active. Scan barcodes or type manually.
                    </p>
                    <p className="text-xs text-gray-700 text-center mt-1">
                      Next empty field: #{fieldsToShow.findIndex(f => !f || f.trim() === '') + 1 || stockQuantity} of {stockQuantity}
                    </p>
                    <p className="text-xs text-gray-600 text-center mt-1">
                      Field will auto-focus after each scan
                    </p>
                  </div>
                )}
                {scannerError && (
                  <p className="text-xs text-red-600 text-center">{scannerError}</p>
                )}
              </div>
            </div>
          )}

          <div 
            ref={scrollContainerRef}
            className="space-y-2 max-h-64 overflow-y-auto pr-2 relative"
            style={{ scrollbarWidth: 'thin' }}
          >
            {fieldsToShow.map((child, childIndex) => {
              const isFilled = child && child.trim() !== '';
              
              return (
                <div 
                  key={childIndex} 
                  className="group relative flex items-center gap-2 p-2 rounded-lg border border-gray-300 bg-white hover:border-gray-400 transition-colors"
                >
                  <div className={`w-8 h-8 flex items-center justify-center rounded text-xs font-semibold flex-shrink-0 ${
                    isFilled
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {childIndex + 1}
                  </div>
                  <div className="flex-1 relative">
                    <QrCode className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      isFilled ? 'text-gray-400' : 'text-gray-300'
                    }`} />
                    <input
                      ref={(el) => {
                        inputRefs.current[childIndex] = el;
                      }}
                      type="text"
                      value={child}
                      onChange={(e) => handleChildChange(childIndex, e.target.value)}
                      placeholder={`Enter ${itemLabel} #${childIndex + 1}`}
                      className={`w-full pl-10 pr-10 py-2.5 border-0 rounded-lg focus:outline-none focus:ring-2 text-sm font-medium font-mono bg-transparent ${
                        isFilled
                          ? 'text-gray-900 focus:ring-blue-500'
                          : 'text-gray-600 focus:ring-gray-400'
                      }`}
                    />
                    {isFilled && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Check className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear(childIndex);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                    title="Clear this field"
                  >
                    Clear
                  </button>
                </div>
              );
            })}
            
            {/* Scroll indicator - shows when there are more fields below */}
            {hasMoreFields && (
              <div className="sticky bottom-0 left-0 right-0 pt-4 pb-2 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="font-medium">Scroll for more fields ({fieldsToShow.length} total)</span>
                  <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildrenVariantsTracker;
