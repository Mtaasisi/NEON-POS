/**
 * Comprehensive Audit Trail Service
 * 
 * Tracks all user actions, data changes, and system events
 * for compliance, security, and debugging purposes.
 */

import { supabase } from '../lib/supabase';

export type AuditAction = 
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' 
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
  | 'EXPORT' | 'IMPORT' | 'BACKUP' | 'RESTORE'
  | 'PERMISSION_CHANGE' | 'SETTINGS_CHANGE'
  | 'PAYMENT_CREATE' | 'PAYMENT_UPDATE' | 'PAYMENT_DELETE'
  | 'SALE_CREATE' | 'SALE_VOID' | 'SALE_REFUND'
  | 'INVENTORY_ADJUST' | 'STOCK_TRANSFER'
  | 'CUSTOM';

export type AuditCategory =
  | 'auth'
  | 'user_management'
  | 'customer'
  | 'product'
  | 'inventory'
  | 'sale'
  | 'payment'
  | 'device'
  | 'settings'
  | 'report'
  | 'system';

export interface AuditLogEntry {
  id?: string;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  action: AuditAction;
  category: AuditCategory;
  table_name?: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  description?: string;
  ip_address?: string;
  user_agent?: string;
  branch_id?: string;
  branch_name?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  category?: AuditCategory;
  tableName?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  branchId?: string;
}

class AuditTrailService {
  private static instance: AuditTrailService;
  private queue: AuditLogEntry[] = [];
  private isProcessing = false;
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds

  private constructor() {
    // Auto-flush queue periodically
    setInterval(() => this.flushQueue(), this.flushInterval);
    
    // Flush queue before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushQueue());
    }
  }

  static getInstance(): AuditTrailService {
    if (!AuditTrailService.instance) {
      AuditTrailService.instance = new AuditTrailService();
    }
    return AuditTrailService.instance;
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void> {
    try {
      // Enrich with current user and environment info
      const enrichedEntry = await this.enrichEntry(entry);
      
      // Add to queue for batch processing
      this.queue.push(enrichedEntry);
      
      // Flush if queue is full
      if (this.queue.length >= this.batchSize) {
        await this.flushQueue();
      }
    } catch (error) {
      console.error('❌ [AuditTrail] Error logging entry:', error);
      // Don't throw - audit logging should never break app functionality
    }
  }

  /**
   * Enrich audit entry with context
   */
  private async enrichEntry(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<AuditLogEntry> {
    const enriched: AuditLogEntry = { ...entry };

    // Add user info if not provided
    if (!enriched.user_id) {
      const userData = this.getCurrentUser();
      enriched.user_id = userData.userId;
      enriched.user_name = userData.userName;
      enriched.user_role = userData.userRole;
    }

    // Add branch info if not provided
    if (!enriched.branch_id) {
      const branchData = this.getCurrentBranch();
      enriched.branch_id = branchData.branchId;
      enriched.branch_name = branchData.branchName;
    }

    // Add IP and user agent
    enriched.ip_address = await this.getClientIP();
    enriched.user_agent = navigator.userAgent;

    return enriched;
  }

  /**
   * Get current user from localStorage
   */
  private getCurrentUser(): { userId?: string; userName?: string; userRole?: string } {
    try {
      const userId = localStorage.getItem('userId') || undefined;
      const userName = localStorage.getItem('userName') || undefined;
      const userRole = localStorage.getItem('userRole') || undefined;
      return { userId, userName, userRole };
    } catch {
      return {};
    }
  }

  /**
   * Get current branch from localStorage
   */
  private getCurrentBranch(): { branchId?: string; branchName?: string } {
    try {
      const branchId = localStorage.getItem('selectedBranch') || undefined;
      const branchName = localStorage.getItem('selectedBranchName') || undefined;
      return { branchId, branchName };
    } catch {
      return {};
    }
  }

  /**
   * Get client IP address
   */
  private async getClientIP(): Promise<string | undefined> {
    try {
      // In production, this should come from your API
      // For now, return undefined (will be captured by server if needed)
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Flush queue to database
   */
  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const batch = [...this.queue];
    this.queue = [];

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(batch);

      if (error) {
        console.error('❌ [AuditTrail] Error flushing queue:', error);
        // Re-add to queue on error
        this.queue.unshift(...batch);
      } else {
        console.log(`✅ [AuditTrail] Flushed ${batch.length} audit logs`);
      }
    } catch (error) {
      console.error('❌ [AuditTrail] Error flushing queue:', error);
      this.queue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Query audit logs with filters
   */
  async query(filters: AuditLogFilters = {}, limit: number = 100): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.tableName) {
        query = query.eq('table_name', filters.tableName);
      }

      if (filters.branchId) {
        query = query.eq('branch_id', filters.branchId);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.searchTerm) {
        query = query.or(`description.ilike.%${filters.searchTerm}%,user_name.ilike.%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [AuditTrail] Query error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [AuditTrail] Query error:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getStats(userId?: string, days: number = 30): Promise<{
    totalActions: number;
    actionsByCategory: Record<string, number>;
    actionsByType: Record<string, number>;
    recentActivity: AuditLogEntry[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await this.query({
        userId,
        startDate: startDate.toISOString()
      }, 1000);

      const actionsByCategory: Record<string, number> = {};
      const actionsByType: Record<string, number> = {};

      logs.forEach(log => {
        actionsByCategory[log.category] = (actionsByCategory[log.category] || 0) + 1;
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      });

      return {
        totalActions: logs.length,
        actionsByCategory,
        actionsByType,
        recentActivity: logs.slice(0, 10)
      };
    } catch (error) {
      console.error('❌ [AuditTrail] Stats error:', error);
      return {
        totalActions: 0,
        actionsByCategory: {},
        actionsByType: {},
        recentActivity: []
      };
    }
  }

  /**
   * Export audit logs to CSV
   */
  async exportToCSV(filters: AuditLogFilters = {}): Promise<string> {
    const logs = await this.query(filters, 10000);
    
    const headers = [
      'Timestamp',
      'User',
      'Role',
      'Action',
      'Category',
      'Table',
      'Record ID',
      'Description',
      'Branch',
      'IP Address'
    ];

    const rows = logs.map(log => [
      new Date(log.created_at!).toLocaleString(),
      log.user_name || log.user_id || 'System',
      log.user_role || '-',
      log.action,
      log.category,
      log.table_name || '-',
      log.record_id || '-',
      log.description || '-',
      log.branch_name || log.branch_id || '-',
      log.ip_address || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}

// Convenience functions
export const auditTrail = AuditTrailService.getInstance();

// Helper functions for common audit events
export const auditAuth = {
  login: (userId: string, userName: string) => 
    auditTrail.log({
      action: 'LOGIN',
      category: 'auth',
      user_id: userId,
      user_name: userName,
      description: 'User logged in'
    }),
  
  logout: (userId: string, userName: string) =>
    auditTrail.log({
      action: 'LOGOUT',
      category: 'auth',
      user_id: userId,
      user_name: userName,
      description: 'User logged out'
    }),
  
  loginFailed: (email: string, reason: string) =>
    auditTrail.log({
      action: 'LOGIN_FAILED',
      category: 'auth',
      description: `Login failed for ${email}: ${reason}`
    })
};

export const auditData = {
  create: (category: AuditCategory, tableName: string, recordId: string, data: Record<string, any>, description?: string) =>
    auditTrail.log({
      action: 'CREATE',
      category,
      table_name: tableName,
      record_id: recordId,
      new_values: data,
      description: description || `Created ${tableName} record`
    }),
  
  update: (category: AuditCategory, tableName: string, recordId: string, oldData: Record<string, any>, newData: Record<string, any>, description?: string) =>
    auditTrail.log({
      action: 'UPDATE',
      category,
      table_name: tableName,
      record_id: recordId,
      old_values: oldData,
      new_values: newData,
      description: description || `Updated ${tableName} record`
    }),
  
  delete: (category: AuditCategory, tableName: string, recordId: string, data: Record<string, any>, description?: string) =>
    auditTrail.log({
      action: 'DELETE',
      category,
      table_name: tableName,
      record_id: recordId,
      old_values: data,
      description: description || `Deleted ${tableName} record`
    })
};

export default auditTrail;

