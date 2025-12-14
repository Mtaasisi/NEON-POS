import { supabase } from './supabaseClient';
import { matchesPhoneSearch } from './phoneUtils';
import Fuse from 'fuse.js';
import { APP_ROUTES, getRoutesForRole, type RouteDefinition } from './routeRegistry';

export interface SearchResult {
  id: string;
  type: 'device' | 'customer' | 'product' | 'sale' | 'payment' | 'loyalty' | 'inventory' | 'report' | 'page' | 'action';
  title: string;
  subtitle: string;
  description: string;
  url: string;
  metadata?: Record<string, any>;
  priority: number;
  score?: number; // Fuzzy search score
  matches?: string[]; // Matched fields for highlighting
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchFilters {
  status?: string;
  model?: string;
  customer?: string;
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  category?: string;
  price?: string;
  date?: string;
  amount?: string;
  payment?: string;
  [key: string]: string | undefined;
}

// Cache for search results
interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
}

export class SearchService {
  private userRole: string;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheExpiry: number = 30000; // 30 seconds

  constructor(userRole: string) {
    this.userRole = userRole;
  }

  // Get cached results if available
  private getCached(query: string): SearchResult[] | null {
    const entry = this.cache.get(query);
    if (entry && Date.now() - entry.timestamp < this.cacheExpiry) {
      return entry.results;
    }
    return null;
  }

  // Set cache
  private setCache(query: string, results: SearchResult[]): void {
    this.cache.set(query, { results, timestamp: Date.now() });
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Parse search query for filters and terms
  parseQuery(query: string): { filters: SearchFilters; terms: string[] } {
    const filters: SearchFilters = {};
    const terms: string[] = [];
    
    // First, extract quoted strings for exact phrase matching
    const quotedStrings: string[] = [];
    const quotedRegex = /"([^"]+)"/g;
    let quotedMatch;
    while ((quotedMatch = quotedRegex.exec(query)) !== null) {
      quotedStrings.push(quotedMatch[1]);
    }
    
    // Remove quoted strings from query for filter parsing
    let queryWithoutQuotes = query.replace(quotedRegex, '');
    
    // Extract filters (key:value format)
    // Updated regex to handle values with colons and special characters
    const filterRegex = /(\w+):([^\s"']+)/g;
    let match;
    while ((match = filterRegex.exec(queryWithoutQuotes)) !== null) {
      const key = match[1];
      let value = match[2];
      
      // Handle date format like "2024-01" - convert to date range
      if (key === 'date' && /^\d{4}-\d{2}$/.test(value)) {
        // Format: YYYY-MM, convert to month range
        const [year, month] = value.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month}-${lastDay}`;
        filters[key] = `${startDate}-${endDate}`;
      } else {
        filters[key] = value;
      }
    }
    
    // Extract remaining terms (excluding filters and quoted strings)
    const remainingQuery = queryWithoutQuotes.replace(filterRegex, '').trim();
    if (remainingQuery) {
      // Split by spaces but preserve quoted strings
      const termParts = remainingQuery.split(/\s+/).filter(part => part.length > 0);
      terms.push(...termParts);
    }
    
    // Add quoted strings as exact match terms
    terms.push(...quotedStrings);
    
    return { filters, terms };
  }

  // Search devices with fuzzy search
  async searchDevices(filters: SearchFilters, terms: string[]): Promise<SearchResult[]> {
    try {
      // Query database for devices
      let query = supabase
        .from('devices')
        .select(`
          id,
          model,
          serial_number,
          status,
          problem_description,
          estimated_completion_date,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });
        // Removed limit - fetching all devices

      // Apply status filter if provided
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data: devices, error } = await query;

      if (error) {
        console.error('Error fetching devices:', error);
        return [];
      }

      if (!devices || devices.length === 0) {
        return [];
      }

      // Map database results to searchable format
      const deviceList = devices.map(device => ({
        id: device.id,
        model: device.model || '',
        serialNumber: device.serial_number || '',
        status: device.status || '',
        issue: device.problem_description || '',
        expectedReturnDate: device.estimated_completion_date || '',
        createdAt: device.created_at,
        updatedAt: device.updated_at,
      }));

      // Apply model filter
      let filteredDevices = deviceList;
      if (filters.model) {
        filteredDevices = filteredDevices.filter(device =>
          device.model.toLowerCase().includes(filters.model!.toLowerCase())
        );
      }

      // If search terms provided, use fuzzy search or exact match
      if (terms.length > 0) {
        // Check if we have exact phrase matches (from quoted strings)
        const exactPhrases = terms.filter(term => term.includes(' ') || term.length > 3);
        const regularTerms = terms.filter(term => !term.includes(' ') && term.length <= 3);
        
        // First, try exact matches for quoted phrases
        let exactMatches: typeof filteredDevices = [];
        if (exactPhrases.length > 0) {
          exactPhrases.forEach(phrase => {
            const matches = filteredDevices.filter(device =>
              device.model.toLowerCase().includes(phrase.toLowerCase()) ||
              device.serialNumber.toLowerCase().includes(phrase.toLowerCase()) ||
              device.issue.toLowerCase().includes(phrase.toLowerCase())
            );
            exactMatches.push(...matches);
          });
          // Remove duplicates
          exactMatches = exactMatches.filter((device, index, self) =>
            index === self.findIndex(d => d.id === device.id)
          );
        }
        
        // Then use fuzzy search for remaining terms
        const searchQuery = regularTerms.length > 0 ? regularTerms.join(' ') : terms.join(' ');
        const fuse = new Fuse(filteredDevices, {
          keys: ['model', 'serialNumber', 'issue', 'status'],
          threshold: 0.3, // Lower = more strict
          includeScore: true,
          includeMatches: true,
        });

        const fuseResults = fuse.search(searchQuery);
        
        // Combine exact matches with fuzzy results, prioritizing exact matches
        const allResults = [...exactMatches.map(d => ({ item: d, score: 0, matches: [] })), ...fuseResults];
        const uniqueResults = allResults.filter((result, index, self) =>
          index === self.findIndex(r => r.item.id === result.item.id)
        );

        return uniqueResults.map(result => {
          const device = result.item;
          const matches = result.matches?.map(m => m.key || '') || [];

          return {
            id: device.id,
            type: 'device' as const,
            title: device.model,
            subtitle: device.serialNumber || 'No serial number',
            description: `Status: ${device.status}${device.issue ? ' | Issue: ' + device.issue : ''}`,
            url: `/devices/${device.id}`,
            metadata: {
              status: device.status,
              serialNumber: device.serialNumber,
              issue: device.issue,
              expectedReturnDate: device.expectedReturnDate,
            },
            priority: device.status === 'pending' || device.status === 'in-progress' ? 1 : 2,
            score: result.score,
            matches,
            createdAt: device.createdAt,
            updatedAt: device.updatedAt,
          };
        });
      }

      // No search terms - return all filtered devices
      return filteredDevices.map(device => ({
        id: device.id,
        type: 'device' as const,
        title: device.model,
        subtitle: device.serialNumber || 'No serial number',
        description: `Status: ${device.status}${device.issue ? ' | Issue: ' + device.issue : ''}`,
        url: `/devices/${device.id}`,
        metadata: {
          status: device.status,
          serialNumber: device.serialNumber,
          issue: device.issue,
          expectedReturnDate: device.expectedReturnDate,
        },
        priority: device.status === 'pending' || device.status === 'in-progress' ? 1 : 2,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      }));
    } catch (error) {
      console.error('Error in searchDevices:', error);
      return [];
    }
  }

  // Search customers with fuzzy search
  async searchCustomers(filters: SearchFilters, terms: string[]): Promise<SearchResult[]> {
    try {
      // Query database for customers
      let query = supabase
        .from('customers')
        .select(`
          id,
          name,
          phone,
          email,
          city,
          notes,
          gender,
          whatsapp,
          birthday,
          national_id,
          referral_source,
          location_description,
          loyalty_level,
          points,
          total_spent,
          total_purchases,
          last_visit,
          joined_date,
          is_active,
          color_tag,
          customer_tag,
          total_calls,
          call_loyalty_level,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });
        // Removed limit - fetching all customers

      const { data: customers, error } = await query;

      if (error) {
        console.error('Error fetching customers:', error);
        return [];
      }

      if (!customers || customers.length === 0) {
        return [];
      }

      // Map database results to searchable format
      const customerList = customers.map(customer => ({
        id: customer.id,
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        location: customer.city || '',
        notes: customer.notes || '',
        gender: customer.gender || '',
        whatsapp: customer.whatsapp || '',
        birthday: customer.birthday || '',
        nationalId: customer.national_id || '',
        referralSource: customer.referral_source || '',
        locationDescription: customer.location_description || '',
        loyaltyLevel: customer.loyalty_level || '',
        points: customer.points || 0,
        totalSpent: customer.total_spent || 0,
        totalPurchases: customer.total_purchases || 0,
        lastVisit: customer.last_visit || '',
        joinedDate: customer.joined_date || customer.created_at || '',
        isActive: customer.is_active !== false,
        colorTag: customer.color_tag || '',
        customerTag: customer.customer_tag || '',
        totalCalls: customer.total_calls || 0,
        callLoyaltyLevel: customer.call_loyalty_level || '',
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
      }));

      // Apply filters
      let filteredCustomers = customerList;
      if (filters.name || filters.customer) {
        const customerFilter = filters.customer || filters.name;
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.name.toLowerCase().includes(customerFilter!.toLowerCase())
        );
      }
      if (filters.phone) {
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.phone ? matchesPhoneSearch(customer.phone, filters.phone!) : false
        );
      }
      if (filters.email) {
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.email.toLowerCase().includes(filters.email!.toLowerCase())
        );
      }
      if (filters.location) {
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.location.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }

      // If search terms provided, use fuzzy search
      if (terms.length > 0) {
        const fuse = new Fuse(filteredCustomers, {
          keys: ['name', 'phone', 'email', 'location', 'notes'],
          threshold: 0.3,
          includeScore: true,
          includeMatches: true,
        });

        const searchQuery = terms.join(' ');
        const fuseResults = fuse.search(searchQuery);

        return fuseResults.map(result => {
          const customer = result.item;
          const matches = result.matches?.map(m => m.key || '') || [];

          return {
            id: customer.id,
            type: 'customer' as const,
            title: customer.name,
            subtitle: customer.phone,
            description: `${customer.email || 'No email'} | ${customer.location || 'No location'}`,
            url: `/customers/${customer.id}`,
            metadata: {
              email: customer.email,
              location: customer.location,
              phone: customer.phone,
              whatsapp: customer.whatsapp,
              gender: customer.gender,
              city: customer.city,
              locationDescription: customer.locationDescription,
              nationalId: customer.nationalId,
              referralSource: customer.referralSource,
              loyaltyLevel: customer.loyaltyLevel,
              points: customer.points,
              totalSpent: customer.totalSpent,
              lastVisit: customer.lastVisit,
              isActive: customer.isActive,
              totalPurchases: customer.totalPurchases,
              colorTag: customer.colorTag,
              customerTag: customer.customerTag,
              birthday: customer.birthday,
              joinedDate: customer.joinedDate,
              totalCalls: customer.totalCalls,
              callLoyaltyLevel: customer.callLoyaltyLevel,
              notes: customer.notes,
            },
            priority: 0,
            score: result.score,
            matches,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
          };
        });
      }

      // No search terms - return all filtered customers
      return filteredCustomers.map(customer => ({
        id: customer.id,
        type: 'customer' as const,
        title: customer.name,
        subtitle: customer.phone,
        description: `${customer.email || 'No email'} | ${customer.location || 'No location'}`,
        url: `/customers/${customer.id}`,
        metadata: {
          email: customer.email,
          location: customer.location,
          phone: customer.phone,
          whatsapp: customer.whatsapp,
          gender: customer.gender,
          city: customer.city,
          loyaltyLevel: customer.loyalty_level,
          points: customer.points,
          totalSpent: customer.total_spent,
          lastVisit: customer.last_visit,
          isActive: customer.is_active,
          totalPurchases: customer.total_purchases,
          colorTag: customer.color_tag,
          birthday: customer.birthday,
          joinedDate: customer.joined_date,
          totalCalls: customer.total_calls,
          callLoyaltyLevel: customer.call_loyalty_level,
        },
        priority: 0,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      }));
    } catch (error) {
      console.error('Error in searchCustomers:', error);
      return [];
    }
  }

  // Search products (LATS module) with fuzzy search
  async searchProducts(filters: SearchFilters, terms: string[]): Promise<SearchResult[]> {
    if (this.userRole !== 'admin' && this.userRole !== 'customer-care') {
      return [];
    }

    try {
      // Query database for products with category and variant data (including children variants)
      let query = supabase
        .from('lats_products')
        .select(`
          id,
          name,
          description,
          sku,
          barcode,
          cost_price,
          selling_price,
          stock_quantity,
          min_stock_level,
          category_id,
          branch_id,
          is_active,
          created_at,
          updated_at,
          lats_categories(name),
          lats_product_variants(
            id,
            sku,
            name,
            variant_name,
            cost_price,
            selling_price,
            unit_price,
            quantity,
            parent_variant_id,
            is_parent,
            variant_type
          )
        `)
        .order('created_at', { ascending: false });
        // Removed limit - fetching all products

      // Apply category filter if provided
      if (filters.category) {
        query = query.eq('category_id', filters.category);
      }

      const { data: products, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }

      if (!products || products.length === 0) {
        return [];
      }

      // Debug: Log product count
      if (import.meta.env.DEV) {
        console.log(`[SearchProducts] Fetched ${products.length} products from database`);
      }

      // Fetch all variants separately to ensure we get all of them (nested queries have limits)
      const productIds = products.map(p => p.id);
      const { data: allVariants, error: variantsError } = await supabase
        .from('lats_product_variants')
        .select(`
          id,
          product_id,
          sku,
          name,
          variant_name,
          cost_price,
          selling_price,
          unit_price,
          quantity,
          parent_variant_id,
          is_parent,
          variant_type,
          is_active
        `)
        .in('product_id', productIds)
        .eq('is_active', true); // Only fetch active variants
        // Removed limit - fetching all variants

      if (variantsError) {
        console.error('Error fetching variants:', variantsError);
        // Continue with variants from nested query if available
      }

      // Group variants by product_id for efficient lookup
      const variantsByProductId = new Map<string, any[]>();
      if (allVariants) {
        allVariants.forEach(variant => {
          const productId = variant.product_id;
          if (!variantsByProductId.has(productId)) {
            variantsByProductId.set(productId, []);
          }
          variantsByProductId.get(productId)!.push(variant);
        });
      }

      // Debug: Log variants count
      if (import.meta.env.DEV) {
        console.log(`[SearchProducts] Fetched ${allVariants?.length || 0} variants from database`);
      }

      // Debug: Log first product structure to verify data
      if (products.length > 0 && import.meta.env.DEV) {
        console.log('Sample product data:', {
          id: products[0].id,
          name: products[0].name,
          selling_price: products[0].selling_price,
          cost_price: products[0].cost_price,
          variants: products[0].lats_product_variants,
        });
      }

      // Map database results to searchable format
      const productList = products.map(product => {
        // Get price from product or first variant
        // Use variants from separate query (which has all variants) or fallback to nested query variants
        let allVariants = variantsByProductId.get(product.id) || [];
        
        // Fallback to nested query variants if separate query didn't return any (shouldn't happen, but safety)
        if (allVariants.length === 0 && product.lats_product_variants) {
          allVariants = Array.isArray(product.lats_product_variants) 
            ? product.lats_product_variants 
            : [product.lats_product_variants];
        }
        
        // Organize variants: separate parent variants and their children
        const parentVariants = allVariants.filter(v => !v.parent_variant_id);
        const childVariants = allVariants.filter(v => v.parent_variant_id);
        
        // Group children by parent variant ID
        const childrenByParent = new Map<string, typeof childVariants>();
        childVariants.forEach(child => {
          const parentId = child.parent_variant_id;
          if (!childrenByParent.has(parentId)) {
            childrenByParent.set(parentId, []);
          }
          childrenByParent.get(parentId)!.push(child);
        });
        
        // Create organized variants structure with children nested under parents
        const organizedVariants = parentVariants.map(parent => ({
          ...parent,
          children: childrenByParent.get(parent.id) || []
        }));
        
        // Use all variants (including children) for calculations
        const variants = allVariants;
        
        // Convert NUMERIC to number and handle null/undefined
        // Check product-level prices in same order as inventory page
        // Accept 0 as a valid price (don't use > 0 check)
        const extractPrice = (value: any): number | null => {
          if (value == null || value === '') return null;
          const p = Number(value);
          return !isNaN(p) ? p : null;
        };
        
        const productSellingPrice = extractPrice(product.selling_price) 
          ?? extractPrice(product.sellingPrice)
          ?? extractPrice(product.price)
          ?? extractPrice(product.unit_price);
        const productCostPrice = extractPrice(product.cost_price) 
          ?? extractPrice(product.costPrice);
        
        // Find the first variant with a price (check all variants, including organized structure)
        let variantSellingPrice: number | null = null;
        let variantCostPrice: number | null = null;
        
        // Helper function to extract price from variant (check multiple field names)
        // Match the exact logic from inventory page: sellingPrice > price > unit_price > selling_price
        // Accept 0 as a valid price (don't use > 0 check)
        const getVariantPrice = (v: any): number | null => {
          // Check in the same order as inventory page
          return extractPrice(v.sellingPrice)
            ?? extractPrice(v.price)
            ?? extractPrice(v.unit_price)
            ?? extractPrice(v.selling_price);
        };
        
        const getVariantCostPrice = (v: any): number | null => {
          return extractPrice(v.cost_price)
            ?? extractPrice(v.costPrice);
        };
        
        // Check all variants first (raw variants from database)
        for (const variant of variants) {
          const price = getVariantPrice(variant);
          const cost = getVariantCostPrice(variant);
          
          if (price != null && variantSellingPrice === null) {
            variantSellingPrice = price;
          }
          if (cost != null && variantCostPrice === null) {
            variantCostPrice = cost;
          }
        }
        
        // Also check organized variants structure (parent variants with children)
        // This ensures we catch prices in the organized structure
        for (const parentVariant of organizedVariants) {
          const price = getVariantPrice(parentVariant);
          const cost = getVariantCostPrice(parentVariant);
          
          if (price != null && variantSellingPrice === null) {
            variantSellingPrice = price;
          }
          if (cost != null && variantCostPrice === null) {
            variantCostPrice = cost;
          }
          
          // Check children variants
          if (parentVariant.children && parentVariant.children.length > 0) {
            for (const child of parentVariant.children) {
              const childPrice = getVariantPrice(child);
              const childCost = getVariantCostPrice(child);
              
              if (childPrice != null && variantSellingPrice === null) {
                variantSellingPrice = childPrice;
              }
              if (childCost != null && variantCostPrice === null) {
                variantCostPrice = childCost;
              }
            }
          }
        }
        
        // Use product price first, but if it's 0 and variant has a non-zero price, use variant price
        // This handles cases where product price is 0 but variants have actual prices
        let sellingPrice: number | null = null;
        if (productSellingPrice != null && productSellingPrice > 0) {
          sellingPrice = productSellingPrice;
        } else if (variantSellingPrice != null && variantSellingPrice > 0) {
          sellingPrice = variantSellingPrice;
        } else if (productSellingPrice != null) {
          // Product has explicit 0 price
          sellingPrice = productSellingPrice;
        } else if (variantSellingPrice != null) {
          // Variant has explicit 0 price
          sellingPrice = variantSellingPrice;
        }
        
        let costPrice: number | null = null;
        if (productCostPrice != null && productCostPrice > 0) {
          costPrice = productCostPrice;
        } else if (variantCostPrice != null && variantCostPrice > 0) {
          costPrice = variantCostPrice;
        } else if (productCostPrice != null) {
          costPrice = productCostPrice;
        } else if (variantCostPrice != null) {
          costPrice = variantCostPrice;
        }
        
        // Calculate total stock from product and variants (including children)
        const variantStock = variants.reduce((sum, v) => {
          // Try quantity first, then stock_quantity, then 0
          const qty = v.quantity ?? v.stock_quantity ?? 0;
          const numQty = typeof qty === 'number' ? qty : (qty != null ? Number(qty) : 0);
          return sum + (isNaN(numQty) ? 0 : numQty);
        }, 0);
        const productStock = product.stock_quantity != null ? Number(product.stock_quantity) : 0;
        const totalStock = productStock || variantStock || 0;
        
        // Debug logging for products without prices
        if (sellingPrice === null) {
          if (import.meta.env.DEV) {
            console.warn(`Product ${product.id} (${product.name}) has no price`, {
              productSellingPrice: product.selling_price,
              productCostPrice: product.cost_price,
              extractedProductSellingPrice: productSellingPrice,
              extractedVariantSellingPrice: variantSellingPrice,
              variantCount: variants.length,
              variantsWithPrices: variants.filter(v => {
                return (v.sellingPrice != null && v.sellingPrice !== '') ||
                       (v.price != null && v.price !== '') ||
                       (v.unit_price != null && v.unit_price !== '') ||
                       (v.selling_price != null && v.selling_price !== '');
              }).length,
            });
          }
        }
        
        return {
          id: product.id,
          name: product.name || '',
          description: product.description || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          price: sellingPrice ?? null, // Keep null for missing prices, UI will handle it
          costPrice: costPrice ?? null,
          sellingPrice: sellingPrice ?? null,
          stockQuantity: totalStock,
          categoryId: product.category_id || '',
          categoryName: product.lats_categories?.name || '',
          branchId: product.branch_id || '',
          isActive: product.is_active ?? true,
          variants: organizedVariants, // Return organized variants with children nested
          allVariants: variants, // Keep all variants for backward compatibility
          hasPrice: sellingPrice != null, // Flag to indicate if price exists (0 is a valid price)
          createdAt: product.created_at,
          updatedAt: product.updated_at,
        };
      });

      // Debug: Log mapped products count and variant distribution
      if (import.meta.env.DEV) {
        const totalVariants = productList.reduce((sum, p) => sum + (p.allVariants?.length || 0), 0);
        const productsWithVariants = productList.filter(p => (p.allVariants?.length || 0) > 0).length;
        const maxVariants = Math.max(...productList.map(p => p.allVariants?.length || 0), 0);
        console.log(`[SearchProducts] Mapped ${productList.length} products`);
        console.log(`[SearchProducts] Variants: ${totalVariants} total, ${productsWithVariants} products have variants, max ${maxVariants} variants per product`);
      }

      // Apply filters
      let filteredProducts = productList;
      
      // Price filter
      if (filters.price) {
        const priceRange = filters.price.split('-');
        if (priceRange.length === 2) {
          const minPrice = parseFloat(priceRange[0]);
          const maxPrice = priceRange[1] ? parseFloat(priceRange[1]) : Infinity;
          filteredProducts = filteredProducts.filter(product =>
            product.price != null && product.price >= minPrice && product.price <= maxPrice
          );
        } else {
          const exactPrice = parseFloat(filters.price);
          filteredProducts = filteredProducts.filter(product => product.price != null && product.price === exactPrice);
        }
        
        // Debug: Log price filter results
        if (import.meta.env.DEV) {
          console.log(`[SearchProducts] After price filter: ${filteredProducts.length} products (from ${productList.length})`);
        }
      }
      
      // Stock level filter
      if (filters.stock) {
        filteredProducts = filteredProducts.filter(product => {
          const stock = product.stockQuantity || 0;
          switch (filters.stock) {
            case 'in-stock':
              return stock > 0;
            case 'low-stock':
              const minStock = product.minStockLevel || 10;
              return stock > 0 && stock <= minStock;
            case 'out-of-stock':
              return stock === 0;
            default:
              return true;
          }
        });
      }
      
      // Category filter (already applied in query, but also filter by category name)
      if (filters.category && !filters.category.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // If category is not a UUID, filter by category name
        filteredProducts = filteredProducts.filter(product =>
          product.categoryName?.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }

      // If search terms provided, use fuzzy search
      if (terms.length > 0) {
        const searchQuery = terms.join(' ').toLowerCase();
        
        // Debug logging in development
        if (import.meta.env.DEV) {
          console.log('Searching products with query:', searchQuery, 'Products available:', filteredProducts.length);
        }
        
        // First, try fuzzy search with a more lenient threshold
        const fuse = new Fuse(filteredProducts, {
          keys: ['name', 'description', 'sku', 'barcode', 'categoryName'],
          threshold: 0.5, // More lenient threshold (0.0 = exact match, 1.0 = match anything)
          includeScore: true,
          includeMatches: true,
          ignoreLocation: true, // Don't care about where in the string the match is
          minMatchCharLength: 2, // Minimum character length to match
        });

        const fuseResults = fuse.search(searchQuery);

        // If fuzzy search returns no results, try substring matching as fallback
        let results = fuseResults;
        if (fuseResults.length === 0) {
          // Fallback to case-insensitive substring search
          const substringMatches = filteredProducts.filter(product => {
            const searchableText = [
              product.name || '',
              product.description || '',
              product.sku || '',
              product.barcode || '',
              product.categoryName || ''
            ].join(' ').toLowerCase();
            return searchableText.includes(searchQuery);
          });
          
          if (import.meta.env.DEV) {
            console.log('Fuzzy search returned 0 results, substring matches found:', substringMatches.length);
          }
          
          // Convert to Fuse-like format for consistency
          results = substringMatches.map(product => ({
            item: product,
            score: 0.5, // Medium score for substring matches
            matches: []
          }));
        }

        // Remove duplicates by product ID
        const seenProductIds = new Set<string>();
        const uniqueResults = results.filter(result => {
          const productId = result.item.id;
          if (seenProductIds.has(productId)) {
            return false;
          }
          seenProductIds.add(productId);
          return true;
        });

        // Debug: Log search results count
        if (import.meta.env.DEV) {
          console.log(`[SearchProducts] Search returned ${uniqueResults.length} unique products (from ${results.length} results)`);
        }

        return uniqueResults.map(result => {
          const product = result.item;
          const matches = result.matches?.map(m => m.key || '') || [];

          return {
            id: product.id,
            type: 'product' as const,
            title: product.name,
            subtitle: product.sku,
            description: product.description || `Price: ${product.price != null ? `TZS ${product.price.toLocaleString()}` : 'No price'} | Stock: ${product.stockQuantity}`,
            url: `/lats/unified-inventory`,
            metadata: {
              price: product.price,
              sellingPrice: product.sellingPrice,
              costPrice: product.costPrice,
              stock: product.stockQuantity,
              category: product.categoryId,
              categoryName: product.categoryName,
              sku: product.sku,
              barcode: product.barcode,
              isActive: product.isActive,
              hasVariants: product.variants && product.variants.length > 0,
              variantCount: product.variants?.length || 0,
              variants: product.variants, // Include organized variants with children
              hasPrice: product.hasPrice, // Flag indicating if price exists
            },
            priority: product.stockQuantity < 10 ? 1 : 2,
            score: result.score,
            matches,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          };
        });
      }

      // No search terms - return all filtered products
      // Remove duplicates by product ID
      const seenProductIds = new Set<string>();
      const uniqueProducts = filteredProducts.filter(product => {
        if (seenProductIds.has(product.id)) {
          return false;
        }
        seenProductIds.add(product.id);
        return true;
      });

      // Debug: Log products returned when no search terms
      if (import.meta.env.DEV) {
        console.log(`[SearchProducts] No search terms - returning ${uniqueProducts.length} unique products (from ${filteredProducts.length} filtered)`);
      }

      return uniqueProducts.map(product => ({
        id: product.id,
        type: 'product' as const,
        title: product.name,
        subtitle: product.sku,
        description: product.description || `Price: ${product.price != null ? `TZS ${product.price.toLocaleString()}` : 'No price'} | Stock: ${product.stockQuantity}`,
        url: `/lats/unified-inventory`,
        metadata: {
          price: product.price,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          stock: product.stockQuantity,
          category: product.categoryId,
          categoryName: product.categoryName,
          sku: product.sku,
          barcode: product.barcode,
          isActive: product.isActive,
          hasVariants: product.variants && product.variants.length > 0,
          variantCount: product.variants?.length || 0,
          variants: product.variants, // Include organized variants with children
          hasPrice: product.hasPrice, // Flag indicating if price exists
        },
        priority: product.stockQuantity < 10 ? 1 : 2,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }));
    } catch (error) {
      console.error('Error in searchProducts:', error);
      return [];
    }
  }

  // Search installment plans by plan number or other criteria
  async searchInstallmentPlans(filters: SearchFilters, terms: string[]): Promise<SearchResult[]> {
    try {
      let query = supabase
        .from('customer_installment_plans')
        .select(`
          id,
          plan_number,
          customer_id,
          sale_id,
          total_amount,
          balance_due,
          status,
          created_at,
          updated_at,
          customer:customers!customer_id(id, name, phone, email)
        `)
        .order('created_at', { ascending: false });
        // Removed limit - fetching all installment plans

      const { data: plans, error } = await query;

      if (error) {
        console.error('Error fetching installment plans:', error);
        return [];
      }

      if (!plans || plans.length === 0) {
        return [];
      }

      // Map database results to searchable format
      const planList = plans.map(plan => ({
        id: plan.id,
        planNumber: plan.plan_number || '',
        customerName: plan.customer?.name || '',
        customerPhone: plan.customer?.phone || '',
        totalAmount: Number(plan.total_amount || 0),
        balanceDue: Number(plan.balance_due || 0),
        status: plan.status || '',
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
      }));

      // If search terms provided, filter by plan number or customer info
      if (terms.length > 0) {
        const searchQuery = terms.join(' ').toLowerCase();
        const filteredPlans = planList.filter(plan =>
          plan.planNumber.toLowerCase().includes(searchQuery) ||
          plan.customerName.toLowerCase().includes(searchQuery) ||
          plan.customerPhone.includes(searchQuery)
        );

        return filteredPlans.map(plan => ({
          id: plan.id,
          type: 'payment' as const,
          title: `Installment Plan ${plan.planNumber}`,
          subtitle: plan.customerName || 'Unknown Customer',
          description: `Total: TZS ${plan.totalAmount.toLocaleString()} | Balance: TZS ${plan.balanceDue.toLocaleString()} | Status: ${plan.status}`,
          url: `/installments`,
          metadata: {
            planNumber: plan.planNumber,
            customerName: plan.customerName,
            customerPhone: plan.customerPhone,
            totalAmount: plan.totalAmount,
            balanceDue: plan.balanceDue,
            status: plan.status,
          },
          priority: plan.status === 'active' ? 1 : 2,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        }));
      }

      // No search terms - return all plans
      return planList.map(plan => ({
        id: plan.id,
        type: 'payment' as const,
        title: `Installment Plan ${plan.planNumber}`,
        subtitle: plan.customerName || 'Unknown Customer',
        description: `Total: TZS ${plan.totalAmount.toLocaleString()} | Balance: TZS ${plan.balanceDue.toLocaleString()} | Status: ${plan.status}`,
        url: `/installments`,
        metadata: {
          planNumber: plan.planNumber,
          customerName: plan.customerName,
          customerPhone: plan.customerPhone,
          totalAmount: plan.totalAmount,
          balanceDue: plan.balanceDue,
          status: plan.status,
        },
        priority: plan.status === 'active' ? 1 : 2,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      }));
    } catch (error) {
      console.error('Error in searchInstallmentPlans:', error);
      return [];
    }
  }

  // Search by installment plan number (INS-XXX pattern)
  async searchByInstallmentPlanNumber(planNumber: string): Promise<SearchResult[]> {
    try {
      const { data: plan, error } = await supabase
        .from('customer_installment_plans')
        .select(`
          id,
          plan_number,
          customer_id,
          sale_id,
          total_amount,
          balance_due,
          status,
          created_at,
          updated_at,
          customer:customers!customer_id(id, name, phone, email)
        `)
        .eq('plan_number', planNumber.toUpperCase())
        .single();

      if (error || !plan) {
        return [];
      }

      return [{
        id: plan.id,
        type: 'payment' as const,
        title: `Installment Plan ${plan.plan_number}`,
        subtitle: plan.customer?.name || 'Unknown Customer',
        description: `Total: TZS ${Number(plan.total_amount || 0).toLocaleString()} | Balance: TZS ${Number(plan.balance_due || 0).toLocaleString()} | Status: ${plan.status}`,
        url: `/installments`,
        metadata: {
          planNumber: plan.plan_number,
          customerName: plan.customer?.name,
          customerPhone: plan.customer?.phone,
          totalAmount: Number(plan.total_amount || 0),
          balanceDue: Number(plan.balance_due || 0),
          status: plan.status,
        },
        priority: 0, // Highest priority for exact plan number match
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
      }];
    } catch (error) {
      console.error('Error in searchByInstallmentPlanNumber:', error);
      return [];
    }
  }

  // Search by numeric ID across all entities
  async searchByNumericID(numericID: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const idNumber = parseInt(numericID, 10);

    if (isNaN(idNumber)) {
      return [];
    }

    try {
      // Search sales by sale_number (if it's numeric)
      const { data: sales, error: salesError } = await supabase
        .from('lats_sales')
        .select('id, sale_number, customer_name, customer_phone, total_amount, created_at, updated_at')
        .or(`sale_number.eq.${numericID},sale_number.ilike.%${numericID}%`);

      if (!salesError && sales && sales.length > 0) {
        sales.forEach(sale => {
          results.push({
            id: sale.id,
            type: 'sale' as const,
            title: `Sale #${sale.sale_number || sale.id}`,
            subtitle: sale.customer_name || 'Walk-in Customer',
            description: `Amount: TZS ${(sale.total_amount || 0).toLocaleString()} | Date: ${new Date(sale.created_at).toLocaleDateString()}`,
            url: `/lats/sales-reports`,
            metadata: {
              amount: sale.total_amount,
              date: sale.created_at,
              customer: sale.customer_name,
            },
            priority: 0,
            createdAt: sale.created_at,
            updatedAt: sale.updated_at,
          });
        });
      }

      // Search installment plans by plan number (if it contains the numeric ID)
      const { data: plans, error: plansError } = await supabase
        .from('customer_installment_plans')
        .select(`
          id,
          plan_number,
          customer_id,
          total_amount,
          balance_due,
          status,
          created_at,
          updated_at,
          customer:customers!customer_id(id, name, phone, email)
        `)
        .ilike('plan_number', `%${numericID}%`);

      if (!plansError && plans && plans.length > 0) {
        plans.forEach(plan => {
          results.push({
            id: plan.id,
            type: 'payment' as const,
            title: `Installment Plan ${plan.plan_number}`,
            subtitle: plan.customer?.name || 'Unknown Customer',
            description: `Total: TZS ${Number(plan.total_amount || 0).toLocaleString()} | Balance: TZS ${Number(plan.balance_due || 0).toLocaleString()} | Status: ${plan.status}`,
            url: `/installments`,
            metadata: {
              planNumber: plan.plan_number,
              customerName: plan.customer?.name,
              customerPhone: plan.customer?.phone,
              totalAmount: Number(plan.total_amount || 0),
              balanceDue: Number(plan.balance_due || 0),
              status: plan.status,
            },
            priority: 0,
            createdAt: plan.created_at,
            updatedAt: plan.updated_at,
          });
        });
      }

      // Search devices by serial number (if it contains the numeric ID)
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('id, model, serial_number, status, problem_description, created_at, updated_at')
        .or(`serial_number.ilike.%${numericID}%`);

      if (!devicesError && devices && devices.length > 0) {
        devices.forEach(device => {
          results.push({
            id: device.id,
            type: 'device' as const,
            title: device.model || 'Device',
            subtitle: device.serial_number || 'No serial number',
            description: `Status: ${device.status || 'Unknown'}${device.problem_description ? ' | Issue: ' + device.problem_description : ''}`,
            url: `/devices/${device.id}`,
            metadata: {
              status: device.status,
              serialNumber: device.serial_number,
              issue: device.problem_description,
            },
            priority: 0,
            createdAt: device.created_at,
            updatedAt: device.updated_at,
          });
        });
      }

      // Search products by SKU or barcode (if it contains the numeric ID)
      if (this.userRole === 'admin' || this.userRole === 'customer-care') {
        const { data: products, error: productsError } = await supabase
          .from('lats_products')
          .select('id, name, sku, barcode, selling_price, stock_quantity, created_at, updated_at')
          .or(`sku.ilike.%${numericID}%,barcode.ilike.%${numericID}%`);

        if (!productsError && products && products.length > 0) {
          products.forEach(product => {
            results.push({
              id: product.id,
              type: 'product' as const,
              title: product.name || 'Product',
              subtitle: product.sku || 'No SKU',
              description: `Price: TZS ${(product.selling_price || 0).toLocaleString()} | Stock: ${product.stock_quantity || 0}`,
              url: `/lats/unified-inventory`,
              metadata: {
                price: product.selling_price,
                stock: product.stock_quantity,
                sku: product.sku,
                barcode: product.barcode,
              },
              priority: 0,
              createdAt: product.created_at,
              updatedAt: product.updated_at,
            });
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in searchByNumericID:', error);
      return [];
    }
  }

  // Search sales (LATS module - admin only) with fuzzy search
  async searchSales(filters: SearchFilters, terms: string[]): Promise<SearchResult[]> {
    if (this.userRole !== 'admin') {
      return [];
    }

    try {
      // Fetch real sales data from database
      const { data: salesData, error: salesError } = await supabase
        .from('lats_sales')
        .select(`
          id,
          sale_number,
          customer_name,
          customer_phone,
          total_amount,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });
        // Removed limit - fetching all sales

      if (salesError) {
        console.error('Error fetching sales for search:', salesError);
        return [];
      }

      const salesList = (salesData || []).map(sale => ({
        id: sale.id,
        saleNumber: sale.sale_number || '',
        totalAmount: sale.total_amount || 0,
        customerName: sale.customer_name || 'Walk-in Customer',
        customerPhone: sale.customer_phone || '',
        createdAt: sale.created_at,
        updatedAt: sale.updated_at
      }));

      // Apply filters
      let filteredSales = salesList;
      if (filters.date) {
        const dateFilter = filters.date;
        if (dateFilter.includes('-')) {
          const [startDate, endDate] = dateFilter.split('-');
          filteredSales = filteredSales.filter(sale => {
            const saleDate = new Date(sale.createdAt);
            return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
          });
        } else {
          filteredSales = filteredSales.filter(sale => {
            const saleDate = new Date(sale.createdAt);
            const filterYear = parseInt(dateFilter);
            return saleDate.getFullYear() === filterYear;
          });
        }
      }
      if (filters.amount) {
        const amountRange = filters.amount.split('-');
        if (amountRange.length === 2) {
          const minAmount = parseFloat(amountRange[0]);
          const maxAmount = amountRange[1] ? parseFloat(amountRange[1]) : Infinity;
          filteredSales = filteredSales.filter(sale =>
            sale.totalAmount >= minAmount && sale.totalAmount <= maxAmount
          );
        } else {
          const exactAmount = parseFloat(filters.amount);
          filteredSales = filteredSales.filter(sale => sale.totalAmount === exactAmount);
        }
      }
      if (filters.customer) {
        filteredSales = filteredSales.filter(sale =>
          sale.customerName.toLowerCase().includes(filters.customer!.toLowerCase())
        );
      }
      // Payment method filter - need to fetch payment method from sales_items or payments table
      // For now, we'll skip this as it requires additional query
      // TODO: Add payment method to sales query if needed

      // If search terms provided, use fuzzy search
      if (terms.length > 0) {
        const fuse = new Fuse(filteredSales, {
          keys: ['saleNumber', 'customerName', 'customerPhone'],
          threshold: 0.3,
          includeScore: true,
          includeMatches: true,
        });

        const searchQuery = terms.join(' ');
        const fuseResults = fuse.search(searchQuery);

        return fuseResults.map(result => {
          const sale = result.item;
          const matches = result.matches?.map(m => m.key || '') || [];

          return {
            id: sale.id,
            type: 'sale' as const,
            title: `Sale #${sale.id}`,
            subtitle: sale.customerName,
            description: `Amount: TZS ${sale.totalAmount.toLocaleString()} | Date: ${new Date(sale.createdAt).toLocaleDateString()}`,
            url: `/lats/sales-reports`,
            metadata: {
              amount: sale.totalAmount,
              date: sale.createdAt,
              customer: sale.customerName,
            },
            priority: 2,
            score: result.score,
            matches,
            createdAt: sale.createdAt,
            updatedAt: sale.updatedAt,
          };
        });
      }

      // No search terms - return all filtered sales
      return filteredSales.map(sale => ({
        id: sale.id,
        type: 'sale' as const,
        title: `Sale #${sale.id}`,
        subtitle: sale.customerName,
        description: `Amount: TZS ${sale.totalAmount.toLocaleString()} | Date: ${new Date(sale.createdAt).toLocaleDateString()}`,
        url: `/lats/sales-reports`,
        metadata: {
          amount: sale.totalAmount,
          date: sale.createdAt,
          customer: sale.customerName,
        },
        priority: 2,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
      }));
    } catch (error) {
      console.error('Error in searchSales:', error);
      return [];
    }
  }

  // Search pages and actions (quick navigation)
  // Uses centralized route registry - automatically includes all registered routes
  searchPagesAndActions(terms: string[]): SearchResult[] {
    // Get routes filtered by user role from the centralized registry
    const roleFilteredPages = getRoutesForRole(this.userRole);

    // Use fuzzy search if terms provided
    if (terms.length > 0) {
      const fuse = new Fuse(roleFilteredPages, {
        keys: ['title', 'description', 'path'],
        threshold: 0.4,
        includeScore: true,
        includeMatches: true,
      });

      const searchQuery = terms.join(' ');
      const fuseResults = fuse.search(searchQuery);

      return fuseResults.map(result => {
        const route = result.item;
        const matches = result.matches?.map(m => m.key || '') || [];

        return {
          id: route.id,
          type: 'page' as const,
          title: route.title,
          subtitle: 'Navigate to page',
          description: route.description,
          url: route.path,
          metadata: { icon: route.icon, category: route.category },
          priority: 0, // Highest priority for quick actions
          score: result.score,
          matches,
        };
      });
    }

    // Return all pages when no search terms (for browsing)
    return roleFilteredPages.map(route => ({
      id: route.id,
      type: 'page' as const,
      title: route.title,
      subtitle: 'Navigate to page',
      description: route.description,
      url: route.path,
      metadata: { icon: route.icon, category: route.category },
      priority: 0,
    }));
  }

  // Check if a string is a valid UUID
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str.trim());
  }

  // Check if a string is an INS-XXX pattern (installment plan number)
  private isInstallmentPlanNumber(str: string): boolean {
    const insRegex = /^INS-\d+$/i;
    return insRegex.test(str.trim());
  }

  // Check if a string is a numeric ID
  private isNumericID(str: string): boolean {
    // Check if it's a pure number (at least 1 digit, but can be longer)
    const numericRegex = /^\d+$/;
    return numericRegex.test(str.trim());
  }

  // Search by UUID across all entities
  async searchByUUID(uuid: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      // Search all entities in parallel
      const [deviceResult, customerResult, productResult, saleResult, variantResult, installmentResult] = await Promise.all([
        // Search devices
        supabase
          .from('devices')
          .select('id, model, serial_number, status, problem_description, created_at, updated_at')
          .eq('id', uuid)
          .single(),
        
        // Search customers
        supabase
          .from('customers')
          .select('id, name, phone, email, city, notes, created_at, updated_at')
          .eq('id', uuid)
          .single(),
        
        // Search products
        supabase
          .from('lats_products')
          .select('id, name, sku, barcode, selling_price, stock_quantity, created_at, updated_at')
          .eq('id', uuid)
          .single(),
        
        // Search sales
        supabase
          .from('lats_sales')
          .select('id, sale_number, customer_name, customer_phone, total_amount, created_at, updated_at')
          .eq('id', uuid)
          .single(),
        
        // Search product variants
        supabase
          .from('lats_product_variants')
          .select('id, product_id, name, sku, selling_price, stock_quantity, created_at, updated_at')
          .eq('id', uuid)
          .single(),
        
        // Search installment plans
        supabase
          .from('customer_installment_plans')
          .select(`
            id,
            plan_number,
            customer_id,
            total_amount,
            balance_due,
            status,
            created_at,
            updated_at,
            customer:customers!customer_id(id, name, phone, email)
          `)
          .eq('id', uuid)
          .single(),
      ]);

      // Process device result
      if (deviceResult.data && !deviceResult.error) {
        const device = deviceResult.data;
        results.push({
          id: device.id,
          type: 'device' as const,
          title: device.model || 'Device',
          subtitle: device.serial_number || 'No serial number',
          description: `Status: ${device.status || 'Unknown'}${device.problem_description ? ' | Issue: ' + device.problem_description : ''}`,
          url: `/devices/${device.id}`,
          metadata: {
            status: device.status,
            serialNumber: device.serial_number,
            issue: device.problem_description,
          },
          priority: 0, // Highest priority for exact UUID match
          createdAt: device.created_at,
          updatedAt: device.updated_at,
        });
      }

      // Process customer result
      if (customerResult.data && !customerResult.error) {
        const customer = customerResult.data;
        results.push({
          id: customer.id,
          type: 'customer' as const,
          title: customer.name || 'Customer',
          subtitle: customer.phone || 'No phone',
          description: `${customer.email || 'No email'} | ${customer.city || 'No location'}`,
          url: `/customers/${customer.id}`,
          metadata: {
            email: customer.email,
            location: customer.city,
            phone: customer.phone,
          },
          priority: 0,
          createdAt: customer.created_at,
          updatedAt: customer.updated_at,
        });
      }

      // Process product result
      if (productResult.data && !productResult.error) {
        const product = productResult.data;
        results.push({
          id: product.id,
          type: 'product' as const,
          title: product.name || 'Product',
          subtitle: product.sku || 'No SKU',
          description: `Price: TZS ${(product.selling_price || 0).toLocaleString()} | Stock: ${product.stock_quantity || 0}`,
          url: `/lats/unified-inventory`,
          metadata: {
            price: product.selling_price,
            stock: product.stock_quantity,
            sku: product.sku,
            barcode: product.barcode,
          },
          priority: 0,
          createdAt: product.created_at,
          updatedAt: product.updated_at,
        });
      }

      // Process sale result
      if (saleResult.data && !saleResult.error) {
        const sale = saleResult.data;
        results.push({
          id: sale.id,
          type: 'sale' as const,
          title: `Sale #${sale.sale_number || sale.id}`,
          subtitle: sale.customer_name || 'Walk-in Customer',
          description: `Amount: TZS ${(sale.total_amount || 0).toLocaleString()} | Date: ${new Date(sale.created_at).toLocaleDateString()}`,
          url: `/lats/sales-reports`,
          metadata: {
            amount: sale.total_amount,
            date: sale.created_at,
            customer: sale.customer_name,
          },
          priority: 0,
          createdAt: sale.created_at,
          updatedAt: sale.updated_at,
        });
      }

      // Process variant result
      if (variantResult.data && !variantResult.error) {
        const variant = variantResult.data;
        // Get product name for better context
        const { data: productData } = await supabase
          .from('lats_products')
          .select('name')
          .eq('id', variant.product_id)
          .single();
        
        results.push({
          id: variant.id,
          type: 'product' as const,
          title: `${productData?.name || 'Product'} - ${variant.name || 'Variant'}`,
          subtitle: variant.sku || 'No SKU',
          description: `Price: TZS ${(variant.selling_price || 0).toLocaleString()} | Stock: ${variant.stock_quantity || 0}`,
          url: `/lats/unified-inventory`,
          metadata: {
            price: variant.selling_price,
            stock: variant.stock_quantity,
            sku: variant.sku,
            productId: variant.product_id,
            variantId: variant.id,
          },
          priority: 0,
          createdAt: variant.created_at,
          updatedAt: variant.updated_at,
        });
      }

      // Process installment plan result
      if (installmentResult.data && !installmentResult.error) {
        const plan = installmentResult.data;
        results.push({
          id: plan.id,
          type: 'payment' as const,
          title: `Installment Plan ${plan.plan_number}`,
          subtitle: plan.customer?.name || 'Unknown Customer',
          description: `Total: TZS ${Number(plan.total_amount || 0).toLocaleString()} | Balance: TZS ${Number(plan.balance_due || 0).toLocaleString()} | Status: ${plan.status}`,
          url: `/installments`,
          metadata: {
            planNumber: plan.plan_number,
            customerName: plan.customer?.name,
            customerPhone: plan.customer?.phone,
            totalAmount: Number(plan.total_amount || 0),
            balanceDue: Number(plan.balance_due || 0),
            status: plan.status,
          },
          priority: 0,
          createdAt: plan.created_at,
          updatedAt: plan.updated_at,
        });
      }

      return results;
    } catch (error) {
      console.error('Error in searchByUUID:', error);
      return [];
    }
  }

  // Main search method with caching
  async search(query: string): Promise<SearchResult[]> {
    // Check cache first
    const cached = this.getCached(query);
    if (cached) {
      return cached;
    }

    const trimmedQuery = query.trim();
    
    // Check if query is a UUID - if so, search by UUID first
    if (this.isUUID(trimmedQuery)) {
      const uuidResults = await this.searchByUUID(trimmedQuery);
      if (uuidResults.length > 0) {
        this.setCache(query, uuidResults);
        return uuidResults;
      }
      // If UUID search returns no results, continue with normal search
    }

    // Check if query is an INS-XXX pattern (installment plan number)
    if (this.isInstallmentPlanNumber(trimmedQuery)) {
      const planResults = await this.searchByInstallmentPlanNumber(trimmedQuery);
      if (planResults.length > 0) {
        this.setCache(query, planResults);
        return planResults;
      }
      // If plan number search returns no results, continue with normal search
    }

    // Check if query is a numeric ID
    if (this.isNumericID(trimmedQuery)) {
      const numericResults = await this.searchByNumericID(trimmedQuery);
      if (numericResults.length > 0) {
        this.setCache(query, numericResults);
        return numericResults;
      }
      // If numeric ID search returns no results, continue with normal search
    }

    const { filters, terms } = this.parseQuery(query);
    const results: SearchResult[] = [];

    try {
      // Search pages and actions first (quick navigation)
      const pageResults = this.searchPagesAndActions(terms);
      results.push(...pageResults);

      // Determine which types to search based on type filter
      const typeFilter = filters.type?.toLowerCase();
      const searchAllTypes = !typeFilter || typeFilter === 'all';

      // Search data types based on filter
      const searchPromises: Promise<SearchResult[]>[] = [];
      
      if (searchAllTypes || typeFilter === 'device') {
        searchPromises.push(this.searchDevices(filters, terms));
      } else {
        searchPromises.push(Promise.resolve([]));
      }
      
      if (searchAllTypes || typeFilter === 'customer') {
        searchPromises.push(this.searchCustomers(filters, terms));
      } else {
        searchPromises.push(Promise.resolve([]));
      }
      
      if (searchAllTypes || typeFilter === 'product') {
        searchPromises.push(this.searchProducts(filters, terms));
      } else {
        searchPromises.push(Promise.resolve([]));
      }
      
      if (searchAllTypes || typeFilter === 'sale') {
        searchPromises.push(this.searchSales(filters, terms));
      } else {
        searchPromises.push(Promise.resolve([]));
      }
      
      if (searchAllTypes || typeFilter === 'payment' || typeFilter === 'installment') {
        searchPromises.push(this.searchInstallmentPlans(filters, terms));
      } else {
        searchPromises.push(Promise.resolve([]));
      }

      const [deviceResults, customerResults, productResults, saleResults, installmentResults] = await Promise.all(searchPromises);

      results.push(...deviceResults);
      results.push(...customerResults);
      results.push(...productResults);
      results.push(...saleResults);
      results.push(...installmentResults);

      // Sort by priority, score, and relevance
      const sortedResults = results.sort((a, b) => {
        // Priority first (lower number = higher priority)
        if (a.priority !== b.priority) return a.priority - b.priority;
        
        // Then by fuzzy search score (lower score = better match)
        if (a.score !== undefined && b.score !== undefined) {
          return a.score - b.score;
        }
        
        // Then by date (newer first)
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        
        // Finally by title
        return a.title.localeCompare(b.title);
      });

      // Cache the results
      this.setCache(query, sortedResults);

      return sortedResults;
    } catch (error) {
      console.error('Error in search:', error);
      return [];
    }
  }
}

export default SearchService;
