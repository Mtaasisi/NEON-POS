# ============================================================================
# Run Branch Isolation Scripts (PowerShell)
# ============================================================================
# This script runs the branch isolation verification and migration scripts
# against your PostgreSQL database.
# ============================================================================

# Database connection string
$DB_URL = "postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Branch Isolation Script Runner" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if psql is installed
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "Error: psql is not installed" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools" -ForegroundColor Yellow
    exit 1
}

# Function to run a SQL file
function Run-SqlFile {
    param(
        [string]$File,
        [string]$Description
    )
    
    if (-not (Test-Path $File)) {
        Write-Host "⚠️  File not found: $File" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "Running: $Description" -ForegroundColor Green
    Write-Host "File: $File" -ForegroundColor Gray
    Write-Host ""
    
    $env:PGPASSWORD = "npg_dMyv1cG4KSOR"
    psql $DB_URL -f $File
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully executed: $File" -ForegroundColor Green
        $result = $true
    } else {
        Write-Host "❌ Error executing: $File" -ForegroundColor Red
        $result = $false
    }
    
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    
    return $result
}

# Step 1: Run verification script
Write-Host "STEP 1: Verifying current isolation state..." -ForegroundColor Cyan
Run-SqlFile "VERIFY_ALL_TABLES_BRANCH_ISOLATION.sql" "Verification Script"

$response = Read-Host "Review the output above. Press Enter to continue with migrations, or Ctrl+C to cancel"

# Step 2: Add branch_id to logging tables
Write-Host "STEP 2: Adding branch_id to logging tables..." -ForegroundColor Cyan
Run-SqlFile "ADD_BRANCH_ID_TO_LOGGING_TABLES.sql" "Logging Tables Migration"

# Step 3: Add branch_id to communication tables
Write-Host "STEP 3: Adding branch_id to communication tables..." -ForegroundColor Cyan
Run-SqlFile "ADD_BRANCH_ID_TO_COMMUNICATION_TABLES.sql" "Communication Tables Migration"

# Step 4: Add branch_id to session tables
Write-Host "STEP 4: Adding branch_id to session tables..." -ForegroundColor Cyan
Run-SqlFile "ADD_BRANCH_ID_TO_SESSION_TABLES.sql" "Session Tables Migration"

# Step 5: Verify again
Write-Host "STEP 5: Verifying changes..." -ForegroundColor Cyan
Run-SqlFile "VERIFY_ALL_TABLES_BRANCH_ISOLATION.sql" "Final Verification"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ All scripts completed!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the verification output above"
Write-Host "2. Update your application code to set branch_id when creating records"
Write-Host "3. Update queries to use addBranchFilter() for branch filtering"
Write-Host ""
