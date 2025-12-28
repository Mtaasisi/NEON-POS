import { Pool } from '@neondatabase/serverless';
declare let sql: any;
declare let pool: Pool;
declare class NeonQueryBuilder implements PromiseLike<{
    data: any;
    error: any;
    count?: number | null;
}> {
    private tableName;
    private selectFields;
    private whereConditions;
    private orderByClause;
    private limitClause;
    private rangeClause;
    private suppressErrors;
    private countMode;
    private headMode;
    private joins;
    constructor(tableName: string);
    select(fields?: string, options?: {
        count?: 'exact' | 'planned' | 'estimated';
        head?: boolean;
    }): this;
    private qualifyColumn;
    eq(column: string, value: any): this;
    neq(column: string, value: any): this;
    gt(column: string, value: any): this;
    gte(column: string, value: any): this;
    lt(column: string, value: any): this;
    lte(column: string, value: any): this;
    like(column: string, pattern: string): this;
    ilike(column: string, pattern: string): this;
    is(column: string, value: any): this;
    in(column: string, values: any[]): this;
    order(column: string, options?: {
        ascending?: boolean;
    }): this;
    limit(count: number): this;
    range(from: number, to: number): this;
    single(): PromiseLike<{
        data: null;
        error: any;
    } | {
        data: any;
        error: null;
    }>;
    maybeSingle(): PromiseLike<{
        data: null;
        error: any;
    } | {
        data: any;
        error: null;
    }>;
    private formatValue;
    private buildQuery;
    then<TResult1 = {
        data: any;
        error: any;
        count?: number | null;
    }, TResult2 = never>(onfulfilled?: ((value: {
        data: any;
        error: any;
        count?: number | null;
    }) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>;
    private execute;
    catch(onRejected: any): PromiseLike<{
        data: any;
        error: any;
        count?: number | null;
    }>;
    resetOperationFlags(): void;
    insert(values: any): this;
    update(values: any): this;
    delete(): this;
    upsert(values: any, options?: {
        onConflict?: string;
    }): this;
    match(conditions: Record<string, any>): this;
    not(column: string, operator: string, value: any): this;
    or(conditions: string): this;
    filter(column: string, operator: string, value: any): this;
    contains(column: string, value: any): this;
    containedBy(column: string, value: any): this;
    rangeGt(column: string, value: any): this;
    rangeGte(column: string, value: any): this;
    rangeLt(column: string, value: any): this;
    rangeLte(column: string, value: any): this;
    rangeAdjacent(column: string, value: any): this;
    overlaps(column: string, value: any): this;
    textSearch(column: string, query: string): this;
    csv(): this;
}
export interface SupabaseClient {
    from: (table: string) => NeonQueryBuilder;
    auth: any;
    storage: any;
    rpc: (fn: string, params?: any) => Promise<any>;
    channel: (name: string) => any;
}
export declare const supabase: SupabaseClient;
export declare function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
export declare function testSupabaseConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
}>;
export default supabase;
export { sql };
export { pool };
//# sourceMappingURL=supabaseClient.d.ts.map