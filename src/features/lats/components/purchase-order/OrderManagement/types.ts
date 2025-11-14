import { PurchaseOrder, Supplier, Product, ProductVariant } from '../../../../types/inventory';

export interface OrderCardProps {
  order: PurchaseOrder;
  isSelected: boolean;
  onSelect: (orderId: string) => void;
  viewMode: 'list' | 'grid';
  onViewDetails: (order: PurchaseOrder) => void;
  onEdit: (order: PurchaseOrder) => void;
  onPrint: (order: PurchaseOrder) => void;
  onDelete: (orderId: string) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
}

export interface OrderDetailViewModalProps {
  order: PurchaseOrder;
  onClose: () => void;
  onStatusUpdate: (orderId: string, newStatus: string) => Promise<void>;
  onEdit: (order: PurchaseOrder) => void;
  onPrint: (order: PurchaseOrder) => void;
  onDelete: (orderId: string) => void;
}

export interface PaymentHistoryModalProps {
  order: PurchaseOrder;
  onClose: () => void;
  onAddPayment: (orderId: string) => void;
}

export interface OrderFilterState {
  status: string;
  supplier: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery: string;
}

export interface OrderSortState {
  field: keyof PurchaseOrder | '';
  direction: 'asc' | 'desc';
}

export interface OrderManagementContextType {
  orders: PurchaseOrder[];
  filteredOrders: PurchaseOrder[];
  selectedOrders: string[];
  viewMode: 'list' | 'grid';
  isLoading: boolean;
  error: string | null;
  filters: OrderFilterState;
  sort: OrderSortState;
  pagination: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
  setViewMode: (mode: 'list' | 'grid') => void;
  setSelectedOrders: (ids: string[]) => void;
  setFilters: (filters: Partial<OrderFilterState>) => void;
  setSort: (sort: Partial<OrderSortState>) => void;
  setPagination: (pagination: Partial<{
    currentPage: number;
    itemsPerPage: number;
  }>) => void;
  refreshOrders: () => Promise<void>;
  createOrder: (data: any) => Promise<PurchaseOrder>;
  updateOrder: (id: string, data: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  deleteOrder: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: string) => Promise<void>;
  exportOrders: (format: 'csv' | 'pdf' | 'excel') => Promise<void>;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
  status: 'pending' | 'received' | 'partial' | 'cancelled';
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  transactionId?: string;
  date: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderHistoryEntry {
  id: string;
  orderId: string;
  action: string;
  description: string;
  performedBy: string;
  performedById: string;
  timestamp: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

// Type guards
export function isPurchaseOrder(order: any): order is PurchaseOrder {
  return (
    order && 
    typeof order === 'object' && 
    'id' in order && 
    'orderNumber' in order && 
    'status' in order
  );
}

export function isSupplier(supplier: any): supplier is Supplier {
  return (
    supplier && 
    typeof supplier === 'object' && 
    'id' in supplier && 
    'name' in supplier
  );
}

export function isProduct(product: any): product is Product {
  return (
    product && 
    typeof product === 'object' && 
    'id' in product && 
    'name' in product && 
    'sku' in product
  );
}

export function isProductVariant(variant: any): variant is ProductVariant {
  return (
    variant && 
    typeof variant === 'object' && 
    'id' in variant && 
    'sku' in variant
  );
}
