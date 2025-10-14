@echo off
REM ============================================
REM 🚀 PAYMENT SYSTEM FIX - AUTO RUNNER (Windows)
REM ============================================
REM This script runs all payment fixes on your Neon database
REM ============================================

SET DB_CONNECTION=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require^&channel_binding=require

echo ========================================
echo    🚀 PAYMENT SYSTEM FIX
echo ========================================
echo.

REM Check if psql is installed
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERROR: psql is not installed
    echo Please install PostgreSQL client from:
    echo https://www.postgresql.org/download/
    pause
    exit /b 1
)

echo ✅ psql found
echo.

REM Test database connection
echo 📡 Testing database connection...
psql "%DB_CONNECTION%" -c "SELECT 1;" >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Failed to connect to database
    echo Please check your connection string and network
    pause
    exit /b 1
)

echo ✅ Database connection successful
echo.

REM Run the comprehensive payment fix
echo 🔧 Running comprehensive payment system fix...
echo.

psql "%DB_CONNECTION%" -f "🚀-COMPREHENSIVE-PAYMENT-FIX.sql"
if %errorlevel% neq 0 (
    echo.
    echo ❌ Error running payment fix
    pause
    exit /b 1
)

echo.
echo ✅ Payment system fix completed successfully!
echo.
echo ========================================
echo    🎉 FIX COMPLETE
echo ========================================
echo.
echo Next steps:
echo 1. Restart your development server (npm run dev)
echo 2. Clear browser cache (Ctrl+Shift+R)
echo 3. Test payment functionality
echo.
echo To verify the fix worked, run:
echo   run-payment-diagnostics.bat
echo.
pause

