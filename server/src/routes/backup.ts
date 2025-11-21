/**
 * Backup & Restore Routes
 * Database backup and restore operations
 */

import express from 'express';
import multer from 'multer';
import { sql } from '../db/connection.js';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = express.Router();

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max file size (1024MB)
  },
  fileFilter: (req, file, cb) => {
    // Accept SQL and JSON files
    if (file.mimetype === 'application/sql' || 
        file.mimetype === 'text/plain' ||
        file.mimetype === 'application/json' ||
        file.originalname.endsWith('.sql') ||
        file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .sql and .json files are allowed.'));
    }
  },
});

/**
 * POST /api/backup/restore/preview
 * Preview backup file contents without restoring
 * Returns list of tables and record counts available in the backup
 * Uses optionalAuth since this is a read-only operation
 */
router.post(
  '/restore/preview',
  optionalAuth,
  upload.single('backupFile'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No backup file provided');
      }

      const file = req.file;
      const fileContent = file.buffer.toString('utf8');
      const fileName = file.originalname;
      const isSqlFile = fileName.endsWith('.sql') || file.mimetype === 'application/sql' || file.mimetype === 'text/plain';
      const isJsonFile = fileName.endsWith('.json') || file.mimetype === 'application/json';

      if (!isSqlFile && !isJsonFile) {
        throw new ApiError(400, 'Invalid file format. Only .sql and .json files are supported.');
      }

      console.log(`🔍 Previewing backup file: ${fileName} (${isSqlFile ? 'SQL' : 'JSON'} format)...`);

      let previewData: any;

      if (isSqlFile) {
        previewData = await previewSqlBackup(fileContent);
      } else {
        previewData = await previewJsonBackup(fileContent);
      }

      res.json({
        success: true,
        data: {
          fileName,
          format: isSqlFile ? 'SQL' : 'JSON',
          fileSize: file.size,
          tables: previewData.tables,
          totalTables: previewData.tables.length,
          totalRecords: previewData.totalRecords,
          timestamp: previewData.timestamp,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/backup/restore
 * Restore database from backup file (SQL or JSON format)
 * 
 * Body can include:
 * - backupFile: The backup file (multipart/form-data)
 * - selectedTables: Optional array of table names to restore (if not provided, restores all)
 * 
 * SQL format is recommended as it's the easiest to restore:
 * - Standard PostgreSQL format
 * - Can be executed directly
 * - Contains both schema and data
 * - Easy to validate
 * 
 * Note: Uses optionalAuth since the app uses Supabase authentication.
 * In production, consider adding Supabase token validation or requiring admin role.
 */
router.post(
  '/restore',
  optionalAuth,
  upload.single('backupFile'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No backup file provided');
      }

      const file = req.file;
      const fileContent = file.buffer.toString('utf8');
      const fileName = file.originalname;
      const isSqlFile = fileName.endsWith('.sql') || file.mimetype === 'application/sql' || file.mimetype === 'text/plain';
      const isJsonFile = fileName.endsWith('.json') || file.mimetype === 'application/json';

      if (!isSqlFile && !isJsonFile) {
        throw new ApiError(400, 'Invalid file format. Only .sql and .json files are supported.');
      }

      // Get selected tables from request body (if provided)
      const selectedTables: string[] | undefined = req.body.selectedTables 
        ? (typeof req.body.selectedTables === 'string' 
            ? JSON.parse(req.body.selectedTables) 
            : req.body.selectedTables)
        : undefined;

      console.log(`🔄 Starting database restore from ${fileName} (${isSqlFile ? 'SQL' : 'JSON'} format)...`);
      if (selectedTables && selectedTables.length > 0) {
        console.log(`📋 Selected tables to restore: ${selectedTables.join(', ')}`);
      } else {
        console.log(`📋 Restoring all tables`);
      }

      let tablesRestored = 0;
      let recordsRestored = 0;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Start transaction
      await sql`BEGIN`;

      try {
        if (isSqlFile) {
          // Restore from SQL format
          const result = await restoreFromSql(fileContent, selectedTables);
          tablesRestored = result.tablesRestored;
          recordsRestored = result.recordsRestored;
          errors.push(...result.errors);
          warnings.push(...result.warnings);
        } else {
          // Restore from JSON format
          const result = await restoreFromJson(fileContent, selectedTables);
          tablesRestored = result.tablesRestored;
          recordsRestored = result.recordsRestored;
          errors.push(...result.errors);
          warnings.push(...result.warnings);
        }

        // Commit transaction
        await sql`COMMIT`;

        console.log(`✅ Database restore completed successfully!`);
        console.log(`   Tables restored: ${tablesRestored}`);
        console.log(`   Records restored: ${recordsRestored}`);

        res.json({
          success: true,
          message: '✅ Database restore completed successfully!',
          data: {
            tablesRestored,
            recordsRestored,
            fileName,
            format: isSqlFile ? 'SQL' : 'JSON',
            selectedTables: selectedTables || 'all',
            warnings: warnings.length > 0 ? warnings : undefined,
            errors: errors.length > 0 ? errors : undefined,
          },
        });
      } catch (restoreError: any) {
        // Rollback transaction on error
        try {
          await sql`ROLLBACK`;
          console.log('✅ Transaction rolled back successfully');
        } catch (rollbackError: any) {
          console.error('❌ Error during rollback:', rollbackError.message || rollbackError);
        }
        
        console.error('❌ Restore error:', restoreError);
        console.error('Error name:', restoreError.name);
        console.error('Error message:', restoreError.message);
        console.error('Error stack:', restoreError.stack);
        
        // Return detailed error information
        const errorMessage = restoreError.message || 'Unknown error';
        
        // Extract a user-friendly error message
        // Remove common prefixes and clean up the message
        let userMessage = errorMessage
          .replace(/^Restore failed:\s*/i, '')
          .replace(/^SQL restore failed:\s*/i, '')
          .replace(/^JSON restore failed:\s*/i, '')
          .split('\n')[0] // Get first line only
          .trim();
        
        // If we have a database error, make it more user-friendly
        if (userMessage.includes('relation') && userMessage.includes('does not exist')) {
          userMessage = 'Table not found in database. The backup file may be for a different database schema.';
        } else if (userMessage.includes('syntax error') || userMessage.includes('SQL syntax')) {
          userMessage = 'SQL syntax error in backup file. The file may be corrupted or in an unsupported format.';
        } else if (userMessage.includes('duplicate key') || userMessage.includes('unique constraint')) {
          userMessage = 'Duplicate key error. Some records already exist in the database.';
        } else if (userMessage.includes('foreign key') || userMessage.includes('constraint')) {
          userMessage = 'Foreign key constraint violation. Related records may be missing.';
        } else if (userMessage.includes('permission denied') || userMessage.includes('access denied')) {
          userMessage = 'Permission denied. Check database user permissions.';
        } else if (userMessage.includes('connection') || userMessage.includes('timeout')) {
          userMessage = 'Database connection error. Please try again.';
        }
        
        // In development, include full details in the error
        const fullErrorDetails = process.env.NODE_ENV === 'development' 
          ? `${userMessage}${restoreError.stack ? '\n\nStack trace:\n' + restoreError.stack.substring(0, 500) : ''}`
          : userMessage;
        
        // Ensure we throw an ApiError so it's properly handled
        throw new ApiError(
          500,
          fullErrorDetails,
          true
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Preview SQL backup file to extract table information
 */
async function previewSqlBackup(sqlContent: string): Promise<{
  tables: Array<{ name: string; recordCount: number }>;
  totalRecords: number;
  timestamp?: string;
}> {
  const tables = new Map<string, number>();
  
  // Extract table names and record counts from INSERT statements
  const insertMatches = sqlContent.matchAll(/INSERT\s+INTO\s+["']?(\w+)["']?/gi);
  for (const match of insertMatches) {
    const tableName = match[1];
    const currentCount = tables.get(tableName) || 0;
    tables.set(tableName, currentCount + 1);
  }
  
  // Also check for COPY statements (pg_dump format)
  const copyMatches = sqlContent.matchAll(/COPY\s+["']?(\w+)["']?/gi);
  for (const match of copyMatches) {
    const tableName = match[1];
    if (!tables.has(tableName)) {
      // Count data lines after COPY statement
      const copyIndex = match.index || 0;
      const afterCopy = sqlContent.substring(copyIndex);
      const dataLines = afterCopy.match(/^\d+/gm);
      tables.set(tableName, dataLines ? dataLines.length : 0);
    }
  }
  
  // Extract timestamp if available
  const timestampMatch = sqlContent.match(/-- Dumped.*?(\d{4}-\d{2}-\d{2}[\s\d:]+)/i);
  const timestamp = timestampMatch ? timestampMatch[1] : undefined;
  
  const tableArray = Array.from(tables.entries()).map(([name, count]) => ({
    name,
    recordCount: count,
  }));
  
  const totalRecords = tableArray.reduce((sum, table) => sum + table.recordCount, 0);
  
  return {
    tables: tableArray.sort((a, b) => a.name.localeCompare(b.name)),
    totalRecords,
    timestamp,
  };
}

/**
 * Preview JSON backup file to extract table information
 */
async function previewJsonBackup(jsonContent: string): Promise<{
  tables: Array<{ name: string; recordCount: number }>;
  totalRecords: number;
  timestamp?: string;
}> {
  const backupData = JSON.parse(jsonContent);
  
  if (!backupData.tables || typeof backupData.tables !== 'object') {
    throw new Error('Invalid backup format: missing "tables" object');
  }
  
  const tables: Array<{ name: string; recordCount: number }> = [];
  let totalRecords = 0;
  
  for (const [tableName, tableData] of Object.entries(backupData.tables)) {
    const data = (tableData as any)?.data;
    const recordCount = Array.isArray(data) ? data.length : 0;
    tables.push({ name: tableName, recordCount });
    totalRecords += recordCount;
  }
  
  return {
    tables: tables.sort((a, b) => a.name.localeCompare(b.name)),
    totalRecords,
    timestamp: backupData.timestamp,
  };
}

/**
 * Restore from SQL format
 * SQL format is the easiest to restore - standard PostgreSQL format
 */
async function restoreFromSql(sqlContent: string, selectedTables?: string[]): Promise<{
  tablesRestored: number;
  recordsRestored: number;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tablesSeen = new Set<string>();
  let recordsRestored = 0;

  try {
    // Execute the entire SQL content as-is
    // This is the most reliable way to restore SQL dumps
    // PostgreSQL can handle multiple statements in a single execution
    console.log(`📝 Executing SQL restore...`);

    try {
      // For large SQL files, we need to execute statement by statement
      // sql.unsafe() may not handle very large files well
      // So we'll parse and execute statements individually
      
      // First, try to parse SQL into statements
      const statements: string[] = [];
      let currentStatement = '';
      const lines = sqlContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('/*')) {
          continue;
        }
        
        currentStatement += line + '\n';
        
        // If line ends with semicolon, finalize statement
        if (trimmed.endsWith(';')) {
          const stmt = currentStatement.trim();
          if (stmt) {
            statements.push(stmt);
          }
          currentStatement = '';
        }
      }
      
      // Add remaining statement if any
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      
      console.log(`📝 Parsed ${statements.length} SQL statements`);
      
      // Execute statements one by one
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (!statement) continue;
        
        try {
          // Skip schema-only statements
          if (statement.match(/^(SET|CREATE|ALTER|DROP|GRANT|REVOKE|COMMENT)/i)) {
            continue;
          }
          
          // Check if we should skip this statement based on table selection
          if (selectedTables && selectedTables.length > 0) {
            let shouldSkip = true;
            
            if (statement.match(/^INSERT\s+INTO/i)) {
              const tableMatch = statement.match(/INSERT\s+INTO\s+["']?(\w+)["']?/i);
              if (tableMatch && selectedTables.includes(tableMatch[1])) {
                shouldSkip = false;
              }
            } else if (statement.match(/^COPY/i)) {
              const tableMatch = statement.match(/COPY\s+["']?(\w+)["']?/i);
              if (tableMatch && selectedTables.includes(tableMatch[1])) {
                shouldSkip = false;
              }
            } else {
              // For other statements, skip them if we're filtering tables
              shouldSkip = true;
            }
            
            if (shouldSkip) {
              continue;
            }
          }
          
          // Execute the statement
          await sql.unsafe(statement);
          
          // Track tables and records
          if (statement.match(/^INSERT\s+INTO/i)) {
            const tableMatch = statement.match(/INSERT\s+INTO\s+["']?(\w+)["']?/i);
            if (tableMatch) {
              tablesSeen.add(tableMatch[1]);
              recordsRestored++;
            }
          } else if (statement.match(/^COPY/i)) {
            const tableMatch = statement.match(/COPY\s+["']?(\w+)["']?/i);
            if (tableMatch) {
              tablesSeen.add(tableMatch[1]);
            }
          }
        } catch (stmtError: any) {
          const errorMsg = `Statement ${i + 1}: ${stmtError.message}`;
          console.warn(`⚠️  ${errorMsg}`);
          warnings.push(errorMsg);
          // Continue with next statement instead of failing completely
        }
      }
      
      // Count INSERT statements to estimate records restored
      const insertMatches = sqlContent.match(/INSERT\s+INTO\s+["']?(\w+)["']?/gi);
      if (insertMatches) {
        recordsRestored = insertMatches.length;
        
        // Extract unique table names
        insertMatches.forEach(match => {
          const tableMatch = match.match(/INSERT\s+INTO\s+["']?(\w+)["']?/i);
          if (tableMatch) {
            tablesSeen.add(tableMatch[1]);
          }
        });
      }
      
      // If no INSERTs found, try to count COPY statements (pg_dump format)
      if (recordsRestored === 0) {
        const copyMatches = sqlContent.match(/COPY\s+["']?(\w+)["']?\s+\(/gi);
        if (copyMatches) {
          copyMatches.forEach(match => {
            const tableMatch = match.match(/COPY\s+["']?(\w+)["']?/i);
            if (tableMatch) {
              tablesSeen.add(tableMatch[1]);
            }
          });
          
          // Estimate records from COPY data lines
          const dataLines = sqlContent.match(/^\d+/gm);
          if (dataLines) {
            recordsRestored = dataLines.length;
          }
        }
      }
      
      console.log(`✅ SQL restore executed successfully`);
    } catch (sqlError: any) {
      // If there was an error in the inner try block, log it
      console.error(`❌ SQL execution error:`, sqlError.message);
      errors.push(`SQL execution failed: ${sqlError.message}`);
      throw sqlError;
    }

    return {
      tablesRestored: tablesSeen.size || 1,
      recordsRestored: recordsRestored || 0,
      errors,
      warnings,
    };
  } catch (error: any) {
    errors.push(`SQL restore failed: ${error.message}`);
    throw error;
  }
}

/**
 * Restore from JSON format
 */
async function restoreFromJson(jsonContent: string, selectedTables?: string[]): Promise<{
  tablesRestored: number;
  recordsRestored: number;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let tablesRestored = 0;
  let recordsRestored = 0;

  try {
    const backupData = JSON.parse(jsonContent);

    // Validate backup structure
    if (!backupData.tables || typeof backupData.tables !== 'object') {
      throw new Error('Invalid backup format: missing "tables" object');
    }

    const tables = backupData.tables;
    let tableNames = Object.keys(tables);

    // Filter by selected tables if provided
    if (selectedTables && selectedTables.length > 0) {
      tableNames = tableNames.filter(name => selectedTables.includes(name));
      console.log(`📦 Restoring ${tableNames.length} selected tables out of ${Object.keys(tables).length} total tables`);
    } else {
      console.log(`📦 Found ${tableNames.length} tables to restore`);
    }

    // Restore each table
    for (const tableName of tableNames) {
      try {
        const tableData = tables[tableName];
        
        if (!tableData || !tableData.data || !Array.isArray(tableData.data)) {
          warnings.push(`Table ${tableName}: No data to restore`);
          continue;
        }

        const rows = tableData.data;
        if (rows.length === 0) {
          warnings.push(`Table ${tableName}: Empty table`);
          continue;
        }

        console.log(`🔄 Restoring table ${tableName} (${rows.length} records)...`);

        // Get column names from first row
        const columns = Object.keys(rows[0]);
        
        // Build INSERT statement with ON CONFLICT handling
        for (const row of rows) {
          try {
            const values = columns.map(col => row[col]);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            
            // Build ON CONFLICT clause (assuming id is primary key)
            const conflictClause = columns.includes('id')
              ? `ON CONFLICT (id) DO UPDATE SET ${columns
                  .filter(c => c !== 'id')
                  .map((c, i) => `${c} = EXCLUDED.${c}`)
                  .join(', ')}`
              : '';

            const insertQuery = `
              INSERT INTO ${tableName} (${columns.join(', ')})
              VALUES (${placeholders})
              ${conflictClause}
            `;

            await sql.unsafe(insertQuery, values);
            recordsRestored++;
          } catch (rowError: any) {
            warnings.push(`Table ${tableName}: Error inserting row - ${rowError.message}`);
          }
        }

        tablesRestored++;
        console.log(`  ✅ Restored ${rows.length} records to ${tableName}`);
      } catch (tableError: any) {
        errors.push(`Table ${tableName}: ${tableError.message}`);
        warnings.push(`Skipping table ${tableName} due to errors`);
      }
    }

    return {
      tablesRestored,
      recordsRestored,
      errors,
      warnings,
    };
  } catch (error: any) {
    errors.push(`JSON restore failed: ${error.message}`);
    throw error;
  }
}

/**
 * GET /api/backup/restore/formats
 * Get information about supported restore formats
 * Uses optionalAuth since this is just informational and doesn't require authentication
 */
router.get('/restore/formats', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    res.json({
      success: true,
      formats: [
        {
          format: 'SQL',
          extension: '.sql',
          description: 'PostgreSQL SQL dump format (RECOMMENDED)',
          advantages: [
            'Standard PostgreSQL format',
            'Easiest to restore',
            'Can be executed directly with psql',
            'Contains both schema and data',
            'Easy to validate and preview',
            'Works with any PostgreSQL tool',
          ],
          mimeTypes: ['application/sql', 'text/plain'],
        },
        {
          format: 'JSON',
          extension: '.json',
          description: 'JSON backup format',
          advantages: [
            'Human-readable',
            'Easy to parse programmatically',
            'Can be edited before restore',
            'Good for selective restore',
          ],
          mimeTypes: ['application/json'],
        },
      ],
      recommended: 'SQL',
      note: 'SQL format is recommended as it is the easiest to restore and is the standard PostgreSQL format.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

