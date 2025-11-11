import { supabase } from './supabaseClient';

export interface SupplierContract {
  id: string;
  supplier_id: string;
  contract_number?: string;
  contract_name?: string;
  start_date: string;
  end_date: string;
  contract_value?: number;
  currency: string;
  auto_renew: boolean;
  renewal_notice_days: number;
  payment_terms?: string;
  terms_and_conditions?: string;
  document_url?: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled' | 'renewed';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContractData {
  supplier_id: string;
  contract_number?: string;
  contract_name?: string;
  start_date: string;
  end_date: string;
  contract_value?: number;
  currency?: string;
  auto_renew?: boolean;
  renewal_notice_days?: number;
  payment_terms?: string;
  terms_and_conditions?: string;
  document_url?: string;
  notes?: string;
}

// Get all contracts for a supplier
export const getSupplierContracts = async (supplierId: string): Promise<SupplierContract[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_contracts')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('end_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supplier contracts:', error);
    throw error;
  }
};

// Get active contract for a supplier
export const getActiveSupplierContract = async (supplierId: string): Promise<SupplierContract | null> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_contracts')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error fetching active contract:', error);
    throw error;
  }
};

// Get contracts expiring soon
export const getExpiringContracts = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('supplier_contracts_expiring')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching expiring contracts:', error);
    throw error;
  }
};

// Create a new contract
export const createSupplierContract = async (contractData: CreateContractData): Promise<SupplierContract> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('lats_supplier_contracts')
      .insert({
        ...contractData,
        currency: contractData.currency || 'TZS',
        auto_renew: contractData.auto_renew ?? false,
        renewal_notice_days: contractData.renewal_notice_days || 30,
        status: 'active',
        created_by: userData?.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating supplier contract:', error);
    throw error;
  }
};

// Update a contract
export const updateSupplierContract = async (
  id: string,
  updates: Partial<CreateContractData & { status?: string }>
): Promise<SupplierContract> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_contracts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating supplier contract:', error);
    throw error;
  }
};

// Delete a contract
export const deleteSupplierContract = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('lats_supplier_contracts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting supplier contract:', error);
    throw error;
  }
};

// Renew a contract
export const renewSupplierContract = async (
  contractId: string,
  newEndDate: string,
  newContractValue?: number
): Promise<SupplierContract> => {
  try {
    // Get the existing contract
    const { data: existingContract, error: fetchError } = await supabase
      .from('lats_supplier_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (fetchError) throw fetchError;

    // Mark old contract as renewed
    await updateSupplierContract(contractId, { status: 'renewed' });

    // Create new contract
    const newContract = await createSupplierContract({
      supplier_id: existingContract.supplier_id,
      contract_number: existingContract.contract_number,
      contract_name: existingContract.contract_name,
      start_date: existingContract.end_date,
      end_date: newEndDate,
      contract_value: newContractValue || existingContract.contract_value,
      currency: existingContract.currency,
      auto_renew: existingContract.auto_renew,
      renewal_notice_days: existingContract.renewal_notice_days,
      payment_terms: existingContract.payment_terms,
      terms_and_conditions: existingContract.terms_and_conditions,
      notes: `Renewed from contract ${existingContract.contract_number || contractId}`
    });

    return newContract;
  } catch (error) {
    console.error('Error renewing supplier contract:', error);
    throw error;
  }
};

// Check and update expired contracts (should be run as a cron job)
export const updateExpiredContracts = async (): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('lats_supplier_contracts')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('end_date', today)
      .select();

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('Error updating expired contracts:', error);
    throw error;
  }
};

