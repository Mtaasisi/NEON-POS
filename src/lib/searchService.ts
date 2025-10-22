import { supabase } from './supabaseClient';
import { matchesPhoneSearch } from './phoneUtils';
import Fuse from 'fuse.js';

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
    
    // Extract filters (key:value format)
    const filterRegex = /(\w+):([^\s]+)/g;
    let match;
    while ((match = filterRegex.exec(query)) !== null) {
      filters[match[1]] = match[2];
    }
    
    // Extract remaining terms
    const remainingQuery = query.replace(filterRegex, '').trim();
    if (remainingQuery) {
      terms.push(...remainingQuery.split(/\s+/));
    }
    
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
          serialNumber,
          status,
          issue,
          expectedReturnDate,
          customerName,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(200);

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
        serialNumber: device.serialNumber || '',
        status: device.status || '',
        issue: device.issue || '',
        expectedReturnDate: device.expectedReturnDate || '',
        customerName: device.customerName || 'No customer',
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
      if (filters.customer) {
        filteredDevices = filteredDevices.filter(device =>
          device.customerName.toLowerCase().includes(filters.customer!.toLowerCase())
        );
      }

      // If search terms provided, use fuzzy search
      if (terms.length > 0) {
        const fuse = new Fuse(filteredDevices, {
          keys: ['model', 'serialNumber', 'customerName', 'issue', 'status'],
          threshold: 0.3, // Lower = more strict
          includeScore: true,
          includeMatches: true,
        });

        const searchQuery = terms.join(' ');
        const fuseResults = fuse.search(searchQuery);

        return fuseResults.map(result => {
          const device = result.item;
          const matches = result.matches?.map(m => m.key || '') || [];

          return {
            id: device.id,
            type: 'device' as const,
            title: device.model,
            subtitle: device.customerName,
            description: `Status: ${device.status} | Serial: ${device.serialNumber}`,
            url: `/devices/${device.id}`,
            metadata: {
              status: device.status,
              serialNumber: device.serialNumber,
              issue: device.issue,
              expectedReturnDate: device.expectedReturnDate,
            },
            priority: device.status === 'active' ? 1 : 2,
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
        subtitle: device.customerName,
        description: `Status: ${device.status} | Serial: ${device.serialNumber}`,
        url: `/devices/${device.id}`,
        metadata: {
          status: device.status,
          serialNumber: device.serialNumber,
          issue: device.issue,
          expectedReturnDate: device.expectedReturnDate,
        },
        priority: device.status === 'active' ? 1 : 2,
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
          location,
          notes,
          isRead,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(200);

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
        location: customer.location || '',
        notes: customer.notes || '',
        isRead: customer.isRead,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
      }));

      // Apply filters
      let filteredCustomers = customerList;
      if (filters.name) {
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.name.toLowerCase().includes(filters.name!.toLowerCase())
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
              isRead: customer.isRead,
            },
            priority: customer.isRead === false ? 1 : 2,
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
          isRead: customer.isRead,
        },
        priority: customer.isRead === false ? 1 : 2,
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
      // Query database for products
      let query = supabase
        .from('lats_inventory')
        .select(`
          id,
          product_name,
          sku,
          barcode,
          selling_price,
          quantity,
          category_id,
          branch_id,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(200);

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

      // Map database results to searchable format
      const productList = products.map(product => ({
        id: product.id,
        name: product.product_name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        price: product.selling_price || 0,
        stockQuantity: product.quantity || 0,
        categoryId: product.category_id || '',
        branchId: product.branch_id || '',
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      }));

      // Apply price filter
      let filteredProducts = productList;
      if (filters.price) {
        const priceRange = filters.price.split('-');
        if (priceRange.length === 2) {
          const minPrice = parseFloat(priceRange[0]);
          const maxPrice = parseFloat(priceRange[1]);
          filteredProducts = filteredProducts.filter(product =>
            product.price >= minPrice && product.price <= maxPrice
          );
        } else {
          const exactPrice = parseFloat(filters.price);
          filteredProducts = filteredProducts.filter(product => product.price === exactPrice);
        }
      }

      // If search terms provided, use fuzzy search
      if (terms.length > 0) {
        const fuse = new Fuse(filteredProducts, {
          keys: ['name', 'sku', 'barcode'],
          threshold: 0.3,
          includeScore: true,
          includeMatches: true,
        });

        const searchQuery = terms.join(' ');
        const fuseResults = fuse.search(searchQuery);

        return fuseResults.map(result => {
          const product = result.item;
          const matches = result.matches?.map(m => m.key || '') || [];

          return {
            id: product.id,
            type: 'product' as const,
            title: product.name,
            subtitle: product.sku,
            description: `Price: TZS ${product.price.toLocaleString()} | Stock: ${product.stockQuantity}`,
            url: `/lats/unified-inventory`,
            metadata: {
              price: product.price,
              stock: product.stockQuantity,
              category: product.categoryId,
              sku: product.sku,
              barcode: product.barcode,
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
      return filteredProducts.map(product => ({
        id: product.id,
        type: 'product' as const,
        title: product.name,
        subtitle: product.sku,
        description: `Price: TZS ${product.price.toLocaleString()} | Stock: ${product.stockQuantity}`,
        url: `/lats/unified-inventory`,
        metadata: {
          price: product.price,
          stock: product.stockQuantity,
          category: product.categoryId,
          sku: product.sku,
          barcode: product.barcode,
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
        .order('created_at', { ascending: false })
        .limit(100);

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
          const maxAmount = parseFloat(amountRange[1]);
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
  searchPagesAndActions(terms: string[]): SearchResult[] {
    const pages = [
      { id: 'dashboard', title: 'Dashboard', description: 'View overview and analytics', url: '/dashboard', icon: '📊' },
      { id: 'devices', title: 'Devices', description: 'Manage repair devices', url: '/devices', icon: '📱' },
      { id: 'customers', title: 'Customers', description: 'Manage customer information', url: '/customers', icon: '👥' },
      { id: 'pos', title: 'Point of Sale', description: 'New sale transaction', url: '/pos', icon: '💰' },
      { id: 'inventory', title: 'Inventory', description: 'Manage product inventory', url: '/lats/unified-inventory', icon: '📦' },
      { id: 'sales', title: 'Sales Reports', description: 'View sales history and reports', url: '/lats/sales-reports', icon: '📈' },
      { id: 'purchase-orders', title: 'Purchase Orders', description: 'Manage supplier orders', url: '/lats/purchase-orders', icon: '🛒' },
      { id: 'payments', title: 'Payments', description: 'Track payment transactions', url: '/payments', icon: '💳' },
      { id: 'analytics', title: 'Analytics', description: 'Business insights and reports', url: '/analytics', icon: '📊' },
      { id: 'settings', title: 'Settings', description: 'Application settings', url: '/settings', icon: '⚙️' },
    ];

    // Filter by role
    const roleFilteredPages = pages.filter(page => {
      if (this.userRole === 'admin') return true;
      if (this.userRole === 'customer-care') {
        return !['analytics', 'purchase-orders'].includes(page.id);
      }
      return ['dashboard', 'devices', 'customers'].includes(page.id);
    });

    // Use fuzzy search if terms provided
    if (terms.length > 0) {
      const fuse = new Fuse(roleFilteredPages, {
        keys: ['title', 'description'],
        threshold: 0.4,
        includeScore: true,
        includeMatches: true,
      });

      const searchQuery = terms.join(' ');
      const fuseResults = fuse.search(searchQuery);

      return fuseResults.map(result => {
        const page = result.item;
        const matches = result.matches?.map(m => m.key || '') || [];

        return {
          id: page.id,
          type: 'page' as const,
          title: page.title,
          subtitle: 'Navigate to page',
          description: page.description,
          url: page.url,
          metadata: { icon: page.icon },
          priority: 0, // Highest priority for quick actions
          score: result.score,
          matches,
        };
      });
    }

    return [];
  }

  // Main search method with caching
  async search(query: string): Promise<SearchResult[]> {
    // Check cache first
    const cached = this.getCached(query);
    if (cached) {
      return cached;
    }

    const { filters, terms } = this.parseQuery(query);
    const results: SearchResult[] = [];

    try {
      // Search pages and actions first (quick navigation)
      const pageResults = this.searchPagesAndActions(terms);
      results.push(...pageResults);

      // Search all data types in parallel for better performance
      const [deviceResults, customerResults, productResults, saleResults] = await Promise.all([
        this.searchDevices(filters, terms),
        this.searchCustomers(filters, terms),
        this.searchProducts(filters, terms),
        this.searchSales(filters, terms),
      ]);

      results.push(...deviceResults);
      results.push(...customerResults);
      results.push(...productResults);
      results.push(...saleResults);

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
