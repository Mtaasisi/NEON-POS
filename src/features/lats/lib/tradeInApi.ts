/**
 * Trade-In System API
 * Handles all trade-in related operations
 */

import { supabase } from '../../../lib/supabaseClient';
import type {
  TradeInPrice,
  TradeInPriceFormData,
  TradeInTransaction,
  TradeInTransactionFormData,
  TradeInContract,
  TradeInContractFormData,
  TradeInDamageAssessment,
  TradeInDamageAssessmentFormData,
  TradeInSettings,
  TradeInCalculation,
  TradeInFilters,
  TradeInPriceFilters,
  ConditionRating,
  DamageItem,
} from '../types/tradeIn';

// ================================================
// TRADE-IN PRICING API
// ================================================

/**
 * Get all trade-in prices with optional filters
 */
export const getTradeInPrices = async (filters?: TradeInPriceFilters) => {
  try {
    let query = supabase
      .from('lats_trade_in_prices')
      .select(`
        *,
        product:lats_products(id, name, sku),
        variant:lats_product_variants(id, variant_name, sku),
        branch:lats_branches(id, name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.search) {
      query = query.or(`device_name.ilike.%${filters.search}%,device_model.ilike.%${filters.search}%`);
    }

    if (filters?.branch_id) {
      query = query.eq('branch_id', filters.branch_id);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.device_name) {
      query = query.ilike('device_name', `%${filters.device_name}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data as TradeInPrice[] };
  } catch (error) {
    console.error('Error fetching trade-in prices:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch trade-in prices' };
  }
};

/**
 * Get a single trade-in price by ID
 */
export const getTradeInPrice = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('lats_trade_in_prices')
      .select(`
        *,
        product:lats_products(id, name, sku),
        variant:lats_product_variants(id, variant_name, sku),
        branch:lats_branches(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { success: true, data: data as TradeInPrice };
  } catch (error) {
    console.error('Error fetching trade-in price:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch trade-in price' };
  }
};

/**
 * Get trade-in price for a specific product/variant
 */
export const getTradeInPriceForProduct = async (productId: string, variantId?: string) => {
  try {
    let query = supabase
      .from('lats_trade_in_prices')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return { success: true, data: data as TradeInPrice | null };
  } catch (error) {
    console.error('Error fetching trade-in price for product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch trade-in price' };
  }
};

/**
 * Create a new trade-in price
 */
export const createTradeInPrice = async (formData: TradeInPriceFormData) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('lats_trade_in_prices')
      .insert({
        ...formData,
        created_by: userData?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as TradeInPrice };
  } catch (error) {
    console.error('Error creating trade-in price:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create trade-in price' };
  }
};

/**
 * Update an existing trade-in price
 */
export const updateTradeInPrice = async (id: string, formData: Partial<TradeInPriceFormData>) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('lats_trade_in_prices')
      .update({
        ...formData,
        updated_by: userData?.user?.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as TradeInPrice };
  } catch (error) {
    console.error('Error updating trade-in price:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update trade-in price' };
  }
};

/**
 * Delete a trade-in price (soft delete by setting is_active to false)
 */
export const deleteTradeInPrice = async (id: string) => {
  try {
    const { error } = await supabase
      .from('lats_trade_in_prices')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting trade-in price:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete trade-in price' };
  }
};

// ================================================
// TRADE-IN CALCULATOR
// ================================================

/**
 * Calculate trade-in value based on condition and damage
 */
export const calculateTradeInValue = (
  basePrice: number,
  conditionRating: ConditionRating,
  conditionMultipliers: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  },
  damageItems: DamageItem[] = []
): TradeInCalculation => {
  // Get condition multiplier
  const multiplier = conditionMultipliers[conditionRating] || 1.0;
  
  // Calculate condition-adjusted price
  const conditionAdjustedPrice = basePrice * multiplier;
  
  // Calculate total damage deductions
  const totalDamageDeductions = damageItems.reduce((sum, item) => sum + (item.price || 0), 0);
  
  // Calculate final trade-in value (cannot be negative)
  const finalTradeInValue = Math.max(0, conditionAdjustedPrice - totalDamageDeductions);
  
  return {
    base_price: basePrice,
    condition_rating: conditionRating,
    condition_multiplier: multiplier,
    condition_adjusted_price: conditionAdjustedPrice,
    damage_deductions: damageItems,
    total_damage_deductions: totalDamageDeductions,
    final_trade_in_value: finalTradeInValue,
    customer_payment_amount: 0, // Will be calculated when new device is selected
  };
};

/**
 * Calculate customer payment amount
 */
export const calculateCustomerPayment = (
  newDevicePrice: number,
  tradeInValue: number
): number => {
  return Math.max(0, newDevicePrice - tradeInValue);
};

// ================================================
// TRADE-IN TRANSACTIONS API
// ================================================

/**
 * Get all trade-in transactions with optional filters
 */
export const getTradeInTransactions = async (filters?: TradeInFilters) => {
  try {
    let query = supabase
      .from('lats_trade_in_transactions')
      .select(`
        *,
        customer:lats_customers(id, name, phone, email),
        branch:lats_branches(id, name),
        new_product:lats_products(id, name, selling_price),
        new_variant:lats_product_variants(id, variant_name, selling_price),
        contract:lats_trade_in_contracts(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.search) {
      query = query.or(`device_name.ilike.%${filters.search}%,device_model.ilike.%${filters.search}%,device_imei.ilike.%${filters.search}%,transaction_number.ilike.%${filters.search}%`);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.condition_rating) {
      query = query.eq('condition_rating', filters.condition_rating);
    }

    if (filters?.branch_id) {
      query = query.eq('branch_id', filters.branch_id);
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    if (filters?.needs_repair !== undefined) {
      query = query.eq('needs_repair', filters.needs_repair);
    }

    if (filters?.ready_for_resale !== undefined) {
      query = query.eq('ready_for_resale', filters.ready_for_resale);
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    if (filters?.min_value !== undefined) {
      query = query.gte('final_trade_in_value', filters.min_value);
    }

    if (filters?.max_value !== undefined) {
      query = query.lte('final_trade_in_value', filters.max_value);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data as TradeInTransaction[] };
  } catch (error) {
    console.error('Error fetching trade-in transactions:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch trade-in transactions' };
  }
};

/**
 * Get a single trade-in transaction by ID
 */
export const getTradeInTransaction = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('lats_trade_in_transactions')
      .select(`
        *,
        customer:lats_customers(id, name, phone, email, address),
        branch:lats_branches(id, name),
        new_product:lats_products(id, name, selling_price),
        new_variant:lats_product_variants(id, variant_name, selling_price),
        contract:lats_trade_in_contracts(*),
        damage_assessments:lats_trade_in_damage_assessments(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { success: true, data: data as TradeInTransaction };
  } catch (error) {
    console.error('Error fetching trade-in transaction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch trade-in transaction' };
  }
};

/**
 * Create a new trade-in transaction
 */
export const createTradeInTransaction = async (formData: TradeInTransactionFormData) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    // Get active branch (you may need to adjust this based on your branch context)
    const activeBranchId = localStorage.getItem('activeBranchId') || '00000000-0000-0000-0000-000000000001';
    
    // Calculate condition multiplier and final value
    const conditionMultipliers = {
      excellent: 1.0,
      good: 0.85,
      fair: 0.70,
      poor: 0.50,
    };
    
    const calculation = calculateTradeInValue(
      formData.base_trade_in_price,
      formData.condition_rating,
      conditionMultipliers,
      formData.damage_items
    );
    
    // Calculate customer payment if new device is selected
    let customerPayment = formData.customer_payment_amount || 0;
    if (formData.new_device_price) {
      customerPayment = calculateCustomerPayment(formData.new_device_price, calculation.final_trade_in_value);
    }
    
    const { data, error } = await supabase
      .from('lats_trade_in_transactions')
      .insert({
        customer_id: formData.customer_id,
        branch_id: activeBranchId,
        device_name: formData.device_name,
        device_model: formData.device_model,
        device_imei: formData.device_imei,
        device_serial_number: formData.device_serial_number,
        base_trade_in_price: formData.base_trade_in_price,
        condition_rating: formData.condition_rating,
        condition_multiplier: calculation.condition_multiplier,
        condition_description: formData.condition_description,
        total_damage_deductions: calculation.total_damage_deductions,
        damage_items: formData.damage_items && formData.damage_items.length > 0 ? formData.damage_items : null,
        final_trade_in_value: calculation.final_trade_in_value,
        new_product_id: formData.new_product_id,
        new_variant_id: formData.new_variant_id,
        new_device_price: formData.new_device_price,
        customer_payment_amount: customerPayment,
        customer_id_number: formData.customer_id_number,
        customer_id_type: formData.customer_id_type,
        needs_repair: formData.needs_repair || false,
        resale_price: formData.resale_price,
        staff_notes: formData.staff_notes,
        created_by: userData?.user?.id,
        status: 'pending',
      })
      .select(`
        *,
        customer:lats_customers(id, name, phone, email),
        new_product:lats_products(id, name),
        new_variant:lats_product_variants(id, variant_name)
      `)
      .single();

    if (error) throw error;
    return { success: true, data: data as TradeInTransaction };
  } catch (error) {
    console.error('Error creating trade-in transaction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create trade-in transaction' };
  }
};

/**
 * Update trade-in transaction
 */
export const updateTradeInTransaction = async (id: string, updates: Partial<TradeInTransaction>) => {
  try {
    const { data, error } = await supabase
      .from('lats_trade_in_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as TradeInTransaction };
  } catch (error) {
    console.error('Error updating trade-in transaction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update trade-in transaction' };
  }
};

/**
 * Approve trade-in transaction
 */
export const approveTradeInTransaction = async (id: string) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('lats_trade_in_transactions')
      .update({
        status: 'approved',
        approved_by: userData?.user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as TradeInTransaction };
  } catch (error) {
    console.error('Error approving trade-in transaction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to approve trade-in transaction' };
  }
};

/**
 * Complete trade-in transaction
 */
export const completeTradeInTransaction = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('lats_trade_in_transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as TradeInTransaction };
  } catch (error) {
    console.error('Error completing trade-in transaction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to complete trade-in transaction' };
  }
};

// ================================================
// TRADE-IN CONTRACTS API
// ================================================

/**
 * Get trade-in settings (terms & conditions)
 */
export const getTradeInSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('lats_trade_in_settings')
      .select('*');

    if (error) throw error;
    
    const settings: Record<string, string> = {};
    (data as TradeInSettings[]).forEach((setting) => {
      settings[setting.key] = setting.value;
    });
    
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error fetching trade-in settings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch settings' };
  }
};

/**
 * Create trade-in contract
 */
export const createTradeInContract = async (
  transaction: TradeInTransaction,
  formData: TradeInContractFormData
) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    // Get settings for terms and conditions
    const settingsResult = await getTradeInSettings();
    if (!settingsResult.success) {
      throw new Error('Failed to load contract terms');
    }
    
    const settings = settingsResult.data!;
    
    const { data, error } = await supabase
      .from('lats_trade_in_contracts')
      .insert({
        transaction_id: transaction.id,
        customer_id: transaction.customer_id,
        customer_name: transaction.customer?.name || '',
        customer_phone: transaction.customer?.phone || '',
        customer_email: transaction.customer?.email,
        customer_address: transaction.customer?.address,
        customer_id_number: formData.customer_id_number,
        customer_id_type: formData.customer_id_type,
        device_name: transaction.device_name,
        device_model: transaction.device_model,
        device_imei: transaction.device_imei || '',
        device_serial_number: transaction.device_serial_number,
        device_condition: `${transaction.condition_rating} - ${transaction.condition_description || ''}`,
        agreed_value: transaction.final_trade_in_value,
        terms_and_conditions: settings.contract_terms || '',
        ownership_declaration: settings.ownership_declaration || '',
        customer_agreed_terms: formData.customer_agreed_terms,
        customer_signature_data: formData.customer_signature_data,
        staff_signature_data: formData.staff_signature_data,
        status: 'signed',
        created_by: userData?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    
    // Update transaction with contract ID
    await updateTradeInTransaction(transaction.id, {
      contract_id: data.id,
      contract_signed: true,
      contract_signed_at: new Date().toISOString(),
    } as any);
    
    return { success: true, data: data as TradeInContract };
  } catch (error) {
    console.error('Error creating trade-in contract:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create contract' };
  }
};

/**
 * Get contract by transaction ID
 */
export const getContractByTransactionId = async (transactionId: string) => {
  try {
    const { data, error } = await supabase
      .from('lats_trade_in_contracts')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (error) throw error;
    return { success: true, data: data as TradeInContract };
  } catch (error) {
    console.error('Error fetching contract:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch contract' };
  }
};

// ================================================
// DAMAGE ASSESSMENTS API
// ================================================

/**
 * Add damage assessment to transaction
 */
export const addDamageAssessment = async (formData: TradeInDamageAssessmentFormData) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('lats_trade_in_damage_assessments')
      .insert({
        ...formData,
        assessed_by: userData?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as TradeInDamageAssessment };
  } catch (error) {
    console.error('Error adding damage assessment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add damage assessment' };
  }
};

/**
 * Get damage assessments for transaction
 */
export const getDamageAssessments = async (transactionId: string) => {
  try {
    const { data, error } = await supabase
      .from('lats_trade_in_damage_assessments')
      .select(`
        *,
        spare_part:lats_spare_parts(id, name, selling_price)
      `)
      .eq('transaction_id', transactionId);

    if (error) throw error;
    return { success: true, data: data as TradeInDamageAssessment[] };
  } catch (error) {
    console.error('Error fetching damage assessments:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch damage assessments' };
  }
};

