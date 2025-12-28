import { supabase } from './supabaseClient';

export interface MigrationConfig {
  id: string;
  user_id: string;
  config_name: string;
  use_direct_connection: boolean;
  source_connection_string?: string;
  target_connection_string?: string;
  source_branch_name?: string;
  target_branch_name?: string;
  neon_api_key?: string;
  neon_project_id?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all migration configurations for current user
 */
export const getMigrationConfigs = async (userId: string): Promise<MigrationConfig[]> => {
  try {
    const { data, error } = await supabase
      .from('migration_configurations')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching migration configs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching migration configs:', error);
    throw error;
  }
};

/**
 * Get default migration configuration for current user
 */
export const getDefaultMigrationConfig = async (userId: string): Promise<MigrationConfig | null> => {
  try {
    const { data, error } = await supabase
      .from('migration_configurations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching default migration config:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching default migration config:', error);
    return null;
  }
};

/**
 * Save migration configuration
 */
export const saveMigrationConfig = async (
  userId: string,
  config: Omit<MigrationConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<MigrationConfig> => {
  try {
    // If this is set as default, unset other defaults
    if (config.is_default) {
      await supabase
        .from('migration_configurations')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('migration_configurations')
      .insert({
        ...config,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving migration config:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error saving migration config:', error);
    throw error;
  }
};

/**
 * Update migration configuration
 */
export const updateMigrationConfig = async (
  configId: string,
  userId: string,
  updates: Partial<Omit<MigrationConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<MigrationConfig> => {
  try {
    // If setting as default, unset other defaults
    if (updates.is_default) {
      await supabase
        .from('migration_configurations')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true)
        .neq('id', configId);
    }

    const { data, error } = await supabase
      .from('migration_configurations')
      .update(updates)
      .eq('id', configId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating migration config:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating migration config:', error);
    throw error;
  }
};

/**
 * Delete migration configuration
 */
export const deleteMigrationConfig = async (configId: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('migration_configurations')
      .delete()
      .eq('id', configId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting migration config:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error deleting migration config:', error);
    throw error;
  }
};

/**
 * Set default migration configuration
 */
export const setDefaultMigrationConfig = async (configId: string, userId: string): Promise<void> => {
  try {
    // Unset all other defaults
    await supabase
      .from('migration_configurations')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);

    // Set this one as default
    const { error } = await supabase
      .from('migration_configurations')
      .update({ is_default: true })
      .eq('id', configId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error setting default migration config:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error setting default migration config:', error);
    throw error;
  }
};

