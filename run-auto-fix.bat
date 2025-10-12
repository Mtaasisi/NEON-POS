@echo off
REM ============================================================================
REM Auto-Fix Payment Mirroring - Windows Batch Script
REM ============================================================================
REM Usage: run-auto-fix.bat
REM Or set DATABASE_URL first: set DATABASE_URL=postgres://... && run-auto-fix.bat
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║       Payment Mirroring Auto-Fix - Execution Script          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check if psql is installed
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: psql is not installed
    echo Please install PostgreSQL client from https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

REM Check if DATABASE_URL is set
if "%DATABASE_URL%"=="" (
    REM Try to load from .env file
    if exist .env (
        echo 📄 Loading DATABASE_URL from .env file...
        for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /r "^DATABASE_URL"') do set %%a=%%b
    )
    
    REM Still not set? Ask user
    if "%DATABASE_URL%"=="" (
        echo ⚠️  DATABASE_URL not found in environment or .env file
        echo.
        echo Please provide your database URL:
        echo Example: postgres://user:password@host:5432/database
        echo.
        set /p DATABASE_URL="Database URL: "
    )
)

REM Verify DATABASE_URL is set
if "%DATABASE_URL%"=="" (
    echo ❌ Error: DATABASE_URL is required
    pause
    exit /b 1
)

REM Check if SQL file exists
if not exist AUTO-FIX-PAYMENT-MIRRORING.sql (
    echo ❌ Error: AUTO-FIX-PAYMENT-MIRRORING.sql not found
    echo Please ensure you're running this script from the correct directory.
    pause
    exit /b 1
)

echo 🔍 Database connection configured
echo.
echo ⚠️  This script will:
echo   ✓ Create/verify payment tables
echo   ✓ Add missing columns
echo   ✓ Remove invalid columns
echo   ✓ Create indexes
echo   ✓ Set up default data
echo   ✓ Run validation tests
echo.
set /p CONFIRM="Continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo 🚀 Running auto-fix script...
echo.

REM Run the SQL script
psql "%DATABASE_URL%" -f AUTO-FIX-PAYMENT-MIRRORING.sql
if %errorlevel% equ 0 (
    echo.
    echo ╔════════════════════════════════════════════════════════════════╗
    echo ║                  ✅ AUTO-FIX COMPLETED!                        ║
    echo ╚════════════════════════════════════════════════════════════════╝
    echo.
    echo 📋 Next Steps:
    echo   1. Restart your dev server: npm run dev
    echo   2. Clear browser cache (F12 → Application → Clear Site Data)
    echo   3. Test a sale with multiple payment methods
    echo   4. Check console for ✅ success messages
    echo.
    echo 📊 Quick Verification:
    echo   psql "%DATABASE_URL%" -c "SELECT * FROM test_payment_mirroring();"
    echo.
    echo 📚 Documentation:
    echo   Read: 🎯-PAYMENT-FIX-README.md
    echo.
) else (
    echo.
    echo ╔════════════════════════════════════════════════════════════════╗
    echo ║                    ❌ ERROR OCCURRED                           ║
    echo ╚════════════════════════════════════════════════════════════════╝
    echo.
    echo Troubleshooting:
    echo   • Check your DATABASE_URL is correct
    echo   • Ensure you have database permissions
    echo   • Verify PostgreSQL version is 12+
    echo   • Read RUN-AUTO-FIX.md for more help
    echo.
    pause
    exit /b 1
)

pause

