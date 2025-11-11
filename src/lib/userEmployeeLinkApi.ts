/**
 * User-Employee Link API
 * Manages the relationship between user accounts and employee records
 */

import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { employeeService } from '../services/employeeService';

// ===================================================================
// TYPES AND INTERFACES
// ===================================================================

export interface UserEmployeeLink {
  userId: string;
  employeeId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  employeeName: string;
  employeeEmail: string;
  employeePosition: string;
  employeeDepartment: string;
  linkedAt: string;
}

export interface LinkStatus {
  hasUser: boolean;
  hasEmployee: boolean;
  isLinked: boolean;
  userId?: string;
  employeeId?: string;
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

// ===================================================================
// LINK MANAGEMENT FUNCTIONS
// ===================================================================

/**
 * Check link status for a user
 */
export async function checkUserEmployeeLink(userId: string): Promise<LinkStatus> {
  try {
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw userError;

    if (!user) {
      return {
        hasUser: false,
        hasEmployee: false,
        isLinked: false
      };
    }

    // Check if employee exists linked to this user
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, user_id, email')
      .eq('user_id', userId)
      .maybeSingle();

    if (empError) throw empError;

    return {
      hasUser: true,
      hasEmployee: !!employee,
      isLinked: !!employee && employee.user_id === userId,
      userId: user.id,
      employeeId: employee?.id
    };
  } catch (error) {
    console.error('Error checking user-employee link:', error);
    throw error;
  }
}

/**
 * Check link status by email
 */
export async function checkLinkByEmail(email: string): Promise<LinkStatus> {
  try {
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    if (userError) throw userError;

    // Check if employee exists with this email
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, user_id, email')
      .ilike('email', email)
      .maybeSingle();

    if (empError) throw empError;

    const isLinked = !!(user && employee && employee.user_id === user.id);

    return {
      hasUser: !!user,
      hasEmployee: !!employee,
      isLinked,
      userId: user?.id,
      employeeId: employee?.id
    };
  } catch (error) {
    console.error('Error checking link by email:', error);
    throw error;
  }
}

/**
 * Link existing user to existing employee by email
 */
export async function linkUserToEmployeeByEmail(email: string): Promise<boolean> {
  try {
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .ilike('email', email)
      .single();

    if (userError || !user) {
      toast.error('User not found with this email');
      return false;
    }

    // Get employee
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, email, user_id')
      .ilike('email', email)
      .single();

    if (empError || !employee) {
      toast.error('Employee not found with this email');
      return false;
    }

    // Check if already linked
    if (employee.user_id) {
      if (employee.user_id === user.id) {
        toast('User and employee already linked', { icon: 'ℹ️' });
        return true;
      } else {
        toast.error('Employee already linked to another user');
        return false;
      }
    }

    // Link them
    const { error: updateError } = await supabase
      .from('employees')
      .update({ user_id: user.id, updated_at: new Date().toISOString() })
      .eq('id', employee.id);

    if (updateError) throw updateError;

    toast.success(`Linked ${user.full_name} to employee record`);
    return true;
  } catch (error: any) {
    console.error('Error linking user to employee:', error);
    toast.error(error.message || 'Failed to link user and employee');
    return false;
  }
}

/**
 * Link specific user to specific employee
 */
export async function linkUserToEmployee(userId: string, employeeId: string): Promise<boolean> {
  try {
    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      toast.error('User not found');
      return false;
    }

    // Verify employee exists
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, email, user_id, first_name, last_name')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      toast.error('Employee not found');
      return false;
    }

    // Check if employee already linked
    if (employee.user_id && employee.user_id !== userId) {
      toast.error('Employee already linked to another user');
      return false;
    }

    // Link them
    const { error: updateError } = await supabase
      .from('employees')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', employeeId);

    if (updateError) throw updateError;

    const employeeFullName = `${employee.first_name} ${employee.last_name}`;
    toast.success(`Linked ${user.full_name} to ${employeeFullName}`);
    return true;
  } catch (error: any) {
    console.error('Error linking user to employee:', error);
    toast.error(error.message || 'Failed to link user and employee');
    return false;
  }
}

/**
 * Unlink user from employee
 */
export async function unlinkUserFromEmployee(employeeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('employees')
      .update({ user_id: null, updated_at: new Date().toISOString() })
      .eq('id', employeeId);

    if (error) throw error;

    toast.success('Unlinked user from employee');
    return true;
  } catch (error: any) {
    console.error('Error unlinking user from employee:', error);
    toast.error(error.message || 'Failed to unlink');
    return false;
  }
}

/**
 * Create employee record for existing user
 */
export async function createEmployeeForUser(
  userId: string,
  employeeData: {
    position: string;
    department: string;
    salary?: number;
    hireDate?: string;
  }
): Promise<string | null> {
  try {
    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, phone')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      toast.error('User not found');
      return null;
    }

    // Check if employee already exists for this user
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      toast('Employee record already exists for this user', { icon: 'ℹ️' });
      return existing.id;
    }

    // Create employee
    // Split full_name into first and last name if needed
    const nameParts = (user.full_name || 'Unknown User').split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    
    const employee = await employeeService.createEmployee({
      userId: user.id,
      firstName,
      lastName,
      email: user.email,
      phone: user.phone || '',
      position: employeeData.position,
      department: employeeData.department,
      hireDate: employeeData.hireDate || new Date().toISOString().split('T')[0],
      salary: employeeData.salary || 0,
      currency: 'TZS',
      status: 'active',
      employmentType: 'full-time',
      performanceRating: 3.0,
      skills: null
    });

    return employee.id;
  } catch (error: any) {
    console.error('Error creating employee for user:', error);
    toast.error(error.message || 'Failed to create employee record');
    return null;
  }
}

/**
 * Link all users to employees automatically by matching emails
 */
export async function autoLinkAllUserEmployees(): Promise<{ 
  linked: number; 
  skipped: number; 
  errors: number 
}> {
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .eq('is_active', true);

    if (usersError) throw usersError;

    // Get all employees without user_id
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, email, user_id')
      .is('user_id', null);

    if (empError) throw empError;

    let linked = 0;
    let skipped = 0;
    let errors = 0;

    // Match and link
    for (const employee of employees || []) {
      try {
        const matchingUser = users?.find(
          u => u.email.toLowerCase() === employee.email.toLowerCase()
        );

        if (matchingUser) {
          const { error } = await supabase
            .from('employees')
            .update({ user_id: matchingUser.id, updated_at: new Date().toISOString() })
            .eq('id', employee.id);

          if (error) {
            errors++;
          } else {
            linked++;
          }
        } else {
          skipped++;
        }
      } catch (error) {
        errors++;
      }
    }

    if (linked > 0) {
      toast.success(`Linked ${linked} users to employees`);
    }

    if (errors > 0) {
      toast.error(`${errors} errors occurred during linking`);
    }

    return { linked, skipped, errors };
  } catch (error: any) {
    console.error('Error auto-linking users and employees:', error);
    toast.error(error.message || 'Failed to auto-link');
    return { linked: 0, skipped: 0, errors: 0 };
  }
}

/**
 * Get all user-employee links
 */
export async function getAllUserEmployeeLinks(): Promise<UserEmployeeLink[]> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        email,
        position,
        department,
        created_at,
        users:users!user_id (
          id,
          email,
          full_name,
          role
        )
      `)
      .not('user_id', 'is', null);

    if (error) throw error;

    const links: UserEmployeeLink[] = (data || []).map((item: any) => ({
      userId: item.user_id,
      employeeId: item.id,
      userName: item.users?.full_name || 'Unknown',
      userEmail: item.users?.email || '',
      userRole: item.users?.role || '',
      employeeName: `${item.first_name} ${item.last_name}` || 'Unknown',
      employeeEmail: item.email,
      employeePosition: item.position,
      employeeDepartment: item.department,
      linkedAt: item.created_at
    }));

    return links;
  } catch (error: any) {
    // Silently handle errors - likely table/permission issues
    // Only log once if it's a real error (not permission/missing table)
    if (error?.code && error.code !== 'PGRST116' && error.code !== '42P01') {
      console.warn('User-employee links unavailable');
    }
    return [];
  }
}

/**
 * Get unlinked users (users without employee records)
 */
export async function getUnlinkedUsers(): Promise<any[]> {
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active')
      .eq('is_active', true);

    if (usersError) throw usersError;

    // Get all linked user IDs
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('user_id')
      .not('user_id', 'is', null);

    if (empError) throw empError;

    const linkedUserIds = new Set((employees || []).map(e => e.user_id));
    
    // Filter out linked users
    const unlinkedUsers = (users || []).filter(u => !linkedUserIds.has(u.id));

    return unlinkedUsers.map(toCamelCase);
  } catch (error: any) {
    // Silently handle errors - likely table/permission issues
    // Only log once if it's a real error (not permission/missing table)
    if (error?.code && error.code !== 'PGRST116' && error.code !== '42P01') {
      console.warn('Unlinked users query unavailable');
    }
    return [];
  }
}

/**
 * Get unlinked employees (employees without user accounts)
 */
export async function getUnlinkedEmployees(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, email, first_name, last_name, position, status')
      .is('user_id', null)
      .eq('status', 'active');

    if (error) throw error;

    // Map to include a full_name field for display
    return (data || []).map(emp => ({
      ...toCamelCase(emp),
      fullName: `${emp.first_name} ${emp.last_name}`
    }));
  } catch (error) {
    console.error('Error getting unlinked employees:', error);
    return [];
  }
}

/**
 * Get employee by user ID
 */
export async function getEmployeeByUserId(userId: string): Promise<any | null> {
  try {
    return await employeeService.getEmployeeByUserId(userId);
  } catch (error) {
    console.error('Error getting employee by user ID:', error);
    return null;
  }
}

// Export all functions
export default {
  checkUserEmployeeLink,
  checkLinkByEmail,
  linkUserToEmployeeByEmail,
  linkUserToEmployee,
  unlinkUserFromEmployee,
  createEmployeeForUser,
  autoLinkAllUserEmployees,
  getAllUserEmployeeLinks,
  getUnlinkedUsers,
  getUnlinkedEmployees,
  getEmployeeByUserId
};

