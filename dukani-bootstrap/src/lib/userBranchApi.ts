import { supabase } from './supabaseClient';

/**
 * User Branch Assignment API
 * Manages user assignments to branches/stores
 */

export interface UserBranchAssignment {
  id: string;
  user_id: string;
  branch_id: string;
  is_primary: boolean;
  can_manage: boolean;
  can_view_reports: boolean;
  can_manage_inventory: boolean;
  can_manage_staff: boolean;
  assigned_at: string;
  assigned_by?: string;
  branch?: {
    id: string;
    name: string;
    code: string;
    city: string;
    is_main: boolean;
  };
}

export interface BranchAssignmentInput {
  branch_id: string;
  is_primary?: boolean;
  can_manage?: boolean;
  can_view_reports?: boolean;
  can_manage_inventory?: boolean;
  can_manage_staff?: boolean;
}

/**
 * Get all branch assignments for a user
 */
export async function getUserBranchAssignments(userId: string): Promise<UserBranchAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('user_branch_assignments')
      .select(`
        *,
        branch:store_locations!branch_id (
          id,
          name,
          code,
          city,
          is_main
        )
      `)
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('Error fetching user branch assignments:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserBranchAssignments:', error);
    return [];
  }
}

/**
 * Get all available branches/stores
 */
export async function getAllBranches() {
  try {
    const { data, error } = await supabase
      .from('store_locations')
      .select('id, name, code, city, is_main, is_active')
      .eq('is_active', true)
      .order('is_main', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching branches:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllBranches:', error);
    return [];
  }
}

/**
 * Assign user to a branch
 */
export async function assignUserToBranch(
  userId: string,
  branchAssignment: BranchAssignmentInput,
  assignedBy?: string
): Promise<UserBranchAssignment | null> {
  try {
    // If this is being set as primary, unset any existing primary
    if (branchAssignment.is_primary) {
      await supabase
        .from('user_branch_assignments')
        .update({ is_primary: false })
        .eq('user_id', userId);
    }

    const { data, error } = await supabase
      .from('user_branch_assignments')
      .insert({
        user_id: userId,
        branch_id: branchAssignment.branch_id,
        is_primary: branchAssignment.is_primary || false,
        can_manage: branchAssignment.can_manage || false,
        can_view_reports: branchAssignment.can_view_reports || false,
        can_manage_inventory: branchAssignment.can_manage_inventory || false,
        can_manage_staff: branchAssignment.can_manage_staff || false,
        assigned_by: assignedBy
      })
      .select()
      .single();

    if (error) {
      console.error('Error assigning user to branch:', error);
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error in assignUserToBranch:', error);
    
    // Check for duplicate assignment error
    if (error.message?.includes('duplicate key value') || error.code === '23505') {
      throw new Error('User is already assigned to this branch');
    }
    
    throw error;
  }
}

/**
 * Update user branch assignment permissions
 */
export async function updateUserBranchAssignment(
  assignmentId: string,
  updates: Partial<BranchAssignmentInput>
): Promise<UserBranchAssignment | null> {
  try {
    const { data, error } = await supabase
      .from('user_branch_assignments')
      .update(updates)
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user branch assignment:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateUserBranchAssignment:', error);
    throw error;
  }
}

/**
 * Remove user from branch
 */
export async function removeUserFromBranch(assignmentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_branch_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error removing user from branch:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in removeUserFromBranch:', error);
    return false;
  }
}

/**
 * Bulk assign user to multiple branches
 */
export async function bulkAssignUserToBranches(
  userId: string,
  branchAssignments: BranchAssignmentInput[],
  assignedBy?: string
): Promise<boolean> {
  try {
    // First, remove all existing assignments
    await supabase
      .from('user_branch_assignments')
      .delete()
      .eq('user_id', userId);

    // Then insert new assignments
    if (branchAssignments.length > 0) {
      const assignments = branchAssignments.map(assignment => ({
        user_id: userId,
        branch_id: assignment.branch_id,
        is_primary: assignment.is_primary || false,
        can_manage: assignment.can_manage || false,
        can_view_reports: assignment.can_view_reports || false,
        can_manage_inventory: assignment.can_manage_inventory || false,
        can_manage_staff: assignment.can_manage_staff || false,
        assigned_by: assignedBy
      }));

      const { error } = await supabase
        .from('user_branch_assignments')
        .insert(assignments);

      if (error) {
        console.error('Error bulk assigning user to branches:', error);
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in bulkAssignUserToBranches:', error);
    return false;
  }
}

/**
 * Set primary branch for user
 */
export async function setPrimaryBranch(userId: string, branchId: string): Promise<boolean> {
  try {
    // First, unset all primary flags for this user
    await supabase
      .from('user_branch_assignments')
      .update({ is_primary: false })
      .eq('user_id', userId);

    // Then set the new primary
    const { error } = await supabase
      .from('user_branch_assignments')
      .update({ is_primary: true })
      .eq('user_id', userId)
      .eq('branch_id', branchId);

    if (error) {
      console.error('Error setting primary branch:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in setPrimaryBranch:', error);
    return false;
  }
}

/**
 * Check if user has access to all branches
 */
export async function userHasAccessToAllBranches(userId: string): Promise<boolean> {
  try {
    // Get user's role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return false;
    }

    // Admins have access to all branches by default
    if (userData.role === 'admin') {
      return true;
    }

    // Otherwise check if they have assignments
    const { data: assignments, error: assignError } = await supabase
      .from('user_branch_assignments')
      .select('id')
      .eq('user_id', userId);

    if (assignError) {
      return false;
    }

    // If no assignments, they have access to all by default
    return !assignments || assignments.length === 0;
  } catch (error) {
    console.error('Error checking user branch access:', error);
    return false;
  }
}

/**
 * Get users assigned to a specific branch
 */
export async function getBranchUsers(branchId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('user_branch_assignments')
      .select(`
        *,
        users (
          id,
          email,
          full_name,
          role,
          is_active
        )
      `)
      .eq('branch_id', branchId);

    if (error) {
      console.error('Error fetching branch users:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBranchUsers:', error);
    return [];
  }
}

