import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { X, Layers, Package, Plus } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import { useBranch } from '../../../../context/BranchContext';
import { retryWithBackoff } from '../../../../lib/supabaseClient';

import { getActiveCategories, Category } from '../../../../lib/categoryApi';

import { generateSKU } from '../../lib/skuUtils';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { productCacheService } from '../../../../lib/productCacheService';

// Extracted components
import ProductInformationForm from './ProductInformationForm';
import ProductVariantsSection from './ProductVariantsSection';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: () => void;
  onProductAdded?: (product: any) => void;
  currency?: any; // Optional currency prop for purchase orders
}

// Import ProductVariant type
interface ProductVariant {
  name: string;
  sku: string;
  specification?: string;
  attributes?: Record<string, any>;
}

// Validation schema for product form
const productFormSchema = z.object({
  name: z.string().min(1, 'Product name must be provided').max(100, 'Product name must be less than 100 characters'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
  specification: z.string().max(1000, 'Specification must be less than 1000 characters').optional().refine((val) => {
    if (!val) return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, {
    message: "Specification must be valid JSON"
  }),
  sku: z.string().max(50, 'SKU must be less than 50 characters').optional(),
  categoryId: z.string().min(1, 'Category must be selected'),
  condition: z.enum(['new', 'used', 'refurbished'], {
    errorMap: () => ({ message: 'Please select a condition' })
  }),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  variants: z.array(z.any()).optional().default([])
});

const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  onProductAdded,
  currency
}) => {
  const { currentBranch } = useBranch();
  const { loadProducts } = useInventoryStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentErrors, setCurrentErrors] = useState<Record<string, string>>({});

  // Generate auto SKU using utility function
  const generateAutoSKU = () => {
    return generateSKU();
  };

  // Initial form data
  const [formData, setFormData] = useState({
    name: '',
    sku: generateAutoSKU(),
    categoryId: '',
    condition: 'new' as 'new' | 'used' | 'refurbished',
    description: '',
    specification: '',
    metadata: {},
    variants: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variants state - Start with empty array, user can add variants manually
  // If no variants are added, the database trigger will auto-create a "Default" variant
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
  
  // Autocomplete suggestions for attribute values
  const [valueSuggestions, setValueSuggestions] = useState<string[]>([]);
  const [showValueSuggestions, setShowValueSuggestions] = useState(false);
  const [selectedValueSuggestionIndex, setSelectedValueSuggestionIndex] = useState(-1);
  const valueInputRef = useRef<HTMLInputElement>(null);
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

  // Generate smart value suggestions based on attribute name
  const getValueSuggestions = (attributeName: string, currentValue: string): string[] => {
    const attrLower = attributeName.toLowerCase();
    const valueLower = currentValue.toLowerCase().trim();
    const suggestions: string[] = [];

    // Storage-related attributes
    if (attrLower.includes('storage') && !attrLower.includes('type')) {
      // Extract number from input
      const numberMatch = valueLower.match(/\d+/);
      const number = numberMatch ? parseInt(numberMatch[0]) : null;
      
      if (number) {
        // Smart suggestions: smaller numbers (128-512) are usually SSD, larger (500+) are usually HDD
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
        // Common storage sizes
        suggestions.push('128GB SSD', '256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD');
        suggestions.push('500GB HDD', '1TB HDD', '2TB HDD', '4TB HDD');
        suggestions.push('128GB NVMe SSD', '256GB NVMe SSD', '512GB NVMe SSD', '1TB NVMe SSD');
      }
    }

    // Storage type
    if (attrLower.includes('storage_type')) {
      suggestions.push('SSD', 'HDD', 'NVMe SSD', 'eMMC', 'UFS');
    }

    // RAM/Memory
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

    // Screen size
    if (attrLower.includes('screen_size') || attrLower.includes('display') && attrLower.includes('size')) {
      const numberMatch = valueLower.match(/\d+(\.\d+)?/);
      if (numberMatch) {
        suggestions.push(`${numberMatch[0]}"`);
        suggestions.push(`${numberMatch[0]} inch`);
      } else {
        suggestions.push('11"', '12"', '13"', '13.3"', '14"', '15"', '15.6"', '16"', '17"', '21"', '24"', '27"', '32"');
      }
    }

    // Resolution
    if (attrLower.includes('resolution')) {
      suggestions.push('HD (1366x768)', 'FHD (1920x1080)', 'QHD (2560x1440)', '4K (3840x2160)', '8K (7680x4320)');
      suggestions.push('HD+', 'FHD+', 'QHD+');
    }

    // Refresh rate
    if (attrLower.includes('refresh_rate')) {
      const numberMatch = valueLower.match(/\d+/);
      if (numberMatch) {
        suggestions.push(`${numberMatch[0]}Hz`);
      } else {
        suggestions.push('60Hz', '75Hz', '90Hz', '120Hz', '144Hz', '165Hz', '240Hz');
      }
    }

    // Battery capacity
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

    // Battery life
    if (attrLower.includes('battery_life')) {
      const numberMatch = valueLower.match(/\d+/);
      if (numberMatch) {
        suggestions.push(`${numberMatch[0]} hours`, `${numberMatch[0]}h`);
      } else {
        suggestions.push('8 hours', '10 hours', '12 hours', '15 hours', '20 hours', '24 hours');
      }
    }

    // Processor/CPU
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

    // GPU/Graphics
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

    // Color
    if (attrLower.includes('color')) {
      const commonColors = ['Black', 'White', 'Silver', 'Gray', 'Space Gray', 'Gold', 'Rose Gold', 'Blue', 'Red', 'Green', 'Purple', 'Pink'];
      if (valueLower) {
        const filtered = commonColors.filter(c => c.toLowerCase().includes(valueLower));
        suggestions.push(...filtered);
      } else {
        suggestions.push(...commonColors);
      }
    }

    // Weight
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

    // WiFi
    if (attrLower.includes('wifi')) {
      suggestions.push('Wi-Fi 5', 'Wi-Fi 6', 'Wi-Fi 6E', 'Wi-Fi 7', '802.11ac', '802.11ax');
    }

    // Bluetooth
    if (attrLower.includes('bluetooth')) {
      suggestions.push('4.0', '4.2', '5.0', '5.1', '5.2', '5.3');
    }

    // Operating System
    if (attrLower.includes('os') || attrLower.includes('operating_system')) {
      suggestions.push('Windows 11', 'Windows 10', 'macOS', 'iOS', 'Android', 'Linux', 'Chrome OS');
    }

    // Camera (MP)
    if (attrLower.includes('camera')) {
      const numberMatch = valueLower.match(/\d+/);
      if (numberMatch) {
        suggestions.push(`${numberMatch[0]}MP`, `${numberMatch[0]} MP`);
      } else {
        suggestions.push('12MP', '48MP', '50MP', '64MP', '108MP');
        suggestions.push('12MP + 12MP', '48MP + 12MP + 5MP', '50MP + 12MP + 8MP');
      }
    }

    // Panel type
    if (attrLower.includes('panel_type')) {
      suggestions.push('IPS', 'VA', 'TN', 'OLED', 'AMOLED', 'Mini LED');
    }

    // Display type
    if (attrLower.includes('display_type')) {
      suggestions.push('LCD', 'OLED', 'AMOLED', 'Super AMOLED', 'IPS LCD', 'TFT');
    }

    // Waterproof rating
    if (attrLower.includes('waterproof')) {
      suggestions.push('IP67', 'IP68', 'IPX7', 'IPX8', 'Yes', 'No');
    }

    // Boolean-like attributes
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

    return suggestions.slice(0, 8); // Limit to 8 suggestions
  };

  // Filter value suggestions based on input
  useEffect(() => {
    if (customAttributeValue.trim() && customAttributeInput.trim() && showVariantSpecificationsModal) {
      const suggestions = getValueSuggestions(customAttributeInput, customAttributeValue);
      setValueSuggestions(suggestions);
      setShowValueSuggestions(suggestions.length > 0);
      setSelectedValueSuggestionIndex(-1);
    } else {
      setValueSuggestions([]);
      setShowValueSuggestions(false);
    }
  }, [customAttributeValue, customAttributeInput, showVariantSpecificationsModal]);

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

  // Name checking
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameExists, setNameExists] = useState(false);

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

      // Generate new SKU when modal opens
      setFormData(prev => ({
        ...prev,
        sku: generateAutoSKU()
      }));
    } else {
      // Reset form when modal closes
      setFormData({
        name: '',
        sku: generateAutoSKU(),
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
    }
  }, [isOpen]);

  // Check if product name exists
  const checkProductName = async (name: string) => {
    if (!name.trim()) {
      setNameExists(false);
      return;
    }

    setIsCheckingName(true);
    try {
      const { data, error } = await supabase
        .from('lats_products')
        .select('id')
        .ilike('name', name.trim())
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
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            errors[err.path[0]] = err.message;
          }
        });
        setCurrentErrors(errors);
        toast.error('Please fix the validation errors');
        return;
      }
    }

    if (!currentBranch?.id) {
      toast.error('No branch selected');
      return;
    }

    setIsSubmitting(true);

    try {
      // Set total quantity and value to 0 - will be managed by variants
      const totalQuantity = 0;
      const totalValue = 0;

      // Always generate/use SKU - it's the base for variant SKUs
      const finalSku = formData.sku || generateAutoSKU();
      
      // Prepare attributes with specification and condition if available
      const productAttributes = {
        ...(formData.metadata || {}),
        ...(formData.specification ? { specification: formData.specification } : {}),
        ...(formData.condition ? { condition: formData.condition } : {})
      };

      // Validate branch_id exists in store_locations
      let validatedBranchId = currentBranch?.id || null;
      if (validatedBranchId) {
        console.log('🔍 [AddProductModal] Validating branch_id:', validatedBranchId);
        const { data: branchCheck } = await supabase
          .from('store_locations')
          .select('id')
          .eq('id', validatedBranchId)
          .single();
        
        if (!branchCheck) {
          console.warn('⚠️ [AddProductModal] Current branch ID not found in store_locations, setting to null');
          validatedBranchId = null;
        }
      }

      const productData = {
        name: formData.name,
        description: formData.description || null,
        sku: finalSku,
        category_id: formData.categoryId || null,
        branch_id: validatedBranchId,

        // Set prices and stock to 0 - variants will handle these
        cost_price: 0,
        selling_price: 0,
        stock_quantity: 0,
        min_stock_level: 0,
        total_quantity: totalQuantity,
        total_value: totalValue,
        attributes: productAttributes,
        metadata: {
          useVariants: useVariants,
          variantCount: useVariants ? variants.length : 0,
          skip_default_variant: useVariants && variants.length > 0, // ✅ Skip auto-creation if custom variants provided
          createdBy: currentUser?.id,
          createdAt: new Date().toISOString()
        },
        is_active: true
      };

      console.log('🔄 [AddProductModal] Creating product with data:', productData);

      // Create product
      const { data: product, error: productError } = await retryWithBackoff(async () => {
        return await supabase
          .from('lats_products')
          .insert([productData])
          .select()
          .single();
      });

      console.log('🔍 [AddProductModal] INSERT result:', { 
        data: product, 
        error: productError, 
        hasData: !!product, 
        hasError: !!productError
      });

      // Check if we have an error (even if not thrown)
      if (productError) {
        console.error('❌ [AddProductModal] Product creation failed with error:', productError);
        console.error('Error details:', {
          message: productError.message,
          code: productError.code,
          details: productError.details,
          hint: productError.hint
        });
        
        // Provide more helpful error messages
        if (productError.code === '23503') {
          toast.error('Invalid branch assignment. Please refresh the page and try again.');
        } else if (productError.code === '23505') {
          toast.error('A product with this SKU already exists.');
        } else {
          toast.error(`Product creation failed: ${productError.message}`);
        }
        throw productError;
      }

      // Check if we got null data without an error
      if (!product) {
        console.error('❌ [AddProductModal] Product creation returned null WITHOUT an error!');
        console.error('❌ This usually means RLS policy allows INSERT but blocks SELECT');
        
        // Check current user
        const { data: { user } } = await supabase.auth.getUser();
        console.error('❌ Current user:', user);
        console.error('❌ User ID:', user?.id);
        
        toast.error('Product creation failed - database returned no data. Please check your permissions.');
        return;
      }

      console.log('✅ [AddProductModal] Product created successfully:', product);

      // Create variants if any
      if (product && variants.length > 0) {
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
        
        console.log('🔄 [AddProductModal] Creating user-defined variants for product:', product.id);
        console.log('Variants from form:', variants.map(v => ({ name: v.name, sku: v.sku })));
        
        const variantsToInsert = variants.map((variant, index) => ({
          product_id: product.id,
          branch_id: currentBranch?.id || null,  // ✅ Include branch_id to satisfy NOT NULL constraint
          name: variant.name || `Variant ${index + 1}`,  // ✅ 'name' column
          variant_name: variant.name || `Variant ${index + 1}`,  // ✅ 'variant_name' column (both needed)
          sku: variant.sku || `${formData.sku}-V${(index + 1).toString().padStart(2, '0')}`,
          cost_price: variant.costPrice || 0,  // ✅ FIX: Use variant costPrice from form
          unit_price: variant.price || 0,  // ✅ FIX: Use variant price as unit_price
          selling_price: variant.price || 0,  // ✅ FIX: Use variant price from form
          quantity: variant.stockQuantity || 0,  // ✅ FIX: Use variant stockQuantity from form
          min_quantity: variant.minStockLevel || 0,  // ✅ FIX: Use variant minStockLevel from form
          variant_attributes: {  // ✅ Save to 'variant_attributes' (correct column)
            ...variant.attributes,
            specification: variant.specification || null
          },
          attributes: variant.attributes || {},  // ✅ Added separate 'attributes' column
          is_active: true,
          // Mark as parent if it has children variants
          is_parent: variant.useChildrenVariants && variant.childrenVariants && variant.childrenVariants.filter(c => c.trim()).length > 0,
          variant_type: variant.useChildrenVariants && variant.childrenVariants && variant.childrenVariants.filter(c => c.trim()).length > 0 ? 'parent' : null
        }));

        console.log('🔄 [AddProductModal] Variant data to insert:', variantsToInsert);

        const { data: createdVariants, error: variantsError } = await retryWithBackoff(async () => {
          return await supabase
            .from('lats_product_variants')
            .insert(variantsToInsert)
            .select();
        });

        if (variantsError) {
          console.error('❌ [AddProductModal] Error creating variants:', variantsError);
          toast.error('Product created but failed to create variants');
        } else {
          console.log('✅ [AddProductModal] Variants created successfully:', createdVariants);

          // Create children variants (IMEI/Serial numbers) if any
          if (createdVariants && createdVariants.length > 0) {
            const { addIMEIToParentVariant, checkIMEIExists } = await import('../../lib/imeiVariantService');
            
            // Collect all children variants from all variants to check for duplicates across the product
            const allChildrenVariants: string[] = [];
            for (const formVariant of variants) {
              if (formVariant.useChildrenVariants && formVariant.childrenVariants) {
                const validChildren = formVariant.childrenVariants.filter(c => c.trim().length > 0);
                allChildrenVariants.push(...validChildren.map(c => c.trim()));
              }
            }
            
            // Check for duplicates across all variants in the product
            const childrenSet = new Set<string>();
            const duplicateChildren: string[] = [];
            for (const child of allChildrenVariants) {
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
            
            for (let i = 0; i < createdVariants.length; i++) {
              const createdVariant = createdVariants[i];
              const formVariant = variants[i];
              
              // Check if this variant has children variants to add
              if (formVariant.useChildrenVariants && formVariant.childrenVariants && formVariant.childrenVariants.length > 0) {
                const validChildren = formVariant.childrenVariants.filter(c => c.trim().length > 0);
                
                if (validChildren.length > 0) {
                  console.log(`🔄 [AddProductModal] Creating ${validChildren.length} children variants for variant ${createdVariant.id}`);
                  
                  // Ensure parent is marked as parent
                  if (!createdVariant.is_parent) {
                    await supabase
                      .from('lats_product_variants')
                      .update({
                        is_parent: true,
                        variant_type: 'parent',
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', createdVariant.id);
                  }
                  
                  // Add each child variant
                  const childrenResults = [];
                  for (const childValue of validChildren) {
                    const trimmedValue = childValue.trim();
                    
                    // Check if IMEI/Serial already exists
                    const exists = await checkIMEIExists(trimmedValue);
                    if (exists) {
                      console.warn(`⚠️ [AddProductModal] IMEI/Serial ${trimmedValue} already exists, skipping`);
                      toast.error(`IMEI/Serial ${trimmedValue} already exists`);
                      continue;
                    }
                    
                    // Add child variant
                    const result = await addIMEIToParentVariant(createdVariant.id, {
                      imei: trimmedValue,
                      serial_number: trimmedValue,
                      cost_price: formVariant.costPrice || createdVariant.cost_price || 0,
                      selling_price: formVariant.price || createdVariant.selling_price || 0,
                      condition: 'new',
                      source: 'purchase'
                    });
                    
                    if (result.success) {
                      childrenResults.push(trimmedValue);
                    } else {
                      console.error(`❌ [AddProductModal] Failed to add child variant ${trimmedValue}:`, result.error);
                      toast.error(`Failed to add IMEI/Serial ${trimmedValue}: ${result.error}`);
                    }
                  }
                  
                  if (childrenResults.length > 0) {
                    console.log(`✅ [AddProductModal] Created ${childrenResults.length} children variants for variant ${createdVariant.id}`);
                  }
                }
              }
            }
          }
        }
      }

      // Clear all caches
      console.log('🔄 [AddProductModal] Clearing all product caches and reloading...');
      productCacheService.clearProducts();
      
      // Clear query cache and deduplication cache
      const { invalidateCachePattern } = await import('../../../../lib/queryCache');
      invalidateCachePattern('products:*');
      
      // Clear enhanced cache manager
      const { smartCache } = await import('../../../../lib/enhancedCacheManager');
      smartCache.invalidateCache('products');
      
      // Force refresh products (bypass all caches)
      await loadProducts(null, true);
      console.log('✅ [AddProductModal] Products reloaded successfully');

      toast.success('Product created successfully!');
      
      // Call both callbacks for compatibility
      if (onProductCreated) onProductCreated();
      if (onProductAdded) onProductAdded(product);
      
      onClose();

      // Reset form
      setFormData({
        name: '',
        sku: generateAutoSKU(),
        categoryId: '',
        condition: 'new',
        description: '',
        specification: '',
        metadata: {},
        variants: []
      });
      setVariants([]);
      setCurrentErrors({});
    } catch (error: any) {
      console.error('❌ [AddProductModal] Error creating product:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error(error.message || 'Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Calculate completion stats
  // Count scalar fields (name, categoryId, condition) separately from variant objects
  const completedScalarFields = [
    formData.name,
    formData.categoryId,
    formData.condition
  ].filter(Boolean).length;
  
  // Count complete variants separately using .length property
  const completedVariants = variants.filter(v => v.name && v.price > 0).length;
  
  // Sum the counts
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
          aria-labelledby="add-product-modal-title"
        >
        {/* Close Button */}
        <button
          onClick={onClose}
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
              <h3 id="add-product-modal-title" className="text-2xl font-bold text-gray-900 mb-3">Add New Product</h3>
              
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

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          {pendingFields > 0 && (
            <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-semibold text-orange-700">
                Please complete all required fields before creating the product.
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
                'Create Product'
              )}
            </button>
          </form>
        </div>
        </div>
      </div>

      {/* Variant Specifications Modal */}
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
                                <span className="text-sm font-medium text-gray-700">{key.replace(/_/g, ' ')}:</span>
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
                      <div className="space-y-3">
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
                              // Show all suggestions when field is focused, even if empty
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
                              // Delay to allow click on suggestion
                              setTimeout(() => setShowSuggestions(false), 200);
                            }}
                            placeholder="e.g., Color, Size, Storage, Processor"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-sm"
                            autoComplete="off"
                          />
                          {/* Autocomplete Suggestions Dropdown */}
                          {showSuggestions && attributeSuggestions.length > 0 && createPortal(
                            <div 
                              className="fixed z-[999999] bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                              style={{
                                top: `${attributeDropdownPosition.top}px`,
                                left: `${attributeDropdownPosition.left}px`,
                                width: `${attributeDropdownPosition.width}px`,
                                maxWidth: '100vw'
                              }}
                            >
                              {attributeSuggestions.map((suggestion, index) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => handleSuggestionSelect(suggestion)}
                                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-purple-50 transition-colors ${
                                    index === selectedSuggestionIndex ? 'bg-purple-100' : ''
                                  } ${index === 0 ? 'rounded-t-xl' : ''} ${
                                    index === attributeSuggestions.length - 1 ? 'rounded-b-xl' : ''
                                  }`}
                                >
                                  <span className="font-medium text-gray-800">{suggestion}</span>
                                </button>
                              ))}
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
                              // Show suggestions when field is focused, even if empty
                              if (customAttributeInput.trim() && customAttributeValue.trim()) {
                                const suggestions = getValueSuggestions(customAttributeInput, customAttributeValue);
                                setValueSuggestions(suggestions);
                                setShowValueSuggestions(suggestions.length > 0);
                              } else if (customAttributeInput.trim()) {
                                // Show initial suggestions based on attribute name
                                const suggestions = getValueSuggestions(customAttributeInput, '');
                                setValueSuggestions(suggestions);
                                setShowValueSuggestions(suggestions.length > 0);
                              }
                            }}
                            onBlur={() => {
                              // Delay to allow click on suggestion
                              setTimeout(() => setShowValueSuggestions(false), 200);
                            }}
                            placeholder="e.g., Black, Large, 256GB"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-sm"
                            autoComplete="off"
                          />
                          {/* Autocomplete Suggestions Dropdown for Value */}
                          {showValueSuggestions && valueSuggestions.length > 0 && createPortal(
                            <div 
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
                          className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                          Add Specification
                        </button>
                      </div>
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

export default AddProductModal;

