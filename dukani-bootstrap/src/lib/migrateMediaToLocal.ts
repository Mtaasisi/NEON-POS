/**
 * Migration Script: Supabase Storage to Local Storage
 * Converts existing Supabase-hosted media to local browser storage
 */

import { supabase } from './supabaseClient';
import { localMediaStorage } from './localMediaStorage';
import type { MediaLibraryItem } from '../types/whatsapp-advanced';

export interface MigrationResult {
  success: boolean;
  migrated: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export async function migrateMediaToLocalStorage(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrated: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  try {
    console.log('🔄 Starting media migration to local storage...');

    // Get all media items from database
    const { data: mediaItems, error } = await supabase
      .from('whatsapp_media_library')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      result.errors.push(`Failed to fetch media items: ${error.message}`);
      return result;
    }

    if (!mediaItems || mediaItems.length === 0) {
      console.log('✅ No media items to migrate');
      result.success = true;
      return result;
    }

    console.log(`📊 Found ${mediaItems.length} media items to migrate`);

    for (const item of mediaItems) {
      try {
        console.log(`\n📄 Processing: ${item.file_name}`);

        // Check if already migrated (relative path without http/https/data:)
        if (!item.file_url.startsWith('http://') && 
            !item.file_url.startsWith('https://') && 
            !item.file_url.startsWith('data:')) {
          console.log(`⏭️  Already migrated, skipping`);
          result.skipped++;
          continue;
        }

        // Download the file from the URL
        console.log(`📥 Downloading from: ${item.file_url.substring(0, 100)}...`);
        
        let blob: Blob;
        
        // Handle data URLs differently
        if (item.file_url.startsWith('data:')) {
          console.log(`🔄 Converting data URL to blob...`);
          const response = await fetch(item.file_url);
          blob = await response.blob();
        } else {
          // Download from HTTP/HTTPS URL
          const response = await fetch(item.file_url, {
            mode: 'cors',
            credentials: 'omit'
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          blob = await response.blob();
        }

        console.log(`✅ Downloaded ${blob.size} bytes`);

        // Create File object from blob
        const file = new File(
          [blob], 
          item.file_name, 
          { type: item.mime_type || 'application/octet-stream' }
        );

        // Upload to local storage
        console.log(`💾 Saving to local storage...`);
        const uploadResult = await localMediaStorage.uploadMedia(file, item.folder);

        if (!uploadResult.success || !uploadResult.relativePath) {
          throw new Error(uploadResult.error || 'Upload failed');
        }

        console.log(`✅ Saved as: ${uploadResult.relativePath}`);

        // Update database with new relative path
        const { error: updateError } = await supabase
          .from('whatsapp_media_library')
          .update({ file_url: uploadResult.relativePath })
          .eq('id', item.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        console.log(`✅ Database updated`);
        result.migrated++;

      } catch (error: any) {
        console.error(`❌ Failed to migrate ${item.file_name}:`, error.message);
        result.failed++;
        result.errors.push(`${item.file_name}: ${error.message}`);
      }
    }

    result.success = true;
    console.log('\n✅ Migration complete!');
    console.log(`📊 Results:
      - Migrated: ${result.migrated}
      - Skipped: ${result.skipped}
      - Failed: ${result.failed}
    `);

    return result;

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    result.errors.push(`Migration failed: ${error.message}`);
    return result;
  }
}

/**
 * Check if migration is needed
 */
export async function checkMigrationNeeded(): Promise<boolean> {
  try {
    const { data: mediaItems } = await supabase
      .from('whatsapp_media_library')
      .select('file_url')
      .limit(1);

    if (!mediaItems || mediaItems.length === 0) {
      return false;
    }

    // Check if any items have external URLs
    return mediaItems.some(item => 
      item.file_url.startsWith('http://') || 
      item.file_url.startsWith('https://')
    );
  } catch {
    return false;
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  total: number;
  migrated: number;
  pending: number;
  needsMigration: boolean;
}> {
  try {
    const { data: allItems } = await supabase
      .from('whatsapp_media_library')
      .select('file_url');

    if (!allItems) {
      return { total: 0, migrated: 0, pending: 0, needsMigration: false };
    }

    const total = allItems.length;
    const pending = allItems.filter(item => 
      item.file_url.startsWith('http://') || 
      item.file_url.startsWith('https://')
    ).length;
    const migrated = total - pending;

    return {
      total,
      migrated,
      pending,
      needsMigration: pending > 0
    };
  } catch {
    return { total: 0, migrated: 0, pending: 0, needsMigration: false };
  }
}

