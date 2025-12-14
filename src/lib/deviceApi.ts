import { supabase } from './supabaseClient';
import { cacheSetAll, cacheGetAll } from './offlineCache';
import { Device } from '../types';

// Optimized function using efficient JOIN queries instead of N+1
export async function fetchAllDevices(): Promise<Device[]> {
  if (navigator.onLine) {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = localStorage.getItem('current_branch_id');
      
      // Enhanced query with customer and technician joins
      let query = supabase
        .from('devices')
        .select(`
          id,
          customer_id,
          brand,
          model,
          serial_number,
          imei,
          problem_description,
          issue_description,
          status,
          assigned_to,
          technician_id,
          estimated_completion_date,
          expected_return_date,
          estimated_hours,
          created_at,
          updated_at,
          estimated_cost,
          actual_cost,
          repair_cost,
          deposit_amount,
          device_cost,
          repair_price,
          diagnosis_required,
          device_notes,
          customers!customer_id (
            id,
            name,
            phone,
            email,
            loyalty_level,
            total_spent,
            last_visit,
            color_tag
          ),
          technician:users!technician_id (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      // 🔒 COMPLETE ISOLATION: Only show devices from current branch
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
      // Check if error is due to PostgREST syntax not being supported (Neon direct connection)
      const isPostgRESTError = error?.message?.includes('syntax error') || 
                               error?.message?.includes('relation') ||
                               error?.code === '42601' ||
                               error?.code === '42703';
      
      if (error && !isPostgRESTError) {
        // Non-syntax errors - log and continue to fallback
        console.warn('⚠️ Device query error (non-syntax):', error.message);
      }
      
      // If query failed or returned no data, use fallback approach
      if (error || !data || data.length === 0) {
        // Fallback: fetch devices without PostgREST joins - use explicit column selection
        let fallbackQuery = supabase
          .from('devices')
          .select(`
            id,
            customer_id,
            brand,
            model,
            serial_number,
            imei,
            problem_description,
            issue_description,
            status,
            assigned_to,
            technician_id,
            estimated_completion_date,
            expected_return_date,
            estimated_hours,
            created_at,
            updated_at,
            estimated_cost,
            actual_cost,
            repair_cost,
            deposit_amount,
            device_cost,
            repair_price,
            diagnosis_required,
            device_notes
          `)
          .order('created_at', { ascending: false });
        
        // 🔒 COMPLETE ISOLATION: Only show devices from current branch
        if (currentBranchId) {
          fallbackQuery = fallbackQuery.eq('branch_id', currentBranchId);
        }
        
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        
        if (fallbackError) {
          console.error('Error fetching devices (fallback):', fallbackError);
          throw fallbackError;
        }
        
        // If no data returned, return empty array
        if (!fallbackData || fallbackData.length === 0) {
          await cacheSetAll('devices', []);
          return [];
        }
        
        // Fetch customer and technician data for fallback
        const fallbackCustomerIds = [...new Set((fallbackData || []).map(d => d.customer_id).filter(Boolean))];
        const fallbackTechnicianIds = [...new Set((fallbackData || []).map(d => d.assigned_to || d.technician_id).filter(Boolean))];
        
        const { data: fallbackCustomersData } = await supabase
          .from('customers')
          .select('id, name, phone, email, loyalty_level, total_spent, last_visit, color_tag')
          .in('id', fallbackCustomerIds.length > 0 ? fallbackCustomerIds : ['00000000-0000-0000-0000-000000000000']);
        
        const { data: fallbackTechniciansData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', fallbackTechnicianIds.length > 0 ? fallbackTechnicianIds : ['00000000-0000-0000-0000-000000000000']);
        
        const fallbackCustomersMap = new Map((fallbackCustomersData || []).map(c => [c.id, c]));
        const fallbackTechniciansMap = new Map((fallbackTechniciansData || []).map(t => [t.id, t]));
        
        const devicesWithData = (fallbackData || []).map(device => {
          const transformedRemarks = (device.remarks || []).map((remark: any) => ({
            id: remark.id,
            content: remark.content,
            createdBy: remark.created_by,
            createdAt: remark.created_at
          }));
          
          const transformedTransitions = (device.transitions || []).map((transition: any) => ({
            id: transition.id,
            fromStatus: transition.from_status,
            toStatus: transition.to_status,
            performedBy: transition.performed_by,
            timestamp: transition.created_at,
            signature: transition.signature || ''
          }));
          
          const transformedRatings = (device.ratings || []).map((rating: any) => ({
            id: rating.id,
            deviceId: rating.device_id,
            technicianId: rating.technician_id,
            score: rating.score || 5, // Default to 5 if score column doesn't exist
            comment: rating.comment,
            createdAt: rating.created_at
          }));

          const customer = fallbackCustomersMap.get(device.customer_id);
          const technician = fallbackTechniciansMap.get(device.assigned_to || device.technician_id);

          return {
            ...device,
            serialNumber: device.serial_number || device.imei || '',
            issueDescription: device.issue_description || device.problem_description || '',
            customerId: device.customer_id,
            assignedTo: device.assigned_to || device.technician_id,
            expectedReturnDate: device.expected_return_date || device.estimated_completion_date,
            estimatedHours: device.estimated_hours,
            customerName: customer?.name || '',
            phoneNumber: customer?.phone || '',
            customerEmail: customer?.email || '',
            customerLoyaltyLevel: customer?.loyalty_level || '',
            customerTotalSpent: customer?.total_spent || 0,
            customerLastVisit: customer?.last_visit || null,
            customerColorTag: customer?.color_tag || '',
            assignedToName: technician?.full_name || '',
            repairCost: device.repair_cost || device.estimated_cost || device.actual_cost || null,
            depositAmount: device.deposit_amount || null,
            deviceCost: device.device_cost || null,
            repairPrice: device.repair_price || null,
            diagnosisRequired: device.diagnosis_required || false,
            deviceNotes: device.device_notes || null,
            remarks: transformedRemarks,
            transitions: transformedTransitions,
            ratings: transformedRatings,
            createdAt: device.created_at,
            updatedAt: device.updated_at,
          };
        });
        
        await cacheSetAll('devices', devicesWithData);
        return devicesWithData;
      }
      
      // If query succeeded but data is empty, return empty array
      if (!data || data.length === 0) {
        await cacheSetAll('devices', []);
        return [];
      }
      
      // Fetch customer and technician data separately (always use this approach for reliability)
      const customerIds = [...new Set((data || []).map(d => d.customer_id).filter(Boolean))];
      const technicianIds = [...new Set((data || []).map(d => d.assigned_to || d.technician_id).filter(Boolean))];
      
      // Fetch customers (handle empty array case)
      let customersData: any[] = [];
      if (customerIds.length > 0) {
        const { data: custData, error: custError } = await supabase
          .from('customers')
          .select('id, name, phone, email, loyalty_level, total_spent, last_visit, color_tag')
          .in('id', customerIds);
        
        if (!custError && custData) {
          customersData = custData;
        } else if (custError) {
          console.warn('⚠️ Error fetching customers:', custError.message);
        }
      }
      
      // Fetch technicians (handle empty array case)
      let techniciansData: any[] = [];
      if (technicianIds.length > 0) {
        const { data: techData, error: techError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', technicianIds);
        
        if (!techError && techData) {
          techniciansData = techData;
        } else if (techError) {
          console.warn('⚠️ Error fetching technicians:', techError.message);
        }
      }
      
      const customersMap = new Map(customersData.map(c => [c.id, c]));
      const techniciansMap = new Map(techniciansData.map(t => [t.id, t]));
      
      const devicesWithData = (data || []).map(device => {
        // Try to get customer/technician from joined data first, then from maps
        const customer = (device as any).customers || customersMap.get(device.customer_id);
        const technician = (device as any).technician || techniciansMap.get(device.assigned_to || device.technician_id);

        return {
          ...device,
          serialNumber: device.serial_number || device.imei || '',
          issueDescription: device.issue_description || device.problem_description || '',
          customerId: device.customer_id,
          assignedTo: device.assigned_to || device.technician_id,
          expectedReturnDate: device.expected_return_date || device.estimated_completion_date,
          estimatedHours: device.estimated_hours,
          customerName: customer?.name || '',
          phoneNumber: customer?.phone || '',
          customerEmail: customer?.email || '',
          customerLoyaltyLevel: customer?.loyalty_level || '',
          customerTotalSpent: customer?.total_spent || 0,
          customerLastVisit: customer?.last_visit || null,
          customerColorTag: customer?.color_tag || '',
          assignedToName: technician?.full_name || '',
          // Cost fields - now supported in database
          repairCost: device.repair_cost || device.estimated_cost || device.actual_cost || null,
          depositAmount: device.deposit_amount || null,
          deviceCost: device.device_cost || null,
          repairPrice: device.repair_price || null,
          // Additional device fields
          unlockCode: null,
          diagnosisRequired: device.diagnosis_required || false,
          deviceNotes: device.device_notes || null,
          deviceCondition: null,
          // Checklist fields
          diagnosticChecklist: null,
          repairChecklist: null,
          remarks: [],
          transitions: [],
          ratings: [],
          createdAt: device.created_at,
          updatedAt: device.updated_at,
        };
      });
      
      await cacheSetAll('devices', devicesWithData);
      return devicesWithData;
    } catch (error) {
      console.error('Error fetching devices:', error);
      return await cacheGetAll('devices');
    }
  } else {
    return await cacheGetAll('devices');
  }
}

export async function fetchAllDevicesDirect() {
  // 🔒 Get current branch for isolation
  const currentBranchId = localStorage.getItem('current_branch_id');
  
  let query = supabase
    .from('devices')
    .select(`
      id,
      customer_id,
      brand,
      model,
      serial_number,
      problem_description,
      status,
      technician_id,
      estimated_completion_date,
      created_at,
      updated_at
    `);
  
  // 🔒 COMPLETE ISOLATION: Only show devices from current branch
  if (currentBranchId) {
    query = query.eq('branch_id', currentBranchId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(device => ({
    ...device,
    createdAt: device.created_at,
    updatedAt: device.updated_at,
  }));
}

export async function addDeviceToDb(device: Device) {
  // 🔒 Get current branch for isolation
  const currentBranchId = localStorage.getItem('current_branch_id');
  
  // Map camelCase fields to snake_case for DB
  // Ensure IMEI and serial_number are synced (both should have the same value)
  const serialNumber = device.serialNumber || '';
  const imei = serialNumber; // IMEI and serial_number are the same in this system
  
  const dbDevice = {
    id: device.id,
    branch_id: currentBranchId || '00000000-0000-0000-0000-000000000001', // 🔒 Add branch isolation
    customer_id: device.customerId,
    device_name: device.model || `${device.brand} Device` || 'Unknown Device', // REQUIRED field
    brand: device.brand || null,
    model: device.model || null,
    serial_number: serialNumber || null,
    imei: imei || null, // Sync IMEI with serial_number
    problem_description: device.issueDescription || null, // Legacy field for compatibility
    issue_description: device.issueDescription || null,
    status: device.status || 'assigned',
    technician_id: device.assignedTo || null, // Legacy field for compatibility
    assigned_to: device.assignedTo || null,
    // Fix: set expected_return_date to null if empty string
    expected_return_date: device.expectedReturnDate === '' ? null : device.expectedReturnDate,
    estimated_completion_date: device.expectedReturnDate === '' ? null : device.expectedReturnDate, // Legacy field
    created_at: device.createdAt,
    updated_at: device.updatedAt,
    unlock_code: device.unlockCode || null,
    // Pricing information - now supported in database
    repair_cost: device.repairCost ? parseFloat(String(device.repairCost)) : null,
    repair_price: device.repairPrice ? parseFloat(String(device.repairPrice)) : null,
    deposit_amount: device.depositAmount ? parseFloat(String(device.depositAmount)) : null,
    diagnosis_required: device.diagnosisRequired || false,
    device_notes: device.deviceNotes || null,
    device_cost: device.deviceCost ? parseFloat(String(device.deviceCost)) : null,
    estimated_hours: device.estimatedHours || null,
    device_condition: device.deviceCondition ? JSON.stringify(device.deviceCondition) : null,
  };
  
  // Log the data being inserted for debugging
  console.log('💾 Inserting device to database:', {
    id: dbDevice.id,
    customer_id: dbDevice.customer_id,
    device_name: dbDevice.device_name,
    brand: dbDevice.brand,
    model: dbDevice.model,
    serial_number: dbDevice.serial_number,
    imei: dbDevice.imei,
    status: dbDevice.status,
    assigned_to: dbDevice.assigned_to,
    branch_id: dbDevice.branch_id
  });
  
  // Insert device first
  const { data: deviceData, error: deviceError } = await supabase.from('devices').insert([dbDevice]).select();
  
  if (deviceError) {
    console.error('❌ Database error inserting device:', deviceError);
    throw new Error(`Failed to insert device: ${deviceError.message}`);
  }
  
  if (!deviceData || deviceData.length === 0) {
    console.error('❌ No data returned from device insert');
    throw new Error('Failed to create device - no data returned');
  }
  
  console.log('✅ Device inserted successfully:', deviceData[0].id);
  
  return deviceData[0];
}

// Utility function to fix corrupted device data
export async function fixCorruptedDeviceData(deviceId: string) {

  try {
    // Get the current device data
    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single();
      
    if (fetchError || !device) {
      console.error('[fixCorruptedDeviceData] Could not fetch device:', fetchError);
      return false;
    }
    
    // Check if status is a UUID
    if (device.status && device.status.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {

      // Reset to a safe default status
      const { error: updateError } = await supabase
        .from('devices')
        .update({ status: 'assigned' })
        .eq('id', deviceId);
        
      if (updateError) {
        console.error('[fixCorruptedDeviceData] Failed to fix device:', updateError);
        return false;
      }

      return true;
    }
    
    return false; // No corruption found
  } catch (error) {
    console.error('[fixCorruptedDeviceData] Error fixing device:', error);
    return false;
  }
}

export async function updateDeviceInDb(deviceId: string, updates: Partial<Device>) {

  // Valid device status values
  const validStatusValues = [
    'assigned', 'diagnosis-started', 'awaiting-parts', 'parts-arrived', 'in-repair',
    'reassembled-testing', 'repair-complete', 'process-payments', 'returned-to-customer-care', 'done', 'failed'
  ];
  
  // Only process fields that exist in the database schema
  const validUpdateFields = [
    'assignedTo', 'serialNumber', 'issueDescription', 'customerId', 
    'expectedReturnDate', 'estimatedHours', 'warrantyStart', 'warrantyEnd', 
    'warrantyStatus', 'repairCount', 'lastReturnDate', 'brand', 'model', 'status'
  ];
  
  // Filter updates to only include valid fields and validate status
  const filteredUpdates: any = {};
  Object.keys(updates).forEach(key => {
    if (validUpdateFields.includes(key) && updates[key as keyof Device] !== undefined) {
      const value = updates[key as keyof Device];
      
      // Special validation for status field
      if (key === 'status') {
        if (typeof value === 'string' && validStatusValues.includes(value)) {
          filteredUpdates[key] = value;

        } else {


          // Check if it's a UUID (common bug)
          if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            console.error('[updateDeviceInDb] 🚨 CRITICAL BUG: Status field contains UUID instead of valid status!');
            console.error('[updateDeviceInDb] This indicates a data corruption bug in the application.');
            console.error('[updateDeviceInDb] Device ID:', deviceId, 'Invalid status UUID:', value);
          }
          
          // Don't add invalid status values
          return;
        }
      } else {
        filteredUpdates[key] = value;
      }
    }
  });

  // Check if there are any valid updates to process
  if (Object.keys(filteredUpdates).length === 0) {

    return { success: false, message: 'No valid updates to process' };
  }
  
  // Map camelCase fields to snake_case for DB
  const dbUpdates: any = { ...filteredUpdates };
  if ('assignedTo' in dbUpdates) {
    dbUpdates.assigned_to = dbUpdates.assignedTo;
    delete dbUpdates.assignedTo;
  }
  if ('serialNumber' in dbUpdates) {
    dbUpdates.serial_number = dbUpdates.serialNumber;
    delete dbUpdates.serialNumber;
  }
  if ('issueDescription' in dbUpdates) {
    dbUpdates.issue_description = dbUpdates.issueDescription;
    delete dbUpdates.issueDescription;
  }
  if ('customerId' in dbUpdates) {
    dbUpdates.customer_id = dbUpdates.customerId;
    delete dbUpdates.customerId;
  }
  if ('expectedReturnDate' in dbUpdates) {
    dbUpdates.expected_return_date = dbUpdates.expectedReturnDate;
    delete dbUpdates.expectedReturnDate;
  }
  if ('estimatedHours' in dbUpdates) {
    dbUpdates.estimated_hours = dbUpdates.estimatedHours;
    delete dbUpdates.estimatedHours;
  }
  if ('warrantyStart' in dbUpdates) {
    dbUpdates.warranty_start = dbUpdates.warrantyStart;
    delete dbUpdates.warrantyStart;
  }
  if ('warrantyEnd' in dbUpdates) {
    dbUpdates.warranty_end = dbUpdates.warrantyEnd;
    delete dbUpdates.warrantyEnd;
  }
  if ('warrantyStatus' in dbUpdates) {
    dbUpdates.warranty_status = dbUpdates.warrantyStatus;
    delete dbUpdates.warrantyStatus;
  }
  if ('repairCount' in dbUpdates) {
    dbUpdates.repair_count = dbUpdates.repairCount;
    delete dbUpdates.repairCount;
  }
  if ('lastReturnDate' in dbUpdates) {
    dbUpdates.last_return_date = dbUpdates.lastReturnDate;
    delete dbUpdates.lastReturnDate;
  }
  

  
  // Only allow fields that are valid columns in the devices table (based on actual database schema)
  const validDeviceFields = [
    'id', 'customer_id', 'brand', 'model', 'serial_number', 'issue_description', 'status', 'assigned_to', 'estimated_hours', 'expected_return_date', 'warranty_start', 'warranty_end', 'warranty_status', 'repair_count', 'last_return_date', 'diagnostic_checklist', 'created_at', 'updated_at'
  ];
  Object.keys(dbUpdates).forEach(key => {
    if (!validDeviceFields.includes(key)) {

      delete dbUpdates[key];
    }
  });


  console.log('[updateDeviceInDb] Update fields count:', Object.keys(dbUpdates).length);
  
  // First check if the device exists and get current data

  const { data: existingDevice, error: checkError } = await supabase
    .from('devices')
    .select('*')
    .eq('id', deviceId)
    .single();
    
  if (checkError) {
    console.error('[updateDeviceInDb] Device not found:', checkError);
    console.error('[updateDeviceInDb] Check error details:', {
      message: checkError.message,
      details: checkError.details,
      hint: checkError.hint,
      code: checkError.code
    });
    throw new Error(`Device with ID ${deviceId} not found`);
  }

  // Show what fields will be updated

  Object.keys(dbUpdates).forEach(key => {
    const oldValue = existingDevice[key];
    const newValue = dbUpdates[key];

  });

  const { data, error } = await supabase
    .from('devices')
    .update(dbUpdates)
    .eq('id', deviceId)
    .select();
    
  if (error) {
    console.error('[updateDeviceInDb] ❌ Database update failed:', error);
    console.error('[updateDeviceInDb] Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    console.error('[updateDeviceInDb] Failed update data:', dbUpdates);
    
    // Database constraint should now support all statuses after migration
    
    throw error;
  }


  return data && data[0] ? { ...data[0], assignedTo: data[0].assigned_to } : null;
}

export async function deleteDeviceFromDb(deviceId: string) {
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', deviceId);
  if (error) throw error;
  return true;
}

// Enhanced pagination with efficient JOIN queries
export async function fetchDevicesPage(page: number, pageSize: number = 20): Promise<Device[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  
  if (navigator.onLine) {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = localStorage.getItem('current_branch_id');
      
      // First try with customer join - use explicit column selection
      let query = supabase
        .from('devices')
        .select(`
          id,
          customer_id,
          brand,
          model,
          serial_number,
          problem_description,
          status,
          technician_id,
          estimated_completion_date,
          created_at,
          updated_at,
          estimated_cost,
          actual_cost,
          deposit_amount
        `)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      // 🔒 COMPLETE ISOLATION: Only show devices from current branch
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
      if (error) {

        // Fallback: fetch devices without customer join - use explicit column selection
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('devices')
          .select(`
            id,
            customer_id,
            brand,
            model,
            serial_number,
            problem_description,
            status,
            technician_id,
            estimated_completion_date,
            created_at,
            updated_at,
            estimated_cost,
            actual_cost,
            deposit_amount
          `)
          .order('created_at', { ascending: false })
          .range(from, to);
        
        if (fallbackError) {
          console.error('Error fetching devices page:', fallbackError);
          throw fallbackError;
        }
        
        const devicesWithData = (fallbackData || []).map(device => {
          const transformedRemarks = (device.remarks || []).map((remark: any) => ({
            id: remark.id,
            content: remark.content,
            createdBy: remark.created_by,
            createdAt: remark.created_at
          }));
          
          const transformedTransitions = (device.transitions || []).map((transition: any) => ({
            id: transition.id,
            fromStatus: transition.from_status,
            toStatus: transition.to_status,
            performedBy: transition.performed_by,
            timestamp: transition.created_at,
            signature: transition.signature || ''
          }));
          
          const transformedRatings = (device.ratings || []).map((rating: any) => ({
            id: rating.id,
            deviceId: rating.device_id,
            technicianId: rating.technician_id,
            score: rating.score || 5, // Default to 5 if score column doesn't exist
            comment: rating.comment,
            createdAt: rating.created_at
          }));

          return {
            ...device,
            serialNumber: device.serial_number,
            issueDescription: device.issue_description,
            customerId: device.customer_id,
            assignedTo: device.assigned_to,
            expectedReturnDate: device.expected_return_date,
            customerName: '', // No customer data available
            phoneNumber: '', // No customer data available
            remarks: transformedRemarks,
            transitions: transformedTransitions,
            ratings: transformedRatings,
            createdAt: device.created_at,
            updatedAt: device.updated_at,
          };
        });
        
        return devicesWithData;
      }
      
      const devicesWithData = (data || []).map(device => {
        // Related data will be fetched separately on details page

        return {
          ...device,
          serialNumber: device.serial_number,
          issueDescription: device.issue_description,
          customerId: device.customer_id,
          assignedTo: device.assigned_to,
          expectedReturnDate: device.expected_return_date,
          customerName: device.customers?.name || '',
          phoneNumber: device.customers?.phone || '',
          customerEmail: device.customers?.email || '',
          customerLoyaltyLevel: device.customers?.loyalty_level || '',
          customerTotalSpent: device.customers?.total_spent || 0,
          customerLastVisit: device.customers?.last_visit || null,
          customerColorTag: device.customers?.color_tag || '',
          // Cost fields - now supported in database
          repairCost: device.repair_cost || null,
          depositAmount: device.deposit_amount || null,
          deviceCost: device.device_cost,
          repairPrice: device.repair_price || null,
          // Additional device fields
          unlockCode: null,
          diagnosisRequired: device.diagnosis_required,
          deviceNotes: device.device_notes,
          deviceCondition: null,
          // Checklist fields
          diagnosticChecklist: null,
          repairChecklist: null,
          remarks: [],
          transitions: [],
          ratings: [],
          createdAt: device.created_at,
          updatedAt: device.updated_at,
        };
      });
      
      return devicesWithData;
    } catch (error) {
      console.error('Error fetching devices page:', error);
      throw error;
    }
  } else {
    return await cacheGetAll('devices');
  }
}

// Get total count for pagination
export async function getDevicesCount(): Promise<number> {
  if (navigator.onLine) {
    const { count, error } = await supabase
      .from('devices')
      .select('id', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  } else {
    const all = await cacheGetAll('devices');
    return all.length;
  }
}

export const deviceServices = {};
export const inventoryService = {};
export default inventoryService; 