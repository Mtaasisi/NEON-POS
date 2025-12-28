import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { X, Layers, Package, Eye, EyeOff, Settings, ChevronDown, ChevronUp, Copy, Upload, Download, Zap } from 'lucide-react';
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
  costPrice?: number;
  price?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  useChildrenVariants?: boolean;
  childrenVariants?: string[];
}

// Custom hook for suggestion dropdowns
const useSuggestionDropdown = (suggestions: string[], showSuggestions: boolean) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      return suggestions[selectedIndex];
    } else if (e.key === 'Escape') {
      setSelectedIndex(-1);
      return 'escape';
    }
    return null;
  }, [showSuggestions, suggestions, selectedIndex]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setSelectedIndex(-1);
    return suggestion;
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  return {
    selectedIndex,
    dropdownRef,
    handleKeyDown,
    handleSuggestionSelect
  };
};

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
  customerPortalSpecification: z.string().max(2000, 'Customer portal specification must be less than 2000 characters').optional(),
  sku: z.string().max(50, 'SKU must be less than 50 characters').optional(),
  categoryId: z.string().min(1, 'Category must be selected'),
  condition: z.enum(['new', 'used', 'refurbished'], {
    errorMap: () => ({ message: 'Please select a condition' })
  }),
  isCustomerPortalVisible: z.boolean().optional().default(true),
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
    condition: '' as 'new' | 'used' | 'refurbished' | '',
    description: '',
    specification: '',
    customerPortalSpecification: '',
    isCustomerPortalVisible: false,
    metadata: {},
    variants: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate default variant
  const createDefaultVariant = (baseSku: string): ProductVariant => {
    return {
      name: 'Default',
      sku: `${baseSku}-V01`,
      specification: '',
      attributes: {},
      costPrice: 0,
      price: 0,
      stockQuantity: 0,
      minStockLevel: 2,
      useChildrenVariants: false,
      childrenVariants: []
    };
  };

  // Variants state - Start with empty array, populated when modal opens
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [showVariants, setShowVariants] = useState(true); // ✅ Always show variants section by default
  const [useVariants, setUseVariants] = useState(false);
  const [isReorderingVariants, setIsReorderingVariants] = useState(false);
  const [isAdvancedFeaturesExpanded, setIsAdvancedFeaturesExpanded] = useState(false);
  const [draggedVariantIndex, setDraggedVariantIndex] = useState<number | null>(null);

  // Variant specifications modal state
  const [showVariantSpecificationsModal, setShowVariantSpecificationsModal] = useState(false);
  const [currentVariantIndex, setCurrentVariantIndex] = useState<number | null>(null);
  const [customAttributeInput, setCustomAttributeInput] = useState('');
  const [customAttributeValue, setCustomAttributeValue] = useState('');
  const [selectedSpecCategory, setSelectedSpecCategory] = useState<string>('laptop');
  const [selectedVariants, setSelectedVariants] = useState<Set<number>>(new Set());
  const [isEditingTemplates, setIsEditingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<Record<string, { name: string; attributes: Record<string, string> }>>({});

  // Product templates for quick fill
  const productTemplates: Record<string, { name: string; attributes: Record<string, string> }> = {
    laptop: {
      name: '',
      attributes: {
        processor: 'Intel Core i5-12th Gen',
        ram: '16GB DDR4',
        storage: '512GB SSD',
        screen_size: '15.6"',
        graphics: 'Intel Iris Xe',
        battery_life: '8 hours',
        weight: '1.8 kg',
        os: 'Windows 11'
      }
    },
    smartphone: {
      name: '',
      attributes: {
        processor: 'Snapdragon 8 Gen 2',
        ram: '8GB',
        storage: '256GB',
        screen_size: '6.5"',
        camera: '48MP Triple Camera',
        battery_capacity: '5000mAh',
        os: 'Android 13',
        network: '5G'
      }
    },
    tablet: {
      name: '',
      attributes: {
        processor: 'Apple M2',
        ram: '8GB',
        storage: '256GB SSD',
        screen_size: '12.9"',
        camera: '12MP Wide',
        battery_capacity: '40.88Wh',
        weight: '682g',
        os: 'iPadOS 16'
      }
    }
  };
  
  // Autocomplete suggestions for attribute names
  const [attributeSuggestions, setAttributeSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const attributeInputRef = useRef<HTMLInputElement>(null);
  const [attributeDropdownPosition, setAttributeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const attributeDropdown = useSuggestionDropdown(attributeSuggestions, showSuggestions);
  
  // Autocomplete suggestions for attribute values
  const [valueSuggestions, setValueSuggestions] = useState<string[]>([]);
  const [showValueSuggestions, setShowValueSuggestions] = useState(false);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const [valueDropdownPosition, setValueDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const valueDropdown = useSuggestionDropdown(valueSuggestions, showValueSuggestions);

  // Selection indices for dropdowns
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [selectedValueSuggestionIndex, setSelectedValueSuggestionIndex] = useState(-1);
  const [variantSelectionIndex, setVariantSelectionIndex] = useState(-1);
  
  // Common attribute name suggestions
  const commonAttributeNames = [
    'processor', 'cpu', 'gpu', 'graphics',
    'ram', 'memory', 'storage', 'storage_type',
    'screen_size', 'display', 'resolution', 'refresh_rate', 'display_type',
    'battery', 'battery_capacity', 'battery_life', 'fast_charging', 'wireless_charging',
    'camera', 'front_camera', 'rear_camera', 'optical_zoom',
    'color', 'weight', 'dimensions', 'size', 'thickness',
    'wifi', 'bluetooth', 'network', '5g_support', 'wifi_6',
    'os', 'operating_system',
    'warranty', 'warranty_period',
    'touch', 'touchscreen', 'touch_screen', 'oled_display', 'amoled_display',
    'high_refresh_rate', 'hdr_support',
    'fingerprint_scanner', 'face_id', 'security_chip',
    'waterproof', 'dust_resistant', 'drop_resistant', 'military_grade',
    'usb_c_port', 'usb_c_ports', 'usb_a_ports', 'thunderbolt', 'hdmi_port', 'headphone_jack',
    'backlit_keyboard', 'stylus_support', 'convertible', 'detachable',
    'dual_sim', 'esim_support', 'nfc', 'gps',
    'stereo_speakers', 'noise_cancellation', 'haptic_feedback',
    'expandable_storage', 'sd_card_slot'
  ];

  // Prevent body scroll when modals are open
  useBodyScrollLock(isOpen || showVariantSpecificationsModal);

  // Reset save attempt flag when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasAttemptedSave(false);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.hasAttribute('contenteditable')
      );

      // Allow shortcuts when inputs are focused (except for Enter key)
      if (isInputFocused && e.key !== 'Enter') {
        return;
      }

      // Ctrl/Cmd + Enter to submit form (always available)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!isSubmitting) {
          console.log('⌨️ [Shortcut] Ctrl+Enter pressed - submitting form');
          handleSubmit();
        }
        return;
      }

      // Ctrl/Cmd + Shift + N to add new variant (avoids browser conflict)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        e.stopPropagation();

        console.log('⌨️ [Shortcut] Ctrl+Shift+N pressed - adding variant');

        if (!useVariants) {
          // Auto-enable variants if not already enabled
          console.log('⌨️ [Shortcut] Ctrl+Shift+N pressed - enabling variants');
          setUseVariants(true);
          setShowVariants(true);
          const newVariant = createDefaultVariant(formData.sku);
          setVariants([newVariant]);
          toast.success('Variants enabled and new variant added');
        } else {
          // Add new variant to existing variants
          console.log('⌨️ [Shortcut] Ctrl+Shift+N pressed - adding new variant');
          const newVariant = createDefaultVariant(formData.sku);
          setVariants(prev => [...prev, newVariant]);
          toast.success('New variant added');
        }
        return;
      }

      // Arrow key navigation for variant bulk selection (when bulk selection is active)
      if (variants.length > 0 && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'ArrowUp') {
          setVariantSelectionIndex(prev => prev > 0 ? prev - 1 : variants.length - 1);
        } else if (e.key === 'ArrowDown') {
          setVariantSelectionIndex(prev => prev < variants.length - 1 ? prev + 1 : 0);
        } else if (e.key === 'ArrowLeft' && variantSelectionIndex >= 0) {
          // Toggle selection for current variant
          const currentIndex = variantSelectionIndex;
          setSelectedVariants(prev => {
            const newSet = new Set(prev);
            if (newSet.has(currentIndex)) {
              newSet.delete(currentIndex);
            } else {
              newSet.add(currentIndex);
            }
            return newSet;
          });
        } else if (e.key === 'ArrowRight' && variantSelectionIndex >= 0) {
          // Toggle selection for current variant
          const currentIndex = variantSelectionIndex;
          setSelectedVariants(prev => {
            const newSet = new Set(prev);
            if (newSet.has(currentIndex)) {
              newSet.delete(currentIndex);
            } else {
              newSet.add(currentIndex);
            }
            return newSet;
          });
        }
        return;
      }

      // Space bar to toggle selection for current variant
      if (e.key === ' ' && variantSelectionIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();

        const currentIndex = variantSelectionIndex;
        setSelectedVariants(prev => {
          const newSet = new Set(prev);
          if (newSet.has(currentIndex)) {
            newSet.delete(currentIndex);
          } else {
            newSet.add(currentIndex);
          }
          return newSet;
        });
        return;
      }

      // Escape to close modal (when not in nested modal)
      if (e.key === 'Escape' && !showVariantSpecificationsModal) {
        e.preventDefault();
        e.stopPropagation();
        console.log('⌨️ [Shortcut] Escape pressed - closing modal');
        onClose();
        return;
      }

      // Ctrl/Cmd + S to save (alternative to Ctrl+Enter)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        if (!isSubmitting) {
          console.log('⌨️ [Shortcut] Ctrl+S pressed - submitting form');
          handleSubmit();
        }
        return;
      }
    };

    // Add event listener to window with high priority to override browser shortcuts
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    isOpen,
    isSubmitting,
    formData.sku,
    useVariants,
    showVariantSpecificationsModal,
    onClose
  ]);

  // Filter attribute suggestions based on input
  useEffect(() => {
    if (customAttributeInput.trim() && showVariantSpecificationsModal) {
      const filtered = commonAttributeNames.filter(name =>
        name.toLowerCase().includes(customAttributeInput.toLowerCase())
      );
      setAttributeSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      setAttributeSuggestions([]);
      setShowSuggestions(false);
    }
  }, [customAttributeInput, showVariantSpecificationsModal]);

  // Handle attribute input change
  const handleAttributeInputChange = (value: string) => {
    setCustomAttributeInput(value);
    setShowSuggestions(true);
    // Update position when input changes
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
    // Common acronyms that should remain uppercase (simplified to most common ones)
    const acronyms = new Set([
      'gps', 'hdd', 'ssd', 'usb', 'usb-c', 'usb-a', 'hdmi', 'nfc', '5g', 'wifi',
      'cpu', 'gpu', 'ram', 'oled', 'amoled', 'hdr', 'ddr', 'ddr3', 'ddr4', 'ddr5',
      'ghz', 'mhz', 'mb', 'gb', 'tb', 'kb', 'mah', 'wh', 'fps', 'rpm', 'dpi', 'ppi',
      'rgb', 'html', 'css', 'js', 'json', 'xml', 'jpg', 'jpeg', 'png', 'gif', 'svg',
      'mp3', 'mp4', 'avi', 'os', 'ios', 'android', 'windows', 'macos', 'linux',
      'http', 'https', 'ai', 'ml', 'bt', 'qr'
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
    attributeInputRef.current?.focus();
  };

  // Handle keyboard navigation in suggestions
  const handleAttributeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const result = attributeDropdown.handleKeyDown(e);
    if (result === 'escape') {
      setShowSuggestions(false);
    } else if (result) {
      handleSuggestionSelect(result);
    }
  };

  // Generate value suggestions based on attribute name
  const getValueSuggestions = (attributeName: string): string[] => {
    const attrLower = attributeName.toLowerCase();
    const suggestions: string[] = [];

    // Processor/CPU
    if (attrLower.includes('processor') || attrLower.includes('cpu')) {
      suggestions.push('Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9');
      suggestions.push('Intel Core i5-11th Gen', 'Intel Core i7-11th Gen', 'Intel Core i9-11th Gen');
      suggestions.push('Intel Core i5-12th Gen', 'Intel Core i7-12th Gen', 'Intel Core i9-12th Gen');
      suggestions.push('Intel Core i5-13th Gen', 'Intel Core i7-13th Gen', 'Intel Core i9-13th Gen');
      suggestions.push('AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9');
      suggestions.push('AMD Ryzen 5 5000', 'AMD Ryzen 7 5000', 'AMD Ryzen 9 5000');
      suggestions.push('AMD Ryzen 5 6000', 'AMD Ryzen 7 6000', 'AMD Ryzen 9 6000');
      suggestions.push('Snapdragon 888', 'Snapdragon 8 Gen 1', 'Snapdragon 8 Gen 2', 'Snapdragon 8 Gen 3');
      suggestions.push('Snapdragon 870', 'Snapdragon 778G', 'Snapdragon 695');
      suggestions.push('Apple A14 Bionic', 'Apple A15 Bionic', 'Apple A16 Bionic', 'Apple A17 Pro');
      suggestions.push('Apple M1', 'Apple M1 Pro', 'Apple M1 Max', 'Apple M2', 'Apple M2 Pro', 'Apple M2 Max', 'Apple M3');
    }

    // Storage
    if (attrLower.includes('storage') && !attrLower.includes('type')) {
      suggestions.push('128GB SSD', '256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD');
      suggestions.push('500GB HDD', '1TB HDD', '2TB HDD', '4TB HDD');
      suggestions.push('128GB NVMe SSD', '256GB NVMe SSD', '512GB NVMe SSD', '1TB NVMe SSD');
    }

    // RAM/Memory
    if (attrLower.includes('ram') || attrLower.includes('memory')) {
      suggestions.push('4GB', '8GB', '16GB', '32GB', '64GB', '128GB');
      suggestions.push('DDR4', 'DDR5', 'LPDDR4', 'LPDDR5');
    }

    // Add more attribute types as needed...
    
    return suggestions;
  };

  // Filter value suggestions based on input
  useEffect(() => {
    if (customAttributeInput.trim() && showVariantSpecificationsModal) {
      const allSuggestions = getValueSuggestions(customAttributeInput);
      
      if (customAttributeValue.trim()) {
        // Filter suggestions based on what user typed
        const filtered = allSuggestions.filter(suggestion =>
          suggestion.toLowerCase().includes(customAttributeValue.toLowerCase())
        );
        setValueSuggestions(filtered);
        setShowValueSuggestions(filtered.length > 0);
      } else {
        // Show all suggestions when field is empty
        setValueSuggestions(allSuggestions);
        setShowValueSuggestions(allSuggestions.length > 0);
      }
      setSelectedValueSuggestionIndex(-1);
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
        attributeDropdown.dropdownRef.current &&
        !attributeDropdown.dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
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
        valueDropdown.dropdownRef.current &&
        !valueDropdown.dropdownRef.current.contains(event.target as Node)
      ) {
        setShowValueSuggestions(false);
      }
    };

    if (showValueSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showValueSuggestions]);

  // Handle value suggestion selection
  const handleValueSuggestionSelect = (suggestion: string) => {
    setCustomAttributeValue(suggestion);
    setShowValueSuggestions(false);
    valueInputRef.current?.focus();
  };

  // Handle keyboard navigation in value suggestions
  const handleValueInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const result = valueDropdown.handleKeyDown(e);
    if (result === 'escape') {
      setShowValueSuggestions(false);
    } else if (result) {
      handleValueSuggestionSelect(result);
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
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

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

      // Generate new SKU and create default variant when modal opens
      const newSku = generateAutoSKU();
      setFormData(prev => ({
        ...prev,
        sku: newSku
      }));

      // Create default variant with the new SKU
      const defaultVariant = {
        name: 'Default',
        sku: `${newSku}-V01`,
        specification: '',
        attributes: {},
        costPrice: 0,
        price: 0,
        stockQuantity: 0,
        minStockLevel: 2,
        useChildrenVariants: false,
        childrenVariants: []
      };
      setVariants([defaultVariant]);
    } else {
      // Reset form when modal closes
      setFormData({
        name: '',
        sku: generateAutoSKU(),
        categoryId: '',
        condition: '',
        description: '',
        specification: '',
        customerPortalSpecification: '',
        isCustomerPortalVisible: false,
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

  // Bulk operations for variants
  const handleBulkDuplicateVariants = () => {
    if (selectedVariants.size === 0) return;

    const duplicatedVariants: ProductVariant[] = [];
    selectedVariants.forEach(index => {
      if (variants[index]) {
        const original = variants[index];
        const duplicated = {
          ...original,
          name: `${original.name} (Copy)`,
          sku: `${original.sku}-COPY${duplicatedVariants.length + 1}`
        };
        duplicatedVariants.push(duplicated);
      }
    });

    setVariants(prev => [...prev, ...duplicatedVariants]);
    setSelectedVariants(new Set());
    toast.success(`Duplicated ${duplicatedVariants.length} variants`);
  };

  const handleBulkDeleteVariants = () => {
    if (selectedVariants.size === 0) return;

    const newVariants = variants.filter((_, index) => !selectedVariants.has(index));
    setVariants(newVariants);
    setSelectedVariants(new Set());
    toast.success(`Deleted ${selectedVariants.size} variants`);
  };

  const handleBulkSetPrices = (costPrice: number, sellingPrice: number) => {
    if (selectedVariants.size === 0) return;

    setVariants(prev => prev.map((variant, index) =>
      selectedVariants.has(index)
        ? { ...variant, costPrice, price: sellingPrice }
        : variant
    ));
    setSelectedVariants(new Set());
    toast.success(`Updated prices for ${selectedVariants.size} variants`);
  };

  const handleSelectAllVariants = () => {
    setSelectedVariants(new Set(variants.map((_, index) => index)));
  };

  const handleDeselectAllVariants = () => {
    setSelectedVariants(new Set());
  };

  // Apply product template
  const handleApplyTemplate = (templateKey: keyof typeof productTemplates) => {
    const template = productTemplates[templateKey];
    if (template) {
      // Create a default variant with template attributes
      const templateVariant = createDefaultVariant(formData.sku);
      templateVariant.attributes = { ...template.attributes };
      templateVariant.specification = `Auto-filled from ${templateKey} template`;

      setVariants([templateVariant]);
      setUseVariants(true);
      setShowVariants(true);
      toast.success(`Applied ${templateKey} template`);
    }
  };

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Mark that user has attempted to save
    setHasAttemptedSave(true);

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
        ...(formData.specification !== undefined ? { specification: formData.specification } : {}),
        ...(formData.customerPortalSpecification !== undefined ? { customer_portal_specification: formData.customerPortalSpecification } : {}),
        ...(formData.condition ? { condition: formData.condition } : {})
      };

      // Validate branch_id exists in store_locations
      let validatedBranchId = currentBranch?.id || null;
      if (validatedBranchId) {
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
        is_customer_portal_visible: formData.isCustomerPortalVisible !== false,
        metadata: {
          useVariants: useVariants,
          variantCount: useVariants ? variants.length : 0,
          skip_default_variant: useVariants && variants.length > 0, // ✅ Skip auto-creation if custom variants provided
          createdBy: currentUser?.id,
          createdAt: new Date().toISOString()
        },
        is_active: true
      };

      try {
        toast.custom?.(null); // noop to ensure toast lib is available (no-op)
      } catch {}

      // Create product
      const { data: product, error: productError } = await retryWithBackoff(async () => {
        return await supabase
          .from('lats_products')
          .insert([productData])
          .select()
          .single();
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
                  }
                }
              }
            }
          }
        }
      }

      // Clear all caches
      productCacheService.clearProducts();
      
      // Clear query cache and deduplication cache
      const { invalidateCachePattern } = await import('../../../../lib/queryCache');
      invalidateCachePattern('products:*');
      
      // Clear enhanced cache manager
      const { smartCache } = await import('../../../../lib/enhancedCacheManager');
      smartCache.invalidateCache('products');
      
      // Force refresh products (bypass all caches)
      await loadProducts(null, true);

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
        condition: '',
        description: '',
        specification: '',
        customerPortalSpecification: '',
        isCustomerPortalVisible: false,
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

  // Calculate completion stats and validation
  const getValidationStatus = () => {
    const errors: string[] = [];

    if (!formData.name?.trim()) errors.push('Product name is required');
    if (!formData.categoryId) errors.push('Category must be selected');
    if (!formData.condition) errors.push('Condition must be selected');

    if (useVariants && variants.length === 0) {
      errors.push('At least one variant is required when variants are enabled');
    }

    variants.forEach((variant, index) => {
      if (!variant.name?.trim()) {
        errors.push(`Variant ${index + 1}: Name is required`);
      }
      // Price is now optional - can be 0 or greater
      // if (variant.price <= 0) {
      //   errors.push(`Variant ${index + 1}: Selling price must be greater than 0`);
      // }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [] // Could add warnings for optional but recommended fields
    };
  };

  const validationStatus = getValidationStatus();

  // Count scalar fields (name, categoryId, condition) separately from variant objects
  const completedScalarFields = [
    formData.name,
    formData.categoryId,
    formData.condition
  ].filter(Boolean).length;
  
  // Count complete variants separately using .length property
  // Price is now optional for variants
  const completedVariants = variants.filter(v => v.name).length;
  
  // Sum the counts
  const completedFields = completedScalarFields + completedVariants;
  const totalFields = 3 + (useVariants ? variants.length : 0);
  const pendingFields = Math.max(0, totalFields - completedFields);

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99999]" />

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
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
          <button
            onClick={() => {
              // Export current product configuration
              const exportData = {
                formData,
                variants,
                useVariants,
                timestamp: new Date().toISOString()
              };
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `product-config-${Date.now()}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              toast.success('Product configuration exported');
            }}
            className="w-9 h-9 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors shadow-lg"
            title="Export Configuration"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              // Import product configuration
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    try {
                      const importData = JSON.parse(e.target?.result as string);
                      if (importData.formData && importData.variants) {
                        setFormData(importData.formData);
                        setVariants(importData.variants);
                        setUseVariants(importData.useVariants || false);
                        setShowVariants(importData.useVariants || importData.variants.length > 0);
                        toast.success('Product configuration imported');
                      } else {
                        toast.error('Invalid configuration file');
                      }
                    } catch (error) {
                      toast.error('Failed to parse configuration file');
                    }
                  };
                  reader.readAsText(file);
                }
              };
              input.click();
            }}
            className="w-9 h-9 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-lg"
            title="Import Configuration"
          >
            <Upload className="w-4 h-4" />
          </button>

        <button
          onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>
        </div>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr,auto] gap-6 items-center">
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
              selectedVariants={selectedVariants}
              setSelectedVariants={setSelectedVariants}
              keyboardSelectionIndex={variantSelectionIndex}
              setKeyboardSelectionIndex={setVariantSelectionIndex}
            />

            {/* Advanced Features Section */}
            <div className="border-2 rounded-2xl bg-white shadow-sm border-gray-200 mb-6">
              <button
                type="button"
                onClick={() => setIsAdvancedFeaturesExpanded(!isAdvancedFeaturesExpanded)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 rounded-t-2xl transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Advanced Features
                    </h3>
                    <p className="text-sm text-gray-600">
                      Customer portal settings and additional options
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isAdvancedFeaturesExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </button>

              {isAdvancedFeaturesExpanded && (
                <div className="p-6 space-y-6">
                  {/* Customer Portal Visibility */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        formData.isCustomerPortalVisible !== false ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        {formData.isCustomerPortalVisible !== false ? (
                          <Eye className="w-5 h-5 text-white" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          Customer Portal Visibility
                        </h4>
                        <p className="text-xs text-gray-600">
                          {formData.isCustomerPortalVisible !== false
                            ? 'Product is visible to customers in the portal'
                            : 'Product is hidden from customers in the portal'
                          }
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isCustomerPortalVisible !== false}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          isCustomerPortalVisible: e.target.checked
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>

                  {/* Customer Portal Specifications - shown only when product is visible in customer portal */}
                  {formData.isCustomerPortalVisible !== false && (
                    <div>
                      <label
                        htmlFor="customer-portal-specs"
                        className={`block mb-2 text-xs font-medium ${currentErrors.customerPortalSpecification ? 'text-red-600' : 'text-gray-700'}`}
                      >
                        Customer Portal Specifications (optional)
                      </label>
                      <textarea
                        id="customer-portal-specs"
                        value={formData.customerPortalSpecification || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerPortalSpecification: e.target.value }))}
                        placeholder="Advanced specifications for the customer portal — paste or type detailed specs here."
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 resize-vertical ${
                          currentErrors.customerPortalSpecification
                            ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        }`}
                        rows={4}
                        maxLength={2000}
                      />
                      {currentErrors.customerPortalSpecification && (
                        <p className="mt-1 text-sm text-red-600">{currentErrors.customerPortalSpecification}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        You can paste larger/advanced specifications here for display in the customer portal.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>


            {/* Bulk Actions Section (only show when variants exist) */}
            {variants.length > 1 && (
              <div className="border-2 rounded-2xl bg-white shadow-sm border-gray-200 mb-6">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Copy className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Bulk Actions</h3>
                        <p className="text-sm text-gray-600">
                          {selectedVariants.size} of {variants.length} variants selected
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllVariants}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllVariants}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleBulkDuplicateVariants}
                      disabled={selectedVariants.size === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicate Selected
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDeleteVariants}
                      disabled={selectedVariants.size === 0}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Delete Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const costPrice = prompt('Enter cost price for selected variants:');
                        const sellingPrice = prompt('Enter selling price for selected variants:');
                        if (costPrice && sellingPrice) {
                          handleBulkSetPrices(parseFloat(costPrice), parseFloat(sellingPrice));
                        }
                      }}
                      disabled={selectedVariants.size === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Set Prices
                    </button>
                  </div>

                  {/* Perfect Closed Variant Card Preview */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="text-center text-gray-600 mb-4">
                      <div className="text-sm font-medium">Perfect Closed Variant Card Preview:</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 cursor-pointer group">
                      <div className="flex items-center gap-4">
                        {/* Selection Checkbox */}
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />

                        {/* Icon */}
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-blue-600" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold text-gray-900 truncate">Default Variant</h4>
                            <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Active
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              $1,299.00
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              15 in stock
                            </span>
                          </div>
                        </div>

                        {/* Single Actions Menu */}
                        <button
                          type="button"
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors opacity-60 group-hover:opacity-100"
                          title="Variant actions"
                          aria-label="Variant actions menu"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Validation Summary - Only show after user attempts to save */}
        {!validationStatus.isValid && hasAttemptedSave && (
          <div className="p-4 border-t border-gray-200 bg-red-50">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800 mb-2">Validation Issues</h4>
                <ul className="space-y-1">
                  {validationStatus.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-700">• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          {/* Keyboard Shortcuts Help */}
          <div className="flex items-center justify-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs font-medium text-gray-600">⌨️ Shortcuts:</div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono text-xs shadow-sm">Ctrl+Enter</kbd>
                <span className="text-gray-600">Save</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono text-xs shadow-sm">Ctrl+S</kbd>
                <span className="text-gray-600">Save</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono text-xs shadow-sm">Ctrl+Shift+N</kbd>
                <span className="text-gray-600">Add Variant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono text-xs shadow-sm">↑↓</kbd>
                <span className="text-gray-600">Navigate Variants</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono text-xs shadow-sm">Space</kbd>
                <span className="text-gray-600">Select</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono text-xs shadow-sm">Esc</kbd>
                <span className="text-gray-600">Close</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={isSubmitting || isCheckingName || !validationStatus.isValid}
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
          {/* Modal Backdrop */}
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100002]" />

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
                  setCustomAttributeInput('');
                  setCustomAttributeValue('');
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
              <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
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

                    {/* Quick Templates */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-green-600" />
                          Quick Templates
                        </h4>
                        <button
                          type="button"
                          onClick={() => setIsEditingTemplates(!isEditingTemplates)}
                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                          {isEditingTemplates ? 'Done' : 'Edit'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mb-4">
                        {isEditingTemplates
                          ? 'Edit template values or create custom templates'
                          : 'Start with pre-configured templates for common products'
                        }
                      </p>

                      {isEditingTemplates ? (
                        <div className="space-y-4">
                          {Object.entries({ ...productTemplates, ...customTemplates }).map(([key, template]) => (
                            <div key={key} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-gray-900 capitalize text-sm">{key}</h5>
                                <div className="flex gap-1">
                                  {editingTemplate === key ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingTemplate(null);
                                          toast.success(`Saved ${key} template`);
                                        }}
                                        className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingTemplate(null)}
                                        className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setEditingTemplate(key)}
                                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                      >
                                        Edit
                                      </button>
                                      {!productTemplates[key as keyof typeof productTemplates] && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newTemplates = { ...customTemplates };
                                            delete newTemplates[key];
                                            setCustomTemplates(newTemplates);
                                            toast.success(`Deleted ${key} template`);
                                          }}
                                          className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {editingTemplate === key ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {Object.entries(template.attributes).map(([attrKey, attrValue]) => (
                                    <div key={attrKey} className="flex flex-col">
                                      <label className="text-xs font-medium text-gray-600 mb-1 capitalize">
                                        {attrKey.replace(/_/g, ' ')}
                                      </label>
                                      <input
                                        type="text"
                                        value={attrValue}
                                        onChange={(e) => {
                                          const updatedTemplates = { ...customTemplates, ...productTemplates };
                                          if (!updatedTemplates[key]) updatedTemplates[key] = { name: '', attributes: {} };
                                          updatedTemplates[key].attributes[attrKey] = e.target.value;

                                          if (productTemplates[key as keyof typeof productTemplates]) {
                                            // This is a built-in template, save to custom templates
                                            setCustomTemplates(prev => ({
                                              ...prev,
                                              [key]: updatedTemplates[key]
                                            }));
                                          } else {
                                            // This is already a custom template
                                            setCustomTemplates(prev => ({
                                              ...prev,
                                              [key]: updatedTemplates[key]
                                            }));
                                          }
                                        }}
                                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                        placeholder={`Enter ${attrKey.replace(/_/g, ' ')}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-600">
                                  {Object.keys(template.attributes).length} specifications configured
                                </div>
                              )}
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => {
                              const templateName = prompt('Enter template name:');
                              if (templateName && templateName.trim()) {
                                const newTemplate = {
                                  name: '',
                                  attributes: {
                                    processor: '',
                                    ram: '',
                                    storage: '',
                                    screen_size: '',
                                    camera: '',
                                    battery_capacity: '',
                                    weight: '',
                                    os: ''
                                  }
                                };
                                setCustomTemplates(prev => ({
                                  ...prev,
                                  [templateName.trim().toLowerCase()]: newTemplate
                                }));
                                setEditingTemplate(templateName.trim().toLowerCase());
                                toast.success(`Created new template: ${templateName}`);
                              }
                            }}
                            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-sm text-gray-600 hover:text-green-600"
                          >
                            + Create Custom Template
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {Object.entries({ ...productTemplates, ...customTemplates }).map(([key, template]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                // Apply template to current variant
                                if (currentVariantIndex !== null && variants[currentVariantIndex]) {
                                  const updatedAttributes = {
                                    ...variants[currentVariantIndex].attributes,
                                    ...template.attributes
                                  };
                                  setVariants(prev => prev.map((v, i) =>
                                    i === currentVariantIndex
                                      ? { ...v, attributes: updatedAttributes }
                                      : v
                                  ));
                                  toast.success(`Applied ${key} template to variant`);
                                }
                              }}
                              className="p-3 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all group"
                            >
                              <div className="text-center">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-green-200 transition-colors">
                                  <Package className="w-5 h-5 text-green-600" />
                                </div>
                                <h5 className="font-medium text-gray-900 capitalize text-sm mb-1">{key}</h5>
                                <p className="text-xs text-gray-600">
                                  {Object.keys(template.attributes).length} specs
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {!isEditingTemplates && (
                        <p className="text-xs text-gray-500 mt-3 text-center">
                          Templates will add pre-filled attributes to this variant
                        </p>
                      )}
                    </div>

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
                              ref={attributeDropdown.dropdownRef}
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
                                    onClick={() => attributeDropdown.handleSuggestionSelect(suggestion)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors rounded-lg border ${
                                      index === attributeDropdown.selectedIndex
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
                            onChange={(e) => {
                              setCustomAttributeValue(e.target.value);
                              // Update position when typing
                              if (valueInputRef.current) {
                                const rect = valueInputRef.current.getBoundingClientRect();
                                setValueDropdownPosition({
                                  top: rect.bottom + window.scrollY,
                                  left: rect.left + window.scrollX,
                                  width: rect.width
                                });
                              }
                            }}
                            onKeyDown={(e) => {
                              handleValueInputKeyDown(e);
                              // Also handle Enter to add specification
                              if (e.key === 'Enter' && !showValueSuggestions && customAttributeInput && customAttributeValue) {
                                const updatedAttributes = {
                                  ...variants[currentVariantIndex].attributes,
                                  [customAttributeInput]: customAttributeValue
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
                                const allSuggestions = getValueSuggestions(customAttributeInput);
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
                              ref={valueDropdown.dropdownRef}
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
                                    onClick={() => valueDropdown.handleSuggestionSelect(suggestion)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors rounded-lg border ${
                                      index === valueDropdown.selectedIndex
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
                            const updatedAttributes = {
                              ...variants[currentVariantIndex].attributes,
                              [customAttributeInput]: customAttributeValue
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
                    setCustomAttributeInput('');
                    setCustomAttributeValue('');
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

