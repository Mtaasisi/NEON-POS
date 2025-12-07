/**
 * Neon Database Branch Migration API
 * Provides endpoints for managing database migrations between Neon branches
 */

import express from 'express';
import { neon } from '@neondatabase/serverless';
import fetch from 'node-fetch';

const router = express.Router();

// Neon API base URL
const NEON_API_BASE = 'https://console.neon.tech/api/v2';

/**
 * Helper: Make authenticated request to Neon API
 */
async function neonApiRequest(endpoint, apiKey, options = {}) {
  const url = `${NEON_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Neon API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * GET /api/neon/branches
 * List all branches in a Neon project
 */
router.get('/branches', async (req, res) => {
  try {
    const { projectId } = req.query;
    const apiKey = req.headers.authorization?.replace('Bearer ', '');

    if (!apiKey || !projectId) {
      return res.status(400).json({ error: 'Missing apiKey or projectId' });
    }

    const data = await neonApiRequest(`/projects/${projectId}/branches`, apiKey);
    
    res.json({
      success: true,
      branches: data.branches || []
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ 
      error: 'Failed to fetch branches', 
      message: error.message 
    });
  }
});

/**
 * POST /api/neon/tables
 * List all tables in a specific branch
 */
router.post('/tables', async (req, res) => {
  try {
    const { branchId, apiKey, projectId, connectionString, useDirectConnection } = req.body;

    let sql;

    if (useDirectConnection) {
      // Direct connection string mode
      if (!connectionString) {
        return res.status(400).json({ error: 'Missing connection string' });
      }
      
      // Clean up connection string (remove psql command prefix if present)
      let cleanConnectionString = connectionString.trim();
      if (cleanConnectionString.startsWith('psql ')) {
        cleanConnectionString = cleanConnectionString.substring(5).trim();
      }
      if (cleanConnectionString.startsWith("'") || cleanConnectionString.startsWith('"')) {
        cleanConnectionString = cleanConnectionString.slice(1, -1);
      }
      
      console.log('Using connection string:', cleanConnectionString.substring(0, 50) + '...');
      sql = neon(cleanConnectionString);
    } else {
      // Neon API mode
      if (!apiKey || !projectId || !branchId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Get branch connection details
      const branchData = await neonApiRequest(
        `/projects/${projectId}/branches/${branchId}`,
        apiKey
      );

      if (!branchData.branch?.connection_uri) {
        throw new Error('Could not get connection URI for branch');
      }

      sql = neon(branchData.branch.connection_uri);
    }

    // Query to get table information
    const tables = await sql`
      SELECT 
        schemaname as schema_name,
        tablename as table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = schemaname AND table_name = tablename) as column_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename
    `;

    // Get row counts for each table
    const tablesWithCounts = await Promise.all(
      tables.map(async (table) => {
        try {
          const fullTableName = `${table.schema_name}.${table.table_name}`;
          const result = await sql.unsafe(`
            SELECT COUNT(*) as row_count 
            FROM ${fullTableName}
          `);
          return {
            ...table,
            row_count: result && result[0] ? parseInt(result[0].row_count) : 0
          };
        } catch (err) {
          console.error(`Error counting rows for ${table.table_name}:`, err.message);
          return {
            ...table,
            row_count: 0
          };
        }
      })
    );

    res.json({
      success: true,
      tables: tablesWithCounts
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tables', 
      message: error.message 
    });
  }
});

/**
 * POST /api/neon/compare-schemas
 * Compare schemas between two branches
 */
router.post('/compare-schemas', async (req, res) => {
  try {
    console.log('📥 /api/neon/compare-schemas request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      sourceBranchId, 
      targetBranchId, 
      apiKey, 
      projectId,
      sourceConnectionString,
      targetConnectionString,
      useDirectConnection
    } = req.body;

    let sourceSql, targetSql;

    if (useDirectConnection) {
      // Direct connection string mode
      if (!sourceConnectionString || !targetConnectionString) {
        return res.status(400).json({ error: 'Missing connection strings' });
      }
      
      // Clean up connection strings
      let cleanSourceConn = sourceConnectionString.trim();
      let cleanTargetConn = targetConnectionString.trim();
      
      if (cleanSourceConn.startsWith('psql ')) {
        cleanSourceConn = cleanSourceConn.substring(5).trim();
      }
      if (cleanTargetConn.startsWith('psql ')) {
        cleanTargetConn = cleanTargetConn.substring(5).trim();
      }
      if (cleanSourceConn.startsWith("'") || cleanSourceConn.startsWith('"')) {
        cleanSourceConn = cleanSourceConn.slice(1, -1);
      }
      if (cleanTargetConn.startsWith("'") || cleanTargetConn.startsWith('"')) {
        cleanTargetConn = cleanTargetConn.slice(1, -1);
      }
      
      sourceSql = neon(cleanSourceConn);
      targetSql = neon(cleanTargetConn);
    } else {
      // Neon API mode
      if (!apiKey || !projectId || !sourceBranchId || !targetBranchId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Get connection URIs for both branches
      const [sourceData, targetData] = await Promise.all([
        neonApiRequest(`/projects/${projectId}/branches/${sourceBranchId}`, apiKey),
        neonApiRequest(`/projects/${projectId}/branches/${targetBranchId}`, apiKey)
      ]);

      sourceSql = neon(sourceData.branch.connection_uri);
      targetSql = neon(targetData.branch.connection_uri);
    }

    // Get table lists from both branches
    const [sourceTables, targetTables] = await Promise.all([
      sourceSql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `,
      targetSql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `
    ]);

    const sourceTableNames = sourceTables.map(t => t.table_name);
    const targetTableNames = targetTables.map(t => t.table_name);

    const diff = {
      tables_only_in_source: sourceTableNames.filter(t => !targetTableNames.includes(t)),
      tables_only_in_target: targetTableNames.filter(t => !sourceTableNames.includes(t)),
      tables_in_both: sourceTableNames.filter(t => targetTableNames.includes(t)),
      columns_diff: {}
    };

    // Compare columns for tables that exist in both
    console.log(`🔍 Comparing columns for ${diff.tables_in_both.length} tables...`);
    
    // Process tables in batches to avoid timeout
    const BATCH_SIZE = 20;
    const tableBatches = [];
    for (let i = 0; i < diff.tables_in_both.length; i += BATCH_SIZE) {
      tableBatches.push(diff.tables_in_both.slice(i, i + BATCH_SIZE));
    }
    
    for (let batchIndex = 0; batchIndex < tableBatches.length; batchIndex++) {
      const batch = tableBatches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${tableBatches.length} (${batch.length} tables)...`);
      
      await Promise.all(batch.map(async (tableName) => {
        try {
      const [sourceColumns, targetColumns] = await Promise.all([
        sourceSql`
          SELECT column_name, data_type, character_maximum_length, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${tableName}
          ORDER BY ordinal_position
        `,
        targetSql`
          SELECT column_name, data_type, character_maximum_length, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${tableName}
          ORDER BY ordinal_position
        `
      ]);

      const sourceColNames = sourceColumns.map(c => c.column_name);
      const targetColNames = targetColumns.map(c => c.column_name);

      const onlyInSource = sourceColNames.filter(c => !targetColNames.includes(c));
      const onlyInTarget = targetColNames.filter(c => !sourceColNames.includes(c));

      // Check for type changes
      const typeChanges = [];
      for (const col of sourceColumns) {
        const targetCol = targetColumns.find(c => c.column_name === col.column_name);
        if (targetCol && col.data_type !== targetCol.data_type) {
          typeChanges.push({
            column: col.column_name,
            source_type: col.data_type,
            target_type: targetCol.data_type
          });
        }
      }

      if (onlyInSource.length > 0 || onlyInTarget.length > 0 || typeChanges.length > 0) {
        diff.columns_diff[tableName] = {
          only_in_source: onlyInSource,
          only_in_target: onlyInTarget,
          type_changes: typeChanges
        };
      }
        } catch (tableError) {
          console.error(`Error comparing table ${tableName}:`, tableError.message);
          // Continue with other tables even if one fails
        }
      }));
    }
    
    console.log('✅ Schema comparison completed successfully');

    res.json({
      success: true,
      diff
    });
  } catch (error) {
    console.error('Error comparing schemas:', error);
    res.status(500).json({ 
      error: 'Failed to compare schemas', 
      message: error.message 
    });
  }
});

/**
 * POST /api/neon/migrate
 * Migrate tables from source to target branch
 */
router.post('/migrate', async (req, res) => {
  try {
    const { 
      sourceBranchId, 
      targetBranchId, 
      tables, 
      migrationType, 
      apiKey, 
      projectId,
      sourceConnectionString,
      targetConnectionString,
      useDirectConnection
    } = req.body;

    if (!tables || !migrationType) {
      return res.status(400).json({ error: 'Missing tables or migration type' });
    }

    if (useDirectConnection) {
      if (!sourceConnectionString || !targetConnectionString) {
        return res.status(400).json({ error: 'Missing connection strings' });
      }
    } else {
      if (!apiKey || !projectId || !sourceBranchId || !targetBranchId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
    }

    // Set up SSE for progress updates
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendProgress = (message, error = false) => {
      res.write(`data: ${JSON.stringify({ message, error })}\n\n`);
    };

    try {
      sendProgress('Connecting to branches...');

      let sourceSql, targetSql;

      if (useDirectConnection) {
        // Direct connection string mode - clean strings
        let cleanSourceConn = sourceConnectionString.trim();
        let cleanTargetConn = targetConnectionString.trim();
        
        if (cleanSourceConn.startsWith('psql ')) {
          cleanSourceConn = cleanSourceConn.substring(5).trim();
        }
        if (cleanTargetConn.startsWith('psql ')) {
          cleanTargetConn = cleanTargetConn.substring(5).trim();
        }
        if (cleanSourceConn.startsWith("'") || cleanSourceConn.startsWith('"')) {
          cleanSourceConn = cleanSourceConn.slice(1, -1);
        }
        if (cleanTargetConn.startsWith("'") || cleanTargetConn.startsWith('"')) {
          cleanTargetConn = cleanTargetConn.slice(1, -1);
        }
        
        sourceSql = neon(cleanSourceConn);
        targetSql = neon(cleanTargetConn);
      } else {
        // Neon API mode
        const [sourceData, targetData] = await Promise.all([
          neonApiRequest(`/projects/${projectId}/branches/${sourceBranchId}`, apiKey),
          neonApiRequest(`/projects/${projectId}/branches/${targetBranchId}`, apiKey)
        ]);

        sourceSql = neon(sourceData.branch.connection_uri);
        targetSql = neon(targetData.branch.connection_uri);
      }

      sendProgress('Connected to both branches');

      for (const tableName of tables) {
        // FAST MODE: For schema-missing, skip tables that already exist
        if (migrationType === 'schema-missing') {
          const tableExists = await targetSql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = ${tableName}
            ) as exists
          `;
          
          if (tableExists[0].exists) {
            sendProgress(`⏭️  Skipping ${tableName} (already exists in target)`);
            continue; // Skip this table entirely for faster migration
          }
        }

        sendProgress(`Processing table: ${tableName}`);

        try {
          // Migrate Schema
          if (migrationType === 'schema' || migrationType === 'both' || migrationType === 'schema-selective' || migrationType === 'schema-missing') {
            sendProgress(`Migrating schema for ${tableName}...`);

            // Get table schema from source
            const tableSchema = await sourceSql`
              SELECT 
                column_name,
                data_type,
                character_maximum_length,
                column_default,
                is_nullable,
                udt_name
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = ${tableName}
              ORDER BY ordinal_position
            `;

            // Check if table exists in target (only if not already checked above)
            let tableExists;
            if (migrationType !== 'schema-missing') {
              tableExists = await targetSql`
                SELECT EXISTS (
                  SELECT FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = ${tableName}
                ) as exists
              `;
            } else {
              // For schema-missing, we already checked above, so table doesn't exist
              tableExists = [{ exists: false }];
            }

            if (migrationType === 'schema-missing') {
              // FAST MODE: For schema-missing, only process tables that don't exist
              // Skip tables that already exist to make migration faster
              if (!tableExists[0].exists) {
                // Create table in target (only if it doesn't exist)
                sendProgress(`⚡ Creating missing table ${tableName} in target...`);

                const columns = tableSchema.map(col => {
                  let colDef = `"${col.column_name}" ${col.data_type}`;
                  if (col.character_maximum_length) {
                    colDef += `(${col.character_maximum_length})`;
                  }
                  if (col.is_nullable === 'NO') {
                    colDef += ' NOT NULL';
                  }
                  if (col.column_default) {
                    colDef += ` DEFAULT ${col.column_default}`;
                  }
                  return colDef;
                }).join(', ');

                await targetSql.unsafe(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`);
                sendProgress(`✓ Missing table ${tableName} created`);
              } else {
                // Table exists, only add missing columns (don't modify existing ones)
                const targetColumns = await targetSql`
                  SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                  FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = ${tableName}
                `;

                const targetColMap = new Map();
                targetColumns.forEach(col => {
                  targetColMap.set(col.column_name, col);
                });

                const missingColumns = tableSchema.filter(col => !targetColMap.has(col.column_name));

                for (const col of missingColumns) {
                  sendProgress(`Adding missing column ${col.column_name} to ${tableName}...`);
                  let colDef = `${col.data_type}`;
                  if (col.character_maximum_length) {
                    colDef += `(${col.character_maximum_length})`;
                  }
                  if (col.is_nullable === 'NO') {
                    colDef += ' NOT NULL';
                  }
                  if (col.column_default) {
                    colDef += ` DEFAULT ${col.column_default}`;
                  }

                  await targetSql.unsafe(
                    `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${colDef}`
                  );
                }

                if (missingColumns.length > 0) {
                  sendProgress(`✓ Added ${missingColumns.length} missing column(s) to ${tableName}`);
                } else {
                  sendProgress(`✓ Table ${tableName} already has all required columns`);
                }
              }
            } else {
              // For regular schema migration: recreate tables and modify existing ones
              if (!tableExists[0].exists) {
                // Create table in target
                sendProgress(`Creating table ${tableName} in target...`);

                const columns = tableSchema.map(col => {
                  let colDef = `"${col.column_name}" ${col.data_type}`;
                  if (col.character_maximum_length) {
                    colDef += `(${col.character_maximum_length})`;
                  }
                  if (col.is_nullable === 'NO') {
                    colDef += ' NOT NULL';
                  }
                  if (col.column_default) {
                    colDef += ` DEFAULT ${col.column_default}`;
                  }
                  return colDef;
                }).join(', ');

                await targetSql.unsafe(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`);
                sendProgress(`✓ Table ${tableName} created`);
              } else {
                // Add missing columns to existing table
                const targetColumns = await targetSql`
                  SELECT column_name
                  FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = ${tableName}
                `;

                const targetColNames = targetColumns.map(c => c.column_name);
                const missingColumns = tableSchema.filter(
                  col => !targetColNames.includes(col.column_name)
                );

                for (const col of missingColumns) {
                  sendProgress(`Adding column ${col.column_name} to ${tableName}...`);
                  let colDef = `${col.data_type}`;
                  if (col.character_maximum_length) {
                    colDef += `(${col.character_maximum_length})`;
                  }
                  if (col.column_default) {
                    colDef += ` DEFAULT ${col.column_default}`;
                  }

                  await targetSql.unsafe(
                    `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${colDef}`
                  );
                }

                if (missingColumns.length > 0) {
                  sendProgress(`✓ Added ${missingColumns.length} column(s) to ${tableName}`);
                }
              }
            }
          }

          // Migrate Data
          if (migrationType === 'data' || migrationType === 'both' || migrationType === 'selective-data' || migrationType === 'schema-selective') {
            // Note: 'schema-missing' does NOT include data migration
            sendProgress(`Migrating data for ${tableName}...`);

            // Get data from source
            const sourceData = await sourceSql.unsafe(`SELECT * FROM "${tableName}"`);

            if (sourceData.length > 0) {
              let dataToMigrate = sourceData;

              // For selective migration, filter out data that already exists in target
              if (migrationType === 'selective-data' || migrationType === 'schema-selective') {
                sendProgress(`Checking existing data in target for ${tableName}...`);

                // Get primary key or unique constraints for the table
                const constraints = await targetSql`
                  SELECT conname, conkey, contype
                  FROM pg_constraint
                  WHERE conrelid = (
                    SELECT oid FROM pg_class WHERE relname = ${tableName}
                  )
                  AND (contype = 'p' OR contype = 'u')
                  ORDER BY contype DESC
                  LIMIT 1
                `;

                if (constraints.length > 0) {
                  const constraint = constraints[0];
                  const keyColumns = constraint.conkey;

                  // Get column names for the primary key
                  const columnInfo = await targetSql`
                    SELECT attname
                    FROM pg_attribute
                    WHERE attrelid = (
                      SELECT oid FROM pg_class WHERE relname = ${tableName}
                    )
                    AND attnum = ANY(${keyColumns})
                    ORDER BY attnum
                  `;

                  const keyColumnNames = columnInfo.map(col => col.attname);

                  if (keyColumnNames.length > 0) {
                    sendProgress(`Using key columns: ${keyColumnNames.join(', ')} for selective migration`);

                    // Get existing keys from target
                    const existingKeysQuery = `
                      SELECT ${keyColumnNames.map(col => `"${col}"`).join(', ')}
                      FROM "${tableName}"
                    `;
                    const existingKeys = await targetSql.unsafe(existingKeysQuery);

                    // Create a set of existing key combinations for fast lookup
                    const existingKeySet = new Set();
                    existingKeys.forEach(row => {
                      const key = keyColumnNames.map(col => row[col]).join('|');
                      existingKeySet.add(key);
                    });

                    // Filter source data to only include rows that don't exist in target
                    dataToMigrate = sourceData.filter(row => {
                      const key = keyColumnNames.map(col => row[col]).join('|');
                      return !existingKeySet.has(key);
                    });

                    sendProgress(`Found ${sourceData.length} rows in source, ${dataToMigrate.length} new rows to migrate`);
                  } else {
                    sendProgress(`⚠️ No suitable key found for selective migration, falling back to regular migration`);
                  }
                } else {
                  sendProgress(`⚠️ No primary key or unique constraints found for selective migration, falling back to regular migration`);
                }
              }

              if (dataToMigrate.length > 0) {
                sendProgress(`Copying ${dataToMigrate.length} rows to ${tableName}...`);

                // Get column names (ensure all rows have same columns)
                const columns = Object.keys(dataToMigrate[0]);
                const columnList = columns.map(c => `"${c}"`).join(', ');

                // Check if table has primary key for conflict handling
                const pkInfo = await targetSql`
                  SELECT a.attname
                  FROM pg_index i
                  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                  WHERE i.indrelid = (
                    SELECT oid FROM pg_class WHERE relname = ${tableName}
                  )
                  AND i.indisprimary = true
                  ORDER BY a.attnum
                `;

                const primaryKeyColumns = pkInfo.map(pk => pk.attname);
                const hasPrimaryKey = primaryKeyColumns.length > 0;
                const conflictClause = hasPrimaryKey 
                  ? `ON CONFLICT (${primaryKeyColumns.map(c => `"${c}"`).join(', ')}) DO NOTHING`
                  : '';

                // Insert data in batches for better performance
                const batchSize = 100; // Optimal batch size for neon serverless
                let migratedCount = 0;
                let errorCount = 0;
                let skippedCount = 0;

                // Helper function to escape SQL values safely
                const escapeValue = (value) => {
                  if (value === null || value === undefined) {
                    return 'NULL';
                  }
                  if (typeof value === 'string') {
                    // Escape single quotes and wrap in quotes
                    return `'${value.replace(/'/g, "''")}'`;
                  }
                  if (typeof value === 'boolean') {
                    return value ? 'TRUE' : 'FALSE';
                  }
                  if (value instanceof Date) {
                    return `'${value.toISOString()}'`;
                  }
                  if (typeof value === 'object') {
                    // Handle JSON objects
                    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
                  }
                  return String(value);
                };

                for (let i = 0; i < dataToMigrate.length; i += batchSize) {
                  const batch = dataToMigrate.slice(i, i + batchSize);
                  
                  try {
                    // Build batch insert query with multiple VALUES (using safe escaping)
                    const valuesList = batch.map(row => {
                      const rowValues = columns.map(col => escapeValue(row[col]));
                      return `(${rowValues.join(', ')})`;
                    });

                    const batchQuery = `
                      INSERT INTO "${tableName}" (${columnList}) 
                      VALUES ${valuesList.join(', ')}
                      ${conflictClause}
                    `;

                    // Execute batch insert
                    await targetSql.unsafe(batchQuery);
                    migratedCount += batch.length;
                    
                    sendProgress(`Migrated ${Math.min(i + batchSize, dataToMigrate.length)}/${dataToMigrate.length} rows`);
                  } catch (batchError) {
                    // If batch insert fails, fall back to individual inserts
                    console.warn(`Batch insert failed for ${tableName}, trying individual inserts:`, batchError.message);
                    sendProgress(`⚠️ Batch insert failed, using individual inserts...`);

                  for (const row of batch) {
                    try {
                        const values = columns.map(col => row[col]);
                        const singleValuePlaceholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
                        
                      await targetSql.unsafe(
                          `INSERT INTO "${tableName}" (${columnList}) VALUES (${singleValuePlaceholders}) ${conflictClause}`,
                        values
                      );
                      migratedCount++;
                      } catch (rowError) {
                        // Check if it's a conflict error (which is expected with ON CONFLICT DO NOTHING)
                        if (rowError.message && (
                          rowError.message.includes('duplicate key') || 
                          rowError.message.includes('unique constraint') ||
                          rowError.message.includes('violates unique constraint')
                        )) {
                          skippedCount++;
                        } else {
                          errorCount++;
                          // Log but continue
                          if (errorCount <= 5) { // Only log first 5 errors to avoid spam
                            console.error(`Error inserting row into ${tableName}:`, rowError.message);
                    }
                  }
                      }
                    }
                  }
                }

                const migrationTypeText = (migrationType === 'selective-data' || migrationType === 'schema-selective') ? 'selective data' : 'data';
                let statusMsg = `✓ ${migrationTypeText} migration complete for ${tableName} (${migratedCount} rows migrated`;
                if (skippedCount > 0) {
                  statusMsg += `, ${skippedCount} skipped (duplicates)`;
                }
                if (errorCount > 0) {
                  statusMsg += `, ${errorCount} errors`;
                }
                statusMsg += ')';
                sendProgress(statusMsg);
              } else {
                sendProgress(`✓ No new data to migrate for ${tableName}`);
              }
            } else {
              sendProgress(`✓ No data to migrate for ${tableName}`);
            }
          }

          sendProgress(`✓ Completed migration for ${tableName}`);
        } catch (tableError) {
          sendProgress(`✗ Error migrating ${tableName}: ${tableError.message}`, true);
          console.error(`Table migration error for ${tableName}:`, tableError);
        }
      }

      sendProgress('🎉 Migration completed successfully!');
      res.end();
    } catch (error) {
      sendProgress(`Migration failed: ${error.message}`, true);
      res.end();
    }
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      error: 'Migration failed', 
      message: error.message 
    });
  }
});

/**
 * DELETE /api/neon/branches/:branchId
 * Delete a branch from Neon project
 */
router.delete('/branches/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    const { projectId } = req.query;
    const apiKey = req.headers.authorization?.replace('Bearer ', '');

    if (!apiKey || !projectId || !branchId) {
      return res.status(400).json({ error: 'Missing apiKey, projectId, or branchId' });
    }

    console.log(`🗑️ Deleting branch: ${branchId} from project: ${projectId}`);

    // Get branch info first for confirmation
    const branchData = await neonApiRequest(
      `/projects/${projectId}/branches/${branchId}`,
      apiKey
    );

    // Delete the branch
    const deleteResponse = await fetch(`${NEON_API_BASE}/projects/${projectId}/branches/${branchId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!deleteResponse.ok) {
      const error = await deleteResponse.text();
      throw new Error(`Failed to delete branch: ${deleteResponse.status} - ${error}`);
    }

    console.log(`✅ Successfully deleted branch: ${branchData.branch.name} (${branchId})`);

    res.json({
      success: true,
      message: `Branch "${branchData.branch.name}" has been deleted successfully`,
      deletedBranch: {
        id: branchId,
        name: branchData.branch.name
      }
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({
      error: 'Failed to delete branch',
      message: error.message
    });
  }
});

/**
 * POST /api/neon/verify-table
 * Verify table exists and get row count in target database
 */
router.post('/verify-table', async (req, res) => {
  try {
    const { tableName, branchId, apiKey, projectId, connectionString, useDirectConnection } = req.body;

    if (!tableName) {
      return res.status(400).json({ error: 'Missing table name' });
    }

    let sql;

    if (useDirectConnection) {
      if (!connectionString) {
        return res.status(400).json({ error: 'Missing connection string' });
      }
      
      let cleanConnectionString = connectionString.trim();
      if (cleanConnectionString.startsWith('psql ')) {
        cleanConnectionString = cleanConnectionString.substring(5).trim();
      }
      if (cleanConnectionString.startsWith("'") || cleanConnectionString.startsWith('"')) {
        cleanConnectionString = cleanConnectionString.slice(1, -1);
      }
      
      sql = neon(cleanConnectionString);
    } else {
      if (!apiKey || !projectId || !branchId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      const branchData = await neonApiRequest(
        `/projects/${projectId}/branches/${branchId}`,
        apiKey
      );

      if (!branchData.branch?.connection_uri) {
        throw new Error('Could not get connection URI for branch');
      }

      sql = neon(branchData.branch.connection_uri);
    }

    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${tableName}
      ) as exists
    `;

    if (!tableExists[0].exists) {
      return res.json({
        success: true,
        exists: false,
        rowCount: 0
      });
    }

    // Get row count
    try {
      const result = await sql.unsafe(`SELECT COUNT(*) as row_count FROM "${tableName}"`);
      const rowCount = result && result[0] ? parseInt(result[0].row_count) : 0;
      
      res.json({
        success: true,
        exists: true,
        rowCount
      });
    } catch (err) {
      console.error(`Error counting rows for ${tableName}:`, err.message);
      res.json({
        success: true,
        exists: true,
        rowCount: 0,
        error: err.message
      });
    }
  } catch (error) {
    console.error('Error verifying table:', error);
    res.status(500).json({
      error: 'Failed to verify table',
      message: error.message
    });
  }
});

/**
 * POST /api/neon/export-schema
 * Export schema as SQL script
 */
router.post('/export-schema', async (req, res) => {
  try {
    const { branchId, apiKey, projectId, tables } = req.body;

    if (!apiKey || !projectId || !branchId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const branchData = await neonApiRequest(
      `/projects/${projectId}/branches/${branchId}`,
      apiKey
    );

    const sql = neon(branchData.branch.connection_uri);

    let sqlScript = `-- Database Schema Export\n`;
    sqlScript += `-- Branch: ${branchData.branch.name}\n`;
    sqlScript += `-- Generated: ${new Date().toISOString()}\n\n`;

    const tablesToExport = tables || await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `.then(results => results.map(r => r.table_name));

    for (const tableName of tablesToExport) {
      // Get table schema
      const columns = await sql`
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          column_default,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      sqlScript += `-- Table: ${tableName}\n`;
      sqlScript += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;

      const columnDefs = columns.map(col => {
        let def = `  "${col.column_name}" ${col.data_type}`;
        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`;
        }
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        return def;
      });

      sqlScript += columnDefs.join(',\n');
      sqlScript += `\n);\n\n`;
    }

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="schema-export-${Date.now()}.sql"`);
    res.send(sqlScript);
  } catch (error) {
    console.error('Error exporting schema:', error);
    res.status(500).json({
      error: 'Failed to export schema',
      message: error.message
    });
  }
});

export default router;

