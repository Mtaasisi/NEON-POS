import { supabase } from './supabaseClient';
import {
  DiagnosticRequest,
  DiagnosticDevice,
  DiagnosticCheck,
  DiagnosticTemplate,
  CreateDiagnosticRequestData,
  CreateDiagnosticDeviceData,
  UpdateDiagnosticCheckData,
  DiagnosticStats,
  DiagnosticFilters,
  AdminFeedbackData,
  UpdateAdminFeedbackData,
  MarkActionCompletedData,
} from '../types/diagnostics';

// Export types for convenience
export type {
  DiagnosticRequest,
  DiagnosticDevice,
  DiagnosticCheck,
  DiagnosticTemplate,
  CreateDiagnosticRequestData,
  CreateDiagnosticDeviceData,
  UpdateDiagnosticCheckData,
  DiagnosticStats,
  AdminFeedbackData,
};

/**
 * Get diagnostic requests with optional filters
 */
export async function getDiagnosticRequests(filters?: DiagnosticFilters): Promise<DiagnosticRequest[]> {
  try {
    let query = supabase
      .from('diagnostic_requests')
      .select(`
        *,
        created_by_user:users!diagnostic_requests_created_by_fkey(id, full_name, email),
        assigned_to_user:users!diagnostic_requests_assigned_to_fkey(id, full_name, email),
        devices:diagnostic_devices(
          id,
          device_name,
          serial_number,
          model,
          result_status,
          checks:diagnostic_checks(id, result)
        )
      `)
      .order('created_at', { ascending: false });

    if (filters) {
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate device and check counts
    return (data || []).map((request: any) => {
      const devices = request.devices || [];
      const passedDevices = devices.filter((d: any) => d.result_status === 'passed').length;
      const failedDevices = devices.filter((d: any) => 
        d.result_status === 'failed' || d.result_status === 'partially_failed'
      ).length;
      const pendingDevices = devices.filter((d: any) => d.result_status === 'pending').length;

      return {
        ...request,
        device_count: devices.length,
        passed_devices: passedDevices,
        failed_devices: failedDevices,
        pending_devices: pendingDevices,
      };
    });
  } catch (error) {
    console.error('Error getting diagnostic requests:', error);
    throw error;
  }
}

/**
 * Get a single diagnostic request by ID
 */
export async function getDiagnosticRequest(id: string): Promise<DiagnosticRequest | null> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_requests')
      .select(`
        *,
        created_by_user:users!diagnostic_requests_created_by_fkey(id, full_name, email),
        assigned_to_user:users!diagnostic_requests_assigned_to_fkey(id, full_name, email),
        devices:diagnostic_devices(
          *,
          checks:diagnostic_checks(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting diagnostic request:', error);
    return null;
  }
}

/**
 * Create a new diagnostic request
 */
export async function createDiagnosticRequest(data: CreateDiagnosticRequestData): Promise<DiagnosticRequest> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create the request
    const { data: request, error: requestError } = await supabase
      .from('diagnostic_requests')
      .insert({
        title: data.title,
        created_by: user.id,
        assigned_to: data.assigned_to,
        description: data.notes, // Map notes to description
        priority: data.priority || 'medium',
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // Create devices
    const devicesToCreate: any[] = [];
    data.devices.forEach((device) => {
      if (device.quantity && device.quantity > 1 && device.individual_serials) {
        // Create multiple devices with individual serials
        device.individual_serials.forEach((serial) => {
          devicesToCreate.push({
            diagnostic_request_id: request.id,
            device_name: device.device_name,
            serial_number: serial,
            model: device.model,
            notes: device.notes,
            result_status: 'pending',
          });
        });
      } else {
        // Create single device
        devicesToCreate.push({
          diagnostic_request_id: request.id,
          device_name: device.device_name,
          serial_number: device.serial_number,
          model: device.model,
          notes: device.notes,
          result_status: 'pending',
        });
      }
    });

    const { error: devicesError } = await supabase
      .from('diagnostic_devices')
      .insert(devicesToCreate);

    if (devicesError) throw devicesError;

    return request;
  } catch (error) {
    console.error('Error creating diagnostic request:', error);
    throw error;
  }
}

/**
 * Update diagnostic request status
 */
export async function updateDiagnosticRequestStatus(id: string, status: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('diagnostic_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating diagnostic request status:', error);
    throw error;
  }
}

/**
 * Get diagnostic device by ID
 */
export async function getDiagnosticDevice(id: string): Promise<DiagnosticDevice | null> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_devices')
      .select(`
        *,
        checks:diagnostic_checks(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting diagnostic device:', error);
    return null;
  }
}

/**
 * Update diagnostic device status
 */
export async function updateDiagnosticDeviceStatus(id: string, resultStatus: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('diagnostic_devices')
      .update({ result_status: resultStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating diagnostic device status:', error);
    throw error;
  }
}

/**
 * Create diagnostic check
 */
export async function createDiagnosticCheck(deviceId: string, checkData: UpdateDiagnosticCheckData): Promise<DiagnosticCheck> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_checks')
      .insert({
        diagnostic_device_id: deviceId,
        test_item: checkData.test_item,
        result: checkData.result,
        remarks: checkData.remarks,
        image_url: checkData.image_url,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating diagnostic check:', error);
    throw error;
  }
}

/**
 * Update diagnostic check
 */
export async function updateDiagnosticCheck(id: string, checkData: UpdateDiagnosticCheckData): Promise<void> {
  try {
    const { error } = await supabase
      .from('diagnostic_checks')
      .update({
        test_item: checkData.test_item,
        result: checkData.result,
        remarks: checkData.remarks,
        image_url: checkData.image_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating diagnostic check:', error);
    throw error;
  }
}

/**
 * Get diagnostic templates
 */
export async function getDiagnosticTemplates(): Promise<DiagnosticTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_templates')
      .select('*')
      .order('device_type');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting diagnostic templates:', error);
    return [];
  }
}

/**
 * Get diagnostic template for specific device type
 */
export async function getDiagnosticTemplateForDevice(deviceType: string): Promise<DiagnosticTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_templates')
      .select('*')
      .eq('device_type', deviceType.toLowerCase())
      .single();

    if (error) {
      console.warn(`No template found for device type: ${deviceType}`);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error getting diagnostic template for device:', error);
    return null;
  }
}

/**
 * Get diagnostic stats
 */
export async function getDiagnosticStats(filters?: DiagnosticFilters): Promise<DiagnosticStats> {
  try {
    let requestQuery = supabase
      .from('diagnostic_requests')
      .select('id, status');

    let deviceQuery = supabase
      .from('diagnostic_devices')
      .select('id, result_status, diagnostic_request_id');

    if (filters) {
      if (filters.assigned_to) {
        requestQuery = requestQuery.eq('assigned_to', filters.assigned_to);
      }
      if (filters.created_by) {
        requestQuery = requestQuery.eq('created_by', filters.created_by);
      }
      if (filters.date_from) {
        requestQuery = requestQuery.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        requestQuery = requestQuery.lte('created_at', filters.date_to);
      }
    }

    const [requestsResult, devicesResult] = await Promise.all([
      requestQuery,
      deviceQuery,
    ]);

    if (requestsResult.error) throw requestsResult.error;
    if (devicesResult.error) throw devicesResult.error;

    const requests = requestsResult.data || [];
    const devices = devicesResult.data || [];

    // Filter devices if we have request filters
    const requestIds = new Set(requests.map((r: any) => r.id));
    const filteredDevices = devices.filter((d: any) => requestIds.has(d.diagnostic_request_id));

    return {
      total_requests: requests.length,
      pending_requests: requests.filter((r: any) => r.status === 'pending').length,
      in_progress_requests: requests.filter((r: any) => r.status === 'in_progress').length,
      completed_requests: requests.filter((r: any) => r.status === 'completed').length,
      total_devices: filteredDevices.length,
      passed_devices: filteredDevices.filter((d: any) => d.result_status === 'passed').length,
      failed_devices: filteredDevices.filter((d: any) => d.result_status === 'failed').length,
      partially_failed_devices: filteredDevices.filter((d: any) => d.result_status === 'partially_failed').length,
      pending_devices: filteredDevices.filter((d: any) => d.result_status === 'pending').length,
    };
  } catch (error) {
    console.error('Error getting diagnostic stats:', error);
    return {
      total_requests: 0,
      pending_requests: 0,
      in_progress_requests: 0,
      completed_requests: 0,
      total_devices: 0,
      passed_devices: 0,
      failed_devices: 0,
      partially_failed_devices: 0,
      pending_devices: 0,
    };
  }
}

/**
 * Get technicians (users with tech role)
 */
export async function getTechnicians(): Promise<any[]> {
  try {
    // 🔒 Get current branch for isolation
    const currentBranchId = localStorage.getItem('current_branch_id');
    
    let query = supabase
      .from('users')
      .select('id, name, username, role')
      .in('role', ['tech', 'admin', 'manager'])
      .order('name');
    
    // 🔒 COMPLETE ISOLATION: Only show technicians from current branch
    // Note: This can be disabled by commenting out the filter
    if (currentBranchId) {
      query = query.eq('branch_id', currentBranchId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting technicians:', error);
    return [];
  }
}

/**
 * Submit admin feedback for a device
 */
export async function submitAdminFeedback(data: UpdateAdminFeedbackData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('diagnostic_devices')
      .update({
        admin_feedback: data.admin_feedback,
        next_action: data.next_action,
        feedback_submitted_at: new Date().toISOString(),
        feedback_submitted_by: user.id,
        result_status: 'admin_reviewed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.device_id);

    if (error) throw error;
  } catch (error) {
    console.error('Error submitting admin feedback:', error);
    throw error;
  }
}

/**
 * Mark action as completed (e.g., repair done)
 */
export async function markActionCompleted(data: MarkActionCompletedData): Promise<void> {
  try {
    const updates: any = {
      repair_completed_at: new Date().toISOString(),
      repair_notes: data.completion_notes,
      parts_used: data.parts_used,
      repair_time: data.repair_time,
      result_status: 'sent_to_care',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('diagnostic_devices')
      .update(updates)
      .eq('id', data.device_id);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking action as completed:', error);
    throw error;
  }
}

/**
 * Delete diagnostic request
 */
export async function deleteDiagnosticRequest(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('diagnostic_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting diagnostic request:', error);
    throw error;
  }
}

