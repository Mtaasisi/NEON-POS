// Trade-In System TypeScript Interfaces
// Matches the database schema in create_trade_in_system.sql

export type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor';
export type TradeInStatus = 'pending' | 'approved' | 'completed' | 'cancelled';
export type RepairStatus = 'pending' | 'in_repair' | 'completed' | 'ready_for_resale';
export type ContractStatus = 'draft' | 'signed' | 'voided';
export type CustomerIdType = 'national_id' | 'passport' | 'drivers_license' | 'other';

// ================================================
// TRADE-IN PRICING
// ================================================

export interface TradeInPrice {
  id: string;
  product_id?: string;
  variant_id?: string;
  device_name: string;
  device_model: string;
  base_trade_in_price: number;
  branch_id?: string;
  // Condition multipliers
  excellent_multiplier: number; // Default 1.0 (100%)
  good_multiplier: number; // Default 0.85 (85%)
  fair_multiplier: number; // Default 0.70 (70%)
  poor_multiplier: number; // Default 0.50 (50%)
  // Device specifications
  storage_capacity?: string;
  battery_health?: number;
  has_charger?: boolean;
  has_original_box?: boolean;
  specifications?: {
    storage?: number;
    battery?: number;
    condition?: number;
    screen?: number;
  };
  notes?: string;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;

  // Joined data (not in database)
  product?: any;
  variant?: any;
  branch?: any;
}

export interface TradeInPriceFormData {
  product_id?: string;
  variant_id?: string;
  device_name: string;
  device_model: string;
  base_trade_in_price: number;
  branch_id?: string;
  excellent_multiplier?: number;
  good_multiplier?: number;
  fair_multiplier?: number;
  poor_multiplier?: number;
  // Device specifications
  storage_capacity?: string;
  battery_health?: number;
  has_charger?: boolean;
  has_original_box?: boolean;
  specifications?: {
    storage?: number;
    battery?: number;
    condition?: number;
    screen?: number;
  };
  notes?: string;
  is_active?: boolean;
}

// ================================================
// TRADE-IN TRANSACTION
// ================================================

export interface DamageItem {
  spare_part_id?: string;
  spare_part_name: string;
  price: number;
  description?: string;
}

export interface DevicePhoto {
  url: string;
  caption?: string;
  timestamp: string;
}

export interface TradeInTransaction {
  id: string;
  transaction_number: string;
  customer_id: string;
  branch_id: string;
  
  // Device being traded in
  device_name: string;
  device_model: string;
  device_imei?: string;
  device_serial_number?: string;
  
  // Pricing
  base_trade_in_price: number;
  condition_rating: ConditionRating;
  condition_multiplier: number;
  condition_description?: string;
  
  // Damage deductions
  total_damage_deductions: number;
  damage_items?: DamageItem[];
  
  // Final valuation
  final_trade_in_value: number;
  
  // New device being purchased
  new_product_id?: string;
  new_variant_id?: string;
  new_device_price?: number;
  customer_payment_amount: number;
  
  // Contract details
  contract_id?: string;
  contract_signed: boolean;
  contract_signed_at?: string;
  customer_signature_data?: string;
  staff_signature_data?: string;
  customer_id_number?: string;
  customer_id_type?: CustomerIdType;
  customer_id_photo_url?: string;
  
  // Device condition photos
  device_photos?: DevicePhoto[];
  
  // Status
  status: TradeInStatus;
  
  // Inventory integration
  inventory_item_id?: string;
  needs_repair: boolean;
  repair_status?: RepairStatus;
  repair_cost: number;
  ready_for_resale: boolean;
  resale_price?: number;
  
  // Sale integration
  sale_id?: string;
  
  // Audit
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  completed_at?: string;
  
  // Notes
  staff_notes?: string;
  internal_notes?: string;
  
  // Joined data (not in database)
  customer?: any;
  branch?: any;
  new_product?: any;
  new_variant?: any;
  contract?: TradeInContract;
  damage_assessments?: TradeInDamageAssessment[];
}

export interface TradeInTransactionFormData {
  customer_id: string;
  device_name: string;
  device_model: string;
  device_imei?: string;
  device_serial_number?: string;
  base_trade_in_price: number;
  condition_rating: ConditionRating;
  condition_description?: string;
  damage_items?: DamageItem[];
  device_photos?: DevicePhoto[];
  customer_id_photo_url?: string;
  new_product_id?: string;
  new_variant_id?: string;
  new_device_price?: number;
  customer_payment_amount?: number;
  customer_id_number?: string;
  customer_id_type?: CustomerIdType;
  needs_repair?: boolean;
  resale_price?: number;
  staff_notes?: string;
}

// ================================================
// TRADE-IN CONTRACT
// ================================================

export interface TradeInContract {
  id: string;
  contract_number: string;
  transaction_id: string;
  
  // Customer information
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  customer_id_number: string;
  customer_id_type: CustomerIdType;
  customer_id_photo_url?: string;
  
  // Device information
  device_name: string;
  device_model: string;
  device_imei: string;
  device_serial_number?: string;
  device_condition: string;
  agreed_value: number;
  
  // Legal terms
  terms_and_conditions: string;
  ownership_declaration: string;
  customer_agreed_terms: boolean;
  
  // Signatures
  customer_signature_data?: string;
  staff_signature_data?: string;
  customer_signed_at?: string;
  staff_signed_at?: string;
  
  // Witnesses
  witness_name?: string;
  witness_signature_data?: string;
  witness_signed_at?: string;
  
  // Status
  status: ContractStatus;
  
  // Audit
  created_by?: string;
  created_at: string;
  updated_at: string;
  voided_at?: string;
  voided_by?: string;
  void_reason?: string;
  
  // Joined data
  transaction?: TradeInTransaction;
  customer?: any;
}

export interface TradeInContractFormData {
  transaction_id: string;
  customer_id_number: string;
  customer_id_type: CustomerIdType;
  customer_agreed_terms: boolean;
  customer_signature_data?: string;
  staff_signature_data?: string;
}

// ================================================
// DAMAGE ASSESSMENT
// ================================================

export interface DamagePhoto {
  url: string;
  caption?: string;
}

export interface TradeInDamageAssessment {
  id: string;
  transaction_id: string;
  damage_type: string;
  damage_description?: string;
  spare_part_id?: string;
  spare_part_name?: string;
  deduction_amount: number;
  assessed_by?: string;
  assessed_at: string;
  damage_photos?: DamagePhoto[];
  
  // Joined data
  spare_part?: any;
}

export interface TradeInDamageAssessmentFormData {
  transaction_id: string;
  damage_type: string;
  damage_description?: string;
  spare_part_id?: string;
  spare_part_name?: string;
  deduction_amount: number;
  damage_photos?: DamagePhoto[];
}

// ================================================
// TRADE-IN SETTINGS
// ================================================

export interface TradeInSettings {
  id: string;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// ================================================
// CALCULATOR DATA
// ================================================

export interface TradeInCalculation {
  base_price: number;
  condition_rating: ConditionRating;
  condition_multiplier: number;
  condition_adjusted_price: number;
  damage_deductions: DamageItem[];
  total_damage_deductions: number;
  final_trade_in_value: number;
  new_device_price?: number;
  customer_payment_amount: number;
}

// ================================================
// API RESPONSES
// ================================================

export interface TradeInPriceResponse {
  success: boolean;
  data?: TradeInPrice;
  error?: string;
}

export interface TradeInPricesListResponse {
  success: boolean;
  data?: TradeInPrice[];
  total?: number;
  error?: string;
}

export interface TradeInTransactionResponse {
  success: boolean;
  data?: TradeInTransaction;
  error?: string;
}

export interface TradeInTransactionsListResponse {
  success: boolean;
  data?: TradeInTransaction[];
  total?: number;
  error?: string;
}

export interface TradeInContractResponse {
  success: boolean;
  data?: TradeInContract;
  error?: string;
}

export interface TradeInCalculationResponse {
  success: boolean;
  calculation?: TradeInCalculation;
  error?: string;
}

// ================================================
// FILTER & SEARCH
// ================================================

export interface TradeInFilters {
  search?: string;
  status?: TradeInStatus;
  condition_rating?: ConditionRating;
  branch_id?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  needs_repair?: boolean;
  ready_for_resale?: boolean;
  min_value?: number;
  max_value?: number;
}

export interface TradeInPriceFilters {
  search?: string;
  branch_id?: string;
  is_active?: boolean;
  device_name?: string;
}

