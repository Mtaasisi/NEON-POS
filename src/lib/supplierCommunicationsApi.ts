import { supabase } from './supabaseClient';

export interface SupplierCommunication {
  id: string;
  supplier_id: string;
  communication_type: 'email' | 'phone' | 'meeting' | 'whatsapp' | 'wechat' | 'sms' | 'other';
  direction: 'inbound' | 'outbound';
  subject?: string;
  message?: string;
  notes?: string;
  contact_person?: string;
  response_time_hours?: number;
  follow_up_required: boolean;
  follow_up_date?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommunicationData {
  supplier_id: string;
  communication_type: string;
  direction?: string;
  subject?: string;
  message?: string;
  notes?: string;
  contact_person?: string;
  response_time_hours?: number;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

// Get all communications for a supplier
export const getSupplierCommunications = async (supplierId: string): Promise<SupplierCommunication[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_communications')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supplier communications:', error);
    throw error;
  }
};

// Get communications requiring follow-up
export const getCommunicationsNeedingFollowUp = async (): Promise<SupplierCommunication[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_communications')
      .select('*, supplier:lats_suppliers(name)')
      .eq('follow_up_required', true)
      .lte('follow_up_date', new Date().toISOString())
      .order('follow_up_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching follow-up communications:', error);
    throw error;
  }
};

// Create a new communication log
export const createSupplierCommunication = async (
  communicationData: CreateCommunicationData
): Promise<SupplierCommunication> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('lats_supplier_communications')
      .insert({
        ...communicationData,
        user_id: userData?.user?.id,
        direction: communicationData.direction || 'outbound'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating supplier communication:', error);
    throw error;
  }
};

// Update a communication
export const updateSupplierCommunication = async (
  id: string,
  updates: Partial<CreateCommunicationData>
): Promise<SupplierCommunication> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_communications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating supplier communication:', error);
    throw error;
  }
};

// Delete a communication
export const deleteSupplierCommunication = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('lats_supplier_communications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting supplier communication:', error);
    throw error;
  }
};

// Get communication statistics for a supplier
export const getSupplierCommunicationStats = async (supplierId: string) => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_communications')
      .select('communication_type, direction, response_time_hours')
      .eq('supplier_id', supplierId);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      byType: {} as Record<string, number>,
      avgResponseTime: 0,
      lastContact: null as string | null
    };

    if (data && data.length > 0) {
      // Count by type
      data.forEach(comm => {
        stats.byType[comm.communication_type] = (stats.byType[comm.communication_type] || 0) + 1;
      });

      // Calculate average response time
      const responseTimes = data
        .filter(c => c.response_time_hours)
        .map(c => c.response_time_hours!);
      
      if (responseTimes.length > 0) {
        stats.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }
    }

    return stats;
  } catch (error) {
    console.error('Error fetching communication stats:', error);
    throw error;
  }
};

