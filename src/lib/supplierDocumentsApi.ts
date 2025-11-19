import { supabase } from './supabaseClient';

export interface SupplierDocument {
  id: string;
  supplier_id: string;
  document_type: 'contract' | 'license' | 'certificate' | 'insurance' | 'tax_certificate' | 'quality_cert' | 'other';
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  expiry_date?: string;
  notes?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentData {
  supplier_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  expiry_date?: string;
  notes?: string;
}

// Get all documents for a supplier
export const getSupplierDocuments = async (supplierId: string): Promise<SupplierDocument[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_documents')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supplier documents:', error);
    throw error;
  }
};

// Get documents expiring soon (within 60 days)
export const getExpiringDocuments = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('supplier_documents_expiring')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching expiring documents:', error);
    throw error;
  }
};

// Create a new document
export const createSupplierDocument = async (documentData: CreateDocumentData): Promise<SupplierDocument> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('lats_supplier_documents')
      .insert({
        ...documentData,
        uploaded_by: userData?.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating supplier document:', error);
    throw error;
  }
};

// Update a document
export const updateSupplierDocument = async (
  id: string,
  updates: Partial<CreateDocumentData>
): Promise<SupplierDocument> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating supplier document:', error);
    throw error;
  }
};

// Delete a document
export const deleteSupplierDocument = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('lats_supplier_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting supplier document:', error);
    throw error;
  }
};

// Upload file to storage
export const uploadDocumentFile = async (
  file: File,
  supplierId: string
): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${supplierId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('supplier-documents')
      .upload(fileName, file);

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('supplier-documents')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading document file:', error);
    throw error;
  }
};

