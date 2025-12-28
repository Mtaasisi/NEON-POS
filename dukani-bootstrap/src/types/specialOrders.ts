// ================================================
// SPECIAL ORDERS & INSTALLMENTS TYPES
// ================================================

export type SpecialOrderStatus = 
  | 'deposit_received'
  | 'ordered'
  | 'in_transit'
  | 'arrived'
  | 'ready_for_pickup'
  | 'delivered'
  | 'cancelled';

export type InstallmentPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';
export type PaymentFrequency = 'weekly' | 'bi_weekly' | 'monthly' | 'custom';
export type InstallmentPaymentStatus = 'paid' | 'pending' | 'late' | 'waived';

// ================================================
// SPECIAL ORDERS
// ================================================

export interface SpecialOrder {
  id: string;
  order_number: string;
  customer_id: string;
  branch_id?: string;
  
  // Product details
  product_name: string;
  product_description?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  
  // Payment tracking
  deposit_paid: number;
  balance_due: number;
  
  // Order status
  status: SpecialOrderStatus;
  
  // Dates
  order_date: string;
  expected_arrival_date?: string;
  actual_arrival_date?: string;
  delivery_date?: string;
  
  // Supplier info
  supplier_name?: string;
  supplier_reference?: string;
  country_of_origin?: string;
  tracking_number?: string;
  
  // Notes
  notes?: string;
  internal_notes?: string;
  customer_notified_arrival: boolean;
  
  // Audit
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  payments?: SpecialOrderPayment[];
}

export interface SpecialOrderPayment {
  id: string;
  special_order_id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number?: string;
  account_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CreateSpecialOrderInput {
  customer_id: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  deposit_paid: number;
  expected_arrival_date?: string;
  supplier_name?: string;
  supplier_reference?: string;
  country_of_origin?: string;
  tracking_number?: string;
  notes?: string;
  internal_notes?: string;
  payment_method: string;
  account_id: string;
}

export interface UpdateSpecialOrderInput {
  status?: SpecialOrderStatus;
  expected_arrival_date?: string;
  actual_arrival_date?: string;
  tracking_number?: string;
  supplier_reference?: string;
  notes?: string;
  internal_notes?: string;
  customer_notified_arrival?: boolean;
}

export interface RecordSpecialOrderPaymentInput {
  special_order_id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  account_id: string;
  reference_number?: string;
  notes?: string;
}

// ================================================
// INSTALLMENT PLANS
// ================================================

export interface InstallmentPlan {
  id: string;
  plan_number: string;
  customer_id: string;
  sale_id?: string;
  branch_id?: string;
  
  // Amounts
  total_amount: number;
  down_payment: number;
  amount_financed: number;
  total_paid: number;
  balance_due: number;
  
  // Payment schedule
  installment_amount: number;
  number_of_installments: number;
  installments_paid: number;
  payment_frequency: PaymentFrequency;
  
  // Dates
  start_date: string;
  next_payment_date: string;
  end_date: string;
  completion_date?: string;
  
  // Status
  status: InstallmentPlanStatus;
  
  // Penalties
  late_fee_amount: number;
  late_fee_applied: number;
  days_overdue: number;
  
  // Notifications
  last_reminder_sent?: string;
  reminder_count: number;
  
  // Terms
  terms_accepted: boolean;
  terms_accepted_date: string;
  
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  sale?: {
    id: string;
    sale_number: string;
    total_amount: number;
  };
  payments?: InstallmentPayment[];
}

export interface InstallmentPayment {
  id: string;
  installment_plan_id: string;
  customer_id: string;
  
  installment_number: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  due_date: string;
  
  status: InstallmentPaymentStatus;
  days_late: number;
  late_fee: number;
  
  account_id?: string;
  reference_number?: string;
  
  notification_sent: boolean;
  notification_sent_at?: string;
  
  notes?: string;
  created_by?: string;
  created_at: string;
}

// Database table name mapping
export const INSTALLMENT_PAYMENTS_TABLE = 'installment_payments';

export interface CreateInstallmentPlanInput {
  customer_id: string;
  sale_id?: string;
  total_amount: number;
  down_payment: number;
  number_of_installments: number;
  payment_frequency: PaymentFrequency;
  start_date: string;
  late_fee_amount?: number;
  notes?: string;
  payment_method: string;
  account_id: string;
}

export interface RecordInstallmentPaymentInput {
  installment_plan_id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  account_id: string;
  reference_number?: string;
  notes?: string;
}

export interface UpdateInstallmentPlanInput {
  late_fee_amount?: number;
  notes?: string;
  status?: InstallmentPlanStatus;
}

export interface InstallmentSchedule {
  installment_number: number;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_date?: string;
  paid_amount?: number;
}

// ================================================
// STATISTICS & SUMMARY
// ================================================

export interface SpecialOrdersStats {
  total: number;
  deposit_received: number;
  ordered: number;
  in_transit: number;
  arrived: number;
  ready_for_pickup: number;
  delivered: number;
  cancelled: number;
  total_value: number;
  total_deposits: number;
  total_balance_due: number;
}

export interface InstallmentsStats {
  total: number;
  active: number;
  completed: number;
  defaulted: number;
  cancelled: number;
  total_value: number;
  total_paid: number;
  total_balance_due: number;
  overdue_count: number;
  due_this_week: number;
  due_this_month: number;
}

