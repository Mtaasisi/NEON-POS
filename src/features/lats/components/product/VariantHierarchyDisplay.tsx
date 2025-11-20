/**
 * Variant Hierarchy Display Component - Flat & Simple UI
 * =======================================================
 * Clean, minimal display of parent-child variant relationships
 * Simple flat design with clear hierarchy
 */

import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Package, 
  Layers, 
  Smartphone,
  Search,
  Filter,
  DollarSign,
  Hash,
  MapPin,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { loadChildIMEIs } from '../../lib/variantHelpers';
import { format } from '../../lib/format';

interface VariantHierarchyDisplayProps {
  productId: string;
  variants: any[]; // Parent variants only
  showFinancials?: boolean;
  showSearch?: boolean;
  onChildClick?: (child: any) => void;
}

interface ExpandedState {
  [parentId: string]: boolean;
}

interface ChildrenCache {
  [parentId: string]: any[];
}

const VariantHierarchyDisplay: React.FC<VariantHierarchyDisplayProps> = ({
  productId,
  variants,
  showFinancials = true,
  showSearch = true,
  onChildClick
}) => {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [childrenCache, setChildrenCache] = useState<ChildrenCache>({});
  const [loadingChildren, setLoadingChildren] = useState<{[key: string]: boolean}>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'sold'>('all');
  const [loadingStats, setLoadingStats] = useState(false);
  const [overallStats, setOverallStats] = useState({ totalDevices: 0, availableDevices: 0 });

  // Calculate overall stats from variants on mount and when cache changes
  useEffect(() => {
    const calculateOverallStats = () => {
      // Get counts from expanded variants in cache
      const cacheTotal = Object.values(childrenCache).flat().length;
      const cacheAvailable = Object.values(childrenCache).flat().filter(c => c.is_active && c.quantity > 0).length;
      
      // For unexpanded variants, use their quantity field (if is_parent) or available_imeis
      const unexpandedTotal = variants
        .filter(v => !childrenCache[v.id])
        .reduce((sum, v) => {
          // Use available_imeis if present, otherwise quantity
          const count = v.available_imeis !== undefined ? v.available_imeis : (v.quantity || 0);
          return sum + count;
        }, 0);
      
      setOverallStats({
        totalDevices: cacheTotal + unexpandedTotal,
        availableDevices: cacheAvailable + unexpandedTotal
      });
    };
    
    calculateOverallStats();
  }, [variants, childrenCache]);

  // Load children when parent is expanded
  const handleToggleExpand = async (parentId: string) => {
    const isExpanding = !expanded[parentId];
    
    setExpanded(prev => ({
      ...prev,
      [parentId]: isExpanding
    }));

    // Load children if not already loaded and we're expanding
    if (isExpanding && !childrenCache[parentId]) {
      setLoadingChildren(prev => ({ ...prev, [parentId]: true }));
      try {
        const children = await loadChildIMEIs(parentId);
        setChildrenCache(prev => ({
          ...prev,
          [parentId]: children
        }));
      } catch (error) {
        console.error('Error loading children:', error);
      } finally {
        setLoadingChildren(prev => ({ ...prev, [parentId]: false }));
      }
    }
  };

  // Expand all parents
  const handleExpandAll = async () => {
    const allExpanded: ExpandedState = {};
    variants.forEach(v => { allExpanded[v.id] = true; });
    setExpanded(allExpanded);

    // Load all children
    for (const variant of variants) {
      if (!childrenCache[variant.id]) {
        setLoadingChildren(prev => ({ ...prev, [variant.id]: true }));
        try {
          const children = await loadChildIMEIs(variant.id);
          setChildrenCache(prev => ({
            ...prev,
            [variant.id]: children
          }));
        } catch (error) {
          console.error('Error loading children:', error);
        } finally {
          setLoadingChildren(prev => ({ ...prev, [variant.id]: false }));
        }
      }
    }
  };

  // Collapse all
  const handleCollapseAll = () => {
    setExpanded({});
  };

  // Get condition badge color
  const getConditionBadge = (condition?: string) => {
    if (!condition) return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'N/A' };
    
    const conditionMap: {[key: string]: {bg: string, text: string, label: string}} = {
      new: { bg: 'bg-green-100', text: 'text-green-700', label: 'New' },
      excellent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Excellent' },
      good: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Good' },
      fair: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Fair' },
      poor: { bg: 'bg-red-100', text: 'text-red-700', label: 'Poor' },
      used: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Used' }
    };

    return conditionMap[condition.toLowerCase()] || conditionMap.used;
  };

  // Filter children based on search and status
  const getFilteredChildren = (children: any[]) => {
    if (!children) return [];
    
    return children.filter(child => {
      const imei = child.variant_attributes?.imei || '';
      const serialNumber = child.variant_attributes?.serial_number || '';
      const macAddress = child.variant_attributes?.mac_address || '';
      
      // Search filter
      const matchesSearch = searchTerm === '' || 
        imei.toLowerCase().includes(searchTerm.toLowerCase()) ||
        serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        macAddress.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const isAvailable = child.is_active && child.quantity > 0;
      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'available' && isAvailable) ||
        (filterStatus === 'sold' && !isAvailable);

      return matchesSearch && matchesStatus;
    });
  };

  // Calculate parent summary stats
  const getParentStats = (parentId: string, parentPrice: number = 0) => {
    const children = childrenCache[parentId] || [];
    const available = children.filter(c => c.is_active && c.quantity > 0).length;
    const sold = children.filter(c => !c.is_active || c.quantity === 0).length;
    // ✅ FIX: Use parent price as fallback if child price is 0
    const totalValue = children
      .filter(c => c.is_active && c.quantity > 0)
      .reduce((sum, c) => sum + (c.selling_price || parentPrice), 0);
    
    return { total: children.length, available, sold, totalValue };
  };

  // Filter parent variants
  const filteredVariants = variants.filter(variant => {
    if (!searchTerm) return true;
    
    const name = variant.variant_name || variant.name || '';
    const sku = variant.sku || '';
    
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           sku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Simple Header */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Variant Hierarchy</h3>
            <p className="text-sm text-gray-600">
              {filteredVariants.length} parent variant{filteredVariants.length !== 1 ? 's' : ''} • {overallStats.totalDevices} devices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Simple Search and Filters */}
      {showSearch && (
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search variants, IMEIs, serial numbers..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded bg-white">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-sm border-none focus:outline-none bg-transparent"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>
      )}

      {/* Parent Variants List */}
      <div className="space-y-3">
        {filteredVariants.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded border border-gray-300">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-1">No variants found</p>
            <p className="text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search or filter criteria' : 'This product has no variants yet'}
            </p>
          </div>
        ) : (
          filteredVariants.map((variant) => {
            const isExpanded = expanded[variant.id];
            const children = childrenCache[variant.id] || [];
            const isLoadingChildren = loadingChildren[variant.id];
            const stats = getParentStats(variant.id, variant.selling_price || 0);
            const filteredChildren = getFilteredChildren(children);
            const isParent = variant.is_parent || variant.variant_type === 'parent';
            
            return (
              <div
                key={variant.id}
                className="bg-white rounded border-2 border-gray-200 hover:border-purple-400"
              >
                {/* Parent Variant Header */}
                <div
                  onClick={() => handleToggleExpand(variant.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Expand/Collapse Icon */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                      </div>

                      {/* Parent Icon */}
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded flex items-center justify-center">
                        <Layers className="w-5 h-5 text-purple-600" />
                      </div>

                      {/* Parent Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-semibold text-gray-900 truncate">
                            {variant.variant_name || variant.name || 'Unnamed Variant'}
                          </h4>
                          {isParent && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                              Parent
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">SKU: {variant.sku}</p>
                      </div>

                      {/* Stats Summary */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {/* Stock */}
                        <div className="text-center">
                          <div className="text-xs text-gray-500 font-medium">Stock</div>
                          <div className="text-lg font-bold text-gray-900">
                            {variant.quantity || 0}
                          </div>
                        </div>

                        {/* Children Count */}
                        {isParent && children.length > 0 && (
                          <div className="text-center">
                            <div className="text-xs text-gray-500 font-medium">Devices</div>
                            <div className="text-lg font-bold text-blue-600">
                              {stats.available} / {stats.total}
                            </div>
                          </div>
                        )}

                        {/* Price */}
                        {showFinancials && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500 font-medium">Price</div>
                            <div className="text-base font-bold text-green-600">
                              {format.money(variant.selling_price || 0)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Children (IMEI) Display */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {isLoadingChildren ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-3"></div>
                        <p className="text-sm text-gray-600">Loading devices...</p>
                      </div>
                    ) : children.length === 0 ? (
                      <div className="p-8 text-center">
                        <Smartphone className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-700 font-medium mb-1">No child devices</p>
                        <p className="text-xs text-gray-500">
                          This parent variant has no IMEI children yet
                        </p>
                      </div>
                    ) : filteredChildren.length === 0 ? (
                      <div className="p-8 text-center">
                        <Search className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-700 font-medium mb-1">No matches found</p>
                        <p className="text-xs text-gray-500">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        {/* Children Header with Stats */}
                        <div className="flex items-center justify-between pb-2 border-b border-gray-300">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {stats.total} Device{stats.total !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-gray-500">
                              {stats.available} available • {stats.sold} sold
                            </p>
                          </div>
                          {showFinancials && stats.totalValue > 0 && (
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Total Value</p>
                              <p className="text-base font-bold text-green-600">
                                {format.money(stats.totalValue)}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Children Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                          {filteredChildren.map((child, index) => {
                            // ✅ FIX: Treat IMEI and serial number as the same - use whichever is available
                            const identifier = child.variant_attributes?.imei || child.variant_attributes?.serial_number || 'N/A';
                            const imei = identifier;
                            const serialNumber = identifier;
                            const macAddress = child.variant_attributes?.mac_address;
                            const condition = child.variant_attributes?.condition;
                            const location = child.variant_attributes?.location;
                            const isAvailable = child.is_active && child.quantity > 0;
                            const conditionBadge = getConditionBadge(condition);

                            return (
                              <div
                                key={child.id}
                                onClick={() => onChildClick?.(child)}
                                className={`p-3 rounded border-2 ${
                                  isAvailable
                                    ? 'bg-white border-gray-200 hover:border-blue-400 cursor-pointer'
                                    : 'bg-gray-100 border-gray-300 opacity-60'
                                }`}
                              >
                                {/* Header with IMEI or Serial Number */}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Smartphone className={`w-4 h-4 flex-shrink-0 ${
                                      isAvailable ? 'text-blue-600' : 'text-gray-400'
                                    }`} />
                                    <span className="font-mono text-sm font-semibold text-gray-900 truncate">
                                      {identifier}
                                    </span>
                                  </div>
                                  {isAvailable ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                  )}
                                </div>

                                {/* Device Details */}
                                <div className="space-y-1">
                                  {/* ✅ FIX: Removed separate S/N display since IMEI and serial number are the same */}
                                  
                                  {macAddress && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <Hash className="w-3 h-3" />
                                      <span className="truncate">MAC: {macAddress}</span>
                                    </div>
                                  )}

                                  {location && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <MapPin className="w-3 h-3" />
                                      <span className="truncate">{location}</span>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${conditionBadge.bg} ${conditionBadge.text}`}>
                                      {conditionBadge.label}
                                    </span>
                                    
                                    {showFinancials && (
                                      <span className="text-xs font-bold text-green-600">
                                        {/* ✅ FIX: Use parent price as fallback if child price is 0 */}
                                        {format.money(child.selling_price || variant.selling_price || 0)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default VariantHierarchyDisplay;

