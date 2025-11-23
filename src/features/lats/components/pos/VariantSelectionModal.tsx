import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronDown,
  ChevronUp,
  Package,
  Tag,
  AlertCircle,
  Search,
} from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";
import { format } from "../../lib/format";
import { toast } from "react-hot-toast";
import { useBodyScrollLock } from "../../../../hooks/useBodyScrollLock";

interface VariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSelectVariant: (product: any, variant: any, quantity: number) => void;
  isPurchaseOrderMode?: boolean; // Add context flag for PO mode
}

const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
  isOpen,
  onClose,
  product,
  onSelectVariant,
  isPurchaseOrderMode = false,
}) => {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set(),
  );
  const [childVariants, setChildVariants] = useState<{ [key: string]: any[] }>(
    {},
  );
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(
    new Set(),
  );
  const [selectedQuantities, setSelectedQuantities] = useState<{
    [key: string]: number;
  }>({});
  const [variantChildCounts, setVariantChildCounts] = useState<{
    [key: string]: number;
  }>({});
  const [searchQuery, setSearchQuery] = useState<{ [key: string]: string }>({});
  const [mainSearchQuery, setMainSearchQuery] = useState<string>("");
  const [focusedVariantIndex, setFocusedVariantIndex] = useState(0);
  const [focusedChildIndex, setFocusedChildIndex] = useState<{
    [key: string]: number;
  }>({});
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set());
  const [matchingParentIds, setMatchingParentIds] = useState<Set<string>>(new Set());
  const cacheWarningLoggedRef = React.useRef(false);
  const preloadInProgressRef = React.useRef(false);

  // Normalize product data: handle both 'variants' and 'product_variants' property names
  // ✅ FIX: Memoize normalizedProduct to prevent infinite re-renders
  const normalizedProduct = useMemo(() => {
    return product ? {
      ...product,
      variants: product.variants || product.product_variants || []
    } : null;
  }, [product]);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on html element as well
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  // Early return if product is invalid
  if (!isOpen || !normalizedProduct || !normalizedProduct.variants) {
    if (isOpen && normalizedProduct) {
      console.error("❌ Modal opened with invalid product data (no variants):", normalizedProduct);
    }
    return null;
  }

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setExpandedParents(new Set());
      setChildVariants({});
      setLoadingChildren(new Set());
      setSelectedQuantities({});
      setVariantChildCounts({});
      setSearchQuery({});
      setMainSearchQuery("");
      setFocusedVariantIndex(0);
      setFocusedChildIndex({});
      setSelectedDevices(new Set());
      setExpandedVariants(new Set());
      cacheWarningLoggedRef.current = false; // Reset warning flag when modal closes
      preloadInProgressRef.current = false; // Reset preload flag when modal closes
    } else {
      // Focus first variant when opening
      setFocusedVariantIndex(0);

      // ✅ AUTO-EXPAND: If single parent variant with children, auto-expand it
      const autoExpandSingleParent = async () => {
        const productToUse = normalizedProduct;
        if (productToUse?.variants?.length === 1) {
          const singleVariant = productToUse.variants[0];
          const isParentByFlag =
            singleVariant.is_parent || singleVariant.variant_type === "parent";

          // Check if has children (either by flag, cache, or database)
          let hasChildren = isParentByFlag;

          if (!hasChildren) {
            try {
              // First check cache service (instant!)
              const { childVariantsCacheService } = await import("../../../../services/childVariantsCacheService");
              if (childVariantsCacheService.isCacheValid()) {
                hasChildren = childVariantsCacheService.hasChildren(singleVariant.id);
                if (hasChildren) {
                  console.log(`🔍 Modal: Single variant has children (from cache): ${hasChildren}`);
                }
              }
              
              // Fallback to database query if cache not available
              if (!hasChildren) {
                const { count } = await supabase
                  .from("lats_product_variants")
                  .select("id", { count: "exact", head: true })
                  .eq("parent_variant_id", singleVariant.id)
                  .eq("variant_type", "imei_child")
                  .eq("is_active", true)
                  .gt("quantity", 0);

                hasChildren = (count || 0) > 0;
                console.log(
                  `🔍 Modal: Single variant has children: ${hasChildren}`,
                );
              }
            } catch (error) {
              console.error("Error checking for children in modal:", error);
            }
          }

          if (hasChildren || isParentByFlag) {
            // Auto-expand single parent variant to show child variants directly
            console.log("✅ Modal: Auto-expanding single parent variant to show child variants");
            const newExpanded = new Set([singleVariant.id]);
            setExpandedParents(newExpanded);
            // Always try to load children, even if flagged as parent
            loadChildVariants(singleVariant.id);
          }
        }
      };

      // Run after a short delay to ensure modal is rendered
        setTimeout(() => {
        autoExpandSingleParent();
      }, 100);
    }
  }, [isOpen, normalizedProduct]);

  // ⚡ SUPER OPTIMIZED: Use global cache that was preloaded with all products
  const preloadAllChildVariants = useCallback(async () => {
    const productToUse = normalizedProduct;
    if (!productToUse?.variants) return;

    // Prevent concurrent preloads
    if (preloadInProgressRef.current) {
      console.log("⏳ Child variants preload already in progress, skipping...");
      return;
    }

    try {
      preloadInProgressRef.current = true;
      console.log("⚡ Loading child variants from global cache...");
      
      // Import the global cache service
      const { childVariantsCacheService } = await import("../../../../services/childVariantsCacheService");
      
      // Get cache stats
      const cacheStats = childVariantsCacheService.getCacheStats();
      console.log("📊 Cache stats:", cacheStats);

      // If cache is not valid, fallback to local query
      if (!childVariantsCacheService.isCacheValid()) {
        // Only log in development mode - fallback query works fine, this is expected behavior
        if (!cacheWarningLoggedRef.current && (import.meta.env.DEV || import.meta.env.MODE === 'development')) {
          console.log("ℹ️ Global cache not ready, using fallback query (this is normal on first load)");
          cacheWarningLoggedRef.current = true;
        }
        await preloadLocalFallback();
        return;
      }

      // Load from cache - INSTANT! (Cache already includes legacy items)
      const variantIds = productToUse.variants.map((v: any) => v.id);
      const childrenByParent: { [key: string]: any[] } = {};
      const counts: { [key: string]: number } = {};

      // ⚡ OPTIMIZED: Use cache data directly - no database queries needed!
      // The cache service already includes both IMEI children and legacy items
      for (const variantId of variantIds) {
        const cachedChildren = childVariantsCacheService.getChildVariants(variantId) || [];
        
        if (cachedChildren.length > 0) {
          // Cache already has formatted children with all necessary fields
          childrenByParent[variantId] = cachedChildren;
          counts[variantId] = cachedChildren.length;
        }
      }

      // Update state with cached data + legacy items
      setChildVariants(childrenByParent);
      setVariantChildCounts(counts);
      
      console.log("✅ Loaded from GLOBAL CACHE + legacy items:", {
        totalChildren: Object.values(childrenByParent).flat().length,
        parentsWithChildren: Object.keys(childrenByParent).length,
        counts,
      });
    } catch (error) {
      console.error("Error loading from cache:", error);
      await preloadLocalFallback();
    } finally {
      preloadInProgressRef.current = false;
    }
  }, [normalizedProduct]);

  // Fallback: Query directly if cache not ready
  const preloadLocalFallback = async () => {
    const productToUse = normalizedProduct;
    if (!productToUse?.variants) return;

    const variantIds = productToUse.variants.map((v: any) => v.id);
    if (variantIds.length === 0) return;

    console.log("🔄 Fallback: Querying child variants directly...");
    
    // ✅ FIX: Use loadAvailableChildIMEIs to exclude sold items
    const { loadAvailableChildIMEIs } = await import('../../lib/variantHelpers');
    const allChildrenPromises = variantIds.map((parentId: string) => loadAvailableChildIMEIs(parentId));
    const allChildrenArrays = await Promise.all(allChildrenPromises);
    const allChildren = allChildrenArrays.flat();

    if (!allChildren || allChildren.length === 0) {
      console.log("ℹ️ No child variants found");
      return;
    }

    // Format and group children
    const childrenByParent: { [key: string]: any[] } = {};
    const counts: { [key: string]: number } = {};

    allChildren.forEach((child: any) => {
      // ✅ FIX: loadChildIMEIs now sets parent_variant_id correctly for legacy items
      const parentId = child.parent_variant_id;
      
      // Skip if no parent or parent not in our variant list (shouldn't happen)
      if (!parentId || !variantIds.includes(parentId)) {
        console.warn('Child item has invalid parent association:', { childId: child.id, parentId, variantIds });
        return;
      }

      // ✅ FIX: Get parent variant price to use as fallback for children
      const parentVariant = productToUse.variants.find((v: any) => v.id === parentId);
      const parentPrice = parentVariant?.sellingPrice ?? parentVariant?.selling_price ?? parentVariant?.price ?? 0;

      // ✅ FIX: Treat IMEI and serial number as the same - use whichever is available
      const imei = child.variant_attributes?.imei || child.imei || child.variant_attributes?.serial_number || child.serial_number || child.sku || "N/A";
      const serialNumber = imei; // Same as IMEI
      const condition = child.variant_attributes?.condition || child.condition || "New";

      // ✅ FIX: Use parent variant's price as fallback if child doesn't have a price
      const childPrice = child.selling_price || child.sellingPrice || child.price;
      const finalPrice = childPrice && childPrice > 0 ? childPrice : parentPrice;

      const formattedChild = {
        id: child.id,
        name: child.variant_name || child.name || `IMEI: ${imei}`,
        sku: child.sku || imei,
        quantity: child.quantity || 0,
        sellingPrice: finalPrice,
        price: finalPrice, // Also set price field for compatibility
        imei, serialNumber, condition,
        variant_attributes: child.variant_attributes,
            // ✅ FIX: Treat legacy items as IMEI children
            is_imei_child: true,
            is_legacy: child.is_legacy || false,
            variant_type: child.variant_type || 'imei_child', // Ensure variant_type is set
            parent_variant_id: parentId,
            ...child,
          };

      if (!childrenByParent[parentId]) {
        childrenByParent[parentId] = [];
      }
      childrenByParent[parentId].push(formattedChild);
      counts[parentId] = (counts[parentId] || 0) + 1;
    });

    setChildVariants(childrenByParent);
    setVariantChildCounts(counts);
  };

  // Check for children and load from cache when modal opens
  useEffect(() => {
    if (isOpen && normalizedProduct?.variants && !preloadInProgressRef.current) {
      // Use a stable reference to prevent unnecessary re-runs
      const productId = normalizedProduct.id;
      const variantCount = normalizedProduct.variants?.length || 0;
      
      // Only preload if we have a valid product with variants
      if (productId && variantCount > 0) {
        preloadAllChildVariants();
      }
    }
  }, [isOpen, normalizedProduct?.id, normalizedProduct?.variants?.length, preloadAllChildVariants]);

  // Search child variants in database when search query changes
  useEffect(() => {
    if (!isOpen || !normalizedProduct?.variants || !mainSearchQuery.trim()) {
      setMatchingParentIds(new Set());
      return;
    }

    const searchChildVariants = async () => {
      const query = mainSearchQuery.toLowerCase().trim();
      const parentIds = normalizedProduct.variants.map((v: any) => v.id);
      
      if (parentIds.length === 0) {
        setMatchingParentIds(new Set());
        return;
      }

      try {
        // Search in child variants (IMEI children)
        const { data: matchingChildren, error } = await supabase
          .from('lats_product_variants')
          .select('parent_variant_id, variant_attributes, sku')
          .in('parent_variant_id', parentIds)
          .eq('variant_type', 'imei_child')
          .eq('is_active', true)
          .gt('quantity', 0);

        if (error) {
          console.error('Error searching child variants:', error);
          setMatchingParentIds(new Set());
          return;
        }

        // Also search in legacy inventory_items
        const productId = normalizedProduct.id;
        const { data: matchingInventory, error: inventoryError } = await supabase
          .from('inventory_items')
          .select('product_id, serial_number, imei')
          .eq('product_id', productId)
          .eq('status', 'available')
          .not('serial_number', 'is', null);

        // Filter matches
        const matchingParents = new Set<string>();
        
        // Check IMEI children
        if (matchingChildren) {
          matchingChildren.forEach((child: any) => {
            const imei = (child.variant_attributes?.imei || child.variant_attributes?.IMEI || "").toLowerCase();
            const serial = (child.variant_attributes?.serial_number || child.variant_attributes?.serialNumber || "").toLowerCase();
            const sku = (child.sku || "").toLowerCase();
            
            if ((imei && (imei.includes(query) || imei.endsWith(query))) ||
                (serial && (serial.includes(query) || serial.endsWith(query))) ||
                (sku && (sku.includes(query) || sku.endsWith(query)))) {
              matchingParents.add(child.parent_variant_id);
            }
          });
        }

        // Check inventory items - if any match, include all parent variants for this product
        if (matchingInventory && !inventoryError) {
          const hasMatchingInventory = matchingInventory.some((item: any) => {
            const imei = (item.imei || "").toLowerCase();
            const serial = (item.serial_number || "").toLowerCase();
            
            return (imei && (imei.includes(query) || imei.endsWith(query))) ||
                   (serial && (serial.includes(query) || serial.endsWith(query)));
          });

          // If inventory item matches, include all parent variants for this product
          if (hasMatchingInventory) {
            parentIds.forEach((id: string) => matchingParents.add(id));
          }
        }

        setMatchingParentIds(matchingParents);
      } catch (error) {
        console.error('Error in searchChildVariants:', error);
        setMatchingParentIds(new Set());
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(() => {
      searchChildVariants();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [mainSearchQuery, isOpen, normalizedProduct]);

  // Debug log all available variants (reduced verbosity)
  useEffect(() => {
    const productToUse = normalizedProduct;
    if (isOpen && productToUse && !isPurchaseOrderMode) {
      // Only log in non-PO mode for debugging
      console.log("🎯 Modal opened for product:", productToUse.name);
      console.log("📦 Total variants:", productToUse.variants?.length);

      const availableVariants =
        productToUse.variants?.filter((v: any) => {
          const quantity =
            v.quantity ?? v.stockQuantity ?? v.stock_quantity ?? 0;
          const isActive = v.is_active !== false && v.isActive !== false;
          return quantity > 0 && isActive;
        }) || [];
      console.log(
        "✅ Available variants after filter:",
        availableVariants.length,
      );
    }
  }, [isOpen, normalizedProduct, isPurchaseOrderMode]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const productToUse = normalizedProduct;
      const availableVariants =
        productToUse?.variants?.filter((v: any) => {
          const quantity =
            v.quantity ?? v.stockQuantity ?? v.stock_quantity ?? 0;
          const isActive = v.is_active !== false && v.isActive !== false;
          return quantity > 0 && isActive;
        }) || [];

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedVariantIndex((prev) =>
            Math.min(prev + 1, availableVariants.length - 1),
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedVariantIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (availableVariants[focusedVariantIndex]) {
            const variant = availableVariants[focusedVariantIndex];
            if (isParentVariant(variant)) {
              toggleParentExpansion(variant.id);
            } else {
              handleVariantSelect(variant);
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedVariantIndex, normalizedProduct, onClose]);


  // Check if a variant is a parent variant (has children)
  const isParentVariant = (variant: any): boolean => {
    // Check if explicitly marked as parent
    const markedAsParent =
      variant.is_parent === true ||
      variant.variant_type === "parent" ||
      variant.variantType === "parent";

    // Check if has children (from our count check)
    const hasChildren = (variantChildCounts[variant.id] || 0) > 0;

    const isParent = markedAsParent || hasChildren;

    if (hasChildren) {
      console.log(
        `✅ Variant "${variant.name || variant.variant_name}" has ${variantChildCounts[variant.id]} children`,
      );
    }

    return isParent;
  };

  // ⚡ OPTIMIZED: Load child variants for a parent (now instant with preloaded data)
  const loadChildVariants = async (parentVariantId: string) => {
    // ✅ First check local state (already loaded)
    if (childVariants[parentVariantId]) {
      console.log(`⚡ Using preloaded children for parent: ${parentVariantId} (${childVariants[parentVariantId].length} children)`);
      return;
    }

    // ✅ Second check: Try global cache service (instant!)
    try {
      const { childVariantsCacheService } = await import("../../../../services/childVariantsCacheService");
      const cachedChildren = childVariantsCacheService.getChildVariants(parentVariantId);
      
      if (cachedChildren && cachedChildren.length > 0) {
        console.log(`⚡ Using cached children for parent: ${parentVariantId} (${cachedChildren.length} children)`);
        setChildVariants((prev) => ({
          ...prev,
          [parentVariantId]: cachedChildren,
        }));
        return;
      }
    } catch (error) {
      console.warn("Error checking cache service:", error);
    }

    // Fallback: Load from database if not in cache (this is normal - cache may not be ready yet)
    // Only log in development mode to reduce console noise
    if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
      console.log(`ℹ️ Loading children from database for parent ${parentVariantId} (cache not ready yet)`);
    }
    setLoadingChildren((prev) => new Set(prev).add(parentVariantId));

    try {
      // ✅ FIX: Get parent variant price to use as fallback for children
      const parentVariant = normalizedProduct?.variants?.find((v: any) => v.id === parentVariantId);
      const parentPrice = parentVariant?.sellingPrice ?? parentVariant?.selling_price ?? parentVariant?.price ?? 0;

      // ✅ FIX: Use loadAvailableChildIMEIs to exclude sold items
      const { loadAvailableChildIMEIs } = await import('../../lib/variantHelpers');
      const allChildren = await loadAvailableChildIMEIs(parentVariantId);

      if (allChildren && allChildren.length > 0) {
        const formattedChildren = allChildren.map((child) => {
          // ✅ FIX: Treat IMEI and serial number as the same - use whichever is available
          const imei =
            child.variant_attributes?.imei ||
            child.variant_attributes?.IMEI ||
            child.imei ||
            child.variant_attributes?.serial_number ||
            child.variant_attributes?.serialNumber ||
            child.variant_attributes?.serial ||
            child.serial_number ||
            child.sku ||
            "N/A";

          const serialNumber = imei; // Same as IMEI

          const condition =
            child.variant_attributes?.condition || child.condition || "New";

          // ✅ FIX: Use parent variant's price as fallback if child doesn't have a price
          const childPrice = child.selling_price || child.sellingPrice || child.price;
          const finalPrice = childPrice && childPrice > 0 ? childPrice : parentPrice;

          return {
            id: child.id,
            name: child.variant_name || child.name || `IMEI: ${imei}`,
            sku: child.sku || imei,
            quantity: child.quantity || 0,
            sellingPrice: finalPrice,
            price: finalPrice, // Also set price field for compatibility
            imei: imei,
            serialNumber: serialNumber,
            condition: condition,
            variant_attributes: child.variant_attributes,
            // ✅ FIX: Treat legacy items as IMEI children
            is_imei_child: true,
            is_legacy: child.is_legacy || false,
            variant_type: child.variant_type || 'imei_child', // Ensure variant_type is set
            parent_variant_id: parentVariantId,
            ...child,
          };
        });

        setChildVariants((prev) => ({
          ...prev,
          [parentVariantId]: formattedChildren,
        }));
      } else {
        setChildVariants((prev) => ({
          ...prev,
          [parentVariantId]: [],
        }));
      }
    } catch (error) {
      console.error("❌ Error loading child variants:", error);
      toast.error("Failed to load device variants");
      setChildVariants((prev) => ({
        ...prev,
        [parentVariantId]: [],
      }));
    } finally {
      setLoadingChildren((prev) => {
        const newSet = new Set(prev);
        newSet.delete(parentVariantId);
        return newSet;
      });
    }
  };

  // Toggle parent expansion
  const toggleParentExpansion = async (parentVariantId: string) => {
    const newExpanded = new Set(expandedParents);

    if (newExpanded.has(parentVariantId)) {
      newExpanded.delete(parentVariantId);
    } else {
      newExpanded.add(parentVariantId);
      // Load children if not already loaded
      if (!childVariants[parentVariantId]) {
        await loadChildVariants(parentVariantId);
      }
    }

    setExpandedParents(newExpanded);
  };

  // Handle variant selection - toggle for multiple selection mode
  const handleVariantSelect = (variant: any) => {
    const quantity = selectedQuantities[variant.id] || 1;

    // ✅ STRICT CHECK: Never allow adding parent variants with children
    const isParent = isParentVariant(variant);
    const childCount = variantChildCounts[variant.id] || 0;
    const loadedChildren = childVariants[variant.id];
    const hasChildren = isParent && (childCount > 0 || (loadedChildren && loadedChildren.length > 0));

    if (hasChildren) {
      // ❌ BLOCKED: Parent has children - MUST select specific child variant
      toast.error("⚠️ Please select a specific device (IMEI) from the list below", {
        duration: 4000,
        icon: "📱",
      });
      
      // Auto-expand the parent to show children if not already expanded
      if (!expandedParents.has(variant.id)) {
        toggleParentExpansion(variant.id);
      }
      
      // Prevent any further action
      return;
    }

    // ✅ MULTIPLE SELECTION MODE: Toggle variant in selectedDevices instead of immediately adding
    const newSelectedDevices = new Set(selectedDevices);
    if (newSelectedDevices.has(variant.id)) {
      // Deselect
      newSelectedDevices.delete(variant.id);
      console.log("❌ Deselected variant:", variant.imei || variant.name || variant.id);
    } else {
      // Select
      newSelectedDevices.add(variant.id);
      console.log("✅ Selected variant:", variant.imei || variant.name || variant.id);
    }
    setSelectedDevices(newSelectedDevices);
  };

  // Update quantity for a variant
  const updateQuantity = (variantId: string, delta: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[variantId] || 1;
      const newValue = Math.max(1, current + delta);
      return { ...prev, [variantId]: newValue };
    });
  };

  // Filter children by search query
  const filterChildren = (children: any[], parentId: string) => {
    const query = searchQuery[parentId]?.toLowerCase() || "";
    if (!query) return children;

    return children.filter((child) => {
      // ✅ FIX: IMEI and serial number are the same - search both fields together
      const identifier = ((child.imei || child.serialNumber || child.sku || "")).toLowerCase();
      const condition = (child.condition || "").toLowerCase();

      // Check if query matches anywhere or at the end (for last digits search)
      return (
        identifier.includes(query) ||
        identifier.endsWith(query) ||
        condition.includes(query) ||
        condition.endsWith(query)
      );
    });
  };

  // Get condition badge color
  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case "new":
        return "bg-green-100 text-green-800 border-green-200";
      case "used":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "refurbished":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Use normalized product for all operations (already defined at top)
  const productToUse = normalizedProduct;

  // Filter out inactive variants and those with no stock
  // Handle multiple possible field names for quantity (quantity, stockQuantity, stock_quantity)
  let availableVariants =
    productToUse?.variants?.filter((v: any) => {
      const quantity = v.quantity ?? v.stockQuantity ?? v.stock_quantity ?? 0;
      const isActive = v.is_active !== false && v.isActive !== false;
      return quantity > 0 && isActive;
    }) || [];

  // Apply main search filter
  if (mainSearchQuery.trim()) {
    const query = mainSearchQuery.toLowerCase().trim();
    availableVariants = availableVariants.filter((v: any) => {
      const name = (v.name || v.variant_name || "").toLowerCase();
      const sku = (v.sku || "").toLowerCase();
      
      // Check if query matches parent variant name or SKU (anywhere or at the end)
      const matchesParent = name.includes(query) || 
                            name.endsWith(query) || 
                            sku.includes(query) || 
                            sku.endsWith(query);
      
      // Check child variants (IMEIs) if they're loaded
      const children = childVariants[v.id] || [];
      const matchesLoadedChild = children.some((child: any) => {
        const childIdentifier = ((child.imei || child.serialNumber || child.sku || "")).toLowerCase();
        return childIdentifier.includes(query) || childIdentifier.endsWith(query);
      });
      
      // Check if this parent has matching children in database (from search query)
      const matchesDatabaseChild = matchingParentIds.has(v.id);
      
      return matchesParent || matchesLoadedChild || matchesDatabaseChild;
    });
  }

  // ✅ FIX: For POS mode, don't show variants with zero stock
  // Only show fallback for purchase order mode where zero stock is expected
  if (
    availableVariants.length === 0 &&
    productToUse?.variants &&
    productToUse.variants.length > 0
  ) {
    if (isPurchaseOrderMode) {
      // In PO mode, showing zero-stock variants is expected behavior
      availableVariants = productToUse.variants.filter((v: any) => {
        const isActive = v.is_active !== false && v.isActive !== false;
        return isActive;
      });
    } else {
      // For POS mode, don't show any variants if all are out of stock
      console.log(
        "ℹ️ No variants with stock available for POS - product is out of stock",
      );
    }
  }

  // Calculate completed parent variants (parent variants with at least one selected child)
  const completedParentVariants = availableVariants.filter((parent: any) => {
    if (!isParentVariant(parent)) return false;
    const children = childVariants[parent.id] || [];
    return children.some((child: any) => selectedDevices.has(child.id));
  }).length;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[99999] transition-opacity duration-300"
        style={{
          overflow: 'hidden',
          overscrollBehavior: 'none'
        }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-modal-title"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header - Fixed */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center mb-4">
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>

              {/* Text */}
              <div className="flex-1">
                {productToUse?.name && (
                  <h3 className="text-3xl font-extrabold text-gray-900 mb-1">
                    {productToUse.name}
                  </h3>
                )}
                <div className="flex items-center gap-3">
                  <p
                    id="variant-modal-title"
                    className="text-sm text-gray-500 font-medium"
                  >
                    Select Multiple Variants
                  </p>
                  {completedParentVariants > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm font-bold text-green-700">
                        {completedParentVariants} Complete
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search variants..."
                value={mainSearchQuery}
                onChange={(e) => setMainSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Scrollable Variants List Section */}
          <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
            <div className="space-y-4 py-4">
              {availableVariants.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                    <AlertCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    No Variants Available
                  </h3>
                  <p className="text-gray-600 text-lg">
                    This product has no available variants in stock.
                  </p>
                </div>
              ) : (
                <>
                  {availableVariants.map((variant: any, index: number) => {
                    const isParent = isParentVariant(variant);
                    const isExpanded = expandedParents.has(variant.id);
                    const children = childVariants[variant.id] || [];
                    const isLoadingChild = loadingChildren.has(variant.id);
                    const quantity = selectedQuantities[variant.id] || 1;
                    const hasLoadedChildren =
                      childVariants[variant.id] !== undefined;
                    const childCount = variantChildCounts[variant.id] || 0;
                    const isFocused = index === focusedVariantIndex;
                    const filteredChildren = filterChildren(
                      children,
                      variant.id,
                    );
                    // ✅ Check if single parent variant with children - hide parent, show only devices
                    const isSingleParentVariant =
                      availableVariants.length === 1 && isParent;
                    // More aggressive check: show children if it's a single parent variant AND either has loaded children or is flagged as parent
                    const shouldShowOnlyChildren =
                      isSingleParentVariant &&
                      (hasLoadedChildren && children.length > 0 || isParent);

                    // Check if this is a single parent with children - show only children directly
                    if (shouldShowOnlyChildren) {
                      return (
                        <React.Fragment key={variant.id}>
                          {isLoadingChild ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="text-gray-600 mt-2">
                                Loading devices...
                              </p>
                            </div>
                          ) : !hasLoadedChildren && isParent ? (
                            // Parent variant flagged but children not loaded yet - show loading
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="text-gray-600 mt-2">
                                Loading child variants...
                              </p>
                            </div>
                          ) : children.length === 0 ? (
                            <div className="text-center py-8">
                              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-600 font-medium mb-2">
                                No specific devices available
                              </p>
                              <p className="text-gray-500 text-sm mb-4">
                                {variantChildCounts[variant.id] > 0
                                  ? "All devices are currently out of stock"
                                  : "This variant has no individual devices tracked"}
                              </p>
                              {variantChildCounts[variant.id] === 0 && (
                                <button
                                  onClick={() => handleVariantSelect(variant)}
                                  className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                >
                                  Add Variant
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Render children directly without wrapper - Click to select */}
                              {children.map((child: any) => {
                                const isSelected = selectedDevices.has(child.id);
                                const stockLevel = child.quantity || 0;
                                const isLowStock = stockLevel > 0 && stockLevel <= 5;
                                const isOutOfStock = stockLevel === 0;
                                
                                return (
                                  <div
                                    key={child.id}
                                    className={`group relative border-2 rounded-2xl bg-white transition-all duration-300 cursor-pointer overflow-hidden ${
                                      isSelected 
                                        ? "border-green-500 ring-4 ring-green-100" 
                                        : "border-gray-200 hover:border-blue-400 hover:-translate-y-0.5"
                                    }`}
                                    onClick={() => handleVariantSelect(child)}
                                  >
                                    {/* Selection Indicator Bar */}
                                    {isSelected && (
                                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-green-500 to-emerald-600"></div>
                                    )}
                                    
                                    <div className="flex items-center justify-between p-5">
                                      <div className="flex items-center gap-4 flex-1">
                                        {/* Icon with Animation */}
                                        <div
                                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                            isSelected 
                                              ? "bg-gradient-to-br from-green-500 to-emerald-600 scale-110" 
                                              : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-50 group-hover:to-indigo-50"
                                          }`}
                                        >
                                          {isSelected ? (
                                            <svg
                                              className="w-6 h-6 text-white animate-[scale-in_0.3s_ease-out]"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={3}
                                                d="M5 13l4 4L19 7"
                                              />
                                            </svg>
                                          ) : (
                                            <Package className={`w-6 h-6 transition-colors ${
                                              isSelected ? "text-white" : "text-gray-400 group-hover:text-blue-500"
                                            }`} />
                                          )}
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1.5">
                                            <h4 className="text-xl font-bold text-gray-900 truncate">
                                              {child.imei || child.serialNumber}
                                            </h4>
                                            {child.condition && child.condition.toLowerCase() !== "new" && (
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                {child.condition}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Action Button */}
                                      <div className="flex flex-col items-end gap-2 ml-4">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleVariantSelect(child);
                                          }}
                                          className={`px-6 py-2.5 rounded-xl font-bold transition-all transform hover:scale-105 ${
                                            isSelected
                                              ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                          }`}
                                        >
                                          {isSelected ? (
                                            <span className="flex items-center gap-2">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                              Selected
                                            </span>
                                          ) : (
                                            "Select"
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {/* Hover Glow Effect */}
                                    {!isSelected && (
                                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-blue-500/10 group-hover:to-blue-500/5 transition-all duration-300 pointer-events-none rounded-2xl"></div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    }

                    // Regular variant card with optional expansion
                    const hasNoChildren = !isParent || (childCount === 0 && (!children || children.length === 0));
                    const isVariantSelected = hasNoChildren && selectedDevices.has(variant.id);
                    
                    return (
                      <div
                        key={variant.id}
                        className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 relative overflow-hidden ${
                          isVariantSelected
                            ? "border-green-500 ring-4 ring-green-100"
                            : isExpanded
                            ? "border-blue-500 shadow-xl"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                        }`}
                      >
                        {/* Selection Indicator Bar */}
                        {isVariantSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-green-500 to-emerald-600"></div>
                        )}
                        
                        {/* Variant Card - Collapsed style */}
                        <div
                          className="flex items-start justify-between p-6 cursor-pointer group"
                          onClick={() => {
                            if (isParent && (childCount > 0 || (children && children.length > 0))) {
                              // Parent with children - expand to show them
                              toggleParentExpansion(variant.id);
                            } else {
                              // Parent without children or regular variant - toggle selection
                              handleVariantSelect(variant);
                            }
                          }}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                  isVariantSelected
                                    ? "bg-gradient-to-br from-green-500 to-emerald-600 scale-110"
                                    : isExpanded
                                    ? "bg-blue-500"
                                    : "bg-gray-200"
                                }`}
                              >
                                {isVariantSelected ? (
                                  <svg
                                    className="w-4 h-4 text-white animate-[scale-in_0.3s_ease-out]"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className={`w-4 h-4 text-white transition-transform duration-200 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-lg font-bold text-gray-900">
                                    {variant.name ||
                                      variant.variant_name ||
                                      "Unnamed Variant"}
                                  </h4>
                                  {/* Stock Status Badge for Parent */}
                                  {(() => {
                                    const stockLevel = variant.quantity ?? variant.stockQuantity ?? variant.stock_quantity ?? 0;
                                    const isLowStock = stockLevel > 0 && stockLevel <= 5;
                                    const isOutOfStock = stockLevel === 0;
                                    
                                    if (isOutOfStock) {
                                      return (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                          Out of Stock
                                        </span>
                                      );
                                    } else if (isLowStock) {
                                      return (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 animate-pulse">
                                          Low Stock
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                          In Stock
                                        </span>
                                      );
                                    }
                                  })()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                                      (() => {
                                        const stockLevel = variant.quantity ?? variant.stockQuantity ?? variant.stock_quantity ?? 0;
                                        const isLowStock = stockLevel > 0 && stockLevel <= 5;
                                        const isOutOfStock = stockLevel === 0;
                                        return isOutOfStock 
                                          ? "bg-red-500 text-white" 
                                          : isLowStock 
                                            ? "bg-orange-500 text-white" 
                                            : "bg-emerald-500 text-white";
                                      })()
                                    }`}>
                                      {variant.quantity ?? variant.stockQuantity ?? variant.stock_quantity ?? 0}
                                    </span>
                                    <span className="text-gray-500">units available</span>
                                  </p>
                                  {isParent && childCount > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                      {childCount} devices
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            {hasNoChildren && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVariantSelect(variant);
                                }}
                                className={`px-6 py-2.5 rounded-xl font-bold transition-all transform hover:scale-105 ${
                                  isVariantSelected
                                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                }`}
                              >
                                {isVariantSelected ? (
                                  <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Selected
                                  </span>
                                ) : (
                                  "Select"
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Hover Glow Effect */}
                        {!isVariantSelected && !isExpanded && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-blue-500/10 group-hover:to-blue-500/5 transition-all duration-300 pointer-events-none rounded-2xl"></div>
                        )}

                      {/* Child Variants (IMEI devices) - Show if expanded */}
                      {isParent && isExpanded && (
                          <div className="bg-white p-6 border-t-2 border-gray-200 rounded-b-2xl">
                            {isLoadingChild ? (
                              <div className="text-center py-12">
                                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-700 font-medium text-lg">Loading devices...</p>
                              </div>
                            ) : children.length === 0 ? (
                              <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50">
                                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                  <AlertCircle className="w-10 h-10 text-orange-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                  No Devices Available
                                </h3>
                                <p className="text-gray-600 text-base mb-4 px-4">
                                  {variantChildCounts[variant.id] > 0 
                                    ? "All devices are currently out of stock"
                                    : "This variant has no individual devices tracked"}
                                </p>
                                {variantChildCounts[variant.id] === 0 && (
                                  <button
                                    onClick={() => handleVariantSelect(variant)}
                                    className="mt-4 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
                                  >
                                    Add Variant
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {/* Child variant selection - Click to select IMEI device */}
                                {children.map((child: any) => {
                                  const isSelected = selectedDevices.has(child.id);
                                  const stockLevel = child.quantity || 0;
                                  const isLowStock = stockLevel > 0 && stockLevel <= 5;
                                  const isOutOfStock = stockLevel === 0;
                                  
                                  return (
                                    <div
                                      key={child.id}
                                      className={`group relative border-2 rounded-2xl bg-white transition-all duration-300 cursor-pointer overflow-hidden ${
                                        isSelected 
                                          ? "border-green-500 ring-4 ring-green-100" 
                                          : "border-gray-200 hover:border-blue-400 hover:-translate-y-0.5"
                                      }`}
                                      onClick={() => handleVariantSelect(child)}
                                    >
                                      {/* Selection Indicator Bar */}
                                      {isSelected && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-green-500 to-emerald-600"></div>
                                      )}
                                      
                                      <div className="flex items-center justify-between p-5">
                                        <div className="flex items-center gap-4 flex-1">
                                          {/* Icon with Animation */}
                                          <div
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                              isSelected 
                                                ? "bg-gradient-to-br from-green-500 to-emerald-600 scale-110" 
                                                : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-50 group-hover:to-indigo-50"
                                            }`}
                                          >
                                            {isSelected ? (
                                              <svg
                                                className="w-6 h-6 text-white animate-[scale-in_0.3s_ease-out]"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={3}
                                                  d="M5 13l4 4L19 7"
                                                />
                                              </svg>
                                            ) : (
                                              <Package className={`w-6 h-6 transition-colors ${
                                                isSelected ? "text-white" : "text-gray-400 group-hover:text-blue-500"
                                              }`} />
                                            )}
                                          </div>
                                          
                                          {/* Content */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                              <h4 className="text-xl font-bold text-gray-900 truncate">
                                                {child.imei || child.serialNumber}
                                              </h4>
                                              {child.condition && child.condition.toLowerCase() !== "new" && (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                  {child.condition}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Action Button */}
                                        <div className="flex flex-col items-end gap-2 ml-4">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleVariantSelect(child);
                                            }}
                                            className={`px-6 py-2.5 rounded-xl font-bold transition-all transform hover:scale-105 ${
                                              isSelected
                                                ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                            }`}
                                          >
                                            {isSelected ? (
                                              <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Selected
                                              </span>
                                            ) : (
                                              "Select"
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Hover Glow Effect */}
                                      {!isSelected && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-blue-500/10 group-hover:to-blue-500/5 transition-all duration-300 pointer-events-none rounded-2xl"></div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Footer with Action Buttons */}
          <div className="p-6 pt-4 border-t border-gray-200 bg-white flex gap-4 flex-shrink-0">
            <button
              onClick={() => {
                setSelectedDevices(new Set());
                setExpandedVariants(new Set());
              }}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-semibold"
            >
              Clear All
            </button>
            <button
              onClick={() => {
                if (selectedDevices.size > 0) {
                  // Process all selected variants
                  let processedCount = 0;
                  
                  // Get all child variants from all parents
                  const allChildVariants: any[] = [];
                  Object.values(childVariants).forEach(children => {
                    allChildVariants.push(...children);
                  });
                  
                  // Process each selected device
                  selectedDevices.forEach(deviceId => {
                    // Find the variant in child variants first
                    let selectedVariant = allChildVariants.find(child => child.id === deviceId);
                    
                    // If not found in children, check parent variants
                    if (!selectedVariant) {
                      selectedVariant = availableVariants.find(v => v.id === deviceId);
                    }
                    
                    if (selectedVariant) {
                      const quantity = selectedQuantities[selectedVariant.id] || 1;
                      onSelectVariant(productToUse, selectedVariant, quantity);
                      processedCount++;
                    }
                  });
                  
                  if (processedCount > 0) {
                    toast.success(`Added ${processedCount} variant(s) to cart`);
                  }
                  
                  onClose();
                }
              }}
              disabled={selectedDevices.size === 0}
              className="flex-1 px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
              <span>Confirm Selection ({selectedDevices.size})</span>
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default VariantSelectionModal;
