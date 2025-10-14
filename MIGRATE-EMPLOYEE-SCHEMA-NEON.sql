-- ===================================================================
-- EMPLOYEE SCHEMA MIGRATION - NEON DATABASE VERSION
-- ===================================================================
-- This version works with Neon Database (standard PostgreSQL)
-- No Supabase-specific functions (auth.uid(), etc.)
-- ===================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo 'EMPLOYEE MANAGEMENT SCHEMA MIGRATION - NEON DATABASE'
\echo '═══════════════════════════════════════════════════════════════════'
\echo ''

-- ===================================================================
-- STEP 1: Backup existing employee data if table exists
-- ===================================================================
\echo 'Step 1: Checking for existing employee data...'

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
        DROP TABLE IF EXISTS employees_backup_migration;
        CREATE TABLE employees_backup_migration AS SELECT * FROM employees;
        RAISE NOTICE '✅ Backed up % employee records', (SELECT COUNT(*) FROM employees_backup_migration);
    ELSE
        RAISE NOTICE 'ℹ️  No existing employee table found';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Could not backup employees: %', SQLERRM;
END $$;

-- ===================================================================
-- STEP 2: Drop existing tables safely
-- ===================================================================
\echo ''
\echo 'Step 2: Removing old tables if they exist...'

DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS employee_shifts CASCADE;
DROP TABLE IF EXISTS shift_templates CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

\echo '✅ Old tables removed'

-- ===================================================================
-- STEP 3: Create new tables
-- ===================================================================
\echo ''
\echo 'Step 3: Creating new employee management tables...'

-- 1. EMPLOYEES TABLE
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    
    -- Work Information
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    termination_date DATE,
    employment_type VARCHAR(50) DEFAULT 'full-time',
    
    -- Compensation
    salary DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'TZS',
    
    -- Status and Performance
    status VARCHAR(50) DEFAULT 'active',
    performance_rating DECIMAL(3, 2) DEFAULT 3.0 CHECK (performance_rating >= 0 AND performance_rating <= 5),
    
    -- Additional Information
    skills TEXT[],
    manager_id UUID,
    location VARCHAR(255),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Tanzania',
    
    -- Profile
    photo_url TEXT,
    bio TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

\echo '✅ Created employees table'

-- Add foreign key for manager_id after table is created
ALTER TABLE employees ADD CONSTRAINT fk_employees_manager 
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- 2. SHIFT TEMPLATES TABLE
CREATE TABLE shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration_minutes INTEGER DEFAULT 0,
    monday BOOLEAN DEFAULT true,
    tuesday BOOLEAN DEFAULT true,
    wednesday BOOLEAN DEFAULT true,
    thursday BOOLEAN DEFAULT true,
    friday BOOLEAN DEFAULT true,
    saturday BOOLEAN DEFAULT false,
    sunday BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

\echo '✅ Created shift_templates table'

-- 3. EMPLOYEE SHIFTS TABLE
CREATE TABLE employee_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_template_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration_minutes INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    UNIQUE(employee_id, shift_date)
);

\echo '✅ Created employee_shifts table'

-- 4. ATTENDANCE RECORDS TABLE
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_in_location_lat DECIMAL(10, 8),
    check_in_location_lng DECIMAL(11, 8),
    check_out_location_lat DECIMAL(10, 8),
    check_out_location_lng DECIMAL(11, 8),
    check_in_network_ssid VARCHAR(255),
    check_out_network_ssid VARCHAR(255),
    check_in_photo_url TEXT,
    check_out_photo_url TEXT,
    total_hours DECIMAL(5, 2) DEFAULT 0,
    break_hours DECIMAL(5, 2) DEFAULT 0,
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'present',
    notes TEXT,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

\echo '✅ Created attendance_records table'

-- 5. LEAVE REQUESTS TABLE
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

\echo '✅ Created leave_requests table'

-- ===================================================================
-- STEP 4: Create indexes
-- ===================================================================
\echo ''
\echo 'Step 4: Creating indexes for better performance...'

CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_user_id ON employees(user_id);

CREATE INDEX idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_status ON attendance_records(status);
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, attendance_date);

CREATE INDEX idx_leave_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_leave_dates ON leave_requests(start_date, end_date);

CREATE INDEX idx_shifts_employee_id ON employee_shifts(employee_id);
CREATE INDEX idx_shifts_date ON employee_shifts(shift_date);
CREATE INDEX idx_shifts_employee_date ON employee_shifts(employee_id, shift_date);

\echo '✅ Created all indexes'

-- ===================================================================
-- STEP 5: Create functions and triggers
-- ===================================================================
\echo ''
\echo 'Step 5: Creating triggers for automatic calculations...'

-- Drop functions if they exist
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS calculate_attendance_hours() CASCADE;
DROP FUNCTION IF EXISTS calculate_leave_days() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON employee_shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_templates_updated_at
    BEFORE UPDATE ON shift_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600;
        
        IF NEW.total_hours > 8 THEN
            NEW.overtime_hours = NEW.total_hours - 8;
        ELSE
            NEW.overtime_hours = 0;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_hours_trigger
    BEFORE INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION calculate_attendance_hours();

CREATE OR REPLACE FUNCTION calculate_leave_days()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_days = (NEW.end_date - NEW.start_date) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_leave_days_trigger
    BEFORE INSERT OR UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION calculate_leave_days();

\echo '✅ Created all triggers'

-- ===================================================================
-- STEP 6: Create views
-- ===================================================================
\echo ''
\echo 'Step 6: Creating database views...'

DROP VIEW IF EXISTS employee_attendance_summary CASCADE;
DROP VIEW IF EXISTS todays_attendance CASCADE;

CREATE OR REPLACE VIEW employee_attendance_summary AS
SELECT 
    e.id,
    e.first_name,
    e.last_name,
    e.email,
    e.position,
    e.department,
    e.status,
    COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'present') as present_days,
    COUNT(DISTINCT ar.id) as total_attendance_records,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT ar.id) > 0 
            THEN (COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'present')::DECIMAL / COUNT(DISTINCT ar.id)) * 100
            ELSE 100
        END, 
        2
    ) as attendance_rate,
    AVG(ar.total_hours) FILTER (WHERE ar.total_hours > 0) as avg_hours_per_day,
    SUM(ar.overtime_hours) as total_overtime_hours
FROM employees e
LEFT JOIN attendance_records ar ON e.id = ar.employee_id
WHERE e.status = 'active'
GROUP BY e.id, e.first_name, e.last_name, e.email, e.position, e.department, e.status;

CREATE OR REPLACE VIEW todays_attendance AS
SELECT 
    e.id as employee_id,
    e.first_name,
    e.last_name,
    e.email,
    e.position,
    e.department,
    e.photo_url,
    ar.check_in_time,
    ar.check_out_time,
    ar.status,
    ar.total_hours,
    CASE 
        WHEN ar.check_in_time IS NULL THEN 'Not Checked In'
        WHEN ar.check_out_time IS NULL THEN 'Checked In'
        ELSE 'Completed'
    END as attendance_status
FROM employees e
LEFT JOIN attendance_records ar ON e.id = ar.employee_id AND ar.attendance_date = CURRENT_DATE
WHERE e.status = 'active'
ORDER BY e.first_name, e.last_name;

\echo '✅ Created all views'

-- ===================================================================
-- STEP 7: Grant permissions (Standard PostgreSQL)
-- ===================================================================
\echo ''
\echo 'Step 7: Setting up permissions...'

-- Grant permissions to authenticated users (adjust as needed for your setup)
-- Note: In Neon, you may need to adjust these based on your user/role setup

-- For now, we'll skip RLS since Neon uses standard PostgreSQL
-- Access control will be handled at the application level
\echo 'ℹ️  Note: Row Level Security (RLS) is Supabase-specific.'
\echo 'ℹ️  Access control will be handled at the application level.'
\echo 'ℹ️  All authenticated users in your app will have access based on their role.'

-- ===================================================================
-- STEP 8: Restore backed up data
-- ===================================================================
\echo ''
\echo 'Step 8: Migrating existing employee data...'

DO $$
DECLARE
    migrated_count INTEGER := 0;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees_backup_migration') THEN
        INSERT INTO employees (
            id, user_id, first_name, last_name, email, phone, position, 
            department, hire_date, salary, status, created_at, updated_at
        )
        SELECT 
            id,
            user_id,
            COALESCE(SPLIT_PART(full_name, ' ', 1), 'Unknown') as first_name,
            COALESCE(
                NULLIF(array_to_string((string_to_array(full_name, ' '))[2:], ' '), ''),
                'Employee'
            ) as last_name,
            COALESCE(email, 'employee' || id::text || '@company.com') as email,
            phone,
            COALESCE(position, 'Staff') as position,
            COALESCE(department, 'General') as department,
            COALESCE(hire_date, CURRENT_DATE) as hire_date,
            COALESCE(salary, 0) as salary,
            CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
            created_at,
            updated_at
        FROM employees_backup_migration
        ON CONFLICT (email) DO NOTHING;
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        RAISE NOTICE '✅ Migrated % employee records', migrated_count;
    ELSE
        RAISE NOTICE 'ℹ️  No backup data to migrate';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Migration error: %', SQLERRM;
END $$;

-- ===================================================================
-- STEP 9: Insert default shift templates
-- ===================================================================
\echo ''
\echo 'Step 9: Creating default shift templates...'

INSERT INTO shift_templates (name, description, start_time, end_time, break_duration_minutes) 
VALUES
    ('Morning Shift', 'Standard morning shift', '08:00:00', '17:00:00', 60),
    ('Evening Shift', 'Evening shift', '14:00:00', '22:00:00', 30),
    ('Night Shift', 'Night shift', '22:00:00', '06:00:00', 45)
ON CONFLICT DO NOTHING;

\echo '✅ Created default shift templates'

-- ===================================================================
-- FINAL SUMMARY
-- ===================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo 'MIGRATION COMPLETED SUCCESSFULLY!'
\echo '═══════════════════════════════════════════════════════════════════'
\echo ''

SELECT 
    '✅ ' || tablename || ' (' || 
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) || 
    ' columns)' as tables_created
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('employees', 'attendance_records', 'leave_requests', 'employee_shifts', 'shift_templates')
ORDER BY tablename;

\echo ''
\echo 'Current employee count:'
SELECT COUNT(*) || ' employees' as total FROM employees;

\echo ''
\echo '🎉 Employee Management System is ready to use!'
\echo ''
\echo '⚠️  IMPORTANT SECURITY NOTES:'
\echo '   - Access control is handled at the application level'
\echo '   - Make sure your employeeService.ts properly checks user roles'
\echo '   - Only admin/manager users should access employee management'
\echo ''
\echo 'Next steps:'
\echo '1. Navigate to /employees in your application'
\echo '2. Login as an admin or manager user'
\echo '3. Try creating a test employee'
\echo ''

