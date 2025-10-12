import { ErrorDetails, FixSuggestion } from '../context/ErrorContext';

export interface DatabaseErrorCode {
  code: string;
  name: string;
  description: string;
  userMessage: string;
  fixSuggestions: FixSuggestion[];
  severity: ErrorDetails['severity'];
}

// Comprehensive database error code mapping
export const DATABASE_ERROR_CODES: Record<string, DatabaseErrorCode> = {
  // PostgreSQL Constraint Violations
  '23505': {
    code: '23505',
    name: 'Unique Violation',
    description: 'Attempted to insert duplicate data into a column with unique constraint',
    userMessage: 'This record already exists in the database',
    severity: 'medium',
    fixSuggestions: [
      {
        title: 'Update existing record instead',
        description: 'Instead of creating a new record, update the existing one',
        steps: [
          'Check if a record with this ID or unique field already exists',
          'Use an UPDATE query instead of INSERT',
          'Or use an UPSERT (INSERT ... ON CONFLICT) operation'
        ]
      },
      {
        title: 'Use different unique value',
        description: 'Change the value that caused the duplicate',
        steps: [
          'Modify the unique field (email, code, name, etc.)',
          'Ensure the new value is truly unique',
          'Try the operation again'
        ]
      },
      {
        title: 'Check database constraints',
        description: 'Review which fields have unique constraints',
        steps: [
          'View table structure in database',
          'Identify columns with UNIQUE or PRIMARY KEY constraints',
          'Verify your data doesn\'t violate these constraints'
        ],
        sqlFix: `-- Check unique constraints on a table
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'your_table_name';`
      }
    ]
  },

  '23503': {
    code: '23503',
    name: 'Foreign Key Violation',
    description: 'Referenced record doesn\'t exist in the parent table',
    userMessage: 'The related record you\'re trying to link doesn\'t exist',
    severity: 'high',
    fixSuggestions: [
      {
        title: 'Create the parent record first',
        description: 'Ensure the related record exists before creating this one',
        steps: [
          'Identify which foreign key is causing the issue',
          'Create or verify the parent record exists',
          'Then retry creating this record'
        ]
      },
      {
        title: 'Use correct reference ID',
        description: 'Make sure you\'re using a valid ID that exists',
        steps: [
          'Double-check the ID you\'re referencing',
          'Query the parent table to confirm the ID exists',
          'Update your data with the correct ID'
        ],
        sqlFix: `-- Check if referenced record exists
SELECT id FROM parent_table WHERE id = 'your_reference_id';`
      },
      {
        title: 'Review foreign key constraints',
        description: 'Understand the relationships in your database',
        steps: [
          'Review which tables this table depends on',
          'Ensure all required parent records exist',
          'Consider the order of data insertion'
        ],
        sqlFix: `-- View foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'your_table_name';`
      }
    ]
  },

  '23502': {
    code: '23502',
    name: 'Not Null Violation',
    description: 'Required field is missing or null',
    userMessage: 'A required field is missing. Please fill in all required information',
    severity: 'medium',
    fixSuggestions: [
      {
        title: 'Fill in all required fields',
        description: 'Ensure all mandatory fields have values',
        steps: [
          'Review the form or data you\'re submitting',
          'Fill in any empty required fields',
          'Make sure no field is accidentally set to null'
        ]
      },
      {
        title: 'Check table schema',
        description: 'Identify which fields are required',
        steps: [
          'View the table structure',
          'Look for columns with NOT NULL constraint',
          'Ensure your application provides values for these fields'
        ],
        sqlFix: `-- Check NOT NULL constraints
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'your_table_name'
  AND is_nullable = 'NO';`
      }
    ]
  },

  '42P01': {
    code: '42P01',
    name: 'Undefined Table',
    description: 'The database table doesn\'t exist',
    userMessage: 'Database table not found. The database may need to be set up',
    severity: 'critical',
    fixSuggestions: [
      {
        title: 'Run database migrations',
        description: 'Create the missing table',
        steps: [
          'Check if you have SQL migration files in your project',
          'Run the complete database schema setup',
          'Execute files like "complete-database-schema.sql"'
        ],
        sqlFix: `-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'your_table_name'
);

-- If needed, create the table using your schema file
-- Run: psql -d your_database -f complete-database-schema.sql`
      },
      {
        title: 'Verify database connection',
        description: 'Make sure you\'re connected to the correct database',
        steps: [
          'Check your database connection string',
          'Verify the database name is correct',
          'Ensure you have the right permissions'
        ]
      },
      {
        title: 'Check table name spelling',
        description: 'Ensure the table name is correct',
        steps: [
          'Verify table name spelling and case sensitivity',
          'PostgreSQL is case-sensitive for quoted identifiers',
          'List all tables in your database to confirm'
        ],
        sqlFix: `-- List all tables in current database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;`
      }
    ]
  },

  '42703': {
    code: '42703',
    name: 'Undefined Column',
    description: 'The database column doesn\'t exist',
    userMessage: 'Database column not found. The table structure may need updating',
    severity: 'high',
    fixSuggestions: [
      {
        title: 'Update table structure',
        description: 'Add the missing column to the table',
        steps: [
          'Identify which column is missing',
          'Create an ALTER TABLE statement to add it',
          'Run the migration in your database'
        ],
        sqlFix: `-- Add missing column
ALTER TABLE your_table_name 
ADD COLUMN column_name data_type;

-- Example:
-- ALTER TABLE users ADD COLUMN email VARCHAR(255);`
      },
      {
        title: 'Check column name',
        description: 'Verify the column name is correct',
        steps: [
          'List all columns in the table',
          'Check for typos or case sensitivity issues',
          'Update your code with the correct column name'
        ],
        sqlFix: `-- List all columns in a table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'your_table_name'
ORDER BY ordinal_position;`
      },
      {
        title: 'Run database migrations',
        description: 'Execute pending schema updates',
        steps: [
          'Check for migration files in your project',
          'Run any pending database updates',
          'Verify the table structure matches your code'
        ]
      }
    ]
  },

  'PGRST116': {
    code: 'PGRST116',
    name: 'JWT Error',
    description: 'Authentication token is invalid or expired',
    userMessage: 'Your session has expired. Please log in again',
    severity: 'high',
    fixSuggestions: [
      {
        title: 'Log in again',
        description: 'Refresh your authentication',
        steps: [
          'Log out of the application',
          'Log back in with your credentials',
          'This will generate a new authentication token'
        ]
      },
      {
        title: 'Check token expiration',
        description: 'Verify JWT token settings',
        steps: [
          'Check if your JWT token has expired',
          'Review token expiration settings in your config',
          'Consider implementing automatic token refresh'
        ]
      },
      {
        title: 'Verify authentication setup',
        description: 'Ensure auth is configured correctly',
        steps: [
          'Check your authentication service configuration',
          'Verify environment variables are set correctly',
          'Ensure database RLS policies are properly configured'
        ]
      }
    ]
  },

  'PGRST301': {
    code: 'PGRST301',
    name: 'Resource Not Found',
    description: 'The requested record doesn\'t exist',
    userMessage: 'The record you\'re looking for doesn\'t exist',
    severity: 'medium',
    fixSuggestions: [
      {
        title: 'Verify record ID',
        description: 'Check if you\'re using the correct ID',
        steps: [
          'Double-check the ID you\'re searching for',
          'Ensure the record hasn\'t been deleted',
          'Try listing all records to find the correct ID'
        ]
      },
      {
        title: 'Create the record',
        description: 'If it should exist, create it',
        steps: [
          'Determine if the record should exist',
          'Create the missing record with the correct data',
          'Update references to use the new record ID'
        ]
      }
    ]
  },

  'PGRST204': {
    code: 'PGRST204',
    name: 'No Content',
    description: 'The query returned no results',
    userMessage: 'No data found matching your criteria',
    severity: 'low',
    fixSuggestions: [
      {
        title: 'Broaden search criteria',
        description: 'Try less restrictive filters',
        steps: [
          'Remove or relax some filter conditions',
          'Check for typos in search terms',
          'Try searching with partial matches'
        ]
      },
      {
        title: 'Check if data exists',
        description: 'Verify there is data in the table',
        steps: [
          'Query the table without filters',
          'Check if any records exist at all',
          'If empty, consider adding initial data'
        ],
        sqlFix: `-- Check if table has any data
SELECT COUNT(*) FROM your_table_name;

-- View all records
SELECT * FROM your_table_name LIMIT 10;`
      }
    ]
  },

  '28P01': {
    code: '28P01',
    name: 'Invalid Password',
    description: 'Database authentication failed',
    userMessage: 'Database connection failed. Please check your credentials',
    severity: 'critical',
    fixSuggestions: [
      {
        title: 'Verify database credentials',
        description: 'Check your database connection settings',
        steps: [
          'Review your database connection string',
          'Verify username and password are correct',
          'Check environment variables are set properly'
        ]
      },
      {
        title: 'Check database permissions',
        description: 'Ensure user has correct access',
        steps: [
          'Verify the database user exists',
          'Check that the user has necessary permissions',
          'Contact your database administrator if needed'
        ]
      }
    ]
  },

  '08006': {
    code: '08006',
    name: 'Connection Failure',
    description: 'Could not connect to the database',
    userMessage: 'Cannot connect to the database. Please check your internet connection',
    severity: 'critical',
    fixSuggestions: [
      {
        title: 'Check internet connection',
        description: 'Verify you have network connectivity',
        steps: [
          'Check if you can access other websites',
          'Verify WiFi or ethernet is connected',
          'Try disabling VPN if you\'re using one'
        ]
      },
      {
        title: 'Verify database URL',
        description: 'Ensure connection string is correct',
        steps: [
          'Check NEXT_PUBLIC_SUPABASE_URL in your .env file',
          'Verify the database host is accessible',
          'Ensure the URL format is correct'
        ]
      },
      {
        title: 'Check firewall settings',
        description: 'Ensure database port is not blocked',
        steps: [
          'Verify port 5432 (PostgreSQL) is not blocked',
          'Check firewall rules on your machine',
          'Contact IT if on corporate network'
        ]
      }
    ]
  },

  '42501': {
    code: '42501',
    name: 'Insufficient Privilege',
    description: 'Permission denied to perform this operation',
    userMessage: 'You don\'t have permission to perform this action',
    severity: 'high',
    fixSuggestions: [
      {
        title: 'Check user permissions',
        description: 'Verify your account has the right access level',
        steps: [
          'Contact an administrator to grant you access',
          'Check if you\'re logged in with the correct account',
          'Review role-based access control settings'
        ]
      },
      {
        title: 'Review RLS policies',
        description: 'Row Level Security may be blocking access',
        steps: [
          'Check database RLS policies on this table',
          'Verify policies match your user role',
          'Run DISABLE-ALL-RLS.sql if in development'
        ],
        sqlFix: `-- Check RLS policies on a table
SELECT * FROM pg_policies WHERE tablename = 'your_table_name';

-- Disable RLS (only for development!)
ALTER TABLE your_table_name DISABLE ROW LEVEL SECURITY;`
      },
      {
        title: 'Grant necessary permissions',
        description: 'Add permissions to your database user',
        steps: [
          'Identify which permission is needed',
          'Grant the permission using GRANT statement',
          'Test the operation again'
        ],
        sqlFix: `-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON your_table_name TO your_user;

-- Grant all permissions on schema
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;`
      }
    ]
  }
};

// Network error patterns
export const NETWORK_ERRORS = {
  ERR_CONNECTION_CLOSED: {
    name: 'Connection Closed',
    userMessage: 'Connection to the server was lost',
    severity: 'high' as const,
    fixSuggestions: [
      {
        title: 'Check internet connection',
        description: 'Verify your network is working',
        steps: [
          'Check if you can access other websites',
          'Try refreshing the page',
          'Restart your router if needed'
        ]
      },
      {
        title: 'Retry the operation',
        description: 'The connection might be temporarily down',
        steps: [
          'Wait a few seconds',
          'Click the retry button',
          'The connection should be restored automatically'
        ]
      }
    ]
  },
  ERR_NETWORK: {
    name: 'Network Error',
    userMessage: 'Network request failed',
    severity: 'high' as const,
    fixSuggestions: [
      {
        title: 'Check your connection',
        description: 'Ensure you\'re connected to the internet',
        steps: [
          'Verify WiFi or ethernet is connected',
          'Try accessing other websites',
          'Contact your ISP if problem persists'
        ]
      }
    ]
  },
  TIMEOUT: {
    name: 'Request Timeout',
    userMessage: 'The request took too long and timed out',
    severity: 'medium' as const,
    fixSuggestions: [
      {
        title: 'Try again',
        description: 'The server may be slow or busy',
        steps: [
          'Wait a moment and retry',
          'The operation may have succeeded despite the timeout',
          'Check if your data was saved'
        ]
      },
      {
        title: 'Reduce request size',
        description: 'Try processing less data at once',
        steps: [
          'Break large operations into smaller chunks',
          'Reduce the number of items per request',
          'Apply filters to limit results'
        ]
      }
    ]
  }
};

/**
 * Parse and enhance errors with fix suggestions
 */
export function parseError(error: any, context?: string): Partial<ErrorDetails> {
  // Database error
  if (error?.code && DATABASE_ERROR_CODES[error.code]) {
    const dbError = DATABASE_ERROR_CODES[error.code];
    return {
      title: dbError.name,
      message: dbError.userMessage,
      code: error.code,
      type: 'database',
      severity: dbError.severity,
      context,
      fixSuggestions: dbError.fixSuggestions,
      technicalDetails: {
        originalMessage: error.message,
        hint: error.hint,
        details: error.details,
        postgresCode: error.code
      }
    };
  }

  // Network errors
  const errorMessage = error?.message || String(error);
  
  if (errorMessage.includes('ERR_CONNECTION_CLOSED') || errorMessage.includes('net::ERR_CONNECTION_CLOSED')) {
    const netError = NETWORK_ERRORS.ERR_CONNECTION_CLOSED;
    return {
      title: netError.name,
      message: netError.userMessage,
      code: 'ERR_CONNECTION_CLOSED',
      type: 'network',
      severity: netError.severity,
      context,
      fixSuggestions: netError.fixSuggestions,
      technicalDetails: { originalMessage: errorMessage }
    };
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
    const netError = NETWORK_ERRORS.TIMEOUT;
    return {
      title: netError.name,
      message: netError.userMessage,
      code: 'TIMEOUT',
      type: 'network',
      severity: netError.severity,
      context,
      fixSuggestions: netError.fixSuggestions,
      technicalDetails: { originalMessage: errorMessage }
    };
  }

  if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
    const netError = NETWORK_ERRORS.ERR_NETWORK;
    return {
      title: netError.name,
      message: netError.userMessage,
      code: 'ERR_NETWORK',
      type: 'network',
      severity: netError.severity,
      context,
      fixSuggestions: netError.fixSuggestions,
      technicalDetails: { originalMessage: errorMessage }
    };
  }

  // Auth errors
  if (errorMessage.includes('JWT') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
    return {
      title: 'Authentication Error',
      message: 'You need to log in again',
      code: '401',
      type: 'auth',
      severity: 'high',
      context,
      fixSuggestions: [
        {
          title: 'Log in again',
          description: 'Your session has expired',
          steps: [
            'Click the logout button',
            'Log back in with your credentials',
            'Your session will be refreshed'
          ]
        }
      ],
      technicalDetails: { originalMessage: errorMessage }
    };
  }

  // Validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return {
      title: 'Validation Error',
      message: 'Please check your input and try again',
      code: 'VALIDATION',
      type: 'validation',
      severity: 'medium',
      context,
      fixSuggestions: [
        {
          title: 'Check your input',
          description: 'Some fields have invalid values',
          steps: [
            'Review all form fields',
            'Ensure required fields are filled',
            'Check for any red error messages',
            'Correct the invalid values and resubmit'
          ]
        }
      ],
      technicalDetails: { originalMessage: errorMessage }
    };
  }

  // Generic error
  return {
    title: 'Error Occurred',
    message: errorMessage || 'An unexpected error occurred',
    type: 'unknown',
    severity: 'medium',
    context,
    fixSuggestions: [
      {
        title: 'Try again',
        description: 'Refresh and retry the operation',
        steps: [
          'Refresh the page',
          'Try the operation again',
          'Contact support if the problem persists'
        ]
      }
    ],
    technicalDetails: {
      originalError: error,
      originalMessage: errorMessage
    }
  };
}

/**
 * Format SQL fix for display
 */
export function formatSqlFix(sql: string): string {
  return sql.trim().split('\n').map(line => line.trim()).join('\n');
}

export default parseError;

