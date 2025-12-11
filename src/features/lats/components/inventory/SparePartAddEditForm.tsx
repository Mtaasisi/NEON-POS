import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import GlassButton from '../../../../features/shared/components/ui/GlassButton';
import PriceInput from '../../../../shared/components/ui/PriceInput';
import SparePartInformationForm from './SparePartInformationForm';

import { X, Save, Package, AlertCircle, DollarSign, Image as ImageIcon, MapPin, FileText, Hash, Building, LayoutGrid, Check, Search, Plus, Smartphone, Laptop, Monitor, Tablet, Watch, Headphones, Camera, Gamepad2, XCircle, Upload } from 'lucide-react';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { SparePart, SparePartVariant } from '../../types/spareParts';
import SparePartVariantsSection from './SparePartVariantsSection';
import { ImageUpload } from '../../../../components/ImageUpload';
import { SimpleImageUpload } from '../../../../components/SimpleImageUpload';
import { toast } from 'react-hot-toast';
import { format } from '../../lib/format';
import BrandInput from './BrandInput';
import { hybridDeviceStorage, DeviceStorageItem } from '../../lib/hybridDeviceStorage';

interface SparePartAddEditFormProps {
  sparePart?: SparePart | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const SparePartAddEditForm: React.FC<SparePartAddEditFormProps> = ({ 
  sparePart, 
  onSave, 
  onCancel 
}) => {
  const { currentUser } = useAuth();
  const { suppliers, loadSuppliers } = useInventoryStore();





  // Form state
  const [formData, setFormData] = useState({
    name: '',
    spareType: '', // Changed from categoryId to spareType - stores spare type string directly (e.g., "lcd", "battery")
    partNumber: '',
    brand: '',
    supplierId: '',
    condition: 'new',
    description: '',
    costPrice: 0,
    sellingPrice: 0,
    quantity: 0,
    minQuantity: 0,
    compatibleDevices: '',
    images: [] as any[],
    serialNumbers: [] as string[],
    useSerialNumbers: false
  });


  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  

  // Variants state - Always enabled by default
  const [variants, setVariants] = useState<SparePartVariant[]>([]);
  const [showVariants, setShowVariants] = useState(true);
  const [useVariants, setUseVariants] = useState(true);
  const [isReorderingVariants, setIsReorderingVariants] = useState(false);
  const [draggedVariantIndex, setDraggedVariantIndex] = useState<number | null>(null);

  
  // Temporary ID for new spare parts
  const [tempSparePartId, setTempSparePartId] = useState('temp-sparepart-' + Date.now());
  
  
  // Compatible devices state
  const [deviceSuggestions, setDeviceSuggestions] = useState<string[]>([]);
  const [showDeviceSuggestions, setShowDeviceSuggestions] = useState(false);
  const [deviceInputValue, setDeviceInputValue] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [savedDevices, setSavedDevices] = useState<DeviceStorageItem[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Spare type search state
  const [spareTypeSearch, setSpareTypeSearch] = useState('');
  const [showSpareTypeSuggestions, setShowSpareTypeSuggestions] = useState(false);
  
  // Spare types list
  const spareTypes = [
    { value: 'battery', label: 'Battery' },
    { value: 'lcd', label: 'LCD / Screen' },
    { value: 'charging_port', label: 'Charging Port' },
    { value: 'camera', label: 'Camera Module' },
    { value: 'speaker', label: 'Speaker' },
    { value: 'microphone', label: 'Microphone' },
    { value: 'home_button', label: 'Home Button' },
    { value: 'power_button', label: 'Power Button' },
    { value: 'volume_button', label: 'Volume Button' },
    { value: 'flex_cable', label: 'Flex Cable' },
    { value: 'logic_board', label: 'Logic Board' },
    { value: 'motherboard', label: 'Motherboard' },
    { value: 'charging_cable', label: 'Charging Cable' },
    { value: 'adapter', label: 'Adapter' },
    { value: 'connector', label: 'Connector' },
    { value: 'antenna', label: 'Antenna' },
    { value: 'vibration_motor', label: 'Vibration Motor' },
    { value: 'headphone_jack', label: 'Headphone Jack' },
    { value: 'sim_tray', label: 'SIM Tray' },
    { value: 'back_cover', label: 'Back Cover' },
    { value: 'front_glass', label: 'Front Glass' },
    { value: 'hinge', label: 'Hinge' },
    { value: 'keyboard', label: 'Keyboard' },
    { value: 'touchpad', label: 'Touchpad' },
    { value: 'other', label: 'Other' }
  ];
  
  // Get selected spare type label
  const selectedSpareType = spareTypes.find(type => type.value === formData.spareType);
  
  // Filter spare types based on search
  const filteredSpareTypes = spareTypes.filter(type =>
    type.label.toLowerCase().includes(spareTypeSearch.toLowerCase())
  );

  // Global storage picker

  // Device database for suggestions
  const deviceDatabase = [
    // Apple Devices
    { name: 'iPhone 15 Pro Max', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 15 Pro', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 15 Plus', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 15', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 14 Pro Max', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 14 Pro', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 14 Plus', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 14', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 13 Pro Max', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 13 Pro', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 13', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 12 Pro Max', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 12 Pro', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone 12', category: 'smartphone', brand: 'Apple' },
    { name: 'iPhone SE (3rd gen)', category: 'smartphone', brand: 'Apple' },
    { name: 'iPad Pro 12.9" (6th gen)', category: 'tablet', brand: 'Apple' },
    { name: 'iPad Pro 11" (4th gen)', category: 'tablet', brand: 'Apple' },
    { name: 'iPad Air (5th gen)', category: 'tablet', brand: 'Apple' },
    { name: 'iPad (10th gen)', category: 'tablet', brand: 'Apple' },
    { name: 'iPad mini (6th gen)', category: 'tablet', brand: 'Apple' },
    { name: 'MacBook Pro 16" M3 Max', category: 'laptop', brand: 'Apple' },
    { name: 'MacBook Pro 14" M3 Pro', category: 'laptop', brand: 'Apple' },
    { name: 'MacBook Air 15" M2', category: 'laptop', brand: 'Apple' },
    { name: 'MacBook Air 13" M2', category: 'laptop', brand: 'Apple' },
    { name: 'iMac 24" M1', category: 'desktop', brand: 'Apple' },
    { name: 'Mac Studio M2 Ultra', category: 'desktop', brand: 'Apple' },
    { name: 'Apple Watch Series 9', category: 'watch', brand: 'Apple' },
    { name: 'Apple Watch Ultra 2', category: 'watch', brand: 'Apple' },
    
    // Samsung Devices
    { name: 'Galaxy S24 Ultra', category: 'smartphone', brand: 'Samsung' },
    { name: 'Galaxy S24+', category: 'smartphone', brand: 'Samsung' },
    { name: 'Galaxy S24', category: 'smartphone', brand: 'Samsung' },
    { name: 'Galaxy S23 Ultra', category: 'smartphone', brand: 'Samsung' },
    { name: 'Galaxy S23+', category: 'smartphone', brand: 'Samsung' },
    { name: 'Galaxy S23', category: 'smartphone', brand: 'Samsung' },
    { name: 'Galaxy Z Fold 5', category: 'smartphone', brand: 'Samsung' },
    { name: 'Galaxy Z Flip 5', category: 'smartphone', brand: 'Samsung' },
    { name: 'Galaxy Tab S9 Ultra', category: 'tablet', brand: 'Samsung' },
    { name: 'Galaxy Tab S9+', category: 'tablet', brand: 'Samsung' },
    { name: 'Galaxy Tab S9', category: 'tablet', brand: 'Samsung' },
    { name: 'Galaxy Book4 Ultra', category: 'laptop', brand: 'Samsung' },
    { name: 'Galaxy Book4 Pro 360', category: 'laptop', brand: 'Samsung' },
    
    // Google Devices
    { name: 'Pixel 8 Pro', category: 'smartphone', brand: 'Google' },
    { name: 'Pixel 8', category: 'smartphone', brand: 'Google' },
    { name: 'Pixel 7a', category: 'smartphone', brand: 'Google' },
    { name: 'Pixel Tablet', category: 'tablet', brand: 'Google' },
    { name: 'Pixelbook Go', category: 'laptop', brand: 'Google' },
    
    // OnePlus Devices
    { name: 'OnePlus 12', category: 'smartphone', brand: 'OnePlus' },
    { name: 'OnePlus 11', category: 'smartphone', brand: 'OnePlus' },
    { name: 'OnePlus Open', category: 'smartphone', brand: 'OnePlus' },
    { name: 'OnePlus Pad', category: 'tablet', brand: 'OnePlus' },
    
    // Xiaomi Devices
    { name: 'Xiaomi 14 Pro', category: 'smartphone', brand: 'Xiaomi' },
    { name: 'Xiaomi 14', category: 'smartphone', brand: 'Xiaomi' },
    { name: 'Redmi Note 13 Pro', category: 'smartphone', brand: 'Xiaomi' },
    { name: 'Xiaomi Pad 6', category: 'tablet', brand: 'Xiaomi' },
    
    // Gaming Devices
    { name: 'Steam Deck OLED', category: 'gaming', brand: 'Valve' },
    { name: 'Nintendo Switch OLED', category: 'gaming', brand: 'Nintendo' },
    { name: 'PlayStation 5', category: 'gaming', brand: 'Sony' },
    { name: 'Xbox Series X', category: 'gaming', brand: 'Microsoft' },
    
    // Audio Devices
    { name: 'AirPods Pro (2nd gen)', category: 'audio', brand: 'Apple' },
    { name: 'AirPods Max', category: 'audio', brand: 'Apple' },
    { name: 'Sony WH-1000XM5', category: 'audio', brand: 'Sony' },
    { name: 'Bose QuietComfort 45', category: 'audio', brand: 'Bose' },
    
    // Accessories
    { name: 'Magic Keyboard', category: 'accessory', brand: 'Apple' },
    { name: 'Apple Pencil (2nd gen)', category: 'accessory', brand: 'Apple' },
    { name: 'Samsung S Pen', category: 'accessory', brand: 'Samsung' },
    { name: 'USB-C Hub', category: 'accessory', brand: 'Generic' },
    { name: 'Lightning Cable', category: 'accessory', brand: 'Apple' },
    { name: 'USB-C Cable', category: 'accessory', brand: 'Generic' },
    { name: 'Wireless Charger', category: 'accessory', brand: 'Generic' },
  ];

  // Helper functions for device management
  const getDeviceIcon = (device: string) => {
    const deviceLower = device.toLowerCase();
    if (deviceLower.includes('iphone') || deviceLower.includes('galaxy s') || deviceLower.includes('pixel')) {
      return <Smartphone className="w-4 h-4" />;
    } else if (deviceLower.includes('ipad') || deviceLower.includes('galaxy tab') || deviceLower.includes('tablet')) {
      return <Tablet className="w-4 h-4" />;
    } else if (deviceLower.includes('macbook') || deviceLower.includes('galaxy book') || deviceLower.includes('laptop')) {
      return <Laptop className="w-4 h-4" />;
    } else if (deviceLower.includes('imac') || deviceLower.includes('mac studio') || deviceLower.includes('desktop')) {
      return <Monitor className="w-4 h-4" />;
    } else if (deviceLower.includes('watch')) {
      return <Watch className="w-4 h-4" />;
    } else if (deviceLower.includes('airpods') || deviceLower.includes('headphones') || deviceLower.includes('audio')) {
      return <Headphones className="w-4 h-4" />;
    } else if (deviceLower.includes('camera')) {
      return <Camera className="w-4 h-4" />;
    } else if (deviceLower.includes('steam deck') || deviceLower.includes('switch') || deviceLower.includes('playstation') || deviceLower.includes('xbox')) {
      return <Gamepad2 className="w-4 h-4" />;
    }
    return <Smartphone className="w-4 h-4" />;
  };

  const searchDevices = async (query: string) => {
    if (query.length < 2) return [];
    
    const queryLower = query.toLowerCase();
    
    // First, search in built-in database with full metadata
    const builtInMatches = deviceDatabase
      .filter(device => 
        device.name.toLowerCase().includes(queryLower) ||
        device.brand.toLowerCase().includes(queryLower) ||
        device.category.toLowerCase().includes(queryLower)
      )
      .map(device => ({ name: device.name, type: 'built-in' }));
    
    // Then, search in saved devices using hybrid storage
    const savedMatches = await hybridDeviceStorage.searchDevices(query);
    const savedDeviceNames = savedMatches.map(device => ({ 
      name: device.device_name, 
      type: 'saved' as const 
    }));
    
    // Combine and prioritize built-in devices, then saved devices
    const allMatches = [...builtInMatches, ...savedDeviceNames];
    
    // Remove duplicates and limit results
    const uniqueMatches = allMatches.filter((device, index, self) => 
      index === self.findIndex(d => d.name === device.name)
    );
    
    return uniqueMatches.slice(0, 8).map(device => device.name);
  };

  const addDevice = async (device: string) => {
    if (device.trim() && !selectedDevices.includes(device.trim())) {
      const trimmedDevice = device.trim();
      const newDevices = [...selectedDevices, trimmedDevice];
      setSelectedDevices(newDevices);
      setFormData(prev => ({
        ...prev,
        compatibleDevices: newDevices.join(', ')
      }));
      setDeviceInputValue('');
      setShowDeviceSuggestions(false);
      
      // Check if this is a custom device (not in built-in database)
      const isCustomDevice = !deviceDatabase.some(d => d.name === trimmedDevice);
      if (isCustomDevice) {
        // Extract category and brand from device name
        const category = extractDeviceCategory(trimmedDevice);
        const brand = extractDeviceBrand(trimmedDevice);
        
        await hybridDeviceStorage.saveDevice(trimmedDevice, category, brand);
        // Refresh saved devices list
        await loadSavedDevices();
      } else {
        // Increment usage for built-in devices
        await hybridDeviceStorage.incrementUsage(trimmedDevice);
      }
    }
  };

  // Helper functions to extract device metadata
  const extractDeviceCategory = (deviceName: string): string => {
    const name = deviceName.toLowerCase();
    if (name.includes('iphone') || name.includes('galaxy s') || name.includes('pixel')) {
      return 'smartphone';
    } else if (name.includes('ipad') || name.includes('galaxy tab') || name.includes('tablet')) {
      return 'tablet';
    } else if (name.includes('macbook') || name.includes('galaxy book') || name.includes('laptop')) {
      return 'laptop';
    } else if (name.includes('imac') || name.includes('mac studio') || name.includes('desktop')) {
      return 'desktop';
    } else if (name.includes('watch')) {
      return 'watch';
    } else if (name.includes('airpods') || name.includes('headphones') || name.includes('audio')) {
      return 'audio';
    } else if (name.includes('camera')) {
      return 'camera';
    } else if (name.includes('steam deck') || name.includes('switch') || name.includes('playstation') || name.includes('xbox')) {
      return 'gaming';
    }
    return 'accessory';
  };

  const extractDeviceBrand = (deviceName: string): string => {
    const name = deviceName.toLowerCase();
    if (name.includes('iphone') || name.includes('ipad') || name.includes('macbook') || name.includes('imac') || name.includes('watch') || name.includes('airpods')) {
      return 'Apple';
    } else if (name.includes('galaxy') || name.includes('samsung')) {
      return 'Samsung';
    } else if (name.includes('pixel')) {
      return 'Google';
    } else if (name.includes('oneplus')) {
      return 'OnePlus';
    } else if (name.includes('xiaomi') || name.includes('redmi')) {
      return 'Xiaomi';
    } else if (name.includes('steam deck')) {
      return 'Valve';
    } else if (name.includes('switch')) {
      return 'Nintendo';
    } else if (name.includes('playstation')) {
      return 'Sony';
    } else if (name.includes('xbox')) {
      return 'Microsoft';
    }
    return 'Generic';
  };

  const removeDevice = (deviceToRemove: string) => {
    const newDevices = selectedDevices.filter(device => device !== deviceToRemove);
    setSelectedDevices(newDevices);
    setFormData(prev => ({
      ...prev,
      compatibleDevices: newDevices.join(', ')
    }));
  };

  // Hybrid storage functions for saved devices
  const loadSavedDevices = async () => {
    try {
      setIsLoadingDevices(true);
      const devices = await hybridDeviceStorage.loadDevices();
      setSavedDevices(devices);
    } catch (error) {
      console.error('Error loading saved devices:', error);
      setSavedDevices([]);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const removeSavedDevice = async (deviceToRemove: string) => {
    try {
      const success = await hybridDeviceStorage.removeDevice(deviceToRemove);
      if (success) {
        await loadSavedDevices(); // Refresh the list
      }
    } catch (error) {
      console.error('Error removing saved device:', error);
    }
  };

  // Combined device database (built-in + saved)
  const getAllDevices = () => {
    const builtInDevices = deviceDatabase.map(d => d.name);
    const savedDeviceNames = savedDevices.map(d => d.device_name);
    return [...new Set([...builtInDevices, ...savedDeviceNames])].sort();
  };
  
  // Load saved devices on component mount
  useEffect(() => {
    loadSavedDevices();
  }, []);

  // Initialize selected devices from form data
  useEffect(() => {
    if (formData.compatibleDevices) {
      const devices = formData.compatibleDevices.split(',').map(device => device.trim()).filter(Boolean);
      setSelectedDevices(devices);
    }
  }, [formData.compatibleDevices]);

  // Load suppliers on mount
  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Ensure default variant exists when variants are enabled (always enabled now)
  useEffect(() => {
    ensureDefaultVariant();
  }, [useVariants]);

  // Create default variant on mount if none exists (only for new spare parts)
  useEffect(() => {
    if (useVariants && variants.length === 0 && !sparePart) {
      const defaultVariant = createVariantFromFormData('Default', 0);
      setVariants([defaultVariant]);
      setShowVariants(true);
    }
  }, [useVariants, variants.length, sparePart]);


  // Sync spare type search with selected spare type (only when not actively searching)
  useEffect(() => {
    if (formData.spareType && !showSpareTypeSuggestions) {
      const selected = spareTypes.find(type => type.value === formData.spareType);
      if (selected) {
        setSpareTypeSearch(selected.label);
      }
    } else if (!formData.spareType && !showSpareTypeSuggestions) {
      setSpareTypeSearch('');
    }
  }, [formData.spareType, showSpareTypeSuggestions]);


  // Initialize form with existing data
  useEffect(() => {
    if (sparePart) {
      console.log('🔍 [DEBUG] Initializing form with existing spare part:', sparePart);
      
      // Load spare type from database (spare_type field)
      // Find matching spare type option by label
      const spareTypeValue = sparePart.spare_type ? 
        (spareTypes.find(type => type.label === sparePart.spare_type)?.value || '') : 
        '';
      
      const initialFormData = {
        name: sparePart.name,
        spareType: spareTypeValue, // Load from spare_type field in database
        brand: sparePart.brand || '',
        supplierId: sparePart.supplier_id || null,
        condition: sparePart.condition || 'new',
        description: sparePart.description || '',
        compatibleDevices: sparePart.compatible_devices || '',
        images: [],
        // Price and stock are in variants only, set to 0 for main form
        costPrice: 0,
        sellingPrice: 0,
        quantity: 0,
        minQuantity: 0
      };
      
      setFormData(initialFormData);

      // Check if this spare part uses variants
      const hasVariants = sparePart.variants && sparePart.variants.length > 0;
      const usesVariants = sparePart.metadata?.useVariants || hasVariants;
      
      console.log('🔍 [DEBUG] Spare part variant info:', {
        hasVariants,
        usesVariants,
        variantsCount: sparePart.variants?.length || 0,
        metadata: sparePart.metadata
      });

      if (usesVariants && hasVariants) {
        // Set variants from existing data, ensuring childrenVariants support
        setUseVariants(true);
        const loadedVariants = sparePart.variants.map(v => {
          // Extract childrenVariants from attributes JSONB (compatible_devices moved to main spare part level)
          const attributes = (v as any).variant_attributes || (v as any).attributes || {};
          // Remove compatible_devices from variant - it's now at main spare part level only
          const cleanedAttributes = { ...attributes };
          if (cleanedAttributes.compatible_devices) {
            delete cleanedAttributes.compatible_devices;
          }
          const childrenVariants = cleanedAttributes.childrenVariants;
          const useChildrenVariants = cleanedAttributes.useChildrenVariants;
          
          return {
            ...v,
            // Map variant_attributes from database to attributes for code (without compatible_devices)
            attributes: cleanedAttributes,
            // Extract childrenVariants (track individual items) from attributes
            childrenVariants: Array.isArray(childrenVariants) ? childrenVariants : [],
            useChildrenVariants: useChildrenVariants !== undefined ? useChildrenVariants : false
          };
        });
        setVariants(loadedVariants);
        setShowVariants(true);
        console.log('✅ [DEBUG] Loaded existing variants:', loadedVariants);
      } else if (usesVariants && !hasVariants) {
        // Spare part is marked to use variants but has no variants - create default
        setUseVariants(true);
        console.log('🔍 [DEBUG] Creating default variant for existing spare part...');
        const defaultVariant = createVariantFromFormData('Default', 0);
        setVariants([defaultVariant]);
        setShowVariants(true);
        console.log('✅ [DEBUG] Created default variant for existing spare part:', defaultVariant);
      }

      // Load images from database
      loadSparePartImages();
      
    }
  }, [sparePart]);

  // Load spare part images from database
  const loadSparePartImages = async () => {
    if (!sparePart?.id) return;

    try {
      const { getSparePartImages } = await import('../../lib/sparePartsApi');
      const dbImages = await getSparePartImages(sparePart.id);
      
      if (dbImages && dbImages.length > 0) {
        const formattedImages = dbImages.map((dbImage, index) => ({
          id: dbImage.id,
          url: dbImage.image_url,
          thumbnailUrl: dbImage.thumbnail_url || dbImage.image_url,
          fileName: dbImage.file_name || `image-${index + 1}`,
          fileSize: dbImage.file_size || 0,
          isPrimary: dbImage.is_primary || false,
          uploadedAt: dbImage.created_at || new Date().toISOString(),
          mimeType: dbImage.mime_type || 'image/jpeg',
          image_url: dbImage.image_url,
          file_name: dbImage.file_name,
          file_size: dbImage.file_size,
          mime_type: dbImage.mime_type,
          is_primary: dbImage.is_primary
        }));
        
        setFormData(prev => ({ ...prev, images: formattedImages }));
      } else {
        const sparePartImages = sparePart.images || [];
        
        if (sparePartImages.length > 0) {
          const fallbackImages = sparePartImages.map((url: string, index: number) => ({
            id: `fallback-${index}`,
            url: url,
            thumbnailUrl: url,
            fileName: `image-${index + 1}.jpg`,
            fileSize: 0,
            isPrimary: index === 0,
            uploadedAt: new Date().toISOString(),
            mimeType: 'image/jpeg',
            image_url: url,
            file_name: `image-${index + 1}.jpg`,
            file_size: 0,
            mime_type: 'image/jpeg',
            is_primary: index === 0
          }));
          
          setFormData(prev => ({ ...prev, images: fallbackImages }));
        } else {
          setFormData(prev => ({ ...prev, images: [] }));
        }
      }
    } catch (error) {
      console.error('Failed to load images:', error);
      toast.error('Failed to load images for editing');
      setFormData(prev => ({ ...prev, images: [] }));
    }
  };


  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Spare part name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    if (!formData.spareType) {
      newErrors.spareType = 'Spare type is required';
    }

    // Only validate pricing and stock if not using variants
    // Price and stock validation removed - always using variants now

    // Validate variants if using variants
    if (useVariants) {
      if (variants.length === 0) {
        newErrors.variants = 'At least one variant is required when using variants';
      } else {
        variants.forEach((variant, index) => {
          if (!variant.name || variant.name.trim() === '') {
            newErrors[`variant_${index}_name`] = 'Variant name is required';
          }
          if (variant.cost_price < 0) {
            newErrors[`variant_${index}_costPrice`] = 'Variant cost price must be 0 or greater';
          }
          if (variant.selling_price < 0) {
            newErrors[`variant_${index}_sellingPrice`] = 'Variant selling price must be 0 or greater';
          }
          if (variant.quantity < 0) {
            newErrors[`variant_${index}_quantity`] = 'Variant stock quantity must be 0 or greater';
          }
          if (variant.min_quantity < 0) {
            newErrors[`variant_${index}_minQuantity`] = 'Variant min stock level must be 0 or greater';
          }
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Update form data with better error handling
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };


  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      // Ensure at least one variant exists before saving
      let finalVariants = variants;
      if (useVariants && variants.length === 0) {
        console.log('🔍 [DEBUG] No variants found, creating default variant before save...');
        const defaultVariant = createVariantFromFormData('Default', 0);
        finalVariants = [defaultVariant];
        setVariants(finalVariants);
      }
      
      const sparePartData = {
        ...formData,
        id: sparePart?.id,
        createdBy: currentUser?.id,
        updatedBy: currentUser?.id,
        // Include variants data - always use variants now
        useVariants: true, // Always true now
        variants: finalVariants
      };
      
      // Let the parent component handle the API call
      await onSave(sparePartData);
      
    } catch (error: any) {
      console.error('Error saving spare part:', error);
      toast.error(error.message || 'Failed to save spare part');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Function to create a variant from current form data
  const createVariantFromFormData = (variantName?: string, variantIndex: number = 0): SparePartVariant => {
    const defaultName = variantName || (variantIndex === 0 ? 'Default' : `Variant ${variantIndex + 1}`);
    const skuSuffix = variantIndex === 0 ? 'DEFAULT' : `V${String(variantIndex + 1).padStart(2, '0')}`;
    
    return {
      name: defaultName,
      sku: `${formData.name.replace(/\s+/g, '-').toUpperCase()}-${skuSuffix}`,
      cost_price: formData.costPrice || 0,
      selling_price: formData.sellingPrice || 0,
      quantity: formData.quantity || 0,
      min_quantity: formData.minQuantity || 0,
      attributes: {},
      // Use main product image as fallback for first variant
      image_url: formData.images && formData.images.length > 0 ? formData.images[0].image_url || formData.images[0].url : undefined,
      // Add children variants support
      ...({ childrenVariants: [], useChildrenVariants: false } as any)
    };
  };

  // Handle variants toggle - variants are always enabled now, but keep function for compatibility
  const handleUseVariantsToggle = (enabled: boolean) => {
    // Variants are always enabled, so this is a no-op
    // But we still need to ensure at least one variant exists
    if (variants.length === 0) {
      const defaultVariant = createVariantFromFormData('Default', 0);
      setVariants([defaultVariant]);
      setShowVariants(true);
      toast.success('Default variant created');
    }
  };

  // Update the first variant when form data changes (if variants are enabled)
  useEffect(() => {
    if (useVariants && variants.length > 0) {
      console.log('🔍 [DEBUG] Updating first variant with form data changes...');
      const updatedVariant = createVariantFromFormData(variants[0]?.name || 'Default', 0);
      
      setVariants(prev => prev.map((variant, index) => {
        if (index === 0) {
          // Preserve the variant name and attributes, but update pricing and stock
          const updated = { 
            ...variant, 
            ...updatedVariant,
            name: variant.name || updatedVariant.name, // Keep existing name
            attributes: variant.attributes || {} // Keep existing attributes
          };
          console.log('✅ [DEBUG] Updated first variant:', updated);
          return updated;
        }
        return variant;
      }));
    }
  }, [formData.costPrice, formData.sellingPrice, formData.quantity, formData.minQuantity, useVariants]);

  // Ensure there's always a default variant when variants are enabled
  const ensureDefaultVariant = () => {
    if (useVariants && variants.length === 0) {
      console.log('🔍 [DEBUG] Ensuring default variant exists...');
      const defaultVariant = createVariantFromFormData('Default', 0);
      setVariants([defaultVariant]);
      setShowVariants(true);
      console.log('✅ [DEBUG] Default variant ensured:', defaultVariant);
    }
  };

  // Add a new variant
  const addNewVariant = () => {
    const newVariantIndex = variants.length;
    const newVariant = createVariantFromFormData(`Variant ${newVariantIndex + 1}`, newVariantIndex);
    setVariants(prev => [...prev, newVariant]);
    console.log('✅ [DEBUG] Added new variant:', newVariant);
    toast.success(`Added new variant: ${newVariant.name}`);
  };


  // Update variant function
  const updateVariant = (index: number, field: keyof SparePartVariant, value: any) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ));
  };


  // Calculate completion stats
      const completedFields = [
        formData.name,
        formData.partNumber,
        formData.spareType,
        formData.condition,
        variants.filter(v => v.name && v.selling_price > 0).length
      ].filter(Boolean).length;

      const totalFields = 4 + variants.length;
  const pendingFields = totalFields - completedFields;

  return (
    <React.Fragment>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[99999]"
        onClick={onCancel}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center z-[100000] p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="spare-part-modal-title"
        >
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            
            {/* Text and Progress */}
            <div>
              <h3 id="spare-part-modal-title" className="text-2xl font-bold text-gray-900 mb-3">
                {sparePart ? 'Edit Spare Part' : 'Add New Spare Part'}
              </h3>
              
              {/* Progress Indicator */}
              <div className="flex items-center gap-4">
                {completedFields > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-bold text-green-700">{completedFields} Complete</span>
                  </div>
                )}
                {pendingFields > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg animate-pulse">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-bold text-orange-700">{pendingFields} Pending</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          <div className="py-4">
            <div className="space-y-4">
              {/* Spare Part Information Form Component */}
              <SparePartInformationForm
                formData={formData}
                setFormData={setFormData}
                suppliers={suppliers}
                currentErrors={errors}
                spareTypes={spareTypes}
                spareTypeSearch={spareTypeSearch}
                setSpareTypeSearch={setSpareTypeSearch}
                showSpareTypeSuggestions={showSpareTypeSuggestions}
                setShowSpareTypeSuggestions={setShowSpareTypeSuggestions}
                filteredSpareTypes={filteredSpareTypes}
                quantity={formData.quantity}
              />

              {/* Compatible Devices Section - Now at main spare part level */}
              <div className="border-2 rounded-2xl bg-white shadow-sm border-gray-200 mb-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Compatible Devices</h3>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-xs font-medium text-gray-700">
                      Compatible Devices
                      <span className="text-gray-500 ml-2">
                        ({selectedDevices.length} selected)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        // Find and trigger the file input in the images section
                        const imageSection = document.querySelector('[data-image-upload-section]');
                        if (imageSection) {
                          // Try to find the file input
                          const fileInput = imageSection.querySelector('input[type="file"]') as HTMLInputElement;
                          if (fileInput) {
                            fileInput.click();
                          } else {
                            // If file input not found yet, scroll to images section and try again
                            imageSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => {
                              const fileInputRetry = imageSection.querySelector('input[type="file"]') as HTMLInputElement;
                              if (fileInputRetry) {
                                fileInputRetry.click();
                              }
                            }, 300);
                          }
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition-all text-sm font-medium"
                      title="Upload images"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" x2="12" y1="3" y2="15"></line>
                      </svg>
                      Upload Images
                    </button>
                  </div>
                  
                  {/* Selected Devices Tags */}
                  {selectedDevices.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedDevices.map((device, deviceIndex) => (
                        <div
                          key={deviceIndex}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          {getDeviceIcon(device)}
                          <span className="max-w-[180px] truncate">{device}</span>
                          <button
                            type="button"
                            onClick={() => removeDevice(device)}
                            className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                            aria-label="Remove device"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Device Input with Suggestions */}
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-3 pl-10 pr-4 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-gray-900 font-medium"
                      placeholder="Type device name (e.g., iPhone 15, Galaxy S24, MacBook Pro)..."
                      value={deviceInputValue}
                      onChange={async (e) => {
                        const value = e.target.value;
                        setDeviceInputValue(value);
                        
                        if (value.length >= 2) {
                          const suggestions = await searchDevices(value);
                          setDeviceSuggestions(suggestions);
                          setShowDeviceSuggestions(suggestions.length > 0);
                        } else {
                          setShowDeviceSuggestions(false);
                          setDeviceSuggestions([]);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (deviceInputValue.trim()) {
                            addDevice(deviceInputValue.trim());
                          }
                        }
                        if (e.key === 'Escape') {
                          setShowDeviceSuggestions(false);
                        }
                      }}
                      onFocus={async () => {
                        const value = deviceInputValue;
                        if (value.length >= 2) {
                          const suggestions = await searchDevices(value);
                          setDeviceSuggestions(suggestions);
                          setShowDeviceSuggestions(suggestions.length > 0);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowDeviceSuggestions(false), 200);
                      }}
                    />
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    
                    {/* Device Suggestions Dropdown */}
                    {showDeviceSuggestions && deviceSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                        {deviceSuggestions.map((device, deviceIndex) => {
                          const isBuiltIn = deviceDatabase.some(d => d.name === device);
                          const savedDevice = savedDevices.find(d => d.device_name === device);
                          const isSaved = !!savedDevice;
                          const deviceInfo = deviceDatabase.find(d => d.name === device);
                          const isSelected = selectedDevices.includes(device);
                          
                          return (
                            <button
                              key={deviceIndex}
                              type="button"
                              disabled={isSelected}
                              className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                                isSelected ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              onClick={() => addDevice(device)}
                            >
                              <div className="text-gray-500">
                                {getDeviceIcon(device)}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                                  {device}
                                  {isSaved && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                      Saved ({savedDevice?.usage_count || 0}x)
                                    </span>
                                  )}
                                  {isBuiltIn && !isSaved && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                      Built-in
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                                      Added
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {deviceInfo ? (
                                    `${deviceInfo.brand} • ${deviceInfo.category}`
                                  ) : savedDevice ? (
                                    `${savedDevice.device_brand || 'Generic'} • ${savedDevice.device_category || 'Device'}`
                                  ) : (
                                    'Custom device'
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Saved Devices Quick Add */}
                  {savedDevices.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        Quick Add ({savedDevices.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {savedDevices
                          .sort((a, b) => new Date(b.last_used).getTime() - new Date(a.last_used).getTime())
                          .slice(0, 6)
                          .map((device) => {
                            const isSelected = selectedDevices.includes(device.device_name);
                            return (
                              <button
                                key={device.device_name}
                                type="button"
                                onClick={() => !isSelected && addDevice(device.device_name)}
                                disabled={isSelected}
                                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                                  isSelected
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                    : 'bg-white hover:bg-green-50 text-gray-700 border-gray-300 hover:border-green-300'
                                }`}
                              >
                                + {device.device_name}
                              </button>
                            );
                          })}
                        {savedDevices.length > 6 && (
                          <span className="text-xs text-gray-500 px-2.5 py-1">
                            +{savedDevices.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Spare Part Variants Section */}
              <SparePartVariantsSection
                variants={variants}
                setVariants={setVariants}
                useVariants={useVariants}
                setUseVariants={handleUseVariantsToggle}
                showVariants={showVariants}
                setShowVariants={setShowVariants}
                isReorderingVariants={isReorderingVariants}
                setIsReorderingVariants={setIsReorderingVariants}
                draggedVariantIndex={draggedVariantIndex}
                setDraggedVariantIndex={setDraggedVariantIndex}
                basePartNumber={formData.name.replace(/\s+/g, '-').toUpperCase()}
                mainProductImages={formData.images}
                // deviceDatabase removed - compatible devices moved to main spare part level
              />

              {/* Product Images Section - Compact */}
              <div className="border-b border-gray-200 pb-4" data-image-upload-section>
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-pink-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Images</h3>
                  {formData.images.length > 0 && (
                    <span className="text-xs text-gray-500">({formData.images.length}/5)</span>
                  )}
                </div>
              
                <div>
                  <SimpleImageUpload
                    productId={tempSparePartId}
                    userId={currentUser?.id || ''}
                    existingImages={formData.images}
                    onImagesChange={(images) => {
                      console.log('🔍 [SparePartForm] SimpleImageUpload onImagesChange called with:', images);
                      const formImages = images.map(img => ({
                        id: img.id,
                        image_url: img.url,
                        thumbnail_url: img.thumbnailUrl || img.url,
                        file_name: img.fileName,
                        file_size: img.fileSize,
                        is_primary: img.isPrimary,
                        uploaded_by: img.uploadedAt,
                        created_at: img.uploadedAt
                      }));
                      console.log('🔍 [SparePartForm] Setting form data with images:', formImages);
                      setFormData(prev => ({ ...prev, images: formImages }));
                      
                      // Show success message for image upload
                      if (images.length > 0) {
                        toast.success(`${images.length} image${images.length > 1 ? 's' : ''} uploaded successfully!`);
                      }
                    }}
                    maxFiles={5}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          <form onSubmit={handleSubmit}>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-6 py-3.5 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.spareType || !formData.condition}
                className="px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    {sparePart ? 'Update Part' : 'Create Part'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>

    </React.Fragment>
  );
};

export default SparePartAddEditForm;
