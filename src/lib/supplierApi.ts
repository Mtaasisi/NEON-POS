import { supabase } from './supabaseClient';

export interface SupplierCategory {
  value: string;
  label: string;
  icon: string;
}

export interface Supplier {
  id: string;
  name: string;
  company_name?: string;
  description?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  wechat?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  preferred_currency?: string;
  exchange_rate?: number;
  notes?: string;
  rating?: number;
  wechat_qr_code?: string;
  alipay_qr_code?: string;
  bank_account_details?: string;
  is_active: boolean;
  is_trade_in_customer?: boolean; // Flag to distinguish trade-in customers from real suppliers
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  name: string;
  company_name?: string;
  description?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  wechat?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  preferred_currency?: string;
  exchange_rate?: number;
  notes?: string;
  rating?: number;
  wechat_qr_code?: string;
  alipay_qr_code?: string;
  bank_account_details?: string;
  is_active?: boolean; // Will default to true if not provided
}

export interface UpdateSupplierData {
  name?: string;
  company_name?: string;
  description?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  wechat?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  preferred_currency?: string;
  exchange_rate?: number;
  notes?: string;
  rating?: number;
  wechat_qr_code?: string;
  alipay_qr_code?: string;
  bank_account_details?: string;
  is_active?: boolean;
}

// Get all active suppliers (excluding trade-in customers)
export const getActiveSuppliers = async (): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_suppliers')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error fetching suppliers:', error);
      throw new Error(`Failed to fetch suppliers: ${error.message}`);
    }

    // Filter active suppliers and exclude trade-in customers
    const activeSuppliers = (data || []).filter(s => 
      s.is_active !== false && s.is_trade_in_customer !== true
    );
    
    const count = activeSuppliers.length;
    
    if (count === 0) {
      console.warn('⚠️ WARNING: No active suppliers found! Check if suppliers table is empty or all suppliers are inactive.');
    }

    return activeSuppliers;
  } catch (error) {
    console.error('❌ Error in getActiveSuppliers:', error);
    throw error;
  }
};

// Get all suppliers (including inactive, but excluding trade-in customers)
export const getAllSuppliers = async (): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_suppliers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching all suppliers:', error);
      throw new Error('Failed to fetch suppliers');
    }

    // Exclude trade-in customers from supplier list
    return (data || []).filter(s => s.is_trade_in_customer !== true);
  } catch (error) {
    console.error('Error in getAllSuppliers:', error);
    throw error;
  }
};

// Create a new supplier
export const createSupplier = async (supplierData: CreateSupplierData): Promise<Supplier> => {
  try {
    // Clean up the data to avoid type conflicts
    const dataToInsert: any = { ...supplierData };
    
    // Always set suppliers as active
    dataToInsert.is_active = true;
    
    // Remove any undefined values
    Object.keys(dataToInsert).forEach(key => {
      if (dataToInsert[key] === undefined) {
        delete dataToInsert[key];
      }
    });

    const { data, error } = await supabase
      .from('lats_suppliers')
      .insert(dataToInsert)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating supplier:', error.message);
      throw new Error(`Failed to create supplier: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('❌ Error in createSupplier:', error);
    throw error;
  }
};

// Update an existing supplier
export const updateSupplier = async (id: string, supplierData: UpdateSupplierData): Promise<Supplier> => {
  try {
    // Clean up the data to avoid type conflicts
    const dataToUpdate: any = { ...supplierData };
    
    // Remove any undefined values
    Object.keys(dataToUpdate).forEach(key => {
      if (dataToUpdate[key] === undefined) {
        delete dataToUpdate[key];
      }
    });

    const { data, error } = await supabase
      .from('lats_suppliers')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating supplier:', error.message);
      throw new Error(`Failed to update supplier: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('❌ Error in updateSupplier:', error);
    throw error;
  }
};

// Delete a supplier (HARD DELETE - permanently removes from database)
export const deleteSupplier = async (id: string): Promise<void> => {
  try {
    // First, check if the supplier has any purchase orders
    const { data: purchaseOrders, error: checkError } = await supabase
      .from('lats_purchase_orders')
      .select('id')
      .eq('supplier_id', id)
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking purchase orders:', checkError);
      throw new Error(`Failed to check supplier references: ${checkError.message}`);
    }

    if (purchaseOrders && purchaseOrders.length > 0) {
      throw new Error('Cannot delete supplier: This supplier has associated purchase orders. Please delete or reassign the purchase orders first.');
    }

    // Check if the supplier has any products
    const { data: products, error: productsCheckError } = await supabase
      .from('lats_products')
      .select('id')
      .eq('supplier_id', id)
      .limit(1);

    if (productsCheckError) {
      console.error('❌ Error checking products:', productsCheckError);
      throw new Error(`Failed to check supplier references: ${productsCheckError.message}`);
    }

    if (products && products.length > 0) {
      throw new Error('Cannot delete supplier: This supplier has associated products. Please delete or reassign the products first.');
    }

    // If no references exist, proceed with deletion
    const { error } = await supabase
      .from('lats_suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting supplier:', error);
      throw new Error(`Failed to delete supplier: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ Error in deleteSupplier:', error);
    throw error;
  }
};

// Hard delete a supplier (permanently remove from database)
export const hardDeleteSupplier = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('lats_suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error hard deleting supplier:', error);
      throw new Error(`Failed to hard delete supplier: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ Error in hardDeleteSupplier:', error);
    throw error;
  }
};

// Search suppliers by name (excluding trade-in customers)
export const searchSuppliers = async (query: string): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_suppliers')
      .select('*')
      .or(`name.ilike.%${query}%,contact_person.ilike.%${query}%`)
      .order('name');

    if (error) {
      console.error('Error searching suppliers:', error);
      throw new Error('Failed to search suppliers');
    }

    // Filter active suppliers and exclude trade-in customers
    return (data || []).filter(s => 
      s.is_active !== false && s.is_trade_in_customer !== true
    );
  } catch (error) {
    console.error('Error in searchSuppliers:', error);
    throw error;
  }
};

// Get suppliers by country (excluding trade-in customers)
export const getSuppliersByCountry = async (country: string): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_suppliers')
      .select('*')
      .eq('country', country)
      .order('name');

    if (error) {
      console.error('Error fetching suppliers by country:', error);
      throw new Error('Failed to fetch suppliers by country');
    }

    // Filter active suppliers and exclude trade-in customers
    return (data || []).filter(s => 
      s.is_active !== false && s.is_trade_in_customer !== true
    );
  } catch (error) {
    console.error('Error in getSuppliersByCountry:', error);
    throw error;
  }
};

// Get suppliers by payment terms (excluding trade-in customers)
export const getSuppliersByPaymentTerms = async (terms: string): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_suppliers')
      .select('*')
      .eq('payment_terms', terms)
      .order('name');

    if (error) {
      console.error('Error fetching suppliers by payment terms:', error);
      throw new Error('Failed to fetch suppliers by payment terms');
    }

    // Filter active suppliers and exclude trade-in customers
    return (data || []).filter(s => 
      s.is_active !== false && s.is_trade_in_customer !== true
    );
  } catch (error) {
    console.error('Error in getSuppliersByPaymentTerms:', error);
    throw error;
  }
};
