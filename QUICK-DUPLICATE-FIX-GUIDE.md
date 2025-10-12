# ⚡ Quick Duplicate Functions Fix Guide

## 🎯 Top 3 Critical Fixes (Do These First!)

### 1️⃣ Status Functions (142 duplicates) - 2 hours
**Create:** `/src/utils/statusUtils.ts`

```typescript
export type EntityType = 'device' | 'payment' | 'order' | 'appointment' | 'return';

const STATUS_COLORS = {
  device: {
    pending: 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  },
  payment: {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-purple-100 text-purple-800',
  },
  order: {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    received: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  },
  // Add more types...
};

export const getStatusColor = (status: string, type: EntityType = 'device'): string => {
  return STATUS_COLORS[type]?.[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

export const getStatusIcon = (status: string): JSX.Element => {
  const icons = {
    pending: <Clock className="w-4 h-4" />,
    'in-progress': <RefreshCw className="w-4 h-4" />,
    completed: <CheckCircle className="w-4 h-4" />,
    failed: <XCircle className="w-4 h-4" />,
  };
  return icons[status.toLowerCase()] || <Circle className="w-4 h-4" />;
};
```

**Replace in 70+ files:**
```bash
# Find all instances
grep -r "const getStatusColor" src/ --include="*.tsx"

# Replace pattern:
# OLD: const getStatusColor = (status: string) => { ... }
# NEW: import { getStatusColor } from '@/utils/statusUtils';
```

---

### 2️⃣ Currency Formatting (74 duplicates) - 1 hour
**✅ ALREADY EXISTS:** `/src/lib/currencyUtils.ts`

**Action:** Just replace all 74 instances with imports!

```typescript
// ❌ REMOVE these from all files:
const formatCurrency = (amount: number) => { ... }
const formatMoney = (amount: number) => { ... }

// ✅ ADD this import instead:
import { formatCurrency } from '@/lib/currencyUtils';
```

**Quick Find & Replace:**
```bash
# Find all files with duplicate formatCurrency
grep -r "const formatCurrency\|const formatMoney" src/ --include="*.tsx" -l

# Files to update (74 total):
# - src/features/lats/pages/PurchaseOrderDetailPage.tsx
# - src/features/lats/pages/SalesReportsPage.tsx
# - src/features/shared/pages/DashboardPage.tsx
# ... and 71 more
```

---

### 3️⃣ Date Formatting (30 duplicates) - 30 minutes
**✅ ALREADY EXISTS:** `/src/features/lats/lib/format.ts`

```typescript
// ❌ REMOVE from all files:
const formatDate = (dateString: string) => { ... }

// ✅ ADD import:
import { date, dateTime, relativeTime } from '@/features/lats/lib/format';

// Usage:
date(someDate)                    // "Oct 11, 2025"
dateTime(someDate)                // "Oct 11, 2025, 10:30 AM"
relativeTime(someDate)            // "2 hours ago"
```

---

## 📦 Quick Implementation Checklist

### Day 1: Setup (1 hour)
- [ ] Create `/src/utils/statusUtils.ts`
- [ ] Create `/src/utils/crudUtils.ts` 
- [ ] Add tests for new utilities

### Day 2: Status Functions (2 hours)
- [ ] Replace all `getStatusColor` (70 instances)
- [ ] Replace all `getStatusIcon` (72 instances)
- [ ] Test on 3-5 pages

### Day 3: Format Functions (2 hours)
- [ ] Replace all `formatCurrency/formatMoney` (74 instances)
- [ ] Replace all `formatDate` (30 instances)
- [ ] Test currency display across app

### Day 4: CRUD Functions (3 hours)
- [ ] Create `useDeleteHandler` hook
- [ ] Replace `handleDelete` in 10 files (test)
- [ ] If successful, replace remaining 37 files

### Day 5: Testing & Documentation (2 hours)
- [ ] Full app testing
- [ ] Update team documentation
- [ ] Code review

**Total Time: ~10 hours** to fix 300+ duplications!

---

## 🚀 Automated Fix Commands

### 1. Find All Duplicate Patterns
```bash
# Status functions
grep -rn "const getStatusColor" src/ --include="*.tsx" > duplicates_status.txt

# Currency functions  
grep -rn "const formatCurrency\|const formatMoney" src/ --include="*.tsx" > duplicates_currency.txt

# Date functions
grep -rn "const formatDate" src/ --include="*.tsx" > duplicates_date.txt

# Delete handlers
grep -rn "const handleDelete" src/ --include="*.tsx" > duplicates_delete.txt
```

### 2. Create Utility Files
```bash
# Create utils directory if not exists
mkdir -p src/utils

# Copy template files
touch src/utils/statusUtils.ts
touch src/utils/crudUtils.ts
touch src/utils/uiUtils.ts
```

---

## 💪 Reusable Hooks to Create

### useDeleteHandler
```typescript
// src/hooks/useDeleteHandler.ts
import { showToast } from '@/components/ui/ImprovedToast';

export const useDeleteHandler = (
  entityName: string,
  deleteFunction: (id: string) => Promise<void>,
  onSuccess?: () => void
) => {
  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${entityName}?`)) return;
    
    try {
      await deleteFunction(id);
      showToast.success({ message: `${entityName} deleted successfully` });
      onSuccess?.();
    } catch (error) {
      showToast.error({ message: `Failed to delete ${entityName}` });
    }
  };
  
  return { handleDelete };
};

// Usage:
const { handleDelete } = useDeleteHandler('product', api.deleteProduct, refreshList);
```

### useFormSubmit
```typescript
// src/hooks/useFormSubmit.ts
export const useFormSubmit = <T>(
  submitFn: (data: T) => Promise<void>,
  options?: { 
    successMessage?: string;
    onSuccess?: () => void;
    validateFn?: (data: T) => boolean;
  }
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: T) => {
    if (options?.validateFn && !options.validateFn(data)) return;
    
    setIsSubmitting(true);
    try {
      await submitFn(data);
      showToast.success({ message: options?.successMessage || 'Success!' });
      options?.onSuccess?.();
    } catch (error) {
      showToast.error({ message: 'Submission failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting };
};

// Usage:
const { handleSubmit, isSubmitting } = useFormSubmit(
  api.createProduct,
  { successMessage: 'Product created!', onSuccess: () => navigate('/products') }
);
```

---

## 📊 Impact Metrics

| Action | Files Affected | Time to Fix | Lines Reduced |
|--------|---------------|-------------|---------------|
| Status Utils | 142 files | 2 hours | ~2,000 lines |
| Currency Format | 74 files | 1 hour | ~1,500 lines |
| Date Format | 30 files | 30 min | ~600 lines |
| Delete Handlers | 47 files | 2 hours | ~1,000 lines |
| **TOTAL** | **293 files** | **5.5 hours** | **~5,100 lines** |

---

## ⚠️ Common Pitfalls to Avoid

1. **Don't refactor everything at once** - Start with one category
2. **Test after each batch** - Don't break the app
3. **Keep old code commented** temporarily - Easy rollback
4. **Update imports** - Don't forget to add imports
5. **Check TypeScript types** - Ensure type compatibility

---

## ✅ Verification Checklist

After implementing each fix:

- [ ] No TypeScript errors
- [ ] No runtime errors in console
- [ ] UI displays correctly
- [ ] All tests pass
- [ ] Code review approved
- [ ] Documentation updated

---

## 🎯 Priority Order

1. **Week 1:** Status functions (biggest impact on UX)
2. **Week 2:** Format functions (currency & date)
3. **Week 3:** CRUD handlers (delete, save, submit)
4. **Week 4:** Search, filter, sort functions
5. **Week 5:** Polish & documentation

---

## 📞 Need Help?

See the full report: `DUPLICATE-FUNCTIONS-REPORT.md`

**Quick Questions:**
- Which file should I edit? → Check the detailed report
- Where's the utility? → Check "Existing Utility Found" sections
- How to test? → Run `npm test` after changes

**Remember:** The goal is not perfection, but improvement! Start small, test often, and iterate.

