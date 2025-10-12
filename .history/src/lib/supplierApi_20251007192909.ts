import { supabase } from './supabaseClient';

export interface SupplierCategory {
  value: string;
  label: string;
  icon: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  notes?: string;
  rating?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  notes?: string;
  rating?: number;
  is_active?: boolean; // Will default to true if not provided
}

export interface UpdateSupplierData {
  name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  notes?: string;
  rating?: number;
  is_active?: boolean;
}

// Get all active suppliers
export const getActiveSuppliers = async (): Promise<Supplier[]> => {
  try {
    console.log('🔍 getActiveSuppliers: Starting fetch from lats_suppliers...');
    
    // Add timeout to prevent infinite hanging
    const fetchPromise = supabase
      .from('lats_suppliers')
      .select(`
        id,
        name,
        contact_person,
        email,
        phone,
        address,
        city,
        country,
        tax_id,
        payment_terms,
        notes,
        rating,
        is_active,
        created_at,
        updated_at
      `)
      .eq('is_active', true)
      .order('name');
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout after 10s')), 10000)
    );
    
    // Race between query and timeout
    const { data, error } = await Promise.race([
      fetchPromise,
      timeoutPromise.then(() => ({ data: null, error: { message: 'Timeout' } }))
    ]) as any;

    console.log('📦 Response received:', { dataLength: data?.length, hasError: !!error });

    if (error) {
      console.warn('⚠️ is_active column might not exist, trying without filter:', error.message);
      console.warn('⚠️ Error details:', error);
      console.warn('⚠️ Error code:', error.code);
      console.warn('⚠️ Error hint:', error.hint);
      
      // Fallback: get all suppliers without is_active filter
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('lats_suppliers')
        .select(`
          id,
          name,
          contact_person,
          email,
          phone,
          address,
          city,
          country,
          tax_id,
          payment_terms,
          notes,
          rating,
          is_active,
          created_at,
          updated_at
        `)
        .order('name');

      console.log('📦 Fallback response received:', { dataLength: fallbackData?.length, hasError: !!fallbackError });

      if (fallbackError) {
        console.error('❌ Error fetching suppliers (fallback):', fallbackError);
        console.error('❌ Fallback error code:', fallbackError.code);
        console.error('❌ Fallback error details:', fallbackError.details);
        throw new Error(`Failed to fetch suppliers: ${fallbackError.message}`);
      }

      const count = fallbackData?.length || 0;
      console.log(`✅ getActiveSuppliers: Fallback succeeded, got ${count} suppliers`);
      
      if (count > 0) {
        console.log('📋 Sample supplier:', fallbackData[0]);
      }
      
      if (count === 0) {
        console.warn('⚠️ WARNING: Suppliers table is EMPTY! Add suppliers or run DIAGNOSE-AND-FIX-SUPPLIERS.sql');
      }

      return fallbackData || [];
    }

    const count = data?.length || 0;
    console.log(`✅ getActiveSuppliers: Success, got ${count} active suppliers`);
    
    if (count > 0) {
      console.log('📋 First supplier:', data[0]);
    }
    
    if (count === 0) {
      console.warn('⚠️ WARNING: No active suppliers found! Check if:');
      console.warn('   1. Suppliers table is empty');
      console.warn('   2. All suppliers have is_active = false');
      console.warn('   3. RLS is blocking access');
      console.warn('   → Run MAKE-SUPPLIERS-WORK.sql to fix!');
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in getActiveSuppliers:', error);
    throw error;
  }
};

// Get all suppliers (including inactive)
export const getAllSuppliers = async (): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_suppliers')
      .select(`
        id,
        name,
        contact_person,
        email,
        phone,
        address,
        city,
        country,
        tax_id,
        payment_terms,
        notes,
        rating,
        is_active,
        created_at,
        updated_at
      `)
      .order('name');

    if (error) {
      console.error('Error fetching all suppliers:', error);
      throw new Error('Failed to fetch suppliers');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllSuppliers:', error);
    throw error;
  }
};

// Create a new supplier
export const createSupplier = async (supplierData: CreateSupplierData): Promise<Supplier> => {
  try {
    console.log('🔍 createSupplier: Starting with data:', supplierData);
    
    // Clean up the data to avoid type conflicts
    const dataToInsert: any = { ...supplierData };
    
    // Ensure is_active has a default value
    if (dataToInsert.is_active === undefined) {
      dataToInsert.is_active = true;
    }
    
    // Remove any undefined values
    Object.keys(dataToInsert).forEach(key => {
      if (dataToInsert[key] === undefined) {
        delete dataToInsert[key];
      }
    });

    console.log('🔍 createSupplier: Data to insert:', dataToInsert);

    const { data, error } = await supabase
      .from('lats_suppliers')
      .insert(dataToInsert)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating supplier:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to create supplier: ${error.message}`);
    }

    console.log('✅ createSupplier: Successfully created supplier:', data);
    return data;
  } catch (error) {
    console.error('❌ Error in createSupplier:', error);
    throw error;
  }
};

// Update an existing supplier
export const updateSupplier = async (id: string, supplierData: UpdateSupplierData): Promise<Supplier> => {
  try {
    console.log('🔍 updateSupplier: Starting with ID:', id, 'and data:', supplierData);
    
    // Clean up the data to avoid type conflicts
    const dataToUpdate: any = { ...supplierData };
    
    // Remove any undefined values
    Object.keys(dataToUpdate).forEach(key => {
      if (dataToUpdate[key] === undefined) {
        delete dataToUpdate[key];
      }
    });

    console.log('🔍 updateSupplier: Data to update:', dataToUpdate);

    const { data, error } = await supabase
      .from('lats_suppliers')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating supplier:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to update supplier: ${error.message}`);
    }

    console.log('✅ updateSupplier: Successfully updated supplier:', data);
    return data;
  } catch (error) {
    console.error('❌ Error in updateSupplier:', error);
    throw error;
  }
};

// Delete a supplier (soft delete by setting is_active to false)
export const deleteSupplier = async (id: string): Promise<void> => {
  try {
    console.log('🔍 deleteSupplier: Starting with ID:', id);
    
    const { error } = await supabase
      .from('lats_suppliers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting supplier:', error);
      throw new Error(`Failed to delete supplier: ${error.message}`);
    }

    console.log('✅ deleteSupplier: Successfully deleted supplier:', id);
  } catch (error) {
    console.error('❌ Error in deleteSupplier:', error);
    throw error;
  }
};

// Hard delete a supplier (permanently remove from database)
export const hardDeleteSupplier = async (id: string): Promise<void> => {
  try {
    console.log('🔍 hardDeleteSupplier: Starting with ID:', id);
    
    const { error } = await supabase
      .from('lats_suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error hard deleting supplier:', error);
      throw new Error(`Failed to hard delete supplier: ${error.message}`);
    }

    console.log('✅ hardDeleteSupplier: Successfully hard deleted supplier:', id);
  } catch (error) {
    console.error('❌ Error in hardDeleteSupplier:', error);
    throw error;
  }
};

// Search suppliers by name
export const searchSuppliers = async (query: string): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_suppliers')
      .select(`
        id,
        name,
        contact_person,
        email,
        phone,
        address,
        city,
        country,
        tax_id,
        payment_terms,
        notes,
        rating,
        is_active,
        created_at,
        updated_at
      `)
      .or(`name.ilike.%${query}%,contact_person.ilike.%${query}%`)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error searching suppliers:', error);
      throw new Error('Failed to search suppliers');
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchSuppliers:', error);
    throw error;
  }
};

// Get suppliers by country
export const getSuppliersByCountry = async (country: string): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_suppliers')
      .select(`
        id,
        name,
        contact_person,
        email,
        phone,
        address,
        city,
        country,
        tax_id,
        payment_terms,
        notes,
        rating,
        is_active,
        created_at,
        updated_at
      `)
      .eq('country', country)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching suppliers by country:', error);
      throw new Error('Failed to fetch suppliers by country');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSuppliersByCountry:', error);
    throw error;
  }
};

// Get suppliers by payment terms
export const getSuppliersByPaymentTerms = async (terms: string): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_suppliers')
      .select(`
        id,
        name,
        contact_person,
        email,
        phone,
        address,
        city,
        country,
        tax_id,
        payment_terms,
        notes,
        rating,
        is_active,
        created_at,
        updated_at
      `)
      .eq('payment_terms', terms)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching suppliers by payment terms:', error);
      throw new Error('Failed to fetch suppliers by payment terms');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSuppliersByPaymentTerms:', error);
    throw error;
  }
};
