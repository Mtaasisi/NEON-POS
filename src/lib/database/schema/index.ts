/**
 * Database Schema Definitions
 * 
 * Central export point for all database schema definitions.
 * This ensures the codebase always knows the database structure.
 */

export * from './storeLocations';
export type {
  StoreLocationSchema,
  DataIsolationMode,
  ShareableEntityType,
} from './storeLocations';
export {
  STORE_LOCATION_DEFAULTS,
  ISOLATION_COLUMNS,
  ENTITY_TO_COLUMN_MAP,
  SCHEMA_CONSTRAINTS,
  STORE_LOCATION_SCHEMA_METADATA,
} from './storeLocations';

export * from './validator';
export * from './checker';

