// Quality Check Service
import { supabase } from '../../../lib/supabaseClient';
import type {
  QualityCheckTemplate,
  QualityCheckCriteria,
  PurchaseOrderQualityCheck,
  QualityCheckItem,
  QualityCheckSummary,
  CreateQualityCheckParams,
  UpdateQualityCheckItemParams,
  CompleteQualityCheckParams
} from '../types/quality-check';

export class QualityCheckService {
  // Fallback methods for when database functions are not available
  static async createQualityCheckFallback(params: CreateQualityCheckParams): Promise<{ success: boolean; data?: string; message?: string }> {
    try {
      console.log('🔄 Creating quality check using fallback method:', params);
      
      // ✅ Get current branch for isolation
      const currentBranchId = typeof localStorage !== 'undefined' ? localStorage.getItem('current_branch_id') : null;
      const { isDataShared } = await import('../../../lib/branchAwareApi');
      const shared = await isDataShared('quality_checks');
      
      // Create quality check record directly
      const { data: qualityCheck, error: qcError } = await supabase
        .from('purchase_order_quality_checks')
        .insert({
          purchase_order_id: params.purchaseOrderId,
          template_id: params.templateId,
          checked_by: params.checkedBy,
          status: 'in_progress',
          branch_id: shared ? null : (currentBranchId || null), // ✅ Branch isolation
          is_shared: shared // ✅ Shared flag
        })
        .select('id')
        .single();

      if (qcError) throw qcError;
      if (!qualityCheck?.id) throw new Error('Failed to create quality check record');

      // Get template criteria
      const { data: criteria, error: criteriaError } = await supabase
        .from('quality_check_criteria')
        .select('*')
        .eq('template_id', params.templateId)
        .order('sort_order');

      if (criteriaError) throw criteriaError;
      if (!criteria || criteria.length === 0) throw new Error('No criteria found for template');

      // Get purchase order items
      const { data: poItems, error: poItemsError } = await supabase
        .from('lats_purchase_order_items')
        .select('*')
        .eq('purchase_order_id', params.purchaseOrderId);

      if (poItemsError) throw poItemsError;
      if (!poItems || poItems.length === 0) throw new Error('No purchase order items found');

      // Create quality check items
      const itemsToInsert = [];
      for (const criterion of criteria) {
        for (const poItem of poItems) {
          itemsToInsert.push({
            quality_check_id: qualityCheck.id,
            purchase_order_item_id: poItem.id,
            criteria_id: criterion.id,
            criteria_name: criterion.name
          });
        }
      }

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('purchase_order_quality_check_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return {
        success: true,
        data: qualityCheck.id,
        message: 'Quality check created successfully (fallback method)'
      };
    } catch (error) {
      console.error('❌ Error in fallback quality check creation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create quality check using fallback method'
      };
    }
  }
  // Templates
  static async getTemplates(): Promise<{ success: boolean; data?: QualityCheckTemplate[]; message?: string }> {
    try {
      const { data, error } = await supabase
        .from('quality_check_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return {
        success: true,
        data: data?.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          isActive: t.is_active,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }))
      };
    } catch (error) {
      console.error('Error fetching templates:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch templates'
      };
    }
  }

  static async getTemplateCriteria(templateId: string): Promise<{ success: boolean; data?: QualityCheckCriteria[]; message?: string }> {
    try {
      const { data, error } = await supabase
        .from('quality_check_criteria')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');

      if (error) throw error;

      return {
        success: true,
        data: data?.map((c: any) => ({
          id: c.id,
          templateId: c.template_id,
          name: c.name,
          description: c.description,
          isRequired: c.is_required,
          sortOrder: c.sort_order,
          createdAt: c.created_at
        })) || []
      };
    } catch (error) {
      console.error('Error fetching criteria:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch criteria'
      };
    }
  }

  // Quality Checks
  static async createQualityCheck(params: CreateQualityCheckParams): Promise<{ success: boolean; data?: string; message?: string }> {
    try {
      console.log('🔄 Creating quality check with params:', params);
      
      const { data, error } = await supabase
        .rpc('create_quality_check_from_template', {
          p_purchase_order_id: params.purchaseOrderId,
          p_template_id: params.templateId,
          p_checked_by: params.checkedBy
        });

      if (error) {
        console.error('❌ RPC error creating quality check:', error);
        throw error;
      }

      console.log('✅ Quality check created successfully (raw):', data);

      // Extract the ID from the response - handle different response formats
      let qualityCheckId: string;
      
      if (Array.isArray(data)) {
        // If it's an array, get the first element
        const firstItem = data[0];
        
        if (typeof firstItem === 'string') {
          qualityCheckId = firstItem;
        } else if (typeof firstItem === 'object' && firstItem !== null) {
          // RPC functions return format like: {create_quality_check_from_template: 'uuid'}
          qualityCheckId = firstItem.create_quality_check_from_template || firstItem.id || String(firstItem);
        } else {
          qualityCheckId = String(firstItem);
        }
      } else if (typeof data === 'object' && data !== null) {
        // If it's an object, try to extract the UUID
        const dataObj = data as any;
        qualityCheckId = dataObj.create_quality_check_from_template || dataObj.id || String(data);
      } else {
        // If it's already a string, use it directly
        qualityCheckId = String(data);
      }

      console.log('✅ Extracted quality check ID:', qualityCheckId);

      return {
        success: true,
        data: qualityCheckId,
        message: 'Quality check created successfully'
      };
    } catch (error) {
      console.error('❌ Error creating quality check:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create quality check';
      if (error instanceof Error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          errorMessage = 'Quality check system not properly configured. Please contact administrator.';
        } else if (error.message.includes('foreign key')) {
          errorMessage = 'Invalid purchase order or template ID provided.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'You do not have permission to create quality checks.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      // Try fallback method if RPC function fails
      if (errorMessage.includes('not properly configured')) {
        console.log('🔄 Attempting fallback method for quality check creation...');
        return await this.createQualityCheckFallback(params);
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  static async getQualityCheck(id: string): Promise<{ success: boolean; data?: PurchaseOrderQualityCheck; message?: string }> {
    try {
      // Validate id
      if (!id || id === '' || id === 'undefined') {
        console.error('Invalid quality check ID provided:', id);
        return {
          success: false,
          message: 'Invalid quality check ID'
        };
      }

      // Fixed: Removed problematic PostgREST relationship syntax
      let query = supabase
        .from('purchase_order_quality_checks')
        .select('*')
        .eq('id', id);
      
      // ✅ Apply branch filtering
      const { addBranchFilter } = await import('../../../lib/branchAwareApi');
      query = await addBranchFilter(query, 'quality_checks');
      
      const { data, error } = await query.single();

      if (error) throw error;

      // Fetch related template separately
      let template = null;
      if (data.template_id) {
        const { data: templateData } = await supabase
          .from('quality_check_templates')
          .select('*')
          .eq('id', data.template_id)
          .single();
        template = templateData;
      }

      return {
        success: true,
        data: {
          id: data.id,
          purchaseOrderId: data.purchase_order_id,
          templateId: data.template_id,
          status: data.status,
          overallResult: data.overall_result,
          checkedBy: data.checked_by,
          checkedAt: data.checked_at,
          notes: data.notes,
          signature: data.signature,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          template: template ? {
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            isActive: template.is_active,
            createdAt: template.created_at,
            updatedAt: template.updated_at
          } : undefined
        }
      };
    } catch (error) {
      console.error('Error fetching quality check:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch quality check'
      };
    }
  }

  static async getQualityChecksByPO(purchaseOrderId: string): Promise<{ success: boolean; data?: PurchaseOrderQualityCheck[]; message?: string }> {
    try {
      // Fixed: Removed problematic PostgREST relationship syntax
      let query = supabase
        .from('purchase_order_quality_checks')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .order('created_at', { ascending: false });
      
      // ✅ Apply branch filtering
      const { addBranchFilter } = await import('../../../lib/branchAwareApi');
      query = await addBranchFilter(query, 'quality_checks');
      
      const { data, error } = await query;

      if (error) throw error;

      // Fetch related templates separately
      if (data && data.length > 0) {
        const templateIds = data.map(check => check.template_id).filter(Boolean);
        if (templateIds.length > 0) {
          const { data: templates } = await supabase
            .from('quality_check_templates')
            .select('*')
            .in('id', templateIds);
          
          const templatesMap = new Map(templates?.map(t => [t.id, t]) || []);
          data.forEach((check: any) => {
            if (check.template_id) {
              check.template = templatesMap.get(check.template_id);
            }
          });
        }
      }

      return {
        success: true,
        data: data?.map((qc: any) => ({
          id: qc.id,
          purchaseOrderId: qc.purchase_order_id,
          templateId: qc.template_id,
          status: qc.status,
          overallResult: qc.overall_result,
          checkedBy: qc.checked_by,
          checkedAt: qc.checked_at,
          notes: qc.notes,
          signature: qc.signature,
          createdAt: qc.created_at,
          updatedAt: qc.updated_at,
          template: qc.template ? {
            id: qc.template.id,
            name: qc.template.name,
            description: qc.template.description,
            category: qc.template.category,
            isActive: qc.template.is_active,
            createdAt: qc.template.created_at,
            updatedAt: qc.template.updated_at
          } : undefined
        }))
      };
    } catch (error) {
      console.error('Error fetching quality checks:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch quality checks'
      };
    }
  }

  // Quality Check Items
  static async getQualityCheckItems(qualityCheckId: string): Promise<{ success: boolean; data?: QualityCheckItem[]; message?: string }> {
    try {
      // Validate qualityCheckId
      if (!qualityCheckId || qualityCheckId === '' || qualityCheckId === 'undefined') {
        console.error('Invalid quality check ID provided:', qualityCheckId);
        return {
          success: false,
          message: 'Invalid quality check ID'
        };
      }

      // Ensure qualityCheckId is a clean string (not JSONB or object)
      const cleanQualityCheckId = typeof qualityCheckId === 'string' 
        ? qualityCheckId.trim() 
        : String(qualityCheckId);

      console.log('🔍 Fetching quality check items for ID:', cleanQualityCheckId);

      // First, get the quality check items
      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_quality_check_items')
        .select('*')
        .eq('quality_check_id', cleanQualityCheckId)
        .order('created_at');

      if (itemsError) throw itemsError;
      if (!items || items.length === 0) {
        console.warn('No quality check items found for ID:', qualityCheckId);
        return {
          success: true,
          data: []
        };
      }

      // Helper function to safely extract UUID string from any value
      const safeExtractId = (value: any): string | null => {
        if (!value) return null;
        // If it's already a string, return it
        if (typeof value === 'string') return value;
        // If it's an object with an id property, extract it
        if (typeof value === 'object' && value.id) return String(value.id);
        // Try to convert to string
        try {
          return String(value);
        } catch {
          return null;
        }
      };

      // Helper function to validate UUID format
      const isValidUUID = (uuid: string | null): boolean => {
        if (!uuid) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      // Get unique IDs for batch fetching - safely extract and validate UUIDs
      const criteriaIds = [...new Set(
        items
          .map(i => safeExtractId(i.criteria_id))
          .filter(id => id && id !== 'undefined' && id !== 'null' && isValidUUID(id))
      )] as string[];
      
      const poItemIds = [...new Set(
        items
          .map(i => safeExtractId(i.purchase_order_item_id))
          .filter(id => id && id !== 'undefined' && id !== 'null' && isValidUUID(id))
      )] as string[];

      console.log('🔍 Extracted IDs - Criteria:', criteriaIds, 'PO Items:', poItemIds);

      // Fetch criteria
      const criteriaMap = new Map();
      if (criteriaIds.length > 0) {
        try {
          const { data: criteria, error: criteriaError } = await supabase
            .from('quality_check_criteria')
            .select('*')
            .in('id', criteriaIds);
          
          if (criteriaError) {
            console.error('Error fetching criteria:', criteriaError);
            throw criteriaError;
          }
          criteria?.forEach((c: any) => criteriaMap.set(c.id, c));
        } catch (err) {
          console.error('❌ Failed to fetch criteria:', err);
          throw err;
        }
      }

      // Fetch purchase order items
      const poItemsMap = new Map();
      if (poItemIds.length > 0) {
        try {
          const { data: poItems, error: poItemsError } = await supabase
            .from('lats_purchase_order_items')
            .select('id, product_id, variant_id, quantity, received_quantity')
            .in('id', poItemIds);
          
          if (poItemsError) {
            console.error('Error fetching purchase order items:', poItemsError);
            throw poItemsError;
          }
          poItems?.forEach((p: any) => poItemsMap.set(p.id, p));
        } catch (err) {
          console.error('❌ Failed to fetch PO items:', err);
          throw err;
        }
      }

      // Get unique product and variant IDs - safely extract and validate
      const productIds = [...new Set(
        Array.from(poItemsMap.values())
          .map((p: any) => safeExtractId(p.product_id))
          .filter(id => id && id !== 'undefined' && id !== 'null')
      )] as string[];
      
      const variantIds = [...new Set(
        Array.from(poItemsMap.values())
          .map((p: any) => safeExtractId(p.variant_id))
          .filter(id => id && id !== 'undefined' && id !== 'null')
      )] as string[];

      console.log('🔍 Extracted product/variant IDs - Products:', productIds, 'Variants:', variantIds);

      // Fetch products
      const productsMap = new Map();
      if (productIds.length > 0) {
        try {
          console.log('🔄 Fetching products with valid UUIDs:', productIds);
          const { data: products, error: productsError } = await supabase
            .from('lats_products')
            .select('id, name, sku')
            .in('id', productIds);
          
          if (productsError) {
            console.error('❌ Error fetching products:', productsError);
            // Don't throw - products are optional for display
          } else {
            products?.forEach((p: any) => productsMap.set(p.id, p));
            console.log(`✅ Fetched ${products?.length || 0} products`);
          }
        } catch (err) {
          console.error('❌ Failed to fetch products:', err);
          // Don't throw - products are optional for display
        }
      } else {
        console.log('ℹ️ No valid product IDs to fetch');
      }

      // Fetch variants
      const variantsMap = new Map();
      if (variantIds.length > 0) {
        try {
          console.log('🔄 Fetching variants with valid UUIDs:', variantIds);
          const { data: variants, error: variantsError } = await supabase
            .from('lats_product_variants')
            .select('id, name, sku')
            .in('id', variantIds);
          
          if (variantsError) {
            console.error('❌ Error fetching variants:', variantsError);
            // Don't throw - variants are optional for display
          } else {
            variants?.forEach((v: any) => variantsMap.set(v.id, v));
            console.log(`✅ Fetched ${variants?.length || 0} variants`);
          }
        } catch (err) {
          console.error('❌ Failed to fetch variants:', err);
          // Don't throw - variants are optional for display
        }
      } else {
        console.log('ℹ️ No valid variant IDs to fetch');
      }

      // Combine all data
      const enrichedItems = items.map((item: any) => {
        const criteriaId = safeExtractId(item.criteria_id);
        const poItemId = safeExtractId(item.purchase_order_item_id);
        
        const criteria = criteriaId ? criteriaMap.get(criteriaId) : undefined;
        const poItem = poItemId ? poItemsMap.get(poItemId) : undefined;
        
        // Safely extract product and variant IDs for lookup
        const productId = poItem ? safeExtractId(poItem.product_id) : null;
        const variantId = poItem ? safeExtractId(poItem.variant_id) : null;
        
        const product = productId ? productsMap.get(productId) : undefined;
        const variant = variantId ? variantsMap.get(variantId) : undefined;

        return {
          id: item.id,
          qualityCheckId: item.quality_check_id,
          purchaseOrderItemId: item.purchase_order_item_id,
          criteriaId: item.criteria_id,
          criteriaName: item.criteria_name,
          result: item.result,
          quantityChecked: item.quantity_checked,
          quantityPassed: item.quantity_passed,
          quantityFailed: item.quantity_failed,
          defectType: item.defect_type,
          defectDescription: item.defect_description,
          actionTaken: item.action_taken,
          notes: item.notes,
          images: item.images || [],
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          criteria: criteria ? {
            id: criteria.id,
            templateId: criteria.template_id,
            name: criteria.name,
            description: criteria.description,
            isRequired: criteria.is_required,
            sortOrder: criteria.sort_order,
            createdAt: criteria.created_at
          } : undefined,
          purchaseOrderItem: poItem ? {
            id: poItem.id,
            productId: poItem.product_id,
            variantId: poItem.variant_id,
            quantityOrdered: poItem.quantity,
            quantityReceived: poItem.received_quantity,
            product: product ? {
              name: product.name,
              sku: product.sku
            } : undefined,
            variant: variant ? {
              name: variant.name,
              sku: variant.sku
            } : undefined
          } : undefined
        };
      });

      return {
        success: true,
        data: enrichedItems
      };
    } catch (error) {
      console.error('Error fetching quality check items:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch quality check items'
      };
    }
  }

  static async updateQualityCheckItem(params: UpdateQualityCheckItemParams): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabase
        .from('purchase_order_quality_check_items')
        .update({
          result: params.result,
          quantity_checked: params.quantityChecked,
          quantity_passed: params.quantityPassed,
          quantity_failed: params.quantityFailed,
          defect_type: params.defectType,
          defect_description: params.defectDescription,
          action_taken: params.actionTaken,
          notes: params.notes,
          images: params.images,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id);

      if (error) throw error;

      return {
        success: true,
        message: 'Quality check item updated successfully'
      };
    } catch (error) {
      console.error('Error updating quality check item:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update quality check item'
      };
    }
  }

  static async completeQualityCheck(params: CompleteQualityCheckParams): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('🔄 Completing quality check with params:', params);
      
      const { data, error } = await supabase
        .rpc('complete_quality_check', {
          p_quality_check_id: params.qualityCheckId,
          p_notes: params.notes,
          p_signature: params.signature
        });

      if (error) {
        console.error('❌ RPC error completing quality check:', error);
        throw error;
      }

      console.log('✅ Quality check completed successfully:', data);

      return {
        success: true,
        message: 'Quality check completed successfully'
      };
    } catch (error) {
      console.error('❌ Error completing quality check:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to complete quality check';
      if (error instanceof Error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          errorMessage = 'Quality check completion system not properly configured. Please contact administrator.';
        } else if (error.message.includes('not found')) {
          errorMessage = 'Quality check not found. It may have been deleted or the ID is invalid.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'You do not have permission to complete this quality check.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid data provided for quality check completion.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  static async getQualityCheckSummary(purchaseOrderId: string): Promise<{ success: boolean; data?: QualityCheckSummary; message?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('get_quality_check_summary', {
          p_purchase_order_id: purchaseOrderId
        });

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          data: undefined,
          message: 'No quality check found'
        };
      }

      const summary = data[0];
      return {
        success: true,
        data: {
          qualityCheckId: summary.quality_check_id,
          status: summary.status,
          overallResult: summary.overall_result,
          checkedBy: summary.checked_by,
          checkedAt: summary.checked_at,
          totalItems: summary.total_items,
          passedItems: summary.passed_items,
          failedItems: summary.failed_items,
          pendingItems: summary.pending_items
        }
      };
    } catch (error) {
      console.error('Error fetching quality check summary:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch quality check summary'
      };
    }
  }

  static async receiveQualityCheckedItems(
    qualityCheckId: string,
    purchaseOrderId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('receive_quality_checked_items', {
          p_quality_check_id: qualityCheckId,
          p_purchase_order_id: purchaseOrderId
        });

      if (error) throw error;

      return {
        success: true,
        message: (data as any)?.message || 'Quality-checked items received to inventory successfully'
      };
    } catch (error) {
      console.error('Error receiving quality-checked items:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to receive items to inventory'
      };
    }
  }
}
