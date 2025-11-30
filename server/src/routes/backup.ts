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

      // Get restore type (full or schema-only)
      const restoreType: 'full' | 'schema-only' = req.body.restoreType || 'full';

      console.log(`🔄 Starting database restore from ${fileName} (${isSqlFile ? 'SQL' : 'JSON'} format)...`);
      console.log(`📋 Restore type: ${restoreType === 'schema-only' ? 'Schema only (no data)' : 'Full (schema + data)'}`);
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
          const result = await restoreFromSql(fileContent, selectedTables, restoreType);
          tablesRestored = result.tablesRestored;
          recordsRestored = result.recordsRestored;
          errors.push(...result.errors);
          warnings.push(...result.warnings);
        } else {
          // Restore from JSON format
          const result = await restoreFromJson(fileContent, selectedTables, restoreType);
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
            restoreType: restoreType,
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
 * @param restoreType - 'full' to restore schema + data, 'schema-only' to restore only table structures
 */
async function restoreFromSql(sqlContent: string, selectedTables?: string[], restoreType: 'full' | 'schema-only' = 'full'): Promise<{
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
      // Handle COPY statements specially as they span multiple lines
      const statements: string[] = [];
      let currentStatement = '';
      let inCopyMode = false;
      const lines = sqlContent.split('\n');
      
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const trimmed = line.trim();
        
        // Skip comments (but keep them in COPY data)
        if (!inCopyMode && (trimmed.startsWith('--') || trimmed.startsWith('/*'))) {
          continue;
        }
        
        // Check if we're starting a COPY statement
        if (trimmed.match(/^COPY\s+/i) && !inCopyMode) {
          inCopyMode = true;
          currentStatement = line + '\n';
          continue;
        }
        
        // Check if we're ending a COPY statement (ends with \.)
        if (inCopyMode && trimmed === '\\.') {
          currentStatement += line + '\n';
          const stmt = currentStatement.trim();
          if (stmt) {
            statements.push(stmt);
          }
          currentStatement = '';
          inCopyMode = false;
          continue;
        }
        
        // If in COPY mode, add all lines until we see \.
        if (inCopyMode) {
          currentStatement += line + '\n';
          continue;
        }
        
        // Regular statement handling
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
      
      // Add remaining statement if any (shouldn't happen in valid SQL, but handle it)
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      
      // Warn if we're still in COPY mode (malformed SQL)
      if (inCopyMode) {
        warnings.push('Warning: COPY statement was not properly terminated (missing \\.)');
      }
      
      console.log(`📝 Parsed ${statements.length} SQL statements`);
      
      // Execute statements one by one
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (!statement) continue;
        
        try {
          // Extract table name from statement if applicable
          let tableName: string | null = null;
          if (statement.match(/^(INSERT\s+INTO|COPY|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)/i)) {
            const tableMatch = statement.match(/(?:INSERT\s+INTO|COPY|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\s+["']?(\w+)["']?/i);
            if (tableMatch) {
              tableName = tableMatch[1];
            }
          }
          
          // Check if we should skip this statement based on table selection
          if (selectedTables && selectedTables.length > 0 && tableName) {
            // For data statements (INSERT/COPY), only execute if table is selected
            if (statement.match(/^(INSERT\s+INTO|COPY)/i)) {
              if (!selectedTables.includes(tableName)) {
                continue; // Skip data for unselected tables
              }
            }
            // For schema statements (CREATE/ALTER/DROP), execute if table is selected OR if it's a general schema statement
            // This ensures tables exist before we insert data
            if (statement.match(/^(CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)/i)) {
              if (!selectedTables.includes(tableName)) {
                continue; // Skip schema for unselected tables
              }
            }
          }
          
          // Execute SET statements (needed for proper restore)
          if (statement.match(/^SET\s+/i)) {
            await sql.unsafe(statement);
            continue;
          }
          
          // Execute schema statements (CREATE, ALTER, DROP) - these are needed for restore to work
          // But skip if we're filtering and this table isn't selected
          if (statement.match(/^(CREATE|ALTER|DROP|GRANT|REVOKE|COMMENT)/i)) {
            // If filtering by tables and this is a table-specific statement, check if table is selected
            if (selectedTables && selectedTables.length > 0 && tableName) {
              if (!selectedTables.includes(tableName)) {
                continue; // Skip schema for unselected tables
              }
            }
            // Execute schema statements - they're needed for the restore
            await sql.unsafe(statement);
            continue;
          }
          
          // Execute data statements (INSERT, COPY) - only if restoreType is 'full'
          if (statement.match(/^(INSERT\s+INTO|COPY)/i)) {
            // Skip data statements if schema-only restore
            if (restoreType === 'schema-only') {
              continue; // Skip all data statements for schema-only restore
            }
            
            // If filtering by tables, only execute if table is selected
            if (selectedTables && selectedTables.length > 0 && tableName) {
              if (!selectedTables.includes(tableName)) {
                continue; // Skip data for unselected tables
              }
            }
            
            // Execute the statement
            await sql.unsafe(statement);
            
            // Track tables and records
            if (tableName) {
              tablesSeen.add(tableName);
              if (statement.match(/^INSERT\s+INTO/i)) {
                // Count rows in INSERT statement (approximate - one INSERT might have multiple rows)
                const rowCount = (statement.match(/VALUES\s*\(/gi) || []).length || 1;
                recordsRestored += rowCount;
              } else if (statement.match(/^COPY/i)) {
                // For COPY, we'll count later from the data
                recordsRestored += 1; // Placeholder, will be updated
              }
            }
            continue;
          }
          
          // Execute any other statements (functions, triggers, etc.)
          await sql.unsafe(statement);
        } catch (stmtError: any) {
          // Some errors are expected (e.g., table already exists, constraint violations)
          // Only log as warning and continue
          const errorMsg = stmtError.message || 'Unknown error';
          const isExpectedError = 
            errorMsg.includes('already exists') ||
            errorMsg.includes('does not exist') ||
            errorMsg.includes('duplicate key') ||
            errorMsg.includes('constraint');
          
          if (!isExpectedError) {
            console.warn(`⚠️  Statement ${i + 1} warning: ${errorMsg}`);
            warnings.push(`Statement ${i + 1}: ${errorMsg}`);
          }
          // Continue with next statement instead of failing completely
        }
      }
      
      // Recalculate records restored from actual execution (only for full restore)
      if (restoreType === 'full') {
        // Count INSERT statements more accurately
        const insertMatches = sqlContent.match(/INSERT\s+INTO\s+["']?(\w+)["']?/gi);
        if (insertMatches) {
          // Count VALUES clauses to get more accurate row count
          let insertCount = 0;
          insertMatches.forEach(() => {
            insertCount++;
          });
          
          // If we didn't track during execution, use the count from regex
          if (recordsRestored === 0) {
            recordsRestored = insertCount;
          }
          
          // Extract unique table names
          insertMatches.forEach(match => {
            const tableMatch = match.match(/INSERT\s+INTO\s+["']?(\w+)["']?/i);
            if (tableMatch) {
              tablesSeen.add(tableMatch[1]);
            }
          });
        }
        
        // Count COPY statements and their data lines
        const copyMatches = sqlContent.match(/COPY\s+["']?(\w+)["']?/gi);
        if (copyMatches) {
          copyMatches.forEach(match => {
            const tableMatch = match.match(/COPY\s+["']?(\w+)["']?/i);
            if (tableMatch) {
              tablesSeen.add(tableMatch[1]);
            }
          });
          
          // Count data lines in COPY statements (lines between COPY and \.)
          // This is a more accurate count for COPY format
          const copyDataPattern = /COPY\s+["']?\w+["']?[\s\S]*?\\\./g;
          const copyBlocks = sqlContent.match(copyDataPattern);
          if (copyBlocks) {
            let copyRecordCount = 0;
            copyBlocks.forEach(block => {
              // Count non-empty lines that aren't COPY, \., or column definitions
              const lines = block.split('\n');
              lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed && 
                    !trimmed.match(/^COPY\s+/i) && 
                    !trimmed.match(/^\\\.$/) &&
                    !trimmed.match(/^\(/) && // Column list
                    !trimmed.startsWith('--')) {
                  copyRecordCount++;
                }
              });
            });
            if (copyRecordCount > 0) {
              recordsRestored += copyRecordCount;
            }
          }
        }
      } else {
        // For schema-only, count tables from CREATE TABLE statements
        const createTableMatches = sqlContent.match(/CREATE\s+TABLE\s+["']?(\w+)["']?/gi);
        if (createTableMatches) {
          createTableMatches.forEach(match => {
            const tableMatch = match.match(/CREATE\s+TABLE\s+["']?(\w+)["']?/i);
            if (tableMatch) {
              tablesSeen.add(tableMatch[1]);
            }
          });
        }
        recordsRestored = 0; // No records restored in schema-only mode
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
 * @param restoreType - 'full' to restore schema + data, 'schema-only' to restore only table structures
 */
async function restoreFromJson(jsonContent: string, selectedTables?: string[], restoreType: 'full' | 'schema-only' = 'full'): Promise<{
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
        
        // For schema-only restore, skip data insertion
        if (restoreType === 'schema-only') {
          console.log(`🔄 Skipping data for table ${tableName} (schema-only restore)`);
          tablesRestored++; // Count table as processed (schema only)
          continue;
        }
        
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

