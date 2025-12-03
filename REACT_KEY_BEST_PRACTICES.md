# React Key Best Practices Guide

## 🎯 Purpose
This guide helps prevent duplicate key warnings and ensures optimal React rendering performance across the NEON POS application.

---

## ⚠️ Common Issues

### 1. Duplicate Keys in Lists
```tsx
// ❌ BAD: Using potentially duplicate IDs directly
{accounts.map(account => (
  <div key={account.id}>{account.name}</div>
))}
```

### 2. Using Array Index as Key (Anti-pattern for dynamic lists)
```tsx
// ❌ BAD: Index as key for reorderable/filterable lists
{items.map((item, index) => (
  <div key={index}>{item.name}</div>
))}
```

### 3. No Key at All
```tsx
// ❌ BAD: React will use index internally (causes warnings)
{items.map(item => (
  <div>{item.name}</div>
))}
```

---

## ✅ Solutions

### Method 1: Use the Custom Hook (RECOMMENDED)

```tsx
import { useDeduplicated } from '@/hooks/useDeduplicated';

function PaymentAccountList({ accounts }) {
  // Automatically deduplicates and provides safe key generation
  const { items, getKey } = useDeduplicated(accounts);
  
  return (
    <div>
      {items.map((account, idx) => (
        <button key={getKey(account.id, idx)}>
          {account.name}
        </button>
      ))}
    </div>
  );
}
```

**Benefits:**
- ✅ Automatic deduplication
- ✅ Stable keys across re-renders
- ✅ Console warnings for debugging
- ✅ Zero configuration needed

---

### Method 2: Use Key Generator Utilities

```tsx
import { createKeyGenerator, deduplicateByKey } from '@/utils/keyGenerator';

function SupplierGrid({ suppliers }) {
  // Deduplicate first
  const uniqueSuppliers = useMemo(
    () => deduplicateByKey(suppliers),
    [suppliers]
  );
  
  // Create stable key generator
  const getKey = useMemo(() => createKeyGenerator('supplier'), []);
  
  return (
    <div className="grid">
      {uniqueSuppliers.map((supplier, idx) => (
        <div key={getKey(supplier.id, idx)}>
          {supplier.name}
        </div>
      ))}
    </div>
  );
}
```

---

### Method 3: Composite Keys (Manual)

```tsx
function ProductList({ products }) {
  const renderIdRef = useRef(`render-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  
  return (
    <div>
      {products.map((product, idx) => (
        <div key={`${renderIdRef.current}-product-${product.id}-${idx}`}>
          {product.name}
        </div>
      ))}
    </div>
  );
}
```

---

## 🔍 When to Use Each Method

| Scenario | Best Method | Reason |
|----------|-------------|---------|
| Lists with potential duplicates | `useDeduplicated` | Handles deduplication + keys |
| Large datasets (1000+ items) | `deduplicateByKey` + manual keys | More performant, explicit control |
| Static lists (known unique) | Simple `key={item.id}` | Simplest, no overhead |
| Nested/mapped grids | `createKeyGenerator` | Prefix support for namespacing |

---

## 📋 Checklist for New Components

Before committing code that renders lists:

- [ ] Are the keys guaranteed to be unique?
- [ ] Have you tested with duplicate data?
- [ ] Are you using stable keys (not `Math.random()` in render)?
- [ ] If using index, is the list truly static and non-reorderable?
- [ ] Have you checked for console warnings in dev mode?

---

## 🚨 Debugging Duplicate Keys

### Step 1: Use the Validator

```tsx
import { validateUniqueKeys } from '@/utils/keyGenerator';

// In development only
if (process.env.NODE_ENV === 'development') {
  const validation = validateUniqueKeys(accounts);
  if (!validation.isValid) {
    console.error('Duplicate keys found:', validation.duplicates);
  }
}
```

### Step 2: Check Console Warnings

Look for patterns in console logs:
- "Fetched accounts: X" vs "Unique accounts: Y"
- "Removed N duplicates..."

### Step 3: Inspect Data Source

```tsx
// Add temporary logging
useEffect(() => {
  console.log('Raw data:', accounts);
  console.log('IDs:', accounts.map(a => a.id));
  console.log('Unique IDs:', [...new Set(accounts.map(a => a.id))]);
}, [accounts]);
```

---

## 🎓 Examples from NEON POS

### Before (Problematic)
```tsx
// SpecialOrdersPage.tsx - OLD
{paymentAccounts.map(account => (
  <button key={account.id}>{account.name}</button>
))}
// Issue: paymentAccounts had duplicates from API
```

### After (Fixed)
```tsx
// SpecialOrdersPage.tsx - NEW
const { items, getKey } = useDeduplicated(paymentAccounts);

{items.map((account, idx) => (
  <button key={getKey(account.id, idx)}>{account.name}</button>
))}
// ✅ Deduplicates data and generates safe keys
```

---

## 🔧 Quick Fixes

### Fix 1: Deduplicate at Data Fetch

```tsx
const fetchAccounts = async () => {
  const data = await api.getAccounts();
  
  // Deduplicate immediately
  const unique = Array.from(
    new Map(data.map(item => [item.id, item])).values()
  );
  
  setAccounts(unique);
};
```

### Fix 2: Composite Key Helper

```tsx
// Add to any component with key issues
const safeKey = (id: string, index: number) => 
  `${componentName}-${id}-${index}`;

// Use it
{items.map((item, idx) => (
  <div key={safeKey(item.id, idx)}>{item.name}</div>
))}
```

### Fix 3: UUID Fallback

```tsx
import { v4 as uuidv4 } from 'uuid';

// For items without IDs
{items.map(item => (
  <div key={item.id || uuidv4()}>{item.name}</div>
))}
```

---

## 📚 References

- [React Keys Documentation](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- [Why Keys Matter](https://react.dev/learn/preserving-and-resetting-state#option-2-resetting-state-with-a-key)
- Project utilities: `/src/hooks/useDeduplicated.ts`, `/src/utils/keyGenerator.ts`

---

## 🤝 Contributing

When reviewing PRs, check for:
1. Proper key usage in `.map()` calls
2. No duplicate key warnings in console
3. Use of project utilities where appropriate
4. Performance considerations for large lists

---

**Last Updated:** December 2024  
**Maintained By:** Development Team

