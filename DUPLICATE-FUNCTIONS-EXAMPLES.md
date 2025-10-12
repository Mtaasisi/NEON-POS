# 📝 Duplicate Functions - Before & After Examples

## Example 1: Status Color Function (142 duplicates)

### ❌ BEFORE - Duplicated in 70+ files

```typescript
// File: src/features/lats/pages/PurchaseOrdersPage.tsx (line 189)
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-blue-100 text-blue-800';
    case 'received': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// File: src/features/payments/components/PaymentTransactions.tsx (line 818)
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'paid': return 'bg-green-100 text-green-800';
    case 'failed': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// File: src/features/devices/components/DeviceRepairDetailModal.tsx (line 643)
const getStatusColor = (status: string) => {
  if (status === 'pending') return 'yellow';
  if (status === 'in-progress') return 'blue';
  if (status === 'completed') return 'green';
  return 'gray';
};

// ... SAME FUNCTION IN 67+ MORE FILES! 😱
```

### ✅ AFTER - Centralized utility

```typescript
// File: src/utils/statusUtils.ts (NEW FILE)
export type EntityType = 'device' | 'payment' | 'order' | 'appointment';

const STATUS_COLORS = {
  device: {
    pending: 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  },
  payment: {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  },
  order: {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    received: 'bg-green-100 text-green-800',
  },
};

export const getStatusColor = (status: string, type: EntityType): string => {
  return STATUS_COLORS[type]?.[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

// Now in ALL 70 files - just import!
import { getStatusColor } from '@/utils/statusUtils';

// Usage:
<Badge className={getStatusColor(order.status, 'order')}>
  {order.status}
</Badge>
```

**Impact:** 
- 🎯 ONE place to update instead of 70!
- 🎨 Consistent UI across entire app
- 📏 ~2,000 lines of code removed
- 🐛 Fix bugs once, fixed everywhere

---

## Example 2: Currency Formatting (74 duplicates)

### ❌ BEFORE - Duplicated in 74 files

```typescript
// File: src/features/lats/pages/PurchaseOrdersPage.tsx (line 205)
const formatCurrency = (amount: number | string, currencyCode: string = 'TZS') => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount || 0);
  if (!numAmount || numAmount === 0) return 'TSh 0';
  if (currencyCode === 'TZS' || !currencyCode) {
    return `TSh ${numAmount.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  }
  // ... 20 more lines
};

// File: src/features/lats/pages/SalesReportsPage.tsx (line 462)
const formatMoney = (amount: number) => {
  return `TSh ${amount.toLocaleString('en-TZ', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  })}`;
};

// File: src/features/shared/pages/DashboardPage.tsx (line 102)  
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0
  }).format(amount);
};

// ... DIFFERENT IMPLEMENTATIONS IN 71 MORE FILES! 😱
// Some show "TSh", some show "TZS", some handle decimals differently!
```

### ✅ AFTER - Use existing utility

```typescript
// File: src/lib/currencyUtils.ts (ALREADY EXISTS!) ✅
export const formatCurrency = (amount: number, currency: Currency): string => {
  // Robust implementation that handles all cases
  // Supports TZS, USD, EUR, KES, UGX
  // Proper decimal handling
  // Consistent formatting
};

// Now in ALL 74 files - just import!
import { formatCurrency } from '@/lib/currencyUtils';

// Usage:
<span>{formatCurrency(product.price, 'TZS')}</span>
// Output: "TSh 25,000"
```

**Impact:**
- 🎯 Use EXISTING utility (no new code!)
- 💰 Consistent currency display
- 📏 ~1,500 lines removed
- 🐛 Currency bugs fixed everywhere

---

## Example 3: Date Formatting (30 duplicates)

### ❌ BEFORE - Duplicated in 30 files

```typescript
// File: src/features/lats/pages/PurchaseOrdersPage.tsx (line 237)
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// File: src/features/lats/pages/SalesReportsPage.tsx (line 471)
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// File: src/features/devices/components/DeviceCard.tsx (line 203)
const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

// ... 27 MORE VARIATIONS! 😱
```

### ✅ AFTER - Use existing utility

```typescript
// File: src/features/lats/lib/format.ts (ALREADY EXISTS!) ✅
export function date(
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    }).format(dateObj);
  } catch (error) {
    return dateObj.toLocaleDateString();
  }
}

export function dateTime(date: Date | string): string { /* ... */ }
export function relativeTime(date: Date | string): string { /* ... */ }

// Now in ALL 30 files - just import!
import { date, dateTime, relativeTime } from '@/features/lats/lib/format';

// Usage:
<span>{date(order.created_at)}</span>
// Output: "Oct 11, 2025"

<span>{dateTime(order.created_at)}</span>  
// Output: "Oct 11, 2025, 10:30 AM"

<span>{relativeTime(order.created_at)}</span>
// Output: "2 hours ago"
```

**Impact:**
- 🎯 Use EXISTING utility
- 📅 Consistent date display
- 📏 ~600 lines removed

---

## Example 4: Delete Handler (47 duplicates)

### ❌ BEFORE - Duplicated in 47 files

```typescript
// File: src/features/lats/pages/PurchaseOrdersPage.tsx (line 160)
const handleDeleteOrder = async (orderId: string) => {
  if (!confirm('Are you sure you want to delete this purchase order?')) return;
  
  setIsDeleting(true);
  try {
    const { error } = await supabase
      .from('lats_purchase_orders')
      .delete()
      .eq('id', orderId);
      
    if (error) throw error;
    
    toast.success('Purchase order deleted successfully');
    await loadOrders();
  } catch (error) {
    console.error('Delete error:', error);
    toast.error('Failed to delete purchase order');
  } finally {
    setIsDeleting(false);
  }
};

// File: src/features/users/pages/UserManagementPage.tsx (line 212)
const handleDeleteUser = async (userId: string) => {
  if (!window.confirm('Are you sure you want to delete this user?')) return;
  
  try {
    await apiClient.delete(`/users/${userId}`);
    showToast.success({ message: 'User deleted successfully' });
    loadData();
  } catch (error) {
    showToast.error({ message: 'Failed to delete user' });
  }
};

// File: src/features/employees/pages/EmployeeManagementPage.tsx (line 200)
const handleDeleteEmployee = (employeeId: string) => {
  const confirmDelete = confirm('Delete this employee?');
  if (!confirmDelete) return;
  
  // Delete logic...
  alert('Employee deleted');
};

// ... 44 MORE VARIATIONS! 😱
```

### ✅ AFTER - Reusable hook

```typescript
// File: src/hooks/useDeleteHandler.ts (NEW FILE)
import { useState } from 'react';
import { showToast } from '@/components/ui/ImprovedToast';

export const useDeleteHandler = (
  entityName: string,
  deleteFunction: (id: string) => Promise<void>,
  onSuccess?: () => void
) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this ${entityName}?`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteFunction(id);
      showToast.success({ message: `${entityName} deleted successfully` });
      onSuccess?.();
    } catch (error) {
      console.error(`Delete ${entityName} error:`, error);
      showToast.error({ 
        message: `Failed to delete ${entityName}`,
        description: error instanceof Error ? error.message : undefined
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return { handleDelete, isDeleting };
};

// Now in ALL 47 files - just use the hook!
import { useDeleteHandler } from '@/hooks/useDeleteHandler';

// In PurchaseOrdersPage:
const { handleDelete, isDeleting } = useDeleteHandler(
  'purchase order',
  (id) => supabase.from('lats_purchase_orders').delete().eq('id', id),
  loadOrders
);

// In UserManagementPage:
const { handleDelete, isDeleting } = useDeleteHandler(
  'user',
  (id) => apiClient.delete(`/users/${id}`),
  loadData
);

// Usage:
<button onClick={() => handleDelete(order.id)} disabled={isDeleting}>
  {isDeleting ? 'Deleting...' : 'Delete'}
</button>
```

**Impact:**
- 🎯 Consistent delete behavior
- 🎨 Consistent confirmation messages
- 🎨 Loading states handled automatically
- 📏 ~1,000 lines removed
- 🐛 Better error handling everywhere

---

## Example 5: Form Submit Handler (41 duplicates)

### ❌ BEFORE

```typescript
// Duplicated in 41 files with variations:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setIsSubmitting(true);
  try {
    await submitFunction(formData);
    toast.success('Success!');
    navigate('/success');
  } catch (error) {
    toast.error('Failed');
  } finally {
    setIsSubmitting(false);
  }
};
```

### ✅ AFTER - Reusable hook

```typescript
// File: src/hooks/useFormSubmit.ts (NEW FILE)
export const useFormSubmit = <T>(
  submitFn: (data: T) => Promise<void>,
  options?: {
    validateFn?: (data: T) => boolean;
    successMessage?: string;
    onSuccess?: () => void;
  }
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent, data: T) => {
    e.preventDefault();
    
    if (options?.validateFn && !options.validateFn(data)) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitFn(data);
      showToast.success({ 
        message: options?.successMessage || 'Successfully submitted' 
      });
      options?.onSuccess?.();
    } catch (error) {
      showToast.error({ 
        message: error instanceof Error ? error.message : 'Submission failed' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting };
};

// Usage in any form:
const { handleSubmit, isSubmitting } = useFormSubmit(
  api.createProduct,
  {
    validateFn: validateProductForm,
    successMessage: 'Product created!',
    onSuccess: () => navigate('/products')
  }
);

<form onSubmit={(e) => handleSubmit(e, formData)}>
  {/* form fields */}
  <button disabled={isSubmitting}>
    {isSubmitting ? 'Saving...' : 'Save'}
  </button>
</form>
```

---

## 📊 Summary Table

| Function Type | Before (Lines) | After (Lines) | Savings | Files Affected |
|--------------|----------------|---------------|---------|----------------|
| Status Utils | ~2,000 | ~100 | 95% | 142 files |
| Currency Format | ~1,500 | ~50 | 97% | 74 files |
| Date Format | ~600 | ~40 | 93% | 30 files |
| Delete Handlers | ~1,000 | ~60 | 94% | 47 files |
| Submit Handlers | ~800 | ~50 | 94% | 41 files |
| **TOTAL** | **~5,900** | **~300** | **95%** | **334 files** |

---

## 🎯 Key Takeaways

1. **You already have some utilities!** (`currencyUtils.ts`, `format.ts`)
2. **Just need to create a few more** (`statusUtils.ts`, CRUD hooks)
3. **Massive code reduction** (~5,600 lines removed)
4. **Better maintainability** (fix once, works everywhere)
5. **Consistent UX** (same look & feel everywhere)

---

## 🚀 Next Steps

1. Review these examples with your team
2. Start with Status Utils (biggest impact)
3. Use existing utilities for currency & dates
4. Create CRUD hooks for common operations
5. Gradually migrate existing code

**Good luck! 🎉**

