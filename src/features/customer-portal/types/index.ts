// Customer Portal Types

export interface CustomerUser {
  id: string;
  name: string;
  email?: string;
  phone: string;
  profileImage?: string;
  loyaltyPoints: number;
  loyaltyTier?: 'interested' | 'engaged' | 'payment_customer' | 'active' | 'regular' | 'premium' | 'vip';
  createdAt: string;
  lastPurchase?: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  date: string;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  items: CustomerOrderItem[];
  paymentMethod?: string;
  deliveryStatus?: 'pending' | 'shipped' | 'delivered';
}

export interface CustomerOrderItem {
  id: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface CustomerProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  category?: string;
  brand?: string;
  imageUrl?: string;
  images?: string[];
  inStock: boolean;
  stockQuantity?: number;
  variants?: CustomerProductVariant[];
  specifications?: Record<string, string>;
  rating?: number;
  reviewCount?: number;
}

export interface CustomerProductVariant {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  inStock: boolean;
  stockQuantity?: number;
  imageUrl?: string;
}

export interface CustomerDevice {
  id: string;
  deviceType: string;
  model: string;
  status: 'pending' | 'diagnosed' | 'in-repair' | 'completed' | 'ready' | 'delivered';
  submittedAt: string;
  estimatedCompletion?: string;
  problemDescription: string;
  diagnosis?: string;
  cost?: number;
  technicianName?: string;
}

export interface CustomerAppointment {
  id: string;
  date: string;
  time: string;
  type: 'repair' | 'consultation' | 'pickup' | 'other';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  location?: string;
}

export interface CustomerInstallment {
  id: string;
  productName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  nextPaymentDate: string;
  nextPaymentAmount: number;
  installmentSchedule: InstallmentPayment[];
}

export interface InstallmentPayment {
  id: string;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  imageUrl?: string;
  category: 'discount' | 'product' | 'service' | 'voucher';
  expiryDate?: string;
}

export interface CustomerNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'device' | 'appointment' | 'loyalty' | 'promotion';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

