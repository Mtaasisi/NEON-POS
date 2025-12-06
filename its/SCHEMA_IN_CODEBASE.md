# Schema Definitions in Codebase

## Overview

The database schema is now defined in the codebase, ensuring the application always knows what columns, constraints, and defaults exist in the database. This provides:

- ✅ **Type Safety**: TypeScript types match database schema exactly
- ✅ **Documentation**: Schema structure is self-documenting in code
- ✅ **Validation**: Schema validators ensure data integrity
- ✅ **Consistency**: Codebase and database stay in sync
- ✅ **Refactoring Safety**: Easy to find all usages when schema changes

## 📁 File Structure

```
src/lib/database/schema/
├── storeLocations.ts      # Complete schema definition
├── validator.ts           # Validation functions
├── checker.ts             # Schema verification utilities
├── index.ts               # Central exports
└── README.md              # Documentation
```

## 📋 What's Included

### 1. `storeLocations.ts` - Complete Schema Definition

**Type Definitions:**
- `StoreLocationSchema` - Complete interface matching database table
- `DataIsolationMode` - Type for isolation modes ('shared' | 'isolated' | 'hybrid')
- `ShareableEntityType` - All entity types that can be shared/isolated

**Constants:**
- `STORE_LOCATION_DEFAULTS` - All default values matching database
- `ISOLATION_COLUMNS` - Array of all 25 isolation column names
- `ENTITY_TO_COLUMN_MAP` - Maps entity types to their `share_*` column names
- `SCHEMA_CONSTRAINTS` - Database constraint definitions
- `STORE_LOCATION_SCHEMA_METADATA` - Complete schema metadata

**All 25 Isolation Columns Defined:**
```typescript
share_products, share_inventory, share_customers, share_suppliers,
share_categories, share_employees, share_accounts, share_sales,
share_purchase_orders, share_devices, share_payments, share_appointments,
share_reminders, share_expenses, share_trade_ins, share_special_orders,
share_attendance, share_loyalty_points, share_gift_cards,
share_quality_checks, share_recurring_expenses, share_communications,
share_reports, share_finance_transfers
```

### 2. `validator.ts` - Validation Functions

**Functions:**
- `validateStoreLocation()` - Validates store location data against schema
- `applyStoreLocationDefaults()` - Applies default values to partial data
- `isValidIsolationMode()` - Validates isolation mode values
- `getShareColumnName()` - Maps entity types to column names

### 3. `checker.ts` - Schema Verification

**Functions:**
- `checkStoreLocationSchema()` - Comprehensive schema validation
- `validateIsolationSchema()` - Quick isolation columns check
- `quickSchemaCheck()` - Fast runtime validation
- `logSchemaCheckResult()` - Logs validation results

### 4. `index.ts` - Central Exports

All schema definitions, types, and utilities exported from a single entry point.

## 🔧 Integration

### Updated Files

**`src/lib/branchAwareApi.ts`**
- Now uses `ShareableEntityType` from schema
- Uses `ENTITY_TO_COLUMN_MAP` for dynamic column lookups
- Type-safe with `StoreLocationSchema` return type

### Usage Examples

```typescript
// Import schema definitions
import {
  StoreLocationSchema,
  DataIsolationMode,
  STORE_LOCATION_DEFAULTS,
  ENTITY_TO_COLUMN_MAP,
  validateStoreLocation,
  quickSchemaCheck,
} from '@/lib/database/schema';

// Use the type
const store: StoreLocationSchema = {
  id: '...',
  name: 'ARUSHA',
  data_isolation_mode: 'hybrid',
  share_products: false,
  // ... all other fields with correct types
};

// Use defaults
const newStore = {
  ...STORE_LOCATION_DEFAULTS,
  name: 'New Branch',
};

// Validate data
const result = validateStoreLocation(newStore);
if (!result.valid) {
  console.error(result.errors);
}

// Map entity to column
const columnName = ENTITY_TO_COLUMN_MAP['products']; // 'share_products'

// Quick schema check
const schemaCheck = await quickSchemaCheck();
if (!schemaCheck.hasIsolationMode) {
  console.warn('Database missing isolation mode column!');
}
```

## 🔄 Keeping Schema in Sync

### When Database Schema Changes:

1. **Update `storeLocations.ts`**:
   - Add new columns to `StoreLocationSchema` interface
   - Add defaults to `STORE_LOCATION_DEFAULTS`
   - Update `ISOLATION_COLUMNS` if needed
   - Update `ENTITY_TO_COLUMN_MAP` if needed

2. **Update `validator.ts`**:
   - Add validation rules for new columns
   - Update constraint checks if needed

3. **Run database migration**:
   - Apply the same changes to the actual database
   - Use migration files in `migrations/` directory

4. **Test**:
   - Verify types compile correctly
   - Test validation functions
   - Run schema checker to ensure database and codebase match

### Schema Checker Usage

```typescript
import { checkStoreLocationSchema, logSchemaCheckResult } from '@/lib/database/schema';

// Check schema on app startup or admin panel
const result = await checkStoreLocationSchema();
logSchemaCheckResult(result);

if (!result.valid) {
  console.error('Database schema mismatch!', result.missingColumns);
}
```

## ✅ Benefits

1. **Type Safety**: TypeScript catches schema mismatches at compile time
2. **Documentation**: Schema is self-documenting in code
3. **Validation**: Validate data before database operations
4. **Consistency**: Codebase always knows database structure
5. **Refactoring**: Easy to find all usages when schema changes
6. **IDE Support**: Autocomplete and type hints for all schema fields
7. **Runtime Safety**: Schema checker can verify database matches codebase

## 🎯 Key Features

### Complete Isolation Schema
- All 25 isolation columns defined
- Entity type mappings
- Default values matching database
- Constraint definitions

### Type Safety
- Full TypeScript types for all columns
- Union types for constrained values
- Type-safe entity-to-column mappings

### Validation
- Runtime validation functions
- Schema verification utilities
- Default value application

### Documentation
- Inline comments explaining each field
- README with usage examples
- Schema metadata for tooling

## 📊 Schema Coverage

✅ **Columns**: All 25+ isolation columns defined  
✅ **Types**: Complete TypeScript interfaces  
✅ **Defaults**: All default values documented  
✅ **Constraints**: Check constraints defined  
✅ **Mappings**: Entity-to-column mappings  
✅ **Validation**: Validation functions provided  
✅ **Checking**: Schema verification utilities  

## 🚀 Next Steps

1. **Use schema types** in all store location related code
2. **Run schema checker** periodically to ensure sync
3. **Update schema** when database changes
4. **Add validation** before database operations
5. **Document** any custom schema extensions

## 📝 Notes

- Schema definitions are the **source of truth** for the codebase
- Database migrations should match schema definitions
- Schema checker can be run in development to catch mismatches
- All isolation features are now type-safe and documented

