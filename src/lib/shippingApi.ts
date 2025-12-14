// Shipping Management API
import { supabase } from './supabase';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ShippingAgent {
  id: string;
  name: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  shipping_methods: string[]; // ['sea', 'air', 'road']
  address?: string;
  city?: string;
  country?: string;
  license_number?: string;
  website?: string;
  notes?: string;
  base_rate_sea?: number;
  base_rate_air?: number;
  currency?: string;
  rating?: number;
  total_shipments?: number;
  successful_shipments?: number;
  is_active: boolean;
  is_preferred: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  estimated_days_min?: number;
  estimated_days_max?: number;
  cost_multiplier?: number;
  display_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingSettings {
  id?: string;
  default_shipping_address_street?: string;
  default_shipping_address_city?: string;
  default_shipping_address_region?: string;
  default_shipping_address_country?: string;
  default_shipping_address_postal_code?: string;
  default_billing_address_street?: string;
  default_billing_address_city?: string;
  default_billing_address_region?: string;
  default_billing_address_country?: string;
  default_billing_address_postal_code?: string;
  default_shipping_method_id?: string;
  default_agent_id?: string;
  notify_on_shipment?: boolean;
  notify_on_arrival?: boolean;
  notification_email?: string;
  notification_phone?: string;
  auto_calculate_shipping?: boolean;
  include_insurance?: boolean;
  insurance_percentage?: number;
  user_id?: string;
  branch_id?: string;
}

export interface PurchaseOrderShipping {
  id?: string;
  purchase_order_id: string;
  shipping_method_id?: string;
  shipping_method_code?: string;
  shipping_agent_id?: string;
  agent_name?: string;
  agent_contact?: string;
  agent_phone?: string;
  shipping_address_street?: string;
  shipping_address_city?: string;
  shipping_address_region?: string;
  shipping_address_country?: string;
  shipping_address_postal_code?: string;
  billing_address_street?: string;
  billing_address_city?: string;
  billing_address_region?: string;
  billing_address_country?: string;
  billing_address_postal_code?: string;
  use_same_address?: boolean;
  expected_departure_date?: string;
  expected_arrival_date?: string;
  actual_departure_date?: string;
  actual_arrival_date?: string;
  tracking_number?: string;
  container_number?: string;
  bill_of_lading?: string;
  airway_bill?: string;
  shipping_cost?: number;
  insurance_cost?: number;
  customs_duty?: number;
  other_charges?: number;
  total_shipping_cost?: number;
  currency?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  container_type?: string;
  container_count?: number;
  shipping_status?: 'pending' | 'preparing' | 'in_transit' | 'customs' | 'delivered' | 'cancelled';
  shipping_notes?: string;
  customs_notes?: string;
}

// ============================================
// SHIPPING AGENTS API
// ============================================

export const shippingAgentsApi = {
  // Get all shipping agents
  getAll: async (activeOnly: boolean = false): Promise<ShippingAgent[]> => {
    try {
      let query = supabase
        .from('lats_shipping_agents')
        .select('*')
        .order('is_preferred', { ascending: false })
        .order('name', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching shipping agents:', error);
      throw error;
    }
  },

  // Get single shipping agent
  getById: async (id: string): Promise<ShippingAgent | null> => {
    try {
      const { data, error } = await supabase
        .from('lats_shipping_agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching shipping agent:', error);
      throw error;
    }
  },

  // Get agents by shipping method
  getByMethod: async (method: string): Promise<ShippingAgent[]> => {
    try {
      const { data, error } = await supabase
        .from('lats_shipping_agents')
        .select('*')
        .contains('shipping_methods', [method])
        .eq('is_active', true)
        .order('is_preferred', { ascending: false })
        .order('rating', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching agents by method:', error);
      throw error;
    }
  },

  // Create shipping agent
  create: async (agent: Omit<ShippingAgent, 'id' | 'created_at' | 'updated_at'>): Promise<ShippingAgent> => {
    try {
      const { data, error } = await supabase
        .from('lats_shipping_agents')
        .insert(agent)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating shipping agent:', error);
      throw error;
    }
  },

  // Update shipping agent
  update: async (id: string, updates: Partial<ShippingAgent>): Promise<ShippingAgent> => {
    try {
      const { data, error } = await supabase
        .from('lats_shipping_agents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating shipping agent:', error);
      throw error;
    }
  },

  // Delete shipping agent
  delete: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('lats_shipping_agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting shipping agent:', error);
      throw error;
    }
  },

  // Update agent rating
  updateRating: async (id: string, rating: number): Promise<void> => {
    try {
      const { error } = await supabase
        .from('lats_shipping_agents')
        .update({ rating })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating agent rating:', error);
      throw error;
    }
  },

  // Increment shipment count
  incrementShipmentCount: async (id: string, successful: boolean = true): Promise<void> => {
    try {
      const agent = await shippingAgentsApi.getById(id);
      if (!agent) throw new Error('Agent not found');

      const updates: Partial<ShippingAgent> = {
        total_shipments: (agent.total_shipments || 0) + 1,
      };

      if (successful) {
        updates.successful_shipments = (agent.successful_shipments || 0) + 1;
      }

      await shippingAgentsApi.update(id, updates);
    } catch (error) {
      console.error('Error incrementing shipment count:', error);
      throw error;
    }
  },
};

// ============================================
// SHIPPING METHODS API
// ============================================

export const shippingMethodsApi = {
  // Get all shipping methods
  getAll: async (activeOnly: boolean = false): Promise<ShippingMethod[]> => {
    try {
      let query = supabase
        .from('lats_shipping_methods')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching shipping methods:', error);
      throw error;
    }
  },

  // Get by code
  getByCode: async (code: string): Promise<ShippingMethod | null> => {
    try {
      const { data, error } = await supabase
        .from('lats_shipping_methods')
        .select('*')
        .eq('code', code)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching shipping method:', error);
      throw error;
    }
  },

  // Create shipping method
  create: async (method: Omit<ShippingMethod, 'id' | 'created_at' | 'updated_at'>): Promise<ShippingMethod> => {
    try {
      const { data, error } = await supabase
        .from('lats_shipping_methods')
        .insert(method)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating shipping method:', error);
      throw error;
    }
  },

  // Update shipping method
  update: async (id: string, updates: Partial<ShippingMethod>): Promise<ShippingMethod> => {
    try {
      const { data, error } = await supabase
        .from('lats_shipping_methods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating shipping method:', error);
      throw error;
    }
  },

  // Delete shipping method
  delete: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('lats_shipping_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting shipping method:', error);
      throw error;
    }
  },
};

// ============================================
// SHIPPING SETTINGS API
// ============================================

export const shippingSettingsApi = {
  // Get shipping settings
  get: async (): Promise<ShippingSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('lats_shipping_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
      return data || null;
    } catch (error) {
      console.error('Error fetching shipping settings:', error);
      return null;
    }
  },

  // Save or update shipping settings
  save: async (settings: ShippingSettings): Promise<ShippingSettings> => {
    try {
      // Check if settings exist
      const existing = await shippingSettingsApi.get();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('lats_shipping_settings')
          .update(settings)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('lats_shipping_settings')
          .insert(settings)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error saving shipping settings:', error);
      throw error;
    }
  },
};

// ============================================
// PURCHASE ORDER SHIPPING API
// ============================================

export const poShippingApi = {
  // Get shipping info for a PO
  getByPOId: async (purchaseOrderId: string): Promise<PurchaseOrderShipping | null> => {
    try {
      const { data, error } = await supabase
        .from('lats_purchase_order_shipping')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching PO shipping info:', error);
      return null;
    }
  },

  // Create or update shipping info for a PO
  upsert: async (shipping: PurchaseOrderShipping): Promise<PurchaseOrderShipping> => {
    try {
      // Check if shipping info exists
      const existing = await poShippingApi.getByPOId(shipping.purchase_order_id);

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('lats_purchase_order_shipping')
          .update(shipping)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create
        const { data, error } = await supabase
          .from('lats_purchase_order_shipping')
          .insert(shipping)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error upserting PO shipping info:', error);
      throw error;
    }
  },

  // Update shipping status
  updateStatus: async (
    purchaseOrderId: string,
    status: PurchaseOrderShipping['shipping_status']
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('lats_purchase_order_shipping')
        .update({ shipping_status: status })
        .eq('purchase_order_id', purchaseOrderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating shipping status:', error);
      throw error;
    }
  },

  // Update tracking info
  updateTracking: async (
    purchaseOrderId: string,
    trackingInfo: {
      tracking_number?: string;
      container_number?: string;
      bill_of_lading?: string;
      airway_bill?: string;
    }
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('lats_purchase_order_shipping')
        .update(trackingInfo)
        .eq('purchase_order_id', purchaseOrderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating tracking info:', error);
      throw error;
    }
  },

  // Delete shipping info
  delete: async (purchaseOrderId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('lats_purchase_order_shipping')
        .delete()
        .eq('purchase_order_id', purchaseOrderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting shipping info:', error);
      throw error;
    }
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Calculate estimated delivery date
export const calculateEstimatedDelivery = (
  method: ShippingMethod,
  departureDate?: Date
): Date => {
  const start = departureDate || new Date();
  const daysToAdd = method.estimated_days_max || 7;
  const result = new Date(start);
  result.setDate(result.getDate() + daysToAdd);
  return result;
};

// Calculate shipping cost estimate
export const calculateShippingCost = (
  agent: ShippingAgent,
  method: ShippingMethod,
  goodsValue: number
): number => {
  const baseRate =
    method.code === 'air'
      ? agent.base_rate_air || 0
      : agent.base_rate_sea || 0;

  const multiplier = method.cost_multiplier || 1.0;
  return baseRate * multiplier;
};

// Calculate insurance cost
export const calculateInsurance = (
  goodsValue: number,
  insurancePercentage: number = 2.0
): number => {
  return (goodsValue * insurancePercentage) / 100;
};

export default {
  agents: shippingAgentsApi,
  methods: shippingMethodsApi,
  settings: shippingSettingsApi,
  poShipping: poShippingApi,
  calculateEstimatedDelivery,
  calculateShippingCost,
  calculateInsurance,
};

