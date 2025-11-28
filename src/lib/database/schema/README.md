# Database Schema Definitions

This directory contains TypeScript definitions that mirror the database schema. This ensures the codebase always knows what columns, constraints, and defaults exist in the database.

## Purpose

- **Type Safety**: TypeScript types match database schema exactly
- **Documentation**: Schema structure is documented in code
- **Validation**: Schema validators ensure data integrity
- **Consistency**: Codebase and database stay in sync

## Files

### `storeLocations.ts`
Complete schema definition for the `store_locations` table, including:
- All 25+ isolation columns
- Type definitions
- Default values
- Entity-to-column mappings
- Schema constraints

### `validator.ts`
Validation functions for schema data:
- `validateStoreLocation()` - Validates store location data
- `applyStoreLocationDefaults()` - Applies default values
- `isValidIsolationMode()` - Validates isolation mode
- `getShareColumnName()` - Maps entity types to column names

### `index.ts`
Central export point for all schema definitions.

## Usage

```typescript
import {
  StoreLocationSchema,
  DataIsolationMode,
  STORE_LOCATION_DEFAULTS,
  ENTITY_TO_COLUMN_MAP,
  validateStoreLocation,
} from '@/lib/database/schema';

// Use the type
const store: StoreLocationSchema = {
  id: '...',
  name: 'ARUSHA',
  data_isolation_mode: 'hybrid',
  share_products: false,
  // ... all other fields
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
```

## Keeping Schema in Sync

When the database schema changes:

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
   - Ensure database and codebase match

## Schema Features

### Isolation Columns
All 25 isolation columns are defined:
- `data_isolation_mode` - Main mode (shared/isolated/hybrid)
- `share_products` through `share_finance_transfers` - Per-entity controls

### Constraints
- `data_isolation_mode` must be 'shared', 'isolated', or 'hybrid'
- `pricing_model` must be 'centralized' or 'location-specific'
- `code` must be unique

### Defaults
All default values match the database schema exactly.

## Benefits

✅ **Type Safety**: Catch schema mismatches at compile time  
✅ **Documentation**: Schema is self-documenting in code  
✅ **Validation**: Validate data before database operations  
✅ **Consistency**: Codebase always knows database structure  
✅ **Refactoring**: Easy to find all usages when schema changes  

