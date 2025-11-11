import { supabase } from './supabaseClient';

export interface SupplierRating {
  id: string;
  supplier_id: string;
  purchase_order_id?: string;
  overall_rating: number;
  quality_rating?: number;
  delivery_rating?: number;
  communication_rating?: number;
  price_rating?: number;
  review_text?: string;
  pros?: string;
  cons?: string;
  would_recommend: boolean;
  rated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRatingData {
  supplier_id: string;
  purchase_order_id?: string;
  overall_rating: number;
  quality_rating?: number;
  delivery_rating?: number;
  communication_rating?: number;
  price_rating?: number;
  review_text?: string;
  pros?: string;
  cons?: string;
  would_recommend?: boolean;
}

// Get all ratings for a supplier
export const getSupplierRatings = async (supplierId: string): Promise<SupplierRating[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_ratings')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supplier ratings:', error);
    throw error;
  }
};

// Get supplier rating summary
export const getSupplierRatingSummary = async (supplierId: string) => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_ratings')
      .select('*')
      .eq('supplier_id', supplierId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        qualityAvg: 0,
        deliveryAvg: 0,
        communicationAvg: 0,
        priceAvg: 0,
        recommendationRate: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const summary = {
      averageRating: data.reduce((sum, r) => sum + r.overall_rating, 0) / data.length,
      totalRatings: data.length,
      qualityAvg: data.filter(r => r.quality_rating).reduce((sum, r) => sum + (r.quality_rating || 0), 0) / 
                  data.filter(r => r.quality_rating).length || 0,
      deliveryAvg: data.filter(r => r.delivery_rating).reduce((sum, r) => sum + (r.delivery_rating || 0), 0) / 
                   data.filter(r => r.delivery_rating).length || 0,
      communicationAvg: data.filter(r => r.communication_rating).reduce((sum, r) => sum + (r.communication_rating || 0), 0) / 
                        data.filter(r => r.communication_rating).length || 0,
      priceAvg: data.filter(r => r.price_rating).reduce((sum, r) => sum + (r.price_rating || 0), 0) / 
                data.filter(r => r.price_rating).length || 0,
      recommendationRate: (data.filter(r => r.would_recommend).length / data.length) * 100,
      ratingDistribution: {
        5: data.filter(r => r.overall_rating === 5).length,
        4: data.filter(r => r.overall_rating === 4).length,
        3: data.filter(r => r.overall_rating === 3).length,
        2: data.filter(r => r.overall_rating === 2).length,
        1: data.filter(r => r.overall_rating === 1).length
      }
    };

    return summary;
  } catch (error) {
    console.error('Error fetching rating summary:', error);
    throw error;
  }
};

// Create a new rating
export const createSupplierRating = async (ratingData: CreateRatingData): Promise<SupplierRating> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('lats_supplier_ratings')
      .insert({
        ...ratingData,
        would_recommend: ratingData.would_recommend ?? true,
        rated_by: userData?.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating supplier rating:', error);
    throw error;
  }
};

// Update a rating
export const updateSupplierRating = async (
  id: string,
  updates: Partial<CreateRatingData>
): Promise<SupplierRating> => {
  try {
    const { data, error } = await supabase
      .from('lats_supplier_ratings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating supplier rating:', error);
    throw error;
  }
};

// Delete a rating
export const deleteSupplierRating = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('lats_supplier_ratings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting supplier rating:', error);
    throw error;
  }
};

// Get top-rated suppliers
export const getTopRatedSuppliers = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('lats_suppliers')
      .select('id, name, company_name, average_rating, total_orders')
      .gt('average_rating', 0)
      .order('average_rating', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching top-rated suppliers:', error);
    throw error;
  }
};

