// Stub implementation - Database integration removed
// This file provides empty implementations to prevent build errors

export interface SupabaseClient {
  from: (table: string) => any;
  auth: any;
  storage: any;
  rpc: (fn: string, params?: any) => any;
  channel: (name: string) => any;
}

// Mock query builder that returns empty results
const createMockQueryBuilder = () => ({
  select: () => createMockQueryBuilder(),
  insert: () => createMockQueryBuilder(),
  update: () => createMockQueryBuilder(),
  delete: () => createMockQueryBuilder(),
  upsert: () => createMockQueryBuilder(),
  eq: () => createMockQueryBuilder(),
  neq: () => createMockQueryBuilder(),
  gt: () => createMockQueryBuilder(),
  gte: () => createMockQueryBuilder(),
  lt: () => createMockQueryBuilder(),
  lte: () => createMockQueryBuilder(),
  like: () => createMockQueryBuilder(),
  ilike: () => createMockQueryBuilder(),
  is: () => createMockQueryBuilder(),
  in: () => createMockQueryBuilder(),
  contains: () => createMockQueryBuilder(),
  containedBy: () => createMockQueryBuilder(),
  rangeGt: () => createMockQueryBuilder(),
  rangeGte: () => createMockQueryBuilder(),
  rangeLt: () => createMockQueryBuilder(),
  rangeLte: () => createMockQueryBuilder(),
  rangeAdjacent: () => createMockQueryBuilder(),
  overlaps: () => createMockQueryBuilder(),
  textSearch: () => createMockQueryBuilder(),
  match: () => createMockQueryBuilder(),
  not: () => createMockQueryBuilder(),
  or: () => createMockQueryBuilder(),
  filter: () => createMockQueryBuilder(),
  order: () => createMockQueryBuilder(),
  limit: () => createMockQueryBuilder(),
  range: () => createMockQueryBuilder(),
  single: () => createMockQueryBuilder(),
  maybeSingle: () => createMockQueryBuilder(),
  csv: () => createMockQueryBuilder(),
  then: (resolve: any) => resolve({ data: null, error: null }),
  catch: () => createMockQueryBuilder(),
});

// Mock storage implementation
const mockStorage = {
  from: () => ({
    upload: () => Promise.resolve({ data: null, error: null }),
    download: () => Promise.resolve({ data: null, error: null }),
    list: () => Promise.resolve({ data: [], error: null }),
    remove: () => Promise.resolve({ data: null, error: null }),
    createSignedUrl: () => Promise.resolve({ data: null, error: null }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
  }),
};

// Mock auth implementation
const mockAuth = {
  signIn: () => Promise.resolve({ data: null, error: null }),
  signUp: () => Promise.resolve({ data: null, error: null }),
  signOut: () => Promise.resolve({ error: null }),
  getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  updateUser: () => Promise.resolve({ data: null, error: null }),
  setSession: () => Promise.resolve({ data: null, error: null }),
  refreshSession: () => Promise.resolve({ data: null, error: null }),
};

// Mock channel implementation
const mockChannel = () => ({
  on: () => mockChannel(),
  subscribe: () => mockChannel(),
  unsubscribe: () => Promise.resolve(),
});

// Mock RPC implementation
const mockRpc = () => Promise.resolve({ data: null, error: null });

// Mock supabase client
export const supabase: SupabaseClient = {
  from: () => createMockQueryBuilder(),
  auth: mockAuth,
  storage: mockStorage,
  rpc: mockRpc,
  channel: mockChannel,
};

// Export for backward compatibility
export default supabase;

