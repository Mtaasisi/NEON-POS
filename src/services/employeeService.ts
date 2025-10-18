/**
 * Employee Management Service
 * Handles all employee-related operations including CRUD, attendance, and leave management
 */

import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ===================================================================
// TYPES AND INTERFACES
// ===================================================================

export interface Employee {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  position: string;
  department: string;
  hireDate: string;
  terminationDate?: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'intern';
  salary: number;
  currency: string;
  status: 'active' | 'inactive' | 'on-leave' | 'terminated';
  performanceRating: number;
  skills: string[];
  managerId?: string;
  location?: string;
  branchId?: string; // ✨ NEW - Branch/Store assignment
  branch?: {         // ✨ NEW - Populated via join
    id: string;
    name: string;
    code: string;
    isMain: boolean;
  };
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  photoUrl?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLocationLat?: number;
  checkInLocationLng?: number;
  checkOutLocationLat?: number;
  checkOutLocationLng?: number;
  checkInNetworkSsid?: string;
  checkOutNetworkSsid?: string;
  checkInPhotoUrl?: string;
  checkOutPhotoUrl?: string;
  totalHours: number;
  breakHours: number;
  overtimeHours: number;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: 'annual' | 'sick' | 'personal' | 'unpaid' | 'emergency';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  attachmentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeShift {
  id: string;
  employeeId: string;
  shiftTemplateId?: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  inactiveEmployees: number;
  averageAttendanceRate: number;
  averagePerformanceRating: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

// Convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// Convert camelCase to snake_case
const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// ===================================================================
// EMPLOYEE SERVICE CLASS
// ===================================================================

class EmployeeService {
  // =================================================================
  // EMPLOYEE CRUD OPERATIONS
  // =================================================================

  /**
   * Get all employees
   */
  async getAllEmployees(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          branch:store_locations!branch_id(id, name, code, is_main)
        `)
        .order('created_at', { ascending: false});

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
      throw error;
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          branch:store_locations!branch_id(id, name, code, is_main)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return toCamelCase(data);
    } catch (error) {
      console.error('Error fetching employee:', error);
      toast.error('Failed to load employee details');
      throw error;
    }
  }

  /**
   * Get employee by user ID
   */
  async getEmployeeByUserId(userId: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data ? toCamelCase(data) : null;
    } catch (error) {
      console.error('Error fetching employee by user ID:', error);
      throw error;
    }
  }

  /**
   * Get active employees
   */
  async getActiveEmployees(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          branch:store_locations!branch_id(id, name, code, is_main)
        `)
        .eq('status', 'active')
        .order('first_name', { ascending: true });

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching active employees:', error);
      throw error;
    }
  }

  /**
   * Create new employee
   */
  async createEmployee(employee: Partial<Employee>): Promise<Employee> {
    try {
      const employeeData = toSnakeCase(employee);
      
      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Employee created successfully');
      return toCamelCase(data);
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast.error(error.message || 'Failed to create employee');
      throw error;
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    try {
      const updateData = toSnakeCase(updates);
      
      const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Employee updated successfully');
      return toCamelCase(data);
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast.error(error.message || 'Failed to update employee');
      throw error;
    }
  }

  /**
   * Delete employee
   */
  async deleteEmployee(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Employee deleted successfully');
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast.error(error.message || 'Failed to delete employee');
      throw error;
    }
  }

  /**
   * Search employees
   */
  async searchEmployees(query: string): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,position.ilike.%${query}%,department.ilike.%${query}%`)
        .order('first_name', { ascending: true });

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error searching employees:', error);
      throw error;
    }
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          branch:store_locations!branch_id(id, name, code, is_main)
        `)
        .eq('department', department)
        .order('first_name', { ascending: true });

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching employees by department:', error);
      throw error;
    }
  }

  /**
   * Get employees by branch/store
   */
  async getEmployeesByBranch(branchId: string): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          branch:store_locations!branch_id(id, name, code, is_main)
        `)
        .eq('branch_id', branchId)
        .order('first_name', { ascending: true });

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching employees by branch:', error);
      throw error;
    }
  }

  /**
   * Assign employee to branch
   */
  async assignEmployeeToBranch(employeeId: string, branchId: string): Promise<Employee> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update({ branch_id: branchId })
        .eq('id', employeeId)
        .select(`
          *,
          branch:store_locations!branch_id(id, name, code, is_main)
        `)
        .single();

      if (error) throw error;
      
      toast.success('Employee assigned to branch successfully');
      return toCamelCase(data);
    } catch (error: any) {
      console.error('Error assigning employee to branch:', error);
      toast.error(error.message || 'Failed to assign employee to branch');
      throw error;
    }
  }

  /**
   * Remove employee from branch
   */
  async removeEmployeeFromBranch(employeeId: string): Promise<Employee> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update({ branch_id: null })
        .eq('id', employeeId)
        .select(`
          *,
          branch:store_locations!branch_id(id, name, code, is_main)
        `)
        .single();

      if (error) throw error;
      
      toast.success('Employee removed from branch');
      return toCamelCase(data);
    } catch (error: any) {
      console.error('Error removing employee from branch:', error);
      toast.error(error.message || 'Failed to remove employee from branch');
      throw error;
    }
  }

  // =================================================================
  // ATTENDANCE OPERATIONS
  // =================================================================

  /**
   * Get all attendance records
   */
  async getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast.error('Failed to load attendance records');
      throw error;
    }
  }

  /**
   * Get attendance by employee ID
   */
  async getAttendanceByEmployeeId(employeeId: string, limit?: number): Promise<AttendanceRecord[]> {
    try {
      let query = supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('attendance_date', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      throw error;
    }
  }

  /**
   * Get today's attendance for an employee
   */
  async getTodayAttendance(employeeId: string): Promise<AttendanceRecord | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('attendance_date', today)
        .maybeSingle();

      if (error) throw error;
      return data ? toCamelCase(data) : null;
    } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
      throw error;
    }
  }

  /**
   * Check in employee
   */
  async checkIn(
    employeeId: string,
    locationData?: { lat: number; lng: number },
    networkSsid?: string,
    photoUrl?: string
  ): Promise<AttendanceRecord> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      // Check if already checked in today
      const existing = await this.getTodayAttendance(employeeId);
      
      if (existing && existing.checkInTime) {
        toast.error('Already checked in today');
        throw new Error('Already checked in today');
      }

      // Build attendance data, only including defined fields
      const attendanceData: any = {
        employee_id: employeeId,
        attendance_date: today,
        check_in_time: now,
        status: 'present'
      };
      
      if (locationData?.lat !== undefined) attendanceData.check_in_location_lat = locationData.lat;
      if (locationData?.lng !== undefined) attendanceData.check_in_location_lng = locationData.lng;
      if (networkSsid !== undefined) attendanceData.check_in_network_ssid = networkSsid;
      if (photoUrl !== undefined) attendanceData.check_in_photo_url = photoUrl;

      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(attendanceData)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Checked in successfully');
      return toCamelCase(data);
    } catch (error: any) {
      console.error('Error checking in:', error);
      toast.error(error.message || 'Failed to check in');
      throw error;
    }
  }

  /**
   * Check out employee
   */
  async checkOut(
    employeeId: string,
    locationData?: { lat: number; lng: number },
    networkSsid?: string,
    photoUrl?: string
  ): Promise<AttendanceRecord> {
    try {
      const now = new Date().toISOString();
      
      // Check if checked in
      const existing = await this.getTodayAttendance(employeeId);
      
      if (!existing || !existing.checkInTime) {
        toast.error('Not checked in yet');
        throw new Error('Not checked in yet');
      }

      if (existing.checkOutTime) {
        toast.error('Already checked out today');
        throw new Error('Already checked out today');
      }

      // Build update object, only including defined fields
      const updateData: any = {
        check_out_time: now
      };
      
      if (locationData?.lat !== undefined) updateData.check_out_location_lat = locationData.lat;
      if (locationData?.lng !== undefined) updateData.check_out_location_lng = locationData.lng;
      if (networkSsid !== undefined) updateData.check_out_network_ssid = networkSsid;
      if (photoUrl !== undefined) updateData.check_out_photo_url = photoUrl;

      const { data, error } = await supabase
        .from('attendance_records')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Checked out successfully');
      return toCamelCase(data);
    } catch (error: any) {
      console.error('Error checking out:', error);
      toast.error(error.message || 'Failed to check out');
      throw error;
    }
  }

  /**
   * Mark manual attendance
   */
  async markAttendance(attendanceData: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    try {
      const data = toSnakeCase(attendanceData);
      
      const { data: result, error } = await supabase
        .from('attendance_records')
        .upsert(data, { 
          onConflict: 'employee_id,attendance_date'
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Attendance marked successfully');
      return toCamelCase(result);
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast.error(error.message || 'Failed to mark attendance');
      throw error;
    }
  }

  /**
   * Delete attendance record
   */
  async deleteAttendanceRecord(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Attendance record deleted');
    } catch (error: any) {
      console.error('Error deleting attendance:', error);
      toast.error(error.message || 'Failed to delete attendance');
      throw error;
    }
  }

  /**
   * Get attendance by date range
   */
  async getAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching attendance by date range:', error);
      throw error;
    }
  }

  // =================================================================
  // LEAVE REQUEST OPERATIONS
  // =================================================================

  /**
   * Get all leave requests
   */
  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
      throw error;
    }
  }

  /**
   * Get leave requests by employee
   */
  async getLeaveRequestsByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching employee leave requests:', error);
      throw error;
    }
  }

  /**
   * Create leave request
   */
  async createLeaveRequest(leaveData: Partial<LeaveRequest>): Promise<LeaveRequest> {
    try {
      const data = toSnakeCase(leaveData);
      
      const { data: result, error } = await supabase
        .from('leave_requests')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Leave request submitted');
      return toCamelCase(result);
    } catch (error: any) {
      console.error('Error creating leave request:', error);
      toast.error(error.message || 'Failed to submit leave request');
      throw error;
    }
  }

  /**
   * Update leave request status
   */
  async updateLeaveRequestStatus(
    id: string,
    status: 'approved' | 'rejected' | 'cancelled',
    reviewNotes?: string
  ): Promise<LeaveRequest> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success(`Leave request ${status}`);
      return toCamelCase(data);
    } catch (error: any) {
      console.error('Error updating leave request:', error);
      toast.error(error.message || 'Failed to update leave request');
      throw error;
    }
  }

  // =================================================================
  // STATISTICS AND REPORTS
  // =================================================================

  /**
   * Get employee statistics
   */
  async getEmployeeStats(): Promise<EmployeeStats> {
    try {
      // Get employee counts
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('status, performance_rating');

      if (empError) throw empError;

      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAttendance, error: attError } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('attendance_date', today);

      if (attError) throw attError;

      const stats: EmployeeStats = {
        totalEmployees: employees?.length || 0,
        activeEmployees: employees?.filter((e: any) => e.status === 'active').length || 0,
        onLeaveEmployees: employees?.filter((e: any) => e.status === 'on-leave').length || 0,
        inactiveEmployees: employees?.filter((e: any) => e.status === 'inactive').length || 0,
        averagePerformanceRating: employees?.length 
          ? employees.reduce((sum: number, e: any) => sum + (e.performance_rating || 0), 0) / employees.length
          : 0,
        averageAttendanceRate: 0, // Calculate from attendance history
        presentToday: todayAttendance?.filter((a: any) => a.status === 'present').length || 0,
        absentToday: todayAttendance?.filter((a: any) => a.status === 'absent').length || 0,
        lateToday: todayAttendance?.filter((a: any) => a.status === 'late').length || 0,
      };

      return stats;
    } catch (error) {
      console.error('Error fetching employee stats:', error);
      throw error;
    }
  }

  /**
   * Get today's attendance summary
   */
  async getTodaysAttendanceSummary(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('todays_attendance')
        .select('*');

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching today\'s attendance summary:', error);
      throw error;
    }
  }

  /**
   * Get employee attendance summary
   */
  async getEmployeeAttendanceSummary(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('employee_attendance_summary')
        .select('*');

      if (error) throw error;
      return toCamelCase(data || []);
    } catch (error) {
      console.error('Error fetching employee attendance summary:', error);
      throw error;
    }
  }

  // =================================================================
  // EXPORT FUNCTIONS
  // =================================================================

  /**
   * Export employees to CSV
   */
  exportEmployeesToCSV(employees: Employee[]): string {
    const headers = [
      'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Position', 
      'Department', 'Status', 'Hire Date', 'Salary', 'Performance Rating'
    ];

    const rows = employees.map(emp => [
      emp.id,
      emp.firstName,
      emp.lastName,
      emp.email,
      emp.phone || '',
      emp.position,
      emp.department,
      emp.status,
      emp.hireDate,
      emp.salary,
      emp.performanceRating
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Export attendance to CSV
   */
  exportAttendanceToCSV(attendance: AttendanceRecord[]): string {
    const headers = [
      'ID', 'Employee ID', 'Date', 'Check In', 'Check Out', 
      'Total Hours', 'Overtime Hours', 'Status', 'Notes'
    ];

    const rows = attendance.map(att => [
      att.id,
      att.employeeId,
      att.attendanceDate,
      att.checkInTime || '',
      att.checkOutTime || '',
      att.totalHours,
      att.overtimeHours,
      att.status,
      att.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Download CSV file
   */
  downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${filename} downloaded successfully`);
  }
}

// Export singleton instance
export const employeeService = new EmployeeService();
export default employeeService;

