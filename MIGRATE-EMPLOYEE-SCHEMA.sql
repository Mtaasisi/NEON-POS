-- ===================================================================
-- EMPLOYEE SCHEMA MIGRATION SCRIPT
-- ===================================================================
-- This script migrates from the old simplified employee schema
-- to the comprehensive employee management system schema
-- ===================================================================
-- IMPORTANT: This will preserve existing employee data if any exists
-- ===================================================================

BEGIN;

-- ===================================================================
-- STEP 1: BACKUP EXISTING DATA
-- ===================================================================
DO $$
BEGIN
    -- Create temporary backup table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
        -- Backup existing employees if table exists
        CREATE TEMP TABLE employees_backup AS 
        SELECT * FROM employees;
        
        RAISE NOTICE '✅ Backed up existing employee data';
    ELSE
        RAISE NOTICE 'ℹ️  No existing employee table found';
    END IF;
END $$;

-- ===================================================================
-- STEP 2: DROP EXISTING TABLES (WITH CASCADE)
-- ===================================================================
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS employee_shifts CASCADE;
DROP TABLE IF EXISTS shift_templates CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

RAISE NOTICE '✅ Dropped old tables';

-- ===================================================================
-- STEP 3: CREATE NEW COMPREHENSIVE SCHEMA
-- ===================================================================

-- 1. EMPLOYEES TABLE
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
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
    manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
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
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

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
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(employee_id, shift_date)
);

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
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

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
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

RAISE NOTICE '✅ Created new tables with comprehensive schema';

-- ===================================================================
-- STEP 4: CREATE INDEXES
-- ===================================================================

-- Employees indexes
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_user_id ON employees(user_id);

-- Attendance indexes
CREATE INDEX idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_status ON attendance_records(status);
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, attendance_date);

-- Leave requests indexes
CREATE INDEX idx_leave_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_leave_dates ON leave_requests(start_date, end_date);

-- Shift indexes
CREATE INDEX idx_shifts_employee_id ON employee_shifts(employee_id);
CREATE INDEX idx_shifts_date ON employee_shifts(shift_date);
CREATE INDEX idx_shifts_employee_date ON employee_shifts(employee_id, shift_date);

RAISE NOTICE '✅ Created indexes';

-- ===================================================================
-- STEP 5: CREATE TRIGGERS
-- ===================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
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

-- Function to calculate attendance hours
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

-- Function to calculate leave days
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

RAISE NOTICE '✅ Created triggers';

-- ===================================================================
-- STEP 6: CREATE VIEWS
-- ===================================================================

-- Employee attendance summary view
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

-- Today's attendance view
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

RAISE NOTICE '✅ Created views';

-- ===================================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY
-- ===================================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

-- Employees policies
CREATE POLICY "Employees viewable by authenticated users"
    ON employees FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Employees manageable by admin and managers"
    ON employees FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Attendance policies
CREATE POLICY "Attendance viewable by authenticated users"
    ON attendance_records FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Employees can manage their own attendance"
    ON attendance_records FOR INSERT
    TO authenticated
    WITH CHECK (
        employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admin and managers can manage all attendance"
    ON attendance_records FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Leave requests policies
CREATE POLICY "Leave requests viewable by authenticated users"
    ON leave_requests FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Employees can create their own leave requests"
    ON leave_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admin and managers can manage all leave requests"
    ON leave_requests FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Shifts policies
CREATE POLICY "Shifts viewable by authenticated users"
    ON employee_shifts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin and managers can manage shifts"
    ON employee_shifts FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Shift templates policies
CREATE POLICY "Shift templates viewable by authenticated users"
    ON shift_templates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin can manage shift templates"
    ON shift_templates FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

RAISE NOTICE '✅ Enabled RLS policies';

-- ===================================================================
-- STEP 8: MIGRATE EXISTING DATA
-- ===================================================================
DO $$
DECLARE
    backup_exists BOOLEAN;
    migrated_count INTEGER := 0;
BEGIN
    -- Check if backup table exists and has data
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'pg_temp' 
        AND tablename = 'employees_backup'
    ) INTO backup_exists;
    
    IF backup_exists THEN
        -- Migrate data from old schema to new schema
        INSERT INTO employees (
            id,
            user_id,
            first_name,
            last_name,
            email,
            phone,
            position,
            department,
            hire_date,
            salary,
            status,
            created_at,
            updated_at
        )
        SELECT 
            id,
            user_id,
            -- Split full_name into first_name and last_name
            SPLIT_PART(COALESCE(full_name, 'Unknown'), ' ', 1) as first_name,
            CASE 
                WHEN array_length(string_to_array(COALESCE(full_name, 'Unknown'), ' '), 1) > 1 
                THEN array_to_string(
                    (string_to_array(COALESCE(full_name, 'Unknown'), ' '))[2:], ' '
                )
                ELSE 'Employee'
            END as last_name,
            COALESCE(email, 'employee' || id::text || '@company.com') as email,
            phone,
            COALESCE(position, 'Staff') as position,
            COALESCE(department, 'General') as department,
            COALESCE(hire_date, CURRENT_DATE) as hire_date,
            COALESCE(salary, 0) as salary,
            CASE 
                WHEN is_active THEN 'active'
                ELSE 'inactive'
            END as status,
            created_at,
            updated_at
        FROM employees_backup
        ON CONFLICT (email) DO NOTHING;
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        
        RAISE NOTICE '✅ Migrated % employee records from old schema', migrated_count;
    ELSE
        RAISE NOTICE 'ℹ️  No existing employee data to migrate';
    END IF;
END $$;

-- ===================================================================
-- STEP 9: INSERT DEFAULT SHIFT TEMPLATES
-- ===================================================================
INSERT INTO shift_templates (name, description, start_time, end_time, break_duration_minutes) VALUES
    ('Morning Shift', 'Standard morning shift', '08:00:00', '17:00:00', 60),
    ('Evening Shift', 'Evening shift', '14:00:00', '22:00:00', 30),
    ('Night Shift', 'Night shift', '22:00:00', '06:00:00', 45)
ON CONFLICT DO NOTHING;

RAISE NOTICE '✅ Inserted default shift templates';

-- ===================================================================
-- STEP 10: COMMIT TRANSACTION
-- ===================================================================
COMMIT;

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Show table structures
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Database Tables Created:';
END $$;

SELECT 
    'Table: ' || tablename || ' (Columns: ' || count(*) || ')' as table_info
FROM information_schema.columns
WHERE table_schema = 'public' 
AND tablename IN ('employees', 'attendance_records', 'leave_requests', 'employee_shifts', 'shift_templates')
GROUP BY tablename
ORDER BY tablename;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Views Created:';
END $$;

SELECT 'View: ' || viewname as view_info
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('employee_attendance_summary', 'todays_attendance');

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 RLS Policies Created:';
END $$;

SELECT 'Policy: ' || policyname || ' on ' || tablename as policy_info
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('employees', 'attendance_records', 'leave_requests', 'employee_shifts', 'shift_templates');

DO $$
DECLARE
    emp_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO emp_count FROM employees;
    RAISE NOTICE '';
    RAISE NOTICE '👥 Total Employees: %', emp_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration complete! You can now use the Employee Management feature.';
    RAISE NOTICE '';
END $$;

