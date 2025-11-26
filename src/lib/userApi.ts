/**
 * User Management API
 * Handles all user CRUD operations with the database
 */

import { supabase } from './supabaseClient';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  role: 'admin' | 'manager' | 'technician' | 'customer-care' | 'user';
  is_active?: boolean;
  phone?: string;
  department?: string;
  permissions?: string[];
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  password: string;
  role: 'admin' | 'manager' | 'technician' | 'customer-care' | 'user';
  phone?: string;
  department?: string;
  permissions?: string[];
  accessAllBranches?: boolean;
  assignedBranches?: string[];
  customPermissions?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  role?: 'admin' | 'manager' | 'technician' | 'customer-care' | 'user';
  phone?: string;
  department?: string;
  is_active?: boolean;
  password?: string;
  permissions?: string[];
}

/**
 * Fetch all users from the database
 */
export async function fetchAllUsers(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchAllUsers:', error);
    throw error;
  }
}

/**
 * Fetch a single user by ID
 */
export async function fetchUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in fetchUserById:', error);
    return null;
  }
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserData): Promise<User> {
  try {
    const fullName = `${userData.firstName} ${userData.lastName}`;
    
    // Use custom permissions if provided, otherwise use default permissions based on role
    const permissions = userData.permissions && userData.permissions.length > 0
      ? userData.permissions
      : getDefaultPermissions(userData.role);

    // Use provided username or generate from email
    const username = userData.username || userData.email.split('@')[0];

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: userData.email,
          password: userData.password, // In production, this should be hashed
          full_name: fullName,
          username: username,
          role: userData.role,
          phone: userData.phone || null,
          department: userData.department || null,
          permissions: permissions,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('Error in createUser:', error);
    // Check for duplicate email error
    if (error.message?.includes('duplicate key value') || error.code === '23505') {
      throw new Error('A user with this email already exists');
    }
    throw error;
  }
}

/**
 * Update an existing user
 */
export async function updateUser(userId: string, userData: UpdateUserData): Promise<User> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Build full_name if firstName or lastName provided
    if (userData.firstName || userData.lastName) {
      // If we need to build full_name, we might need the current user data
      const currentUser = await fetchUserById(userId);
      if (currentUser) {
        const currentNames = currentUser.full_name?.split(' ') || ['', ''];
        const firstName = userData.firstName || currentNames[0];
        const lastName = userData.lastName || currentNames[1];
        updateData.full_name = `${firstName} ${lastName}`;
      }
    }

    if (userData.email) updateData.email = userData.email;
    if (userData.username) updateData.username = userData.username;
    if (userData.password) updateData.password = userData.password; // In production, hash this
    if (userData.role) {
      updateData.role = userData.role;
      // Only update permissions if not explicitly provided
      if (!userData.permissions) {
        updateData.permissions = getDefaultPermissions(userData.role);
      }
    }
    if (userData.permissions) updateData.permissions = userData.permissions;
    if (userData.phone !== undefined) updateData.phone = userData.phone;
    if (userData.department !== undefined) updateData.department = userData.department;
    if (userData.is_active !== undefined) updateData.is_active = userData.is_active;

    // Update main users table
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }

    // Also update auth_users table if it exists (for systems with dual tables)
    try {
      const authUpdateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (userData.username) authUpdateData.username = userData.username;
      if (userData.email) authUpdateData.email = userData.email;
      if (updateData.full_name) authUpdateData.name = updateData.full_name;
      if (userData.role) authUpdateData.role = userData.role;
      if (userData.is_active !== undefined) authUpdateData.is_active = userData.is_active;
      if (userData.permissions) authUpdateData.permissions = userData.permissions;
      
      // Try to update auth_users (will fail silently if table doesn't exist)
      await supabase
        .from('auth_users')
        .update(authUpdateData)
        .eq('id', userId);
      
      console.log('✅ Synced user update to auth_users table');
    } catch (authError) {
      // Silently ignore if auth_users table doesn't exist
      console.log('ℹ️ auth_users table not found or not used (this is normal for single-table setups)');
    }

    return data;
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw error;
  }
}

/**
 * Reset user password
 */
export async function resetUserPassword(userId: string, newPassword: string): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password: newPassword, // In production, this should be hashed
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error resetting password:', error);
      throw new Error(`Failed to reset password: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in resetUserPassword:', error);
    throw error;
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserStatus(userId: string, isActive: boolean): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling user status:', error);
      throw new Error(`Failed to toggle user status: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in toggleUserStatus:', error);
    throw error;
  }
}

/**
 * Bulk update users status
 */
export async function bulkUpdateUserStatus(userIds: string[], isActive: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .in('id', userIds);

    if (error) {
      console.error('Error bulk updating users:', error);
      throw new Error(`Failed to bulk update users: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in bulkUpdateUserStatus:', error);
    throw error;
  }
}

/**
 * Bulk delete users
 */
export async function bulkDeleteUsers(userIds: string[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .in('id', userIds);

    if (error) {
      console.error('Error bulk deleting users:', error);
      throw new Error(`Failed to bulk delete users: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in bulkDeleteUsers:', error);
    throw error;
  }
}

/**
 * Get default permissions based on role
 */
function getDefaultPermissions(role: string): string[] {
  switch (role) {
    case 'admin':
      return ['all'];
    case 'manager':
      return ['inventory', 'customers', 'reports', 'employees'];
    case 'technician':
      return ['devices', 'spare-parts'];
    case 'customer-care':
      return ['customers', 'appointments'];
    case 'store-keeper':
      return ['inventory', 'stock', 'purchase-orders', 'reports'];
    case 'user':
      return ['basic'];
    default:
      return ['basic'];
  }
}

/**
 * Parse full_name into firstName and lastName
 */
export function parseFullName(fullName: string | undefined): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' };
  
  const parts = fullName.trim().split(' ');
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  
  return { firstName, lastName };
}

/**
 * Transform database user to UI user format
 */
export function transformUserForUI(user: User): any {
  const { firstName, lastName } = parseFullName(user.full_name);
  
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName,
    lastName,
    role: user.role,
    status: user.is_active ? 'active' : 'inactive',
    lastLogin: user.last_login,
    createdAt: user.created_at,
    phone: user.phone,
    department: user.department,
    permissions: user.permissions || []
  };
}

