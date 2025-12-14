/**
 * API Client
 * Frontend client for backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Products
  async getProducts(params?: {
    q?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.q) queryParams.append('q', params.q);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request(`/products${query ? '?' + query : ''}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async searchProducts(query: string) {
    return this.request(`/products/search?q=${encodeURIComponent(query)}`);
  }

  // Cart
  async addToCart(data: {
    productId: string;
    variantId?: string;
    quantity: number;
  }) {
    return this.request('/cart/add', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async validateCart(items: any[]) {
    return this.request('/cart/validate', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // Sales
  async createSale(data: {
    customerId?: string;
    items: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
    }>;
    paymentMethod: string;
    totalAmount: number;
    discountAmount?: number;
    taxAmount?: number;
  }) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSales(params?: {
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request(`/sales${query ? '?' + query : ''}`);
  }

  // Customers
  async getCustomers(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request(`/customers${query ? '?' + query : ''}`);
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}`);
  }
}

export const apiClient = new ApiClient();
