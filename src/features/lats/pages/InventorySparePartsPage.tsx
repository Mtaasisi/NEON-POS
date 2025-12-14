import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../../../context/AuthContext'; // Unused import
import SearchBar from '../../../features/shared/components/ui/SearchBar';
import GlassSelect from '../../../features/shared/components/ui/GlassSelect';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { 
  Package, Plus, Grid, List, SortAsc, AlertCircle, Edit, Eye, Trash2, 
  RefreshCw, Wrench, Minus, CheckCircle, XCircle, Search, BarChart3, ChevronDown, ChevronUp,
  Battery, Monitor, Zap, Camera, Speaker, Mic, MousePointer, Power, Volume2,
  Cpu, HardDrive, Cable, Radio, Headphones, Smartphone, Laptop, Tablet, Upload
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import spare parts forms
import SparePartAddEditForm from '../components/inventory/SparePartAddEditForm';
import SparePartUsageModal from '../components/inventory/SparePartUsageModal';
import SparePartDetailsModal from '../components/spare-parts/SparePartDetailsModal';
import SparePartStockAdjustModal from '../components/inventory/SparePartStockAdjustModal';
import SparePartTransferModal from '../components/inventory/SparePartTransferModal';
import Modal from '../../shared/components/ui/Modal';
import { SimpleImageUpload } from '../../../components/SimpleImageUpload';

// Import database functionality
import { useInventoryStore } from '../stores/useInventoryStore';
import { format } from '../lib/format';
import { SparePart } from '../types/spareParts';
import { SafeImage } from '../../../components/SafeImage';
import { useDialog } from '../../shared/hooks/useDialog';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { InventoryQuickLinks } from '../components/shared/InventoryQuickLinks';

const InventorySparePartsPage: React.FC = () => {
  // const { currentUser } = useAuth(); // Unused variable
  const { confirm } = useDialog();
  const navigate = useNavigate();
  
  // Database state management
  const { 
    spareParts, 
    categories,
    suppliers,
    isLoading,
    error,
    loadSpareParts,
    loadCategories,
    loadSuppliers,
    createOrUpdateSparePart,
    updateSparePart,
    deleteSparePart,
    useSparePart
  } = useInventoryStore();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'cost' | 'selling'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [brandFilter, setBrandFilter] = useState<string>('all'); // Advanced filter
  const [supplierFilter, setSupplierFilter] = useState<string>('all'); // Advanced filter
  
  // Bulk operations state
  const [selectedSpareParts, setSelectedSpareParts] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandedChildrenVariants, setExpandedChildrenVariants] = useState<string | null>(null);
  const [expandedCompatibleDevices, setExpandedCompatibleDevices] = useState<Set<string>>(new Set());
  const [hoveredSingleDevice, setHoveredSingleDevice] = useState<string | null>(null);
  const [isStockAlertsExpanded, setIsStockAlertsExpanded] = useState(false);

  // Form state
  const [showSparePartForm, setShowSparePartForm] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStockAdjustModal, setShowStockAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePart | null>(null);
  const [selectedSparePartForUsage, setSelectedSparePartForUsage] = useState<SparePart | null>(null);
  const [selectedSparePartForDetail, setSelectedSparePartForDetail] = useState<SparePart | null>(null);
  const [selectedSparePartForAdjust, setSelectedSparePartForAdjust] = useState<SparePart | null>(null);
  const [selectedSparePartForTransfer, setSelectedSparePartForTransfer] = useState<SparePart | null>(null);
  const [selectedVariantForImage, setSelectedVariantForImage] = useState<{ part: SparePart; variant: any } | null>(null);

  // Performance optimization state
  const [dataCache, setDataCache] = useState({
    spareParts: null as any,
    categories: null as any,
    lastLoad: 0
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Optimized data loading with parallel execution and caching
  useEffect(() => {
    const loadDataOptimized = async () => {
      const now = Date.now();
      
      // Use cache if data is fresh
      if (dataCache.spareParts && dataCache.categories && (now - dataCache.lastLoad) < CACHE_DURATION) {
        console.log('📦 Using cached spare parts data');
        setIsInitialLoad(false);
        return;
      }

      console.log('🚀 Loading fresh spare parts data...');
      const startTime = performance.now();
      
      try {
        // Load data in parallel for better performance
        const [sparePartsResult, categoriesResult, suppliersResult] = await Promise.allSettled([
          loadSpareParts(),
          loadCategories(),
          loadSuppliers()
        ]);

        const endTime = performance.now();
        console.log(`✅ Spare parts data loaded in ${(endTime - startTime).toFixed(2)}ms`);

        // Update cache
        setDataCache({
          spareParts: sparePartsResult.status === 'fulfilled' ? sparePartsResult.value : null,
          categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value : null,
          lastLoad: now
        });

        // Handle any failures
        if (sparePartsResult.status === 'rejected') {
          console.error('❌ Failed to load spare parts:', sparePartsResult.reason);
          toast.error('Failed to load spare parts data');
        }
        if (categoriesResult.status === 'rejected') {
          console.error('❌ Failed to load categories:', categoriesResult.reason);
          toast.error('Failed to load categories data');
        }

      } catch (error) {
        console.error('💥 Critical error loading spare parts data:', error);
        toast.error('Critical error loading data. Please refresh the page.');
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadDataOptimized();
  }, [loadSpareParts, loadCategories]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for spare parts updates to refresh data
  useEffect(() => {
    const handleSparePartsUpdate = (event: CustomEvent) => {
      console.log('🔄 Refreshing spare parts data due to update:', event.detail);
      loadSpareParts();
    };

    window.addEventListener('lats:spare-parts-updated', handleSparePartsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('lats:spare-parts-updated', handleSparePartsUpdate as EventListener);
    };
  }, [loadSpareParts]);

  // Low stock notifications
  useEffect(() => {
    if (spareParts.length > 0 && !isInitialLoad) {
      const lowStockParts = spareParts.filter(part => {
        const totalStock = getTotalStock(part);
        const totalMin = getTotalMinQuantity(part);
        return totalStock <= totalMin && totalStock > 0;
      });
      const outOfStockParts = spareParts.filter(part => getTotalStock(part) === 0);
      
      if (lowStockParts.length > 0 || outOfStockParts.length > 0) {
        const totalAlerts = lowStockParts.length + outOfStockParts.length;
        if (totalAlerts > 0) {
          toast(
            (t) => (
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="font-semibold text-gray-900">
                    Stock Alert: {totalAlerts} part{totalAlerts !== 1 ? 's' : ''} need attention
                  </div>
                  <div className="text-sm text-gray-600">
                    {outOfStockParts.length > 0 && `${outOfStockParts.length} out of stock`}
                    {outOfStockParts.length > 0 && lowStockParts.length > 0 && ' • '}
                    {lowStockParts.length > 0 && `${lowStockParts.length} low stock`}
                  </div>
                </div>
              </div>
            ),
            {
              duration: 8000,
              icon: '⚠️',
              id: 'spare-parts-stock-alert'
            }
          );
        }
      }
    }
  }, [spareParts, isInitialLoad]);

  // Bulk operations handlers
  const handleSelectAll = () => {
    if (selectedSpareParts.length === filteredSpareParts.length) {
      setSelectedSpareParts([]);
    } else {
      setSelectedSpareParts(filteredSpareParts.map(part => part.id));
    }
  };

  const handleSelectPart = (partId: string) => {
    setSelectedSpareParts(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
  };

  // Bulk edit handler
  const handleBulkEdit = async () => {
    if (selectedSpareParts.length === 0) {
      toast.error('Please select spare parts to edit');
      return;
    }

    // For now, show a message - can be enhanced with a modal
    toast(`Bulk edit for ${selectedSpareParts.length} parts - Feature coming soon!`, { icon: 'ℹ️' });
  };

  // Bulk update quantity
  const handleBulkUpdateQuantity = async (newQuantity: number) => {
    if (selectedSpareParts.length === 0) {
      toast.error('Please select spare parts');
      return;
    }

    try {
      const updates = selectedSpareParts.map(async (partId) => {
        const part = spareParts.find(p => p.id === partId);
        if (!part) return;

        return updateSparePart(partId, {
          ...part,
          quantity: newQuantity
        });
      });

      await Promise.all(updates);
      toast.success(`Updated quantity for ${selectedSpareParts.length} parts`);
      setSelectedSpareParts([]);
      loadSpareParts();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error('Failed to update parts');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSpareParts.length === 0) return;
    
    const confirmed = await confirm(`Are you sure you want to delete ${selectedSpareParts.length} spare parts?`);
    if (!confirmed) return;

    try {
      const deletePromises = selectedSpareParts.map(id => deleteSparePart(id));
      await Promise.all(deletePromises);
      
      toast.success(`Successfully deleted ${selectedSpareParts.length} spare parts`);
      setSelectedSpareParts([]);
    } catch (error) {
      console.error('Error deleting spare parts:', error);
      toast.error('Failed to delete some spare parts');
    }
  };

  const handleBulkExport = () => {
    const csvData = filteredSpareParts
      .filter(part => selectedSpareParts.includes(part.id))
      .map(part => ({
        name: part.name,
        partNumber: part.part_number || '',
        spareType: getSpareTypeName(part.spare_type),
        quantity: part.quantity,
        minQuantity: part.min_quantity,
        costPrice: part.cost_price,
        sellingPrice: part.selling_price,
        location: part.location || '',
        description: part.description || ''
      }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spare-parts-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${csvData.length} spare parts to CSV`);
  };

  // Calculate stock alerts with reorder suggestions
  const stockAlerts = React.useMemo(() => {
    const lowStock = spareParts.filter(part => {
      if (part.variants && part.variants.length > 0) {
        const totalStock = part.variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0);
        const totalMin = part.variants.reduce((sum: number, v: any) => sum + (v.min_quantity || 0), 0);
        return totalStock <= totalMin && totalStock > 0;
      }
      return part.quantity <= part.min_quantity && part.quantity > 0;
    });
    const outOfStock = spareParts.filter(part => {
      if (part.variants && part.variants.length > 0) {
        const totalStock = part.variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0);
        return totalStock === 0;
      }
      return part.quantity === 0;
    });
    const reorderSuggestions = spareParts
      .filter(part => {
        if (part.variants && part.variants.length > 0) {
          const totalStock = part.variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0);
          const totalMin = part.variants.reduce((sum: number, v: any) => sum + (v.min_quantity || 0), 0);
          return totalStock <= totalMin;
        }
        return part.quantity <= part.min_quantity;
      })
      .map(part => {
        if (part.variants && part.variants.length > 0) {
          const totalStock = part.variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0);
          const totalMin = part.variants.reduce((sum: number, v: any) => sum + (v.min_quantity || 0), 0);
          return {
            ...part,
            suggestedReorder: Math.max(totalMin * 2, 10),
            urgency: totalStock === 0 ? 'critical' : totalStock <= totalMin * 0.5 ? 'high' : 'medium'
          };
        }
        return {
          ...part,
          suggestedReorder: Math.max(part.min_quantity * 2, 10),
          urgency: part.quantity === 0 ? 'critical' : part.quantity <= part.min_quantity * 0.5 ? 'high' : 'medium'
        };
      });
    
    return { 
      lowStock, 
      outOfStock, 
      reorderSuggestions,
      total: lowStock.length + outOfStock.length 
    };
  }, [spareParts]);

  // Filter and sort spare parts
  const filteredSpareParts = React.useMemo(() => {
    const filtered = spareParts.filter(part => {
      // Note: Showing ALL products including test/sample products as per user preference

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm.trim() === '' || 
                           part.name.toLowerCase().includes(searchLower) ||
                           part.part_number?.toLowerCase().includes(searchLower) ||
                           part.description?.toLowerCase().includes(searchLower) ||
                           part.brand?.toLowerCase().includes(searchLower) ||
                           part.location?.toLowerCase().includes(searchLower) ||
                           part.compatible_devices?.toLowerCase().includes(searchLower);
      
      // Filter by spare type instead of category
      const matchesCategory = selectedCategory === 'all' || part.spare_type === selectedCategory;
      
      const matchesBrand = brandFilter === 'all' || part.brand === brandFilter;
      
      const matchesSupplier = supplierFilter === 'all' || part.supplier_id === supplierFilter;
      
      let matchesStock = true;
      switch (stockFilter) {
        case 'in-stock':
          matchesStock = getTotalStock(part) > getTotalMinQuantity(part);
          break;
        case 'low-stock':
          const totalStock = getTotalStock(part);
          const totalMin = getTotalMinQuantity(part);
          matchesStock = totalStock <= totalMin && totalStock > 0;
          break;
        case 'out-of-stock':
          matchesStock = getTotalStock(part) === 0;
          break;
      }
      
      return matchesSearch && matchesCategory && matchesStock && matchesBrand && matchesSupplier;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'quantity':
          aValue = getTotalStock(a);
          bValue = getTotalStock(b);
          break;
        case 'cost':
          aValue = a.cost_price;
          bValue = b.cost_price;
          break;
        case 'selling':
          aValue = a.selling_price;
          bValue = b.selling_price;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [spareParts, searchTerm, selectedCategory, stockFilter, sortBy, sortOrder]);

  // Transform form data for API - Only include required fields from the form
  const transformSparePartData = (formData: Record<string, unknown>) => {
    // Only include fields that are in the specified information list:
    // Part Name, Spare Type, Brand, Supplier, Condition, Description, Variants (with all their fields), Images
    const transformedData: Record<string, unknown> = {
      name: formData.name,
      spareType: formData.spareType || null, // Include spare type
      brand: formData.brand || null,
      supplierId: formData.supplierId || null,
      condition: formData.condition || 'new',
      description: formData.description || null,
      compatibleDevices: formData.compatibleDevices || null, // Main compatible devices (stored as string)
      // Variants include: name, sku, cost_price, selling_price, quantity, min_quantity, compatible_devices, childrenVariants, images
      useVariants: formData.useVariants !== undefined ? formData.useVariants : true, // Always use variants
      variants: Array.isArray(formData.variants) ? formData.variants : []
    };

    // Add images if they exist
    if (Array.isArray(formData.images) && formData.images.length > 0) {
      transformedData.images = formData.images;
    }
    
    // Removed: partNumber, categoryId, costPrice, sellingPrice, quantity, minQuantity, location, 
    // storageRoomId, shelfId, partType, primaryDeviceType, searchTags - these are not in the specified list
    
    return transformedData;
  };

  // Input validation function
  const validateSparePartData = (data: Record<string, unknown>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Required fields
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      errors.push('Part name is required');
    }

    // Sanitize string inputs
    if (data.name && typeof data.name === 'string') {
      data.name = data.name.trim().substring(0, 255); // Limit length
    }

    if (data.description && typeof data.description === 'string') {
      data.description = data.description.trim().substring(0, 1000); // Limit length
    }

    // Numeric validation
    if (data.quantity !== undefined && (typeof data.quantity !== 'number' || data.quantity < 0)) {
      errors.push('Quantity must be a non-negative number');
    }

    if (data.minQuantity !== undefined && (typeof data.minQuantity !== 'number' || data.minQuantity < 0)) {
      errors.push('Minimum quantity must be a non-negative number');
    }

    if (data.costPrice !== undefined && (typeof data.costPrice !== 'number' || data.costPrice < 0)) {
      errors.push('Cost price must be a non-negative number');
    }

    if (data.sellingPrice !== undefined && (typeof data.sellingPrice !== 'number' || data.sellingPrice < 0)) {
      errors.push('Selling price must be a non-negative number');
    }

    // Business logic validation
    if (data.quantity !== undefined && data.minQuantity !== undefined && 
        typeof data.quantity === 'number' && typeof data.minQuantity === 'number' &&
        data.quantity < data.minQuantity) {
      errors.push('Current quantity cannot be less than minimum quantity');
    }

    return { isValid: errors.length === 0, errors };
  };

  // Handle spare part creation/editing with validation
  const handleSaveSparePart = async (data: Record<string, unknown>) => {
    try {
      // Validate input data
      const validation = validateSparePartData(data);
      if (!validation.isValid) {
        toast.error(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      const transformedData = transformSparePartData(data);
      
      if (editingSparePart) {
        const response = await updateSparePart(editingSparePart.id, transformedData);
        if (response.ok) {
          toast.success('Spare part updated successfully');
          setShowSparePartForm(false);
          setEditingSparePart(null);
          await loadSpareParts();
        } else {
          toast.error(response.message || 'Failed to update spare part');
        }
      } else {
        const response = await createOrUpdateSparePart(transformedData);
        if (response.ok) {
          // Handle different operation types
          const operationType = (response as { operationType?: string }).operationType;
          switch (operationType) {
            case 'CREATE_NEW':
              toast.success('✅ New spare part created successfully!');
              break;
            case 'UPDATE_EXISTING':
              toast.success(`⚠️ Spare part updated instead of created. A part with this part number already existed and was updated.`);
              break;
            default:
              toast.success('Spare part saved successfully');
          }
          setShowSparePartForm(false);
          await loadSpareParts();
        } else {
          // Handle different error types
          const errorType = (response as { errorType?: string }).errorType;
          const message = response.message || 'Failed to create spare part';
          
          switch (errorType) {
            case 'DUPLICATE_PART_NUMBER':
              toast.error(`❌ Part number already exists! ${message.split(':')[1] || message}`);
              break;
            case 'DUPLICATE_CONSTRAINT':
              toast.error(`❌ Duplicate data! ${message.split(':')[1] || message}`);
              break;
            case 'FOREIGN_KEY_VIOLATION':
              toast.error(`❌ Invalid selection! ${message.split(':')[1] || message}`);
              break;
            case 'CHECK_CONSTRAINT_VIOLATION':
              toast.error(`❌ Invalid data! ${message.split(':')[1] || message}`);
              break;
            case 'DATABASE_ERROR':
              toast.error(`❌ Database error! ${message.split(':')[1] || message}`);
              break;
            default:
              toast.error(message);
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error saving spare part:', error);
      toast.error('An unexpected error occurred while saving the spare part');
    }
  };

  // Handle spare part deletion
  const handleDeleteSparePart = async (id: string) => {
    if (await confirm('Are you sure you want to delete this spare part?')) {
      try {
        const response = await deleteSparePart(id);
        if (response.ok) {
          toast.success('Spare part deleted successfully');
          await loadSpareParts(); // Refresh the list
        } else {
          toast.error(response.message || 'Failed to delete spare part');
        }
      } catch (error) {
        toast.error('An error occurred');
      }
    }
  };

  // Handle spare part usage
  const handleUseSparePart = async (quantity: number, reason: string, notes?: string) => {
    if (!selectedSparePartForUsage) return;
    
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const response = await useSparePart(selectedSparePartForUsage.id, quantity, reason, notes);
      if (response.ok) {
        toast.success('Spare part usage recorded successfully');
        setShowUsageModal(false);
        setSelectedSparePartForUsage(null);
        await loadSpareParts();
      } else {
        toast.error(response.message || 'Failed to record spare part usage');
      }
    } catch (error) {
      console.error('Error recording spare part usage:', error);
      toast.error('An unexpected error occurred while recording usage');
    }
  };

  // Handle opening detail modal
  const handleOpenDetailModal = (sparePart: SparePart) => {
    setSelectedSparePartForDetail(sparePart);
    setShowDetailModal(true);
  };

  // Handle closing detail modal
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedSparePartForDetail(null);
  };

  // Handle editing from detail modal
  const handleEditFromDetailModal = (sparePart: SparePart) => {
    setEditingSparePart(sparePart);
    setShowDetailModal(false);
    setShowSparePartForm(true);
  };

  // Handle deleting from detail modal
  const handleDeleteFromDetailModal = async (id: string) => {
    await handleDeleteSparePart(id);
    setShowDetailModal(false);
    setSelectedSparePartForDetail(null);
  };

  // Handle using spare part from detail modal
  const handleUseFromDetailModal = async (quantity: number, reason: string, notes?: string) => {
    if (!selectedSparePartForDetail) return;
    
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const response = await useSparePart(selectedSparePartForDetail.id, quantity, reason, notes);
      if (response.ok) {
        toast.success('Spare part usage recorded successfully');
        await loadSpareParts();
      } else {
        toast.error(response.message || 'Failed to record spare part usage');
      }
    } catch (error) {
      console.error('Error recording spare part usage:', error);
      toast.error('An unexpected error occurred while recording usage');
    }
  };

  // Handle printing spare part
  const handlePrintSparePart = (part: SparePart) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Spare Part - ${part.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 15px; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Spare Part Information</h1>
            <p>Printed: ${new Date().toLocaleString()}</p>
          </div>
          <div class="section">
            <span class="label">Name:</span>
            <span class="value">${part.name}</span>
          </div>
          <div class="section">
            <span class="label">Part Number:</span>
            <span class="value">${part.part_number || 'N/A'}</span>
          </div>
          <div class="section">
            <span class="label">Category:</span>
            <span class="value">${getSpareTypeName(part.spare_type)}</span>
          </div>
          <div class="section">
            <span class="label">Quantity:</span>
            <span class="value">${part.quantity} / Min: ${part.min_quantity}</span>
          </div>
          <div class="section">
            <span class="label">Cost Price:</span>
            <span class="value">${format.currency(part.cost_price)}</span>
          </div>
          <div class="section">
            <span class="label">Selling Price:</span>
            <span class="value">${format.currency(part.selling_price)}</span>
          </div>
          ${part.description ? `
          <div class="section">
            <span class="label">Description:</span>
            <div class="value">${part.description}</div>
          </div>
          ` : ''}
          ${part.location ? `
          <div class="section">
            <span class="label">Location:</span>
            <span class="value">${part.location}</span>
          </div>
          ` : ''}
          ${part.brand ? `
          <div class="section">
            <span class="label">Brand:</span>
            <span class="value">${part.brand}</span>
          </div>
          ` : ''}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Handle duplicating spare part
  const handleDuplicateSparePart = async (part: SparePart) => {
    try {
      const duplicateData = {
        name: `${part.name} (Copy)`,
        partNumber: part.part_number ? `${part.part_number}-COPY` : undefined,
        categoryId: part.category_id,
        brand: part.brand,
        supplierId: part.supplier_id,
        condition: part.condition,
        description: part.description,
        costPrice: part.cost_price,
        sellingPrice: part.selling_price,
        quantity: 0, // Start with 0 quantity for duplicate
        minQuantity: part.min_quantity,
        location: part.location,
        compatibleDevices: part.compatible_devices,
        images: part.images || []
      };

      const response = await createOrUpdateSparePart(duplicateData);
      if (response.ok) {
        toast.success('Spare part duplicated successfully');
        await loadSpareParts();
      } else {
        toast.error(response.message || 'Failed to duplicate spare part');
      }
    } catch (error) {
      console.error('Error duplicating spare part:', error);
      toast.error('An unexpected error occurred while duplicating');
    }
  };

  // Handle stock adjustment
  const handleStockAdjustment = async (adjustmentType: 'in' | 'out' | 'set', quantity: number, reason: string, notes?: string) => {
    if (!selectedSparePartForAdjust) return;
    
    try {
      let newQuantity = selectedSparePartForAdjust.quantity;
      
      if (adjustmentType === 'in') {
        newQuantity = selectedSparePartForAdjust.quantity + quantity;
      } else if (adjustmentType === 'out') {
        newQuantity = Math.max(0, selectedSparePartForAdjust.quantity - quantity);
      } else if (adjustmentType === 'set') {
        newQuantity = quantity;
      }

      const response = await updateSparePart(selectedSparePartForAdjust.id, {
        ...selectedSparePartForAdjust,
        quantity: newQuantity
      });

      if (response.ok) {
        toast.success(`Stock ${adjustmentType === 'in' ? 'increased' : adjustmentType === 'out' ? 'decreased' : 'set'} successfully`);
        setShowStockAdjustModal(false);
        setSelectedSparePartForAdjust(null);
        await loadSpareParts();
      } else {
        toast.error(response.message || 'Failed to adjust stock');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('An unexpected error occurred while adjusting stock');
    }
  };

  // Handle opening stock adjustment modal
  const handleOpenStockAdjustModal = (part: SparePart) => {
    setSelectedSparePartForAdjust(part);
    setShowStockAdjustModal(true);
  };

  // Handle transferring spare part
  const handleTransferSparePart = (part: SparePart) => {
    setSelectedSparePartForTransfer(part);
    setShowTransferModal(true);
  };

  // Handle transfer submission
  const handleTransferSubmit = async (toLocation: string, quantity: number, notes?: string) => {
    if (!selectedSparePartForTransfer) return;

    if (quantity > selectedSparePartForTransfer.quantity) {
      toast.error('Cannot transfer more than available quantity');
      return;
    }

    try {
      // Update source location quantity
      const newQuantity = selectedSparePartForTransfer.quantity - quantity;
      const response = await updateSparePart(selectedSparePartForTransfer.id, {
        ...selectedSparePartForTransfer,
        quantity: newQuantity
      });

      if (response.ok) {
        toast.success(`Transferred ${quantity} units to ${toLocation}`);
        setShowTransferModal(false);
        setSelectedSparePartForTransfer(null);
        await loadSpareParts();
      } else {
        toast.error(response.message || 'Failed to transfer spare part');
      }
    } catch (error) {
      console.error('Error transferring spare part:', error);
      toast.error('An unexpected error occurred while transferring');
    }
  };

  // Get category name by ID
  // Get spare type name (replaces category)
  const getSpareTypeName = (spareType: string | null | undefined) => {
    return spareType || 'Unknown';
  };

  // Get icon for spare type/category
  const getSpareTypeIcon = (categoryName: string) => {
    if (!categoryName || categoryName === 'Unknown') {
      return Package;
    }
    
    const name = categoryName.toLowerCase();
    
    // Map category names to icons
    if (name.includes('battery') || name.includes('power')) return Battery;
    if (name.includes('lcd') || name.includes('screen') || name.includes('display')) return Monitor;
    if (name.includes('charging') || name.includes('port') || name.includes('cable')) return Zap;
    if (name.includes('camera')) return Camera;
    if (name.includes('speaker')) return Speaker;
    if (name.includes('microphone') || name.includes('mic')) return Mic;
    if (name.includes('button') || name.includes('home') || name.includes('power')) return MousePointer;
    if (name.includes('volume')) return Volume2;
    if (name.includes('board') || name.includes('motherboard') || name.includes('logic')) return Cpu;
    if (name.includes('flex') || name.includes('cable') || name.includes('connector')) return Cable;
    if (name.includes('antenna') || name.includes('wireless')) return Radio;
    if (name.includes('headphone') || name.includes('jack')) return Headphones;
    if (name.includes('phone') || name.includes('smartphone') || name.includes('iphone')) return Smartphone;
    if (name.includes('laptop') || name.includes('macbook')) return Laptop;
    if (name.includes('tablet') || name.includes('ipad')) return Tablet;
    if (name.includes('cover') || name.includes('glass') || name.includes('case')) return Package;
    if (name.includes('keyboard') || name.includes('touchpad')) return Package;
    if (name.includes('sim') || name.includes('tray')) return Package;
    if (name.includes('motor') || name.includes('vibration')) return Package;
    if (name.includes('adapter')) return Zap;
    
    // Default icon
    return Package;
  };

  // Get supplier name by ID
  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return 'Not set';
    const supplier = suppliers.find(sup => sup.id === supplierId);
    return supplier?.name || 'Unknown';
  };

  // Calculate total stock from variants
  const getTotalStock = (part: SparePart): number => {
    if (part.variants && part.variants.length > 0) {
      return part.variants.reduce((total: number, variant: any) => total + (variant.quantity || 0), 0);
    }
    return part.quantity || 0;
  };

  // Calculate total min quantity from variants
  const getTotalMinQuantity = (part: SparePart): number => {
    if (part.variants && part.variants.length > 0) {
      return part.variants.reduce((total: number, variant: any) => total + (variant.min_quantity || 0), 0);
    }
    return part.min_quantity || 0;
  };

  // Get first variant price (for display when main part has no price)
  const getDisplayPrice = (part: SparePart): number => {
    if (part.selling_price > 0) {
      return part.selling_price;
    }
    // Check variants for price
    if (part.variants && part.variants.length > 0) {
      const firstVariantWithPrice = part.variants.find((v: any) => v.selling_price > 0);
      if (firstVariantWithPrice) {
        return firstVariantWithPrice.selling_price;
      }
    }
    return 0;
  };

  // Get first variant cost price (for display when main part has no cost price)
  const getDisplayCostPrice = (part: SparePart): number => {
    if (part.cost_price > 0) {
      return part.cost_price;
    }
    // Check variants for cost price
    if (part.variants && part.variants.length > 0) {
      const firstVariantWithCostPrice = part.variants.find((v: any) => v.cost_price > 0);
      if (firstVariantWithCostPrice) {
        return firstVariantWithCostPrice.cost_price;
      }
    }
    return 0;
  };

  // Get stock status
  const getStockStatus = (part: SparePart) => {
    const totalStock = getTotalStock(part);
    const totalMinQuantity = getTotalMinQuantity(part);
    if (totalStock === 0) return { status: 'out-of-stock', color: 'text-red-500', bg: 'bg-red-100' };
    if (totalStock <= totalMinQuantity) return { status: 'low-stock', color: 'text-yellow-500', bg: 'bg-yellow-100' };
    return { status: 'in-stock', color: 'text-green-500', bg: 'bg-green-100' };
  };

  // Toggle card expansion
  const toggleCardExpansion = (partId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partId)) {
        newSet.delete(partId);
        // Close compatible devices tooltip when card is collapsed
        setExpandedCompatibleDevices(prevDevices => {
          const newDevicesSet = new Set(prevDevices);
          newDevicesSet.delete(partId);
          return newDevicesSet;
        });
      } else {
        newSet.add(partId);
      }
      return newSet;
    });
  };

  // Render content based on loading and data state
  const renderContent = () => {
    if (isLoading || isInitialLoad) {
      return (
        <div className="px-8 py-6 flex-1 overflow-y-auto">
          <GlassCard className="p-12">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
              <span className="ml-4 text-gray-700 font-medium">Loading spare parts...</span>
            </div>
          </GlassCard>
        </div>
      );
    }

    if (filteredSpareParts.length === 0) {
      return (
        <div className="px-8 py-6 flex-1 overflow-y-auto">
          <GlassCard className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No spare parts found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedCategory !== 'all' || stockFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first spare part'
              }
            </p>
            {!searchTerm && selectedCategory === 'all' && stockFilter === 'all' && (
              <button
                onClick={() => {
                  setEditingSparePart(null);
                  setShowSparePartForm(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Spare Part</span>
              </button>
            )}
          </GlassCard>
        </div>
      );
    }

    return viewMode === 'grid' ? (
      <div 
        className="px-8 py-6 flex-1 overflow-y-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 100%), 1fr))',
          gap: 'clamp(1rem, 2vw, 1.5rem)',
        }}
      >
        {filteredSpareParts.map((part) => {
          const stockStatus = getStockStatus(part);
          const isSelected = selectedSpareParts.includes(part.id);
          const isExpanded = expandedCards.has(part.id);
          const totalStock = getTotalStock(part);
          const stockBadgeText = totalStock === 0 ? `${totalStock} out` : `${totalStock} in`;
          
          // Get price from first variant if main part price is not set
          const displayPriceValue = getDisplayPrice(part);
          const displayCostPriceValue = getDisplayCostPrice(part);
          const priceDisplay = displayPriceValue > 0 ? format.currency(displayPriceValue) : 'TSh No price set';
          const costPriceDisplay = displayCostPriceValue > 0 ? format.currency(displayCostPriceValue) : 'TSh No cost set';
          
          return (
            <div key={part.id} className={`relative border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 w-full ${isExpanded ? 'border-blue-500 shadow-xl' : 'border-gray-200'}`}>
              {/* Main Card Content */}
              <div className="flex items-start justify-between p-6 cursor-pointer" onClick={() => toggleCardExpansion(part.id)}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Image */}
                  <div 
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 relative group cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVariantForImage({ part, variant: null }); // null variant means main part images
                      setShowImageModal(true);
                    }}
                  >
                    {part.images && part.images.length > 0 ? (
                      <SafeImage
                        src={part.images[0]}
                        alt={part.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400">
                        <path d="M16.5 9.4 7.55 4.24"></path>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.29 7 12 12 20.71 7"></polyline>
                        <line x1="12" x2="12" y1="22" y2="12"></line>
                      </svg>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl z-10 flex items-center justify-center">
                      <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition-all text-xs font-medium">
                        <Upload className="w-3 h-3" />
                        <span className="hidden sm:inline">Manage</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <h3 className="text-2xl font-bold text-gray-900 truncate">{part.name}</h3>
                      <div className={`inline-flex items-center justify-center p-1.5 sm:p-2 rounded-full border-2 border-white shadow-lg z-30 min-w-[3.5rem] sm:min-w-[4rem] min-h-[2rem] sm:min-h-[2.5rem] transition-all duration-300 ${
                        totalStock === 0 
                          ? 'bg-gradient-to-r from-red-500 to-red-600' 
                          : totalStock <= getTotalMinQuantity(part)
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                          : 'bg-gradient-to-r from-green-500 to-green-600'
                      }`}>
                        <span className="text-xs sm:text-sm font-bold text-white whitespace-nowrap px-1">{stockBadgeText}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 flex-wrap relative">
                        {(() => {
                          const spareTypeName = getSpareTypeName(part.spare_type);
                          const CategoryIcon = getSpareTypeIcon(spareTypeName);
                          return (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                              <CategoryIcon className="w-5 h-5" />
                              <span className="text-base font-semibold truncate max-w-[140px]">{spareTypeName}</span>
                            </div>
                          );
                        })()}
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-purple-600">
                              <path d="M16.5 9.4 7.55 4.24"></path>
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                              <polyline points="3.29 7 12 12 20.71 7"></polyline>
                              <line x1="12" x2="12" y1="22" y2="12"></line>
                            </svg>
                            <span className="text-base font-semibold text-purple-700">{part.variants?.length || 0}</span>
                            <span className="text-sm text-pink-600 font-medium">variant{part.variants?.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        {part.compatible_devices && (() => {
                          const compatibleDevicesKey = part.id;
                          const isCompatibleDevicesExpanded = expandedCompatibleDevices.has(compatibleDevicesKey);
                          const devicesList = typeof part.compatible_devices === 'string' 
                            ? part.compatible_devices.split(',').map(d => d.trim()).filter(Boolean)
                            : Array.isArray(part.compatible_devices) 
                            ? part.compatible_devices 
                            : [];
                          
                          // If single compatible device, show inline without tooltip/expand
                          const isSingleDevice = devicesList.length === 1;
                          
                          const toggleCompatibleDevices = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setExpandedCompatibleDevices(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(compatibleDevicesKey)) {
                                newSet.delete(compatibleDevicesKey);
                                // Clear hover state when collapsing
                                setHoveredSingleDevice(null);
                              } else {
                                newSet.add(compatibleDevicesKey);
                                // Set hover state when expanding to keep tooltip visible
                                setHoveredSingleDevice(compatibleDevicesKey);
                              }
                              return newSet;
                            });
                          };
                          
                          // Single device: show inline with hover tooltip
                          if (isSingleDevice) {
                            const isHovered = hoveredSingleDevice === compatibleDevicesKey;
                            return (
                              <div 
                                className="relative inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200 flex-shrink-0 cursor-pointer hover:bg-green-100 transition-colors"
                                onMouseEnter={() => setHoveredSingleDevice(compatibleDevicesKey)}
                                onMouseLeave={() => setHoveredSingleDevice(null)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                                  <path d="M12 18h.01"></path>
                                </svg>
                                <span className="text-base font-semibold truncate max-w-[200px]">
                                  {devicesList[0]}
                                </span>
                                
                                {/* Hover Tooltip for Single Device */}
                                {isHovered && (
                                  <div 
                                    className="absolute bottom-full left-0 mb-2 z-[9999] min-w-[200px] max-w-md"
                                    style={{ 
                                      opacity: 1,
                                      visibility: 'visible',
                                      pointerEvents: 'none'
                                    }}
                                  >
                                    {/* Arrow */}
                                    <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white border-r-2 border-b-2 border-green-300 rotate-45"></div>
                                    
                                    {/* Tooltip Content */}
                                    <div className="bg-white border-2 border-green-300 rounded-xl shadow-2xl overflow-hidden">
                                      {/* Header */}
                                      <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                                              <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                                              <path d="M12 18h.01"></path>
                                            </svg>
                                            <h4 className="text-sm font-bold text-white">Compatible Model</h4>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Device Info */}
                                      <div className="p-3">
                                        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-green-50 border border-green-200">
                                          <div className="w-6 h-6 bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-green-700">
                                              <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                                              <path d="M12 18h.01"></path>
                                            </svg>
                                          </div>
                                          <span className="text-sm font-medium text-gray-900">{devicesList[0]}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          // Multiple devices: show expandable button with hover tooltip
                          const isHoveredMultiple = hoveredSingleDevice === compatibleDevicesKey;
                          const shouldShowTooltip = isCompatibleDevicesExpanded || isHoveredMultiple;
                          
                          return (
                            <div className="relative">
                              <div 
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200 flex-shrink-0 cursor-pointer hover:bg-green-100 transition-colors"
                                onClick={toggleCompatibleDevices}
                                onMouseEnter={() => setHoveredSingleDevice(compatibleDevicesKey)}
                                onMouseLeave={() => {
                                  // Only clear hover if not expanded (keep tooltip visible when expanded)
                                  if (!isCompatibleDevicesExpanded) {
                                    setHoveredSingleDevice(null);
                                  }
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                                  <path d="M12 18h.01"></path>
                                </svg>
                                <span className="text-base font-semibold truncate max-w-[200px]" title={part.compatible_devices}>
                                  {part.compatible_devices.length > 30 
                                    ? `${part.compatible_devices.substring(0, 30)}...` 
                                    : part.compatible_devices}
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-transform duration-200 ${isCompatibleDevicesExpanded ? 'rotate-180' : ''}`}>
                                  <path d="m6 9 6 6 6-6"></path>
                                </svg>
                              </div>
                              
                              {/* Tooltip-style Popover - Show on hover OR when expanded */}
                              {shouldShowTooltip && devicesList.length > 0 && (
                                <div 
                                  className="absolute top-full left-0 mt-2 z-[9999] min-w-[320px] max-w-md"
                                  style={{ 
                                    opacity: 1,
                                    visibility: 'visible',
                                    pointerEvents: isCompatibleDevicesExpanded ? 'auto' : 'none'
                                  }}
                                  onMouseEnter={() => setHoveredSingleDevice(compatibleDevicesKey)}
                                  onMouseLeave={() => {
                                    if (!isCompatibleDevicesExpanded) {
                                      setHoveredSingleDevice(null);
                                    }
                                  }}
                                >
                                  {/* Arrow */}
                                  <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-l-2 border-t-2 border-green-300 rotate-45"></div>
                                  
                                  {/* Tooltip Content */}
                                  <div className="bg-white border-2 border-green-300 rounded-xl shadow-2xl overflow-hidden">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                                            <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                                            <path d="M12 18h.01"></path>
                                          </svg>
                                          <h4 className="text-sm font-bold text-white">Compatible Models</h4>
                                        </div>
                                        <div className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                                          <span className="text-xs font-bold text-white">{devicesList.length}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Devices Grid */}
                                    <div className="max-h-80 overflow-y-auto p-3">
                                      <div className="grid grid-cols-2 gap-2">
                                        {devicesList.map((device: string, index: number) => (
                                          <div 
                                            key={`${part.id}-device-${index}`} 
                                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300 transition-all duration-150 group"
                                          >
                                            <div className="w-6 h-6 bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-300 transition-colors">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-green-700">
                                                <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                                                <path d="M12 18h.01"></path>
                                              </svg>
                                            </div>
                                            <span className="text-xs font-medium text-gray-900 truncate flex-1">{device}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Price */}
                <div className="ml-4 flex-shrink-0">
                  <div className="flex flex-col">
                    <span className="text-4xl font-bold text-gray-900 leading-tight">{priceDisplay}</span>
                    <span className="text-lg text-gray-600 mt-1">{costPriceDisplay}</span>
                  </div>
                </div>
              </div>
              
              {/* Expand/Collapse Button */}
              <div className="absolute bottom-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 z-10 bg-transparent" onClick={(e) => { e.stopPropagation(); toggleCardExpansion(part.id); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </div>
              
              {/* Expanded Details Section */}
              {isExpanded && (
                <>
                  <div className="mt-5 pt-5 border-t-2 border-gray-200 relative">
                    <div className="absolute top-0 left-0 right-0 flex items-center justify-center -mt-3">
                      <span className="bg-white px-5 py-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider rounded-full border border-gray-200 shadow-sm">Product Details</span>
                    </div>
                  </div>
                  
                  <div className="px-6 pb-6 pt-2">
                    {/* Variants Section */}
                    {part.variants && part.variants.length > 0 ? (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600">
                              <path d="M16.5 9.4 7.55 4.24"></path>
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                              <polyline points="3.29 7 12 12 20.71 7"></polyline>
                              <line x1="12" x2="12" y1="22" y2="12"></line>
                            </svg>
                            Variants ({part.variants.length})
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {part.variants.map((variant: any, variantIndex: number) => {
                            const variantQuantity = variant.quantity || 0;
                            const variantMinQuantity = variant.min_quantity || 0;
                            const variantSellingPrice = variant.selling_price || 0;
                            const variantCostPrice = variant.cost_price || 0;
                            const variantImage = variant.image_url || (part.images && part.images.length > 0 ? part.images[0] : null);
                            const variantSKU = variant.sku || part.part_number || `SKU-${variant.id?.slice(0, 13) || part.id.slice(0, 13)}-PO0`;
                            const useChildrenVariants = variant.useChildrenVariants || false;
                            const childrenVariants = variant.childrenVariants || [];
                            const hasChildrenVariants = useChildrenVariants && childrenVariants.length > 0;
                            const compatibleDevices = variant.compatible_devices || [];
                            const filledCount = childrenVariants.filter((c: string) => c && c.trim()).length;
                            const variantKey = `${part.id}-${variant.id || variantIndex}`;
                            const isChildrenExpanded = expandedChildrenVariants === variantKey;
                            
                            const toggleChildrenExpanded = (e: React.MouseEvent) => {
                              e.stopPropagation();
                              setExpandedChildrenVariants(prev => {
                                // If clicking the same variant, collapse it. Otherwise, expand only this one
                                if (prev === variantKey) {
                                  return null;
                                } else {
                                  return variantKey;
                                }
                              });
                            };
                            
                            return (
                              <div key={variant.id || variant.name} className="flex flex-col">
                                <div className="p-3 sm:p-4 md:p-6 flex flex-col h-full rounded-xl border transition-all duration-200 shadow-sm relative action-button cursor-pointer border-gray-200 bg-white hover:border-blue-400 hover:shadow-md" title={hasChildrenVariants ? "Click to check for IMEI children" : ""}>
                                  <div className={`absolute -top-2 -right-2 sm:-top-3 sm:-right-3 p-1.5 sm:p-2 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-30 min-w-[2rem] min-h-[2rem] sm:min-w-[2.5rem] sm:min-h-[2.5rem] transition-all duration-300 ${
                                    variantQuantity === 0 
                                      ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                      : variantQuantity <= variantMinQuantity 
                                      ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                      : 'bg-gradient-to-r from-green-500 to-green-600'
                                  }`}>
                                    <span className="text-xs sm:text-sm font-bold text-white whitespace-nowrap px-1">{variantQuantity}</span>
                                  </div>
                                  {hasChildrenVariants && (
                                    <div 
                                      className="absolute bottom-2 right-2 w-7 h-7 bg-purple-100 hover:bg-purple-200 rounded-full flex items-center justify-center z-30 transition-colors shadow-sm cursor-pointer" 
                                      title="Check for IMEI children"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleChildrenExpanded(e);
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-purple-600 transition-transform duration-200 ${isChildrenExpanded ? 'rotate-180' : ''}`}>
                                        <path d="m6 9 6 6 6-6"></path>
                                      </svg>
                                    </div>
                                  )}
                                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                                    <div 
                                      className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden group cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedVariantForImage({ part, variant });
                                        setShowImageModal(true);
                                      }}
                                    >
                                      <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center w-full h-full rounded-xl">
                                        {variantImage ? (
                                          <SafeImage
                                            src={variantImage}
                                            alt={variant.name || 'Variant'}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400">
                                            <path d="M16.5 9.4 7.55 4.24"></path>
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                            <polyline points="3.29 7 12 12 20.71 7"></polyline>
                                            <line x1="12" x2="12" y1="22" y2="12"></line>
                                          </svg>
                                        )}
                                      </div>
                                      {/* Hover overlay */}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl z-10 flex items-center justify-center">
                                        <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition-all text-xs font-medium">
                                          <Upload className="w-3 h-3" />
                                          <span className="hidden sm:inline">Manage</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col h-16 sm:h-20 md:h-24 justify-between group">
                                      <div>
                                        <div className="font-medium text-gray-800 truncate text-sm sm:text-base md:text-lg lg:text-xl leading-tight" title={variant.name || 'Default'}>{variant.name || 'Default'}</div>
                                        <div className="text-xs text-gray-500 max-h-0 overflow-hidden group-hover:max-h-10 group-hover:mt-1 transition-all duration-200">SKU: {variantSKU}</div>
                                      </div>
                                      <div>
                                        <div className="text-lg sm:text-xl md:text-2xl text-gray-700 mt-0.5 sm:mt-1 font-bold">
                                          {variantSellingPrice > 0 ? format.currency(variantSellingPrice) : 'TSh 0'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Children Variants Section - Below Variant Card */}
                                {isChildrenExpanded && useChildrenVariants && variantQuantity > 0 && (
                                  <div className="mt-3 ml-4 border-l-2 border-purple-300 pl-4 space-y-2">
                                    <div className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                                      IMEI Children ({filledCount})
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                      {Array.from({ length: variantQuantity }, (_, childIndex) => {
                                        const childValue = childrenVariants[childIndex] || '';
                                        const isFilled = childValue && childValue.trim() !== '';
                                        const childSKU = variant.sku || part.part_number || `SKU-${part.id?.slice(0, 13) || Date.now()}-${variant.id?.slice(0, 13) || variantIndex}-IMEI-${childValue || childIndex}`;
                                        
                                        return (
                                          <div key={`${variantKey}-child-${childIndex}`} className="p-2 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors group">
                                            <div className="flex items-center justify-between">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-purple-600 flex-shrink-0">
                                                    <line x1="4" x2="20" y1="9" y2="9"></line>
                                                    <line x1="4" x2="20" y1="15" y2="15"></line>
                                                    <line x1="10" x2="8" y1="3" y2="21"></line>
                                                    <line x1="16" x2="14" y1="3" y2="21"></line>
                                                  </svg>
                                                  <span className="text-sm font-medium text-gray-900 truncate uppercase">
                                                    {isFilled ? childValue : `ITEM #${childIndex + 1}`}
                                                  </span>
                                                </div>
                                                <div className="text-xs text-gray-500 ml-6 max-h-0 overflow-hidden group-hover:max-h-10 group-hover:mt-1 transition-all duration-200">
                                                  SKU: {childSKU}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-600">
                              <path d="M16.5 9.4 7.55 4.24"></path>
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                              <polyline points="3.29 7 12 12 20.71 7"></polyline>
                              <line x1="12" x2="12" y1="22" y2="12"></line>
                            </svg>
                            Variants (0)
                          </h4>
                        </div>
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
                          No variants configured for this part
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="mt-5 pt-5 border-t-2 border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingSparePart(part); setShowSparePartForm(true); }}
                          className="flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-purple-600 hover:bg-purple-700 action-button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path>
                          </svg>
                          Edit Part
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenDetailModal(part); }}
                          className="flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-blue-600 hover:bg-blue-700 action-button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          View Details
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenStockAdjustModal(part); }}
                          className="flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-orange-600 hover:bg-orange-700 action-button"
                          title="Adjust stock quantity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <rect width="16" height="20" x="4" y="2" rx="2"></rect>
                            <line x1="8" x2="16" y1="6" y2="6"></line>
                            <line x1="16" x2="16" y1="14" y2="18"></line>
                            <path d="M16 10h.01"></path>
                            <path d="M12 10h.01"></path>
                            <path d="M8 10h.01"></path>
                            <path d="M12 14h.01"></path>
                            <path d="M8 14h.01"></path>
                            <path d="M12 18h.01"></path>
                            <path d="M8 18h.01"></path>
                          </svg>
                          Adjust Stock
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDuplicateSparePart(part); }}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-indigo-600 hover:bg-indigo-700 action-button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                          </svg>
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTransferSparePart(part); }}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-teal-600 hover:bg-teal-700 action-button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="m16 3 4 4-4 4"></path>
                            <path d="M20 7H4"></path>
                            <path d="m8 21-4-4 4-4"></path>
                            <path d="M4 17h16"></path>
                          </svg>
                          Transfer
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSparePart(part.id); }}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-red-600 hover:bg-red-700 action-button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <div className="px-8 py-6 flex-1 overflow-y-auto">
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
          {/* Table Header - Flat Style */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <div className="grid grid-cols-12 gap-4 items-center text-xs font-semibold text-gray-700 uppercase">
              <div className="col-span-1">
                <span>Image</span>
              </div>
              <div className="col-span-2">Part Details</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-1 text-center">Quantity</div>
              <div className="col-span-1">Pricing</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-2 text-center">Actions</div>
            </div>
          </div>

          {/* Table Body - Flat Style */}
          <div className="divide-y divide-gray-200">
            {filteredSpareParts.map((part) => {
              const stockStatus = getStockStatus(part);
              return (
                <div key={part.id} className="hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center px-6 py-4">
                    {/* Image */}
                    <div className="col-span-1">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer" onClick={() => handleOpenDetailModal(part)}>
                        {part.images && part.images.length > 0 ? (
                          <SafeImage
                            src={part.images[0]}
                            alt={part.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Part Details */}
                    <div className="col-span-2">
                      <div className="font-bold text-gray-900">{part.name}</div>
                      <div className="text-sm text-gray-500">{part.part_number}</div>
                      {part.description && (
                        <div className="text-xs text-gray-500 truncate mt-1">{part.description}</div>
                      )}
                    </div>

                    {/* Category */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="font-medium text-gray-900">{getSpareTypeName(part.spare_type)}</span>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-1 text-center">
                      <div className={`text-2xl font-bold ${getTotalStock(part) <= getTotalMinQuantity(part) ? 'text-red-600' : 'text-green-600'}`}>
                        {getTotalStock(part)}
                      </div>
                      <div className="text-xs text-gray-500">Min: {getTotalMinQuantity(part)}</div>
                    </div>

                    {/* Pricing */}
                    <div className="col-span-1">
                      <div className="text-sm font-medium text-gray-900">Cost: {format.currency(getDisplayCostPrice(part))}</div>
                      <div className="text-xs text-gray-500">Sell: {format.currency(getDisplayPrice(part))}</div>
                    </div>

                    {/* Location */}
                    <div className="col-span-2">
                      <div className="text-sm text-gray-900">{part.location || 'Not set'}</div>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 flex justify-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${stockStatus.bg} ${stockStatus.color}`}>
                        {stockStatus.status.replace('-', ' ')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenDetailModal(part)}
                          className="p-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSparePartForUsage(part);
                            setShowUsageModal(true);
                          }}
                          disabled={getTotalStock(part) === 0}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Use Part"
                        >
                          <Minus className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingSparePart(part);
                            setShowSparePartForm(true);
                          }}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Edit Part"
                        >
                          <Edit className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          onClick={() => handleDeleteSparePart(part.id)}
                          className="p-2 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Part"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Wrapper Container - Single rounded container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Fixed Header Section */}
        <div className="p-8 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Icon */}
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              
              {/* Text */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Spare Parts Inventory</h1>
                <p className="text-sm text-gray-600">
                  Manage inventory, track usage, and monitor stock levels
                </p>
              </div>
            </div>
          
            {/* Back Button */}
            <BackButton to="/lats" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
          </div>
        </div>
        {/* Action Bar - Enhanced Design */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
          <div className="flex gap-3 flex-wrap items-center justify-between">
            <div className="flex gap-3 flex-wrap items-center">
              <button
                onClick={() => {
                  setEditingSparePart(null);
                  setShowSparePartForm(true);
                }}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:from-orange-600 hover:to-orange-700"
              >
                <Plus size={18} />
                <span>Add Part</span>
              </button>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              <InventoryQuickLinks />
              <button
                onClick={() => navigate('/lats/spare-parts/analytics')}
                className="flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:from-purple-600 hover:to-purple-700"
                title="View Analytics"
              >
                <BarChart3 size={18} />
                <span>Analytics</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="px-8 py-6 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Total Parts</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredSpareParts.length}</p>
                </div>
              </div>
            </div>
          
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">In Stock</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {spareParts.filter(part => getTotalStock(part) > getTotalMinQuantity(part)).length}
                  </p>
                </div>
              </div>
            </div>
          
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5 hover:bg-yellow-100 hover:border-yellow-300 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Low Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{stockAlerts.lowStock.length}</p>
                </div>
              </div>
            </div>
          
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 hover:bg-red-100 hover:border-red-300 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Out of Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{stockAlerts.outOfStock.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedSpareParts.length > 0 && (
          <div className="px-8 py-6 flex-shrink-0">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm font-semibold text-orange-900">
                    {selectedSpareParts.length} part{selectedSpareParts.length !== 1 ? 's' : ''} selected
                  </p>
                  <button
                    onClick={() => setSelectedSpareParts([])}
                    className="text-xs text-orange-600 hover:text-orange-800 underline"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleBulkExport}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm text-sm"
                >
                  <Package className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={handleBulkEdit}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Bulk Edit
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Search and Filters Section */}
        <div className="px-8 py-6 flex-shrink-0 border-t border-gray-100 bg-white">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search parts, numbers, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Spare Type Filter */}
              {(() => {
                const uniqueSpareTypes = Array.from(new Set(spareParts.map(p => p.spare_type).filter(Boolean))).sort();
                if (uniqueSpareTypes.length > 0) {
                  return (
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 bg-white"
                    >
                      <option value="all">All Spare Types</option>
                      {uniqueSpareTypes.map(spareType => (
                        <option key={spareType} value={spareType}>{spareType}</option>
                      ))}
                    </select>
                  );
                }
                return null;
              })()}

              {/* Stock Filter */}
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 bg-white"
              >
                <option value="all">All Stock</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>

              {/* Brand Filter */}
              {(() => {
                const uniqueBrands = Array.from(new Set(spareParts.map(p => p.brand).filter(Boolean))).sort();
                if (uniqueBrands.length > 0) {
                  return (
                    <select
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 bg-white"
                    >
                      <option value="all">All Brands</option>
                      {uniqueBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  );
                }
                return null;
              })()}

              {/* Supplier Filter */}
              {suppliers.length > 0 && (
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 bg-white"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              )}

              {/* Sort Filter */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 bg-white"
              >
                <option value="name">Sort: Name</option>
                <option value="quantity">Sort: Quantity</option>
                <option value="cost">Sort: Cost</option>
                <option value="selling">Sort: Price</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={async () => {
                  await loadSpareParts();
                  toast.success('Data refreshed successfully');
                }}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 bg-white"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* View Mode Toggle */}
              <div className="flex gap-1 border border-gray-300 rounded-lg p-1 bg-white">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-orange-100 text-orange-600' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                {!isMobile && (
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-orange-100 text-orange-600' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-8 py-6 flex-shrink-0">
            <GlassCard className="bg-red-50 border-red-200 p-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <div>
                <h4 className="font-semibold">Error</h4>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </GlassCard>
          </div>
        )}

        {/* Content Area */}
        {renderContent()}
      </div>
    </div>

    {/* Spare Part Form Modal */}
    {showSparePartForm && (
      <SparePartAddEditForm
        sparePart={editingSparePart}
        onSave={handleSaveSparePart}
        onCancel={() => {
          setShowSparePartForm(false);
          setEditingSparePart(null);
        }}
      />
    )}

    {/* Usage Modal */}
    {showUsageModal && selectedSparePartForUsage && (
      <SparePartUsageModal
        sparePart={selectedSparePartForUsage}
        onUse={handleUseSparePart}
        onCancel={() => {
          setShowUsageModal(false);
          setSelectedSparePartForUsage(null);
        }}
      />
    )}

    {/* Detail Modal */}
    {showDetailModal && selectedSparePartForDetail && (
      <SparePartDetailsModal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        sparePart={selectedSparePartForDetail}
        currency={{ code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TZS', flag: '🇹🇿' }}
        onEdit={handleEditFromDetailModal}
        onDelete={handleDeleteFromDetailModal}
        onUse={handleUseFromDetailModal}
      />
    )}

    {/* Stock Adjustment Modal */}
    {showStockAdjustModal && selectedSparePartForAdjust && (
      <SparePartStockAdjustModal
        isOpen={showStockAdjustModal}
        onClose={() => {
          setShowStockAdjustModal(false);
          setSelectedSparePartForAdjust(null);
        }}
        sparePart={selectedSparePartForAdjust}
        onAdjust={handleStockAdjustment}
      />
    )}

    {/* Transfer Modal */}
    {showTransferModal && selectedSparePartForTransfer && (
      <SparePartTransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setSelectedSparePartForTransfer(null);
        }}
        sparePart={selectedSparePartForTransfer}
        onTransfer={handleTransferSubmit}
      />
    )}

    {/* Image Management Modal */}
    {showImageModal && selectedVariantForImage && (
      <Modal
        isOpen={showImageModal}
        onClose={() => {
          setShowImageModal(false);
          setSelectedVariantForImage(null);
        }}
        title={`Manage Images - ${selectedVariantForImage.variant ? (selectedVariantForImage.variant.name || 'Default Variant') : selectedVariantForImage.part.name}`}
        maxWidth="xl"
      >
        <div className="space-y-4">
          <SimpleImageUpload
            productId={selectedVariantForImage.variant?.id || selectedVariantForImage.part.id}
            userId={selectedVariantForImage.part.id || 'default-user'} // Using part ID as fallback for userId
            existingImages={
              selectedVariantForImage.variant
                ? (selectedVariantForImage.variant.image_url 
                    ? [{ image_url: selectedVariantForImage.variant.image_url }]
                    : selectedVariantForImage.part.images?.map((img: string) => ({ image_url: img })) || [])
                : (selectedVariantForImage.part.images?.map((img: string) => ({ image_url: img })) || [])
            }
            onImagesChange={async (images) => {
              try {
                // Update the part with new images
                const imageUrls = images.map(img => img.url);
                
                // If managing variant images, update variant's image_url
                if (selectedVariantForImage.variant) {
                  // Update variant's image_url to first image
                  const updatedVariants = selectedVariantForImage.part.variants?.map((v: any) => 
                    v.id === selectedVariantForImage.variant?.id
                      ? { ...v, image_url: imageUrls[0] || null }
                      : v
                  ) || [];
                  
                  const transformedData = {
                    ...transformSparePartData({
                      name: selectedVariantForImage.part.name,
                      spareType: selectedVariantForImage.part.spare_type,
                      brand: selectedVariantForImage.part.brand,
                      supplierId: selectedVariantForImage.part.supplier_id,
                      condition: selectedVariantForImage.part.condition,
                      description: selectedVariantForImage.part.description,
                      compatibleDevices: selectedVariantForImage.part.compatible_devices,
                      variants: updatedVariants,
                      images: selectedVariantForImage.part.images || []
                    })
                  };
                  
                  const response = await updateSparePart(selectedVariantForImage.part.id, transformedData);
                  if (response.ok) {
                    await loadSpareParts();
                    toast.success('Variant images updated successfully');
                  } else {
                    toast.error(response.message || 'Failed to update variant images');
                  }
                } else {
                  // Update main part images
                  const transformedData = {
                    ...transformSparePartData({
                      name: selectedVariantForImage.part.name,
                      spareType: selectedVariantForImage.part.spare_type,
                      brand: selectedVariantForImage.part.brand,
                      supplierId: selectedVariantForImage.part.supplier_id,
                      condition: selectedVariantForImage.part.condition,
                      description: selectedVariantForImage.part.description,
                      compatibleDevices: selectedVariantForImage.part.compatible_devices,
                      variants: selectedVariantForImage.part.variants || [],
                      images: imageUrls
                    }),
                    images: imageUrls
                  };
                  
                  const response = await updateSparePart(selectedVariantForImage.part.id, transformedData);
                  if (response.ok) {
                    await loadSpareParts();
                    toast.success('Images updated successfully');
                  } else {
                    toast.error(response.message || 'Failed to update images');
                  }
                }
              } catch (error) {
                console.error('Error updating images:', error);
                toast.error('Failed to update images');
              }
            }}
            maxImages={5}
            bucket="product-images"
          />
        </div>
      </Modal>
    )}
    </div>
  );
};

export default InventorySparePartsPage;
