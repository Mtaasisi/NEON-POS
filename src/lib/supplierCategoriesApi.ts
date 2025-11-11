import { supabase } from './supabaseClient';

export interface SupplierCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierTag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  created_at: string;
}

// Get all categories
export const getAllSupplierCategories = async (): Promise<SupplierCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supplier categories:', error);
    throw error;
  }
};

// Get categories for a supplier
export const getSupplierCategories = async (supplierId: string): Promise<SupplierCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_category_mapping')
      .select(`
        category:lats_supplier_categories(*)
      `)
      .eq('supplier_id', supplierId);

    if (error) throw error;
    return data?.map(item => item.category).filter(Boolean) || [];
  } catch (error) {
    console.error('Error fetching supplier categories:', error);
    throw error;
  }
};

// Assign categories to supplier
export const assignCategoriesToSupplier = async (
  supplierId: string,
  categoryIds: string[]
): Promise<void> => {
  try {
    // First, remove existing categories
    await supabase
      .from('lats_supplier_category_mapping')
      .delete()
      .eq('supplier_id', supplierId);

    // Then add new categories
    if (categoryIds.length > 0) {
      const mappings = categoryIds.map(categoryId => ({
        supplier_id: supplierId,
        category_id: categoryId
      }));

      const { error } = await supabase
        .from('lats_supplier_category_mapping')
        .insert(mappings);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error assigning categories to supplier:', error);
    throw error;
  }
};

// Create a new category
export const createSupplierCategory = async (
  categoryData: Omit<SupplierCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<SupplierCategory> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_categories')
      .insert(categoryData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating supplier category:', error);
    throw error;
  }
};

// ==================== TAGS ====================

// Get all tags
export const getAllSupplierTags = async (): Promise<SupplierTag[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_tags')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supplier tags:', error);
    throw error;
  }
};

// Get tags for a supplier
export const getSupplierTags = async (supplierId: string): Promise<SupplierTag[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_tag_mapping')
      .select(`
        tag:lats_supplier_tags(*)
      `)
      .eq('supplier_id', supplierId);

    if (error) throw error;
    return data?.map(item => item.tag).filter(Boolean) || [];
  } catch (error) {
    console.error('Error fetching supplier tags:', error);
    throw error;
  }
};

// Assign tags to supplier
export const assignTagsToSupplier = async (
  supplierId: string,
  tagIds: string[]
): Promise<void> => {
  try {
    // First, remove existing tags
    await supabase
      .from('lats_supplier_tag_mapping')
      .delete()
      .eq('supplier_id', supplierId);

    // Then add new tags
    if (tagIds.length > 0) {
      const mappings = tagIds.map(tagId => ({
        supplier_id: supplierId,
        tag_id: tagId
      }));

      const { error } = await supabase
        .from('lats_supplier_tag_mapping')
        .insert(mappings);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error assigning tags to supplier:', error);
    throw error;
  }
};

// Create a new tag
export const createSupplierTag = async (
  tagData: Omit<SupplierTag, 'id' | 'created_at'>
): Promise<SupplierTag> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_tags')
      .insert(tagData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating supplier tag:', error);
    throw error;
  }
};

// Get suppliers by category
export const getSuppliersByCategory = async (categoryId: string) => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_category_mapping')
      .select(`
        supplier:lats_suppliers(*)
      `)
      .eq('category_id', categoryId);

    if (error) throw error;
    return data?.map(item => item.supplier).filter(Boolean) || [];
  } catch (error) {
    console.error('Error fetching suppliers by category:', error);
    throw error;
  }
};

// Get suppliers by tag
export const getSuppliersByTag = async (tagId: string) => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_tag_mapping')
      .select(`
        supplier:lats_suppliers(*)
      `)
      .eq('tag_id', tagId);

    if (error) throw error;
    return data?.map(item => item.supplier).filter(Boolean) || [];
  } catch (error) {
    console.error('Error fetching suppliers by tag:', error);
    throw error;
  }
};

