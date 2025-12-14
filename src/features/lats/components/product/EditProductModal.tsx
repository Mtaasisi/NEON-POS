import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { X, Layers, Package } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import { useBranch } from '../../../../context/BranchContext';
import { retryWithBackoff } from '../../../../lib/supabaseClient';

import { getActiveCategories, Category } from '../../../../lib/categoryApi';
import { getProduct } from '../../../../lib/latsProductApi';

import { generateSKU } from '../../lib/skuUtils';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { productCacheService } from '../../../../lib/productCacheService';

// Extracted components
import ProductInformationForm from './ProductInformationForm';
import ProductVariantsSection from './ProductVariantsSection';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  onProductUpdated?: () => void;
  onSuccess?: () => void;
}

// ProductVariant type matching AddProductModal
interface ProductVariant {
  id?: string;
  name: string;
  sku: string;
  costPrice: number;
  price: number;
  stockQuantity: number;
  minStockLevel: number;
  specification?: string;
  attributes?: Record<string, any>;
  childrenVariants?: string[]; // IMEI/Serial numbers for child variants (optional)
  useChildrenVariants?: boolean; // Toggle to enable/disable children variants
}

// Validation schema for product form (same as AddProductModal)
const productFormSchema = z.object({
  name: z.string().min(1, 'Product name must be provided').max(100, 'Product name must be less than 100 characters'),
  description: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().max(200, 'Description must be less than 200 characters').optional()
  ),
  specification: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().max(1000, 'Specification must be less than 1000 characters').optional().refine((val) => {
      if (!val || val.trim() === '') return true;
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, {
      message: "Specification must be valid JSON"
    })
  ),
  sku: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().max(50, 'SKU must be less than 50 characters').optional()
  ),
  categoryId: z.string().min(1, 'Category must be selected'),
  condition: z.enum(['new', 'used', 'refurbished'], {
    errorMap: () => ({ message: 'Please select a condition' })
  }),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  variants: z.array(z.any()).optional().default([])
});

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  productId,
  onProductUpdated,
  onSuccess
}) => {
  const { currentBranch } = useBranch();
  const { loadProducts } = useInventoryStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentErrors, setCurrentErrors] = useState<Record<string, string>>({});
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  // Generate auto SKU using utility function
  const generateAutoSKU = () => {
    return generateSKU();
  };

  // Initial form data
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    condition: 'new' as 'new' | 'used' | 'refurbished',
    description: '',
    specification: '',
    metadata: {},
    variants: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variants state - Start with empty array, user can add variants manually
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [showVariants, setShowVariants] = useState(true); // ✅ Always show variants section by default
  const [useVariants, setUseVariants] = useState(false);
  const [isReorderingVariants, setIsReorderingVariants] = useState(false);
  const [draggedVariantIndex, setDraggedVariantIndex] = useState<number | null>(null);

  // Variant specifications modal state
  const [showVariantSpecificationsModal, setShowVariantSpecificationsModal] = useState(false);
  const [currentVariantIndex, setCurrentVariantIndex] = useState<number | null>(null);
  const [customAttributeInput, setCustomAttributeInput] = useState('');
  const [customAttributeValue, setCustomAttributeValue] = useState('');
  const [selectedSpecCategory, setSelectedSpecCategory] = useState<string>('laptop');
  const [variantSpecStep, setVariantSpecStep] = useState(0);
  const [showAllVariantSpecs, setShowAllVariantSpecs] = useState(false);
  
  // Autocomplete suggestions for attribute names
  const [attributeSuggestions, setAttributeSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const attributeInputRef = useRef<HTMLInputElement>(null);
  const attributeDropdownRef = useRef<HTMLDivElement>(null);
  
  // Autocomplete suggestions for attribute values
  const [valueSuggestions, setValueSuggestions] = useState<string[]>([]);
  const [showValueSuggestions, setShowValueSuggestions] = useState(false);
  const [selectedValueSuggestionIndex, setSelectedValueSuggestionIndex] = useState(-1);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const valueDropdownRef = useRef<HTMLDivElement>(null);
  const [valueDropdownPosition, setValueDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [attributeDropdownPosition, setAttributeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  // Comprehensive attribute name suggestions for all electronics specifications
  const commonAttributeNames = [
    // Performance & Processing
    'processor', 'cpu', 'gpu', 'graphics',
    
    // Memory & Storage
    'ram', 'memory', 'storage', 'storage_type', 'expandable_storage', 'cloud_storage', 'sd_card_slot',
    
    // Display & Screen
    'screen_size', 'display', 'display_type', 'resolution', 'refresh_rate', 'high_refresh_rate',
    'aspect_ratio', 'panel_type', 'color_gamut', 'color_accuracy', 'contrast_ratio',
    'brightness', 'response_time', 'curved', 'touch', 'touchscreen', 'touch_screen',
    'oled_display', 'amoled_display', 'hdr_support',
    
    // Battery & Charging
    'battery', 'battery_capacity', 'battery_life', 'fast_charging', 'wireless_charging',
    'reverse_charging', 'removable_battery', 'power_consumption', 'energy_rating',
    
    // Camera
    'camera', 'front_camera', 'rear_camera', 'optical_zoom', 'video_recording',
    
    // Physical Attributes
    'color', 'weight', 'dimensions', 'size', 'thickness', 'material', 'stand_height',
    
    // Connectivity
    'wifi', 'wifi_6', 'bluetooth', 'network', '5g_support', 'cellular', 'ethernet',
    'dual_sim', 'esim_support', 'nfc', 'gps',
    
    // Ports & Connectors
    'usb_c_port', 'usb_c_ports', 'usb_a_ports', 'usb_hub', 'thunderbolt',
    'hdmi_port', 'hdmi_ports', 'displayport_ports', 'headphone_jack', 'audio_out',
    'connector_type', 'audio_type',
    
    // Software & OS
    'os', 'operating_system',
    
    // Security & Authentication
    'fingerprint_scanner', 'face_id', 'security_chip', 'encryption',
    
    // Durability & Protection
    'waterproof', 'dust_resistant', 'drop_resistant', 'scratch_resistant', 'military_grade',
    'protection_level',
    
    // Features & Functionality
    'backlit_keyboard', 'stylus_support', 'convertible', 'detachable', 'keyboard_support',
    'haptic_feedback', 'g_sync', 'freesync', 'wall_mountable',
    
    // Audio
    'stereo_speakers', 'noise_cancellation', 'built_in_speakers', 'microphone',
    
    // Monitor Specific
    'tilt', 'swivel', 'height_adjustable', 'pivot', 'webcam',
    
    // Accessories
    'type', 'compatibility', 'power_output', 'cable_length', 'transparency',
    'magnetic', 'kickstand',
    
    // Warranty
    'warranty', 'warranty_period'
  ];

  // Prevent body scroll when modals are open
  useBodyScrollLock(isOpen || showVariantSpecificationsModal);

  // Filter attribute suggestions based on input - real-time filtering
  useEffect(() => {
    if (showVariantSpecificationsModal) {
      if (customAttributeInput.trim()) {
        const filtered = commonAttributeNames.filter(name =>
          name.toLowerCase().includes(customAttributeInput.toLowerCase())
        );
        setAttributeSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        // Show all suggestions when field is empty
        setAttributeSuggestions(commonAttributeNames);
        setShowSuggestions(true);
      }
      setSelectedSuggestionIndex(-1);
      
      // Update position when input changes
      if (attributeInputRef.current) {
        const rect = attributeInputRef.current.getBoundingClientRect();
        setAttributeDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    } else {
      setAttributeSuggestions([]);
      setShowSuggestions(false);
    }
  }, [customAttributeInput, showVariantSpecificationsModal]);

  // Handle attribute input change
  const handleAttributeInputChange = (value: string) => {
    setCustomAttributeInput(value);
    // Filtering happens in useEffect, but we update position here for immediate feedback
    if (attributeInputRef.current) {
      const rect = attributeInputRef.current.getBoundingClientRect();
      setAttributeDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Format attribute name for display (remove underscores, capitalize, preserve acronyms)
  const formatAttributeName = (name: string): string => {
    // Common acronyms that should remain uppercase
    const acronyms = new Set([
      'gps', 'hdd', 'ssd', 'usb', 'usb-c', 'usb-a', 'hdmi', 'nfc', '5g', 'wifi', 'wifi-6', 'wifi-6e',
      'cpu', 'gpu', 'ram', 'rom', 'dvd', 'cd', 'blu-ray', 'oled', 'amoled', 'ips', 'tn', 'va',
      'led', 'lcd', 'hdr', 'dolby', 'thx', 'dts', 'ac', 'dc', 'api', 'sdk', 'sata', 'nvme',
      'pcie', 'pci', 'agp', 'ddr', 'ddr3', 'ddr4', 'ddr5', 'lpddr', 'lpddr4', 'lpddr5',
      'ghz', 'mhz', 'khz', 'mb', 'gb', 'tb', 'kb', 'mbps', 'gbps', 'kbps', 'mah', 'wh',
      'w', 'v', 'a', 'ma', 'mv', 'kv', 'mw', 'kw', 'hz', 'fps', 'rpm', 'dpi', 'ppi',
      'rgb', 'rgba', 'hsv', 'cmyk', 'html', 'css', 'js', 'json', 'xml', 'pdf', 'jpg', 'jpeg',
      'png', 'gif', 'svg', 'mp3', 'mp4', 'avi', 'mkv', 'wav', 'flac', 'aac', 'ogg',
      'os', 'ios', 'android', 'windows', 'macos', 'linux', 'unix', 'dos', 'bios', 'uefi',
      'tcp', 'ip', 'udp', 'http', 'https', 'ftp', 'smtp', 'pop3', 'imap', 'ssh', 'ssl', 'tls',
      'dns', 'dhcp', 'vpn', 'voip', 'sip', 'rtp', 'rtsp', 'rtmp', 'hls', 'dash',
      'ai', 'ml', 'dl', 'nlp', 'cv', 'ar', 'vr', 'xr', 'iot', 'bt', 'ble',
      'qr', 'rfid', 'irda', 'zigbee', 'z-wave', 'thread', 'matter',
      'h264', 'h265', 'hevc', 'vp9', 'av1', 'mpeg', 'mpeg2', 'mpeg4', 'divx', 'xvid',
      'aac', 'ac3', 'vorbis', 'opus', 'truehd', 'dts-hd'
    ]);

    return name
      .split('_')
      .map(word => {
        const wordLower = word.toLowerCase();
        // Check if the word is an acronym (matches known acronyms or is all uppercase)
        if (acronyms.has(wordLower) || (word.length <= 4 && word === word.toUpperCase())) {
          return word.toUpperCase();
        }
        // Otherwise, capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setCustomAttributeInput(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    attributeInputRef.current?.focus();
  };

  // Handle keyboard navigation in suggestions
  const handleAttributeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || attributeSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < attributeSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionSelect(attributeSuggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Generate smart value suggestions based on attribute name (same as AddProductModal)
  const getValueSuggestions = (attributeName: string, currentValue: string): string[] => {
    const attrLower = attributeName.toLowerCase();
    const valueLower = currentValue.toLowerCase().trim();
    const suggestions: string[] = [];

    // Storage-related attributes
    if (attrLower.includes('storage') && !attrLower.includes('type')) {
      const numberMatch = valueLower.match(/\d+/);
      const number = numberMatch ? parseInt(numberMatch[0]) : null;
      
      if (number) {
        if (number <= 512) {
          suggestions.push(`${number}GB SSD`);
          suggestions.push(`${number}GB NVMe SSD`);
          if (number >= 256) {
            suggestions.push(`${number}GB`);
          }
        } else {
          suggestions.push(`${number}GB HDD`);
          suggestions.push(`${number}GB`);
        }
        if (number >= 1000) {
          suggestions.push(`${number / 1000}TB HDD`);
        }
      } else {
        suggestions.push('128GB SSD', '256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD');
        suggestions.push('500GB HDD', '1TB HDD', '2TB HDD', '4TB HDD');
        suggestions.push('128GB NVMe SSD', '256GB NVMe SSD', '512GB NVMe SSD', '1TB NVMe SSD');
      }
    }

    if (attrLower.includes('storage_type')) {
      suggestions.push('SSD', 'HDD', 'NVMe SSD', 'eMMC', 'UFS');
    }

    if (attrLower.includes('ram') || attrLower.includes('memory')) {
      const numberMatch = valueLower.match(/\d+/);
      if (numberMatch) {
        const number = parseInt(numberMatch[0]);
        suggestions.push(`${number}GB`);
        if (number >= 8) {
          suggestions.push(`DDR4 ${number}GB`, `DDR5 ${number}GB`);
        }
      } else {
        suggestions.push('4GB', '8GB', '16GB', '32GB', '64GB', '128GB');
        suggestions.push('DDR4', 'DDR5', 'LPDDR4', 'LPDDR5');
      }
    }

    if (attrLower.includes('screen_size') || (attrLower.includes('display') && attrLower.includes('size'))) {
      const numberMatch = valueLower.match(/\d+(\.\d+)?/);
      if (numberMatch) {
        suggestions.push(`${numberMatch[0]}"`);
        suggestions.push(`${numberMatch[0]} inch`);
      } else {
        suggestions.push('11"', '12"', '13"', '13.3"', '14"', '15"', '15.6"', '16"', '17"', '21"', '24"', '27"', '32"');
      }
    }

    if (attrLower.includes('resolution')) {
      suggestions.push('HD (1366x768)', 'FHD (1920x1080)', 'QHD (2560x1440)', '4K (3840x2160)', '8K (7680x4320)');
      suggestions.push('HD+', 'FHD+', 'QHD+');
    }

    if (attrLower.includes('refresh_rate')) {
      const numberMatch = valueLower.match(/\d+/);
      if (numberMatch) {
        suggestions.push(`${numberMatch[0]}Hz`);
      } else {
        suggestions.push('60Hz', '75Hz', '90Hz', '120Hz', '144Hz', '165Hz', '240Hz');
      }
    }

    if (attrLower.includes('battery') && (attrLower.includes('capacity') || !attrLower.includes('life'))) {
      const numberMatch = valueLower.match(/\d+/);
      if (numberMatch) {
        const number = parseInt(numberMatch[0]);
        if (number < 1000) {
          suggestions.push(`${number}mAh`);
        } else {
          suggestions.push(`${number}mAh`, `${number / 1000}Ah`);
        }
      } else {
        suggestions.push('2000mAh', '3000mAh', '4000mAh', '5000mAh', '6000mAh', '8000mAh', '10000mAh');
      }
    }

    if (attrLower.includes('battery_life')) {
      const numberMatch = valueLower.match(/\d+/);
      if (numberMatch) {
        suggestions.push(`${numberMatch[0]} hours`, `${numberMatch[0]}h`);
      } else {
        suggestions.push('8 hours', '10 hours', '12 hours', '15 hours', '20 hours', '24 hours');
      }
    }

    if (attrLower.includes('processor') || attrLower.includes('cpu')) {
      if (valueLower.includes('intel') || valueLower.includes('i3') || valueLower.includes('i5') || valueLower.includes('i7') || valueLower.includes('i9')) {
        suggestions.push('Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9');
        suggestions.push('Intel Core i5-11th Gen', 'Intel Core i7-11th Gen', 'Intel Core i9-11th Gen');
        suggestions.push('Intel Core i5-12th Gen', 'Intel Core i7-12th Gen', 'Intel Core i9-12th Gen');
        suggestions.push('Intel Core i5-13th Gen', 'Intel Core i7-13th Gen', 'Intel Core i9-13th Gen');
      } else if (valueLower.includes('amd') || valueLower.includes('ryzen')) {
        suggestions.push('AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9');
        suggestions.push('AMD Ryzen 5 5000', 'AMD Ryzen 7 5000', 'AMD Ryzen 9 5000');
        suggestions.push('AMD Ryzen 5 6000', 'AMD Ryzen 7 6000', 'AMD Ryzen 9 6000');
      } else if (valueLower.includes('snapdragon') || valueLower.includes('qualcomm')) {
        suggestions.push('Snapdragon 888', 'Snapdragon 8 Gen 1', 'Snapdragon 8 Gen 2', 'Snapdragon 8 Gen 3');
        suggestions.push('Snapdragon 870', 'Snapdragon 778G', 'Snapdragon 695');
      } else if (valueLower.includes('apple') || valueLower.includes('a1') || valueLower.includes('m1') || valueLower.includes('m2')) {
        suggestions.push('Apple A14 Bionic', 'Apple A15 Bionic', 'Apple A16 Bionic', 'Apple A17 Pro');
        suggestions.push('Apple M1', 'Apple M1 Pro', 'Apple M1 Max', 'Apple M2', 'Apple M2 Pro', 'Apple M2 Max', 'Apple M3');
      } else {
        suggestions.push('Intel Core i5', 'Intel Core i7', 'AMD Ryzen 5', 'AMD Ryzen 7');
        suggestions.push('Snapdragon 888', 'Apple A15 Bionic', 'Apple M1');
      }
    }

    if (attrLower.includes('gpu') || attrLower.includes('graphics')) {
      if (valueLower.includes('nvidia') || valueLower.includes('rtx') || valueLower.includes('gtx')) {
        suggestions.push('NVIDIA RTX 3050', 'NVIDIA RTX 3060', 'NVIDIA RTX 3070', 'NVIDIA RTX 3080', 'NVIDIA RTX 3090');
        suggestions.push('NVIDIA RTX 4050', 'NVIDIA RTX 4060', 'NVIDIA RTX 4070', 'NVIDIA RTX 4080', 'NVIDIA RTX 4090');
        suggestions.push('NVIDIA GTX 1650', 'NVIDIA GTX 1660');
      } else if (valueLower.includes('amd') || valueLower.includes('radeon')) {
        suggestions.push('AMD Radeon RX 6600', 'AMD Radeon RX 6700', 'AMD Radeon RX 6800', 'AMD Radeon RX 6900');
        suggestions.push('AMD Radeon RX 7600', 'AMD Radeon RX 7700', 'AMD Radeon RX 7800', 'AMD Radeon RX 7900');
      } else {
        suggestions.push('Intel UHD Graphics', 'Intel Iris Xe', 'NVIDIA RTX 3060', 'AMD Radeon RX 6600');
      }
    }

    if (attrLower.includes('color')) {
      const commonColors = ['Black', 'White', 'Silver', 'Gray', 'Space Gray', 'Gold', 'Rose Gold', 'Blue', 'Red', 'Green', 'Purple', 'Pink'];
      if (valueLower) {
        const filtered = commonColors.filter(c => c.toLowerCase().includes(valueLower));
        suggestions.push(...filtered);
      } else {
        suggestions.push(...commonColors);
      }
    }

    if (attrLower.includes('weight')) {
      const numberMatch = valueLower.match(/\d+(\.\d+)?/);
      if (numberMatch) {
        if (parseFloat(numberMatch[0]) < 10) {
          suggestions.push(`${numberMatch[0]}kg`, `${numberMatch[0]} kg`);
        } else {
          suggestions.push(`${numberMatch[0]}g`, `${numberMatch[0]} g`);
        }
      } else {
        suggestions.push('1.5kg', '2kg', '2.5kg', '180g', '200g', '250g');
      }
    }

    if (attrLower.includes('wifi')) {
      suggestions.push('Wi-Fi 5', 'Wi-Fi 6', 'Wi-Fi 6E', 'Wi-Fi 7', '802.11ac', '802.11ax');
    }

    if (attrLower.includes('bluetooth')) {
      suggestions.push('4.0', '4.2', '5.0', '5.1', '5.2', '5.3');
    }

    if (attrLower.includes('os') || attrLower.includes('operating_system')) {
      suggestions.push('Windows 11', 'Windows 10', 'macOS', 'iOS', 'Android', 'Linux', 'Chrome OS');
    }

    if (attrLower.includes('camera')) {
      const numberMatch = valueLower.match(/\d+/);
      if (numberMatch) {
        suggestions.push(`${numberMatch[0]}MP`, `${numberMatch[0]} MP`);
      } else {
        suggestions.push('12MP', '48MP', '50MP', '64MP', '108MP');
        suggestions.push('12MP + 12MP', '48MP + 12MP + 5MP', '50MP + 12MP + 8MP');
      }
    }

    if (attrLower.includes('panel_type')) {
      suggestions.push('IPS', 'VA', 'TN', 'OLED', 'AMOLED', 'Mini LED');
    }

    if (attrLower.includes('display_type')) {
      suggestions.push('LCD', 'OLED', 'AMOLED', 'Super AMOLED', 'IPS LCD', 'TFT');
    }

    if (attrLower.includes('waterproof')) {
      suggestions.push('IP67', 'IP68', 'IPX7', 'IPX8', 'Yes', 'No');
    }

    if (attrLower.includes('touch') || attrLower.includes('wireless') || attrLower.includes('fast_charging') || 
        attrLower.includes('fingerprint') || attrLower.includes('face_id') || attrLower.includes('nfc') ||
        attrLower.includes('5g') || attrLower.includes('stereo') || attrLower.includes('backlit')) {
      if (!valueLower || valueLower === 'y' || valueLower === 'yes') {
        suggestions.push('Yes');
      } else if (valueLower === 'n' || valueLower === 'no') {
        suggestions.push('No');
      } else {
        suggestions.push('Yes', 'No');
      }
    }

    return suggestions.slice(0, 8);
  };

  // Filter value suggestions based on input - real-time filtering
  useEffect(() => {
    if (customAttributeInput.trim() && showVariantSpecificationsModal) {
      const suggestions = getValueSuggestions(customAttributeInput, customAttributeValue);
      setValueSuggestions(suggestions);
      setShowValueSuggestions(suggestions.length > 0);
      setSelectedValueSuggestionIndex(-1);
      
      // Update position when input changes
      if (valueInputRef.current) {
        const rect = valueInputRef.current.getBoundingClientRect();
        setValueDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    } else {
      setValueSuggestions([]);
      setShowValueSuggestions(false);
    }
  }, [customAttributeValue, customAttributeInput, showVariantSpecificationsModal]);

  // Close attribute suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSuggestions &&
        attributeInputRef.current &&
        !attributeInputRef.current.contains(event.target as Node) &&
        attributeDropdownRef.current &&
        !attributeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  // Close value suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showValueSuggestions &&
        valueInputRef.current &&
        !valueInputRef.current.contains(event.target as Node) &&
        valueDropdownRef.current &&
        !valueDropdownRef.current.contains(event.target as Node)
      ) {
        setShowValueSuggestions(false);
        setSelectedValueSuggestionIndex(-1);
      }
    };

    if (showValueSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showValueSuggestions]);

  // Check if attribute is boolean-like
  const isBooleanAttribute = (attributeName: string): boolean => {
    const attrLower = attributeName.toLowerCase();
    return attrLower.includes('touch') || attrLower.includes('wireless') || 
           attrLower.includes('fast_charging') || attrLower.includes('fingerprint') || 
           attrLower.includes('face_id') || attrLower.includes('nfc') ||
           attrLower.includes('5g') || attrLower.includes('stereo') || 
           attrLower.includes('backlit') || attrLower.includes('waterproof') ||
           attrLower.includes('dust_resistant') || attrLower.includes('drop_resistant') ||
           attrLower.includes('convertible') || attrLower.includes('detachable') ||
           attrLower.includes('expandable_storage') || attrLower.includes('g_sync') ||
           attrLower.includes('freesync') || attrLower.includes('curved') ||
           attrLower.includes('oled_display') || attrLower.includes('hdr_support') ||
           attrLower.includes('reverse_charging') || attrLower.includes('removable_battery') ||
           attrLower.includes('dual_sim') || attrLower.includes('esim_support') ||
           attrLower.includes('gps') || attrLower.includes('cellular') ||
           attrLower.includes('headphone_jack') || attrLower.includes('hdmi_port') ||
           attrLower.includes('thunderbolt') || attrLower.includes('usb_c_port') ||
           attrLower.includes('stylus_support') || attrLower.includes('keyboard_support') ||
           attrLower.includes('noise_cancellation') || attrLower.includes('haptic_feedback') ||
           attrLower.includes('wall_mountable') || attrLower.includes('height_adjustable') ||
           attrLower.includes('tilt') || attrLower.includes('swivel') || attrLower.includes('pivot') ||
           attrLower.includes('webcam') || attrLower.includes('microphone') ||
           attrLower.includes('built_in_speakers') || attrLower.includes('audio_out') ||
           attrLower.includes('ethernet') || attrLower.includes('transparency') ||
           attrLower.includes('magnetic') || attrLower.includes('kickstand');
  };

  // Handle value input change
  const handleValueInputChange = (value: string) => {
    // Auto-format boolean attributes
    if (isBooleanAttribute(customAttributeInput)) {
      const valueLower = value.toLowerCase().trim();
      if (valueLower === 'yes' || valueLower === 'y') {
        setCustomAttributeValue('Yes');
      } else if (valueLower === 'no' || valueLower === 'n') {
        setCustomAttributeValue('No');
      } else {
        setCustomAttributeValue(value);
      }
    } else {
      setCustomAttributeValue(value);
    }
    // Filtering happens in useEffect, but we update position here for immediate feedback
    if (valueInputRef.current) {
      const rect = valueInputRef.current.getBoundingClientRect();
      setValueDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Handle value suggestion selection
  const handleValueSuggestionSelect = (suggestion: string) => {
    setCustomAttributeValue(suggestion);
    setShowValueSuggestions(false);
    setSelectedValueSuggestionIndex(-1);
    valueInputRef.current?.focus();
  };

  // Handle keyboard navigation in value suggestions
  const handleValueInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showValueSuggestions || valueSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedValueSuggestionIndex(prev =>
        prev < valueSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedValueSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedValueSuggestionIndex >= 0) {
      e.preventDefault();
      handleValueSuggestionSelect(valueSuggestions[selectedValueSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowValueSuggestions(false);
      setSelectedValueSuggestionIndex(-1);
    }
  };

  // Name checking
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [originalProductName, setOriginalProductName] = useState<string>('');

  // Track loaded product to prevent reloading during editing
  const loadedProductIdRef = useRef<string | null>(null);

  const { currentUser } = useAuth();

  // Handle variants toggle - Actually toggle the variants visibility
  const handleUseVariantsToggle = (enabled: boolean) => {
    setUseVariants(enabled);
    setShowVariants(enabled || variants.length > 0); // Show if enabled OR if variants exist
  };
  
  // ✅ CRITICAL: Auto-enable useVariants when variants are added
  useEffect(() => {
    if (variants.length > 0) {
      setUseVariants(true);
      setShowVariants(true);
    }
  }, [variants.length]);

  // Auto-update variant SKUs when base SKU changes
  useEffect(() => {
    if (variants.length > 0 && formData.sku) {
      setVariants(prevVariants => 
        prevVariants.map((variant, index) => ({
          ...variant,
          sku: `${formData.sku}-V${(index + 1).toString().padStart(2, '0')}`
        }))
      );
    }
  }, [formData.sku]);

  // Load product data when modal opens
  const loadProductData = useCallback(async () => {
    if (!productId) return;

    // Prevent reloading if data is already loaded for this product
    if (loadedProductIdRef.current === productId) {
      console.log('🔄 [EditProductModal] Product data already loaded, skipping reload');
      return;
    }

    // Reset loaded product ID if loading a different product
    if (loadedProductIdRef.current && loadedProductIdRef.current !== productId) {
      console.log('🔄 [EditProductModal] Loading different product, resetting loaded state');
      loadedProductIdRef.current = null;
    }

    setIsLoadingProduct(true);
    try {
      const product = await getProduct(productId, { forceRefresh: true });

      // Extract condition from attributes or use default, ensure it's valid
      const rawCondition = (product as any).attributes?.condition ||
                           (product as any).condition ||
                           'new';
      const condition = ['new', 'used', 'refurbished'].includes(rawCondition)
        ? rawCondition
        : 'new';

      // Extract specification from attributes or direct field
      const rawSpecification = (product as any).attributes?.specification ||
                               (product as any).specification ||
                               '';

      // Handle specification - ensure it's a valid JSON string or empty
      let specification = '';
      if (rawSpecification) {
        if (typeof rawSpecification === 'string') {
          // If it's already a string, validate it's valid JSON
          try {
            JSON.parse(rawSpecification);
            specification = rawSpecification;
          } catch {
            // If it's not valid JSON, stringify it
            specification = JSON.stringify(rawSpecification);
          }
        } else {
          // If it's an object, stringify it
          specification = JSON.stringify(rawSpecification);
        }
      }

      // Ensure categoryId is a string (handle null/undefined)
      const categoryId = product.categoryId ? String(product.categoryId) : '';

      // Set form data
      setFormData({
        name: product.name || '',
        sku: product.sku || generateAutoSKU(),
        categoryId: categoryId,
        condition: condition as 'new' | 'used' | 'refurbished',
        description: product.description || '',
        specification: specification,
        metadata: (product as any).metadata || {},
        variants: []
      });

      setOriginalProductName(product.name || '');

      // Mark this product as loaded
      loadedProductIdRef.current = productId;

      // Load variants
      if (product.variants && product.variants.length > 0) {
        // Load children variants for each parent variant
        const loadedVariantsPromises = product.variants.map(async (v: any) => {
          let childrenVariants: string[] = [];
          let useChildrenVariants = false;
          
          // Check if this variant is a parent and has children
          if (v.is_parent || v.variant_type === 'parent') {
            try {
              const { data: childrenData, error } = await supabase
                .from('lats_product_variants')
                .select('variant_attributes')
                .eq('parent_variant_id', v.id)
                .eq('is_active', true)
                .eq('variant_type', 'imei_child');
              
              if (!error && childrenData && childrenData.length > 0) {
                childrenVariants = childrenData
                  .map((child: any) => {
                    const imei = child.variant_attributes?.imei || 
                                child.variant_attributes?.serial_number ||
                                child.variant_attributes?.['imei'] ||
                                child.variant_attributes?.['serial_number'];
                    return imei || '';
                  })
                  .filter((imei: string) => imei.trim().length > 0);
                
                useChildrenVariants = childrenVariants.length > 0;
              }
            } catch (error) {
              console.warn('Error loading children variants for variant', v.id, error);
            }
          }
          
          return {
            id: v.id,
            name: v.name || v.variant_name || 'Default',
            sku: v.sku || '',
            costPrice: v.costPrice || v.cost_price || 0,
            price: v.price || v.sellingPrice || v.selling_price || 0,
            stockQuantity: v.stockQuantity || v.quantity || 0,
            minStockLevel: v.minStockLevel || v.minQuantity || 0,
            specification: v.specification || '',
            attributes: v.attributes || v.variant_attributes || {},
            childrenVariants: useChildrenVariants ? childrenVariants : [],
            useChildrenVariants: useChildrenVariants
          };
        });
        
        const loadedVariants = await Promise.all(loadedVariantsPromises);
        setVariants(loadedVariants);
        setUseVariants(true);
        setShowVariants(true);
      } else {
        setVariants([]);
        setUseVariants(false);
      }
    } catch (error: any) {
      console.error('Error loading product:', error);
      toast.error(error.message || 'Failed to load product data');
      onClose();
    } finally {
      setIsLoadingProduct(false);
    }
  }, [productId, onClose]);

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const data = await getActiveCategories();
          setCategories(data);
        } catch (error) {
          console.error('Error loading categories:', error);
          toast.error('Failed to load categories');
        }
      };
      fetchCategories();
      loadProductData();
    } else {
      // Reset form when modal closes
      setFormData({
        name: '',
        sku: '',
        categoryId: '',
        condition: 'new',
        description: '',
        specification: '',
        metadata: {},
        variants: []
      });
      setVariants([]);
      setCurrentErrors({});
      setUseVariants(false);
      setShowVariants(true);
      setOriginalProductName('');
      loadedProductIdRef.current = null; // Reset loaded product ID when modal closes
      setIsLoadingProduct(false); // Ensure loading state is reset
    }
  }, [isOpen, loadProductData]);

  // Check if product name exists (excluding current product)
  const checkProductName = async (name: string) => {
    if (!name.trim()) {
      setNameExists(false);
      return;
    }

    // Don't show warning if name hasn't changed
    if (name.trim() === originalProductName.trim()) {
      setNameExists(false);
      return;
    }

    setIsCheckingName(true);
    try {
      const { data, error } = await supabase
        .from('lats_products')
        .select('id')
        .ilike('name', name.trim())
        .neq('id', productId)
        .limit(1);

      if (error) throw error;
      setNameExists(data && data.length > 0);
    } catch (error) {
      console.error('Error checking product name:', error);
    } finally {
      setIsCheckingName(false);
    }
  };

  // Handle variant specifications click
  const handleVariantSpecificationsClick = (index: number) => {
    setCurrentVariantIndex(index);
    setShowVariantSpecificationsModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validation
    try {
      productFormSchema.parse(formData);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        console.error('Validation errors:', error.errors);
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            errors[err.path[0]] = err.message;
          }
        });
        setCurrentErrors(errors);
        
        // Show specific error messages (limit to first 2 to avoid message overflow)
        const errorMessages = error.errors.slice(0, 2).map(err => {
          const field = err.path[0] || 'form';
          return `${field}: ${err.message}`;
        }).join(', ');
        
        console.error('Validation errors:', error.errors);
        console.error('Form data that failed validation:', formData);
        
        if (errorMessages) {
          toast.error(`Validation error: ${errorMessages}`);
        } else {
          toast.error('Please fix the validation errors');
        }
        return;
      }
    }

    if (!currentBranch?.id) {
      toast.error('No branch selected');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare attributes with specification and condition if available
      const productAttributes = {
        ...(formData.metadata || {}),
        ...(formData.specification ? { specification: formData.specification } : {}),
        ...(formData.condition ? { condition: formData.condition } : {})
      };

      // Prepare product update data
      const productUpdateData: any = {
        name: formData.name,
        description: formData.description || null,
        sku: formData.sku,
        categoryId: formData.categoryId || null,
        condition: formData.condition,
        attributes: productAttributes,
        metadata: {
          ...(formData.metadata || {}),
          useVariants: useVariants,
          variantCount: useVariants ? variants.length : 0,
          updatedBy: currentUser?.id,
          updatedAt: new Date().toISOString()
        }
      };

      // Prepare variants if any
      if (variants.length > 0) {
        // Check for duplicate variant names (case-insensitive)
        const variantNames = variants.map(v => v.name?.toLowerCase().trim()).filter(Boolean);
        const uniqueNames = new Set(variantNames);
        
        if (variantNames.length !== uniqueNames.size) {
          // Find the duplicate name
          const duplicateName = variantNames.find((name, index) => 
            variantNames.indexOf(name) !== index
          );
          toast.error(`Duplicate variant name detected: "${duplicateName}". Each variant must have a unique name.`);
          setIsSubmitting(false);
          return;
        }
        
        console.log('🔄 [EditProductModal] Preparing variants for product:', productId);
        
        const variantsToUpdate = variants.map((variant) => ({
          id: variant.id, // Include ID for existing variants
          sku: variant.sku || `${formData.sku}-V${variants.indexOf(variant) + 1}`,
          name: variant.name,
          costPrice: variant.costPrice || 0,
          sellingPrice: variant.price || 0,
          price: variant.price || 0, // Alias
          quantity: variant.stockQuantity || 0,
          stockQuantity: variant.stockQuantity || 0, // Alias
          minQuantity: variant.minStockLevel || 0,
          minStockLevel: variant.minStockLevel || 0, // Alias
          attributes: variant.attributes || {},
          // Mark as parent if it has children variants
          is_parent: variant.useChildrenVariants && variant.childrenVariants && variant.childrenVariants.filter(c => c.trim()).length > 0,
          variant_type: variant.useChildrenVariants && variant.childrenVariants && variant.childrenVariants.filter(c => c.trim()).length > 0 ? 'parent' : null
        }));

        productUpdateData.variants = variantsToUpdate;
      }

      console.log('🔄 [EditProductModal] Updating product with data:', productUpdateData);

      // Update product using latsProductApi (includes variants if any)
      const { updateProduct } = await import('../../../../lib/latsProductApi');
      const updatedProduct = await updateProduct(productId, productUpdateData, currentUser?.id || '');

      // Handle children variants (IMEI/Serial numbers) for updated variants
      if (variants.length > 0 && updatedProduct) {
        const { addIMEIToParentVariant, checkIMEIExists } = await import('../../lib/imeiVariantService');
        
        // Get updated variants from the product
        const updatedProductData = await getProduct(productId, { forceRefresh: true });
        
        if (updatedProductData && updatedProductData.variants) {
          // Collect all new children variants from all variants to check for duplicates
          const allNewChildrenVariants: string[] = [];
          const variantChildrenMap = new Map<string, string[]>(); // variant id -> children array
          
          for (let i = 0; i < variants.length; i++) {
            const formVariant = variants[i];
            const updatedVariant = updatedProductData.variants.find((v: any) => 
              v.id === formVariant.id || 
              (v.name === formVariant.name && v.sku === formVariant.sku)
            );
            
            if (!updatedVariant) continue;
            
            if (formVariant.useChildrenVariants && formVariant.childrenVariants && formVariant.childrenVariants.length > 0) {
              const validChildren = formVariant.childrenVariants.filter(c => c.trim().length > 0);
              
              if (validChildren.length > 0) {
                // Get existing children variants for this parent
                const { data: existingChildren } = await supabase
                  .from('lats_product_variants')
                  .select('variant_attributes')
                  .eq('parent_variant_id', updatedVariant.id)
                  .eq('is_active', true)
                  .eq('variant_type', 'imei_child');
                
                const existingImeis = (existingChildren || []).map((child: any) => 
                  (child.variant_attributes?.imei || 
                   child.variant_attributes?.serial_number ||
                   '').toString().trim().toLowerCase()
                ).filter((imei: string) => imei.length > 0);
                
                // Find new IMEIs that don't exist yet in this parent
                const newImeis = validChildren
                  .map(c => c.trim())
                  .filter(imei => !existingImeis.includes(imei.toLowerCase()));
                
                allNewChildrenVariants.push(...newImeis);
                variantChildrenMap.set(updatedVariant.id, newImeis);
              }
            }
          }
          
          // Check for duplicates across all new children variants
          const childrenSet = new Set<string>();
          const duplicateChildren: string[] = [];
          for (const child of allNewChildrenVariants) {
            const lowerChild = child.toLowerCase();
            if (childrenSet.has(lowerChild)) {
              duplicateChildren.push(child);
            } else {
              childrenSet.add(lowerChild);
            }
          }
          
          if (duplicateChildren.length > 0) {
            toast.error(`Duplicate IMEI/Serial numbers found: ${duplicateChildren.join(', ')}. Each item must be unique across all variants.`);
            setIsSubmitting(false);
            return;
          }
          
          // Also check against existing children variants in the product
          const { data: allExistingChildren } = await supabase
            .from('lats_product_variants')
            .select('variant_attributes, name, variant_name')
            .eq('product_id', productId)
            .eq('is_active', true)
            .eq('variant_type', 'imei_child');
          
          const existingImeisInProduct = (allExistingChildren || []).map((child: any) => 
            (child.variant_attributes?.imei || 
             child.variant_attributes?.serial_number ||
             child.name ||
             child.variant_name ||
             '').toString().trim().toLowerCase()
          ).filter((imei: string) => imei.length > 0);
          
          const duplicatesWithExisting: string[] = [];
          for (const newChild of allNewChildrenVariants) {
            if (existingImeisInProduct.includes(newChild.toLowerCase())) {
              duplicatesWithExisting.push(newChild);
            }
          }
          
          if (duplicatesWithExisting.length > 0) {
            toast.error(`IMEI/Serial numbers already exist in this product: ${duplicatesWithExisting.join(', ')}. Each item must be unique.`);
            setIsSubmitting(false);
            return;
          }
          
          for (let i = 0; i < variants.length; i++) {
            const formVariant = variants[i];
            const updatedVariant = updatedProductData.variants.find((v: any) => 
              v.id === formVariant.id || 
              (v.name === formVariant.name && v.sku === formVariant.sku)
            );
            
            if (!updatedVariant) continue;
            
            // Get new IMEIs for this variant from the map
            const newImeis = variantChildrenMap.get(updatedVariant.id) || [];
            
            // Check if this variant has new children variants to add
            if (formVariant.useChildrenVariants && formVariant.childrenVariants && formVariant.childrenVariants.length > 0 && newImeis.length > 0) {
                
                if (newImeis.length > 0) {
                  console.log(`🔄 [EditProductModal] Adding ${newImeis.length} new children variants for variant ${updatedVariant.id}`);
                  
                  // Ensure parent is marked as parent
                  if (!updatedVariant.is_parent) {
                    await supabase
                      .from('lats_product_variants')
                      .update({
                        is_parent: true,
                        variant_type: 'parent',
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', updatedVariant.id);
                  }
                  
                  // Add each new child variant
                  const childrenResults = [];
                  for (const childValue of newImeis) {
                    const trimmedValue = childValue.trim();
                    
                    // Check if IMEI/Serial already exists
                    const exists = await checkIMEIExists(trimmedValue);
                    if (exists) {
                      console.warn(`⚠️ [EditProductModal] IMEI/Serial ${trimmedValue} already exists, skipping`);
                      continue;
                    }
                    
                    // Add child variant
                    const result = await addIMEIToParentVariant(updatedVariant.id, {
                      imei: trimmedValue,
                      serial_number: trimmedValue,
                      cost_price: formVariant.costPrice || updatedVariant.cost_price || 0,
                      selling_price: formVariant.price || updatedVariant.selling_price || 0,
                      condition: 'new',
                      source: 'purchase'
                    });
                    
                    if (result.success) {
                      childrenResults.push(trimmedValue);
                    } else {
                      console.error(`❌ [EditProductModal] Failed to add child variant ${trimmedValue}:`, result.error);
                    }
                  }
                  
                  if (childrenResults.length > 0) {
                    console.log(`✅ [EditProductModal] Created ${childrenResults.length} new children variants for variant ${updatedVariant.id}`);
                  }
                }
              }
            }
          }
        }

      // Clear all caches
      console.log('🔄 [EditProductModal] Clearing product caches...');
      productCacheService.clearProducts();
      
      // Clear query cache and deduplication cache
      const { invalidateCachePattern } = await import('../../../../lib/queryCache');
      invalidateCachePattern('products:*');
      
      // Clear enhanced cache manager
      const { smartCache } = await import('../../../../lib/enhancedCacheManager');
      smartCache.invalidateCache('products');
      
      // Optimized: Update only the edited product in the store instead of reloading all products
      // This avoids slow database response warnings during cold starts
      try {
        const { getProduct: getProductFromStore } = useInventoryStore.getState();
        const productResponse = await getProductFromStore(productId);
        
        if (productResponse.ok && productResponse.data) {
          const { updateProductInStore } = useInventoryStore.getState();
          updateProductInStore(productResponse.data);
          console.log('✅ [EditProductModal] Product updated in store without full reload');
        } else {
          throw new Error(productResponse.message || 'Failed to fetch updated product');
        }
      } catch (error) {
        console.warn('⚠️ [EditProductModal] Failed to update product in store, falling back to full reload:', error);
        // Fallback to full reload if single product update fails
        // @ts-ignore - loadProducts accepts force parameter but type definition doesn't include it
        await loadProducts(null, true);
      }
      
      // Note: Background refresh removed to prevent form reset during editing
      // The product is already updated in the store via updateProductInStore
      // This prevents the form from being reset while user is still editing

      toast.success('Product updated successfully!');
      
      // Call callbacks
      if (onProductUpdated) onProductUpdated();
      if (onSuccess) onSuccess();
      
      onClose();
    } catch (error: any) {
      console.error('❌ [EditProductModal] Error updating product:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Provide more helpful error messages
      if (error.code === '23505') {
        toast.error('A product with this SKU already exists.');
      } else {
        toast.error(error.message || 'Failed to update product. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Calculate completion stats (same as AddProductModal)
  const completedScalarFields = [
    formData.name,
    formData.categoryId,
    formData.condition
  ].filter(Boolean).length;
  
  const completedVariants = variants.filter(v => v.name && v.price > 0).length;
  
  const completedFields = completedScalarFields + completedVariants;
  const totalFields = 3 + variants.length;
  const pendingFields = totalFields - completedFields;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[99999]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center z-[100000] p-4 pointer-events-none"
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-product-modal-title"
        >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          disabled={isSubmitting || isLoadingProduct}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Loading State */}
        {isLoadingProduct && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading product data...</p>
            </div>
          </div>
        )}

        {/* Icon Header - Fixed (same as AddProductModal) */}
        {!isLoadingProduct && (
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              
              {/* Text and Progress */}
              <div>
                <h3 id="edit-product-modal-title" className="text-2xl font-bold text-gray-900 mb-3">Edit Product</h3>
                
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
        )}

        {/* Scrollable Content */}
        {!isLoadingProduct && (
          <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
            <div className="py-4">
              {/* Product Information */}
              <ProductInformationForm
                formData={formData}
                setFormData={setFormData}
                categories={categories}
                currentErrors={currentErrors}
                isCheckingName={isCheckingName}
                nameExists={nameExists}
                onNameCheck={checkProductName}
                useVariants={useVariants}
                onGenerateSKU={generateAutoSKU}
              />

              {/* Product Variants */}
              <ProductVariantsSection
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
                onVariantSpecificationsClick={handleVariantSpecificationsClick}
                baseSku={formData.sku}
              />
            </div>
          </div>
        )}

        {/* Fixed Action Buttons Footer */}
        {!isLoadingProduct && (
          <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
            {pendingFields > 0 && (
              <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-semibold text-orange-700">
                  Please complete all required fields before updating the product.
                </span>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <button
                type="submit"
                disabled={isSubmitting || isCheckingName || !formData.name || !formData.categoryId || !formData.condition}
                className="w-full px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Update Product'
                )}
              </button>
            </form>
          </div>
        )}
        </div>
      </div>

      {/* Variant Specifications Modal - Same as AddProductModal */}
      {showVariantSpecificationsModal && currentVariantIndex !== null && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 z-[100002]"
            onClick={() => {
              setShowVariantSpecificationsModal(false);
              setVariantSpecStep(0);
              setCustomAttributeInput('');
              setCustomAttributeValue('');
              setShowAllVariantSpecs(false);
            }}
          />
          
          {/* Modal Container */}
          <div 
            className="fixed inset-0 flex items-center justify-center z-[100003] p-4 pointer-events-none"
          >
            <div 
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative pointer-events-auto max-h-[90vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowVariantSpecificationsModal(false);
                  setVariantSpecStep(0);
                  setCustomAttributeInput('');
                  setCustomAttributeValue('');
                  setShowAllVariantSpecs(false);
                }}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-10"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon Header - Fixed */}
              <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <Layers className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Text */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Variant Specifications</h3>
                    <p className="text-sm text-purple-700 font-medium">
                      {variants[currentVariantIndex]?.name || `Variant ${currentVariantIndex !== null ? currentVariantIndex + 1 : ''}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100 relative">
                {currentVariantIndex !== null && variants[currentVariantIndex] && (
                  <div className="py-4 space-y-4">
                    {/* Current Attributes Display */}
                    {variants[currentVariantIndex].attributes && Object.keys(variants[currentVariantIndex].attributes || {}).length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Specifications</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(variants[currentVariantIndex].attributes || {}).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-700">{formatAttributeName(key)}:</span>
                                <span className="text-sm text-gray-600 ml-2">{String(value)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedAttributes = { ...variants[currentVariantIndex].attributes };
                                  delete updatedAttributes[key];
                                  setVariants(prev => prev.map((v, i) => 
                                    i === currentVariantIndex 
                                      ? { ...v, attributes: updatedAttributes }
                                      : v
                                  ));
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium flex-shrink-0 ml-2"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add New Specification */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Specification</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Attribute Name</label>
                          <input
                            ref={attributeInputRef}
                            type="text"
                            value={customAttributeInput}
                            onChange={(e) => handleAttributeInputChange(e.target.value)}
                            onKeyDown={handleAttributeInputKeyDown}
                            onFocus={() => {
                              if (attributeInputRef.current) {
                                const rect = attributeInputRef.current.getBoundingClientRect();
                                setAttributeDropdownPosition({
                                  top: rect.bottom + window.scrollY,
                                  left: rect.left + window.scrollX,
                                  width: rect.width
                                });
                              }
                              // Always show suggestions when field is focused
                              if (customAttributeInput.trim()) {
                                const filtered = commonAttributeNames.filter(name =>
                                  name.toLowerCase().includes(customAttributeInput.toLowerCase())
                                );
                                setAttributeSuggestions(filtered);
                                setShowSuggestions(filtered.length > 0);
                              } else {
                                // Show all suggestions when field is empty and focused
                                setAttributeSuggestions(commonAttributeNames);
                                setShowSuggestions(true);
                              }
                            }}
                            onBlur={() => {
                              // Don't close immediately - let click-outside handler manage it
                              // This allows clicking on suggestions without closing
                            }}
                            placeholder="e.g., Color, Size, Storage, Processor"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-sm"
                            autoComplete="off"
                          />
                          {/* Autocomplete Suggestions Dropdown */}
                          {showSuggestions && attributeSuggestions.length > 0 && createPortal(
                            <div
                              ref={attributeDropdownRef}
                              className="fixed z-[999999] bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto p-2"
                              style={{
                                top: `${attributeDropdownPosition.top}px`,
                                left: `${attributeDropdownPosition.left}px`,
                                width: `${attributeDropdownPosition.width}px`,
                                maxWidth: '100vw'
                              }}
                            >
                              <div className="grid grid-cols-2 gap-2">
                                {attributeSuggestions.map((suggestion, index) => (
                                  <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => handleSuggestionSelect(suggestion)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors rounded-lg border ${
                                      index === selectedSuggestionIndex 
                                        ? 'bg-purple-100 border-purple-300' 
                                        : 'border-gray-200 hover:border-purple-200'
                                    }`}
                                  >
                                    <span className="font-medium text-gray-800">{formatAttributeName(suggestion)}</span>
                                  </button>
                                ))}
                              </div>
                            </div>,
                            document.body
                          )}
                        </div>
                        <div className="relative">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Value</label>
                          <input
                            ref={valueInputRef}
                            type="text"
                            value={customAttributeValue}
                            onChange={(e) => handleValueInputChange(e.target.value)}
                            onKeyDown={(e) => {
                              handleValueInputKeyDown(e);
                              // Also handle Enter to add specification
                              if (e.key === 'Enter' && !showValueSuggestions && customAttributeInput && customAttributeValue) {
                                const valueLower = customAttributeValue.toLowerCase().trim();
                                
                                // Check if it's a boolean attribute with "No" value
                                if (isBooleanAttribute(customAttributeInput) && (valueLower === 'no' || valueLower === 'n')) {
                                  e.preventDefault();
                                  toast.error('Boolean attributes with "No" value are not added. Only "Yes" values are stored.');
                                  setCustomAttributeValue('');
                                  return;
                                }

                                // Auto-format boolean "yes" to "Yes"
                                let finalValue = customAttributeValue;
                                if (isBooleanAttribute(customAttributeInput) && (valueLower === 'yes' || valueLower === 'y')) {
                                  finalValue = 'Yes';
                                }

                                const updatedAttributes = {
                                  ...variants[currentVariantIndex].attributes,
                                  [customAttributeInput]: finalValue
                                };
                                setVariants(prev => prev.map((v, i) => 
                                  i === currentVariantIndex 
                                    ? { ...v, attributes: updatedAttributes }
                                    : v
                                ));
                                setCustomAttributeInput('');
                                setCustomAttributeValue('');
                              }
                            }}
                            onFocus={() => {
                              if (valueInputRef.current) {
                                const rect = valueInputRef.current.getBoundingClientRect();
                                setValueDropdownPosition({
                                  top: rect.bottom + window.scrollY,
                                  left: rect.left + window.scrollX,
                                  width: rect.width
                                });
                              }
                              // Always show suggestions when field is focused (if attribute name is set)
                              if (customAttributeInput.trim()) {
                                const allSuggestions = getValueSuggestions(customAttributeInput, customAttributeValue || '');
                                if (customAttributeValue.trim()) {
                                  const filtered = allSuggestions.filter(s =>
                                    s.toLowerCase().includes(customAttributeValue.toLowerCase())
                                  );
                                  setValueSuggestions(filtered);
                                  setShowValueSuggestions(filtered.length > 0);
                                } else {
                                  setValueSuggestions(allSuggestions);
                                  setShowValueSuggestions(allSuggestions.length > 0);
                                }
                              } else {
                                // If no attribute name, show empty suggestions
                                setValueSuggestions([]);
                                setShowValueSuggestions(false);
                              }
                            }}
                            onBlur={() => {
                              // Don't close immediately - let click-outside handler manage it
                              // This allows clicking on suggestions without closing
                            }}
                            placeholder="e.g., Black, Large, 256GB"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-sm"
                            autoComplete="off"
                          />
                          {/* Autocomplete Suggestions Dropdown for Value */}
                          {showValueSuggestions && valueSuggestions.length > 0 && createPortal(
                            <div
                              ref={valueDropdownRef}
                              className="fixed z-[999999] bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto p-2"
                              style={{
                                top: `${valueDropdownPosition.top}px`,
                                left: `${valueDropdownPosition.left}px`,
                                width: `${valueDropdownPosition.width}px`,
                                maxWidth: '100vw'
                              }}
                            >
                              <div className="grid grid-cols-2 gap-2">
                                {valueSuggestions.map((suggestion, index) => (
                                  <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => handleValueSuggestionSelect(suggestion)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors rounded-lg border ${
                                      index === selectedValueSuggestionIndex 
                                        ? 'bg-purple-100 border-purple-300' 
                                        : 'border-gray-200 hover:border-purple-200'
                                    }`}
                                  >
                                    <span className="font-medium text-gray-800">{suggestion}</span>
                                  </button>
                                ))}
                              </div>
                            </div>,
                            document.body
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (customAttributeInput && customAttributeValue) {
                            // Check if it's a boolean attribute with "No" value
                            const valueLower = customAttributeValue.toLowerCase().trim();
                            if (isBooleanAttribute(customAttributeInput) && (valueLower === 'no' || valueLower === 'n')) {
                              toast.error('Boolean attributes with "No" value are not added. Only "Yes" values are stored.');
                              setCustomAttributeValue('');
                              return;
                            }

                            // Auto-format boolean "yes" to "Yes"
                            let finalValue = customAttributeValue;
                            if (isBooleanAttribute(customAttributeInput) && (valueLower === 'yes' || valueLower === 'y')) {
                              finalValue = 'Yes';
                            }

                            const updatedAttributes = {
                              ...variants[currentVariantIndex].attributes,
                              [customAttributeInput]: finalValue
                            };
                            setVariants(prev => prev.map((v, i) => 
                              i === currentVariantIndex 
                                ? { ...v, attributes: updatedAttributes }
                                : v
                            ));
                            setCustomAttributeInput('');
                            setCustomAttributeValue('');
                          }
                        }}
                        disabled={!customAttributeInput || !customAttributeValue}
                        className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-4"
                      >
                        Add Specification
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowVariantSpecificationsModal(false);
                    setVariantSpecStep(0);
                    setCustomAttributeInput('');
                    setCustomAttributeValue('');
                    setShowAllVariantSpecs(false);
                    toast.success('Specifications saved!');
                  }}
                  className="w-full px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl text-lg"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default EditProductModal;

