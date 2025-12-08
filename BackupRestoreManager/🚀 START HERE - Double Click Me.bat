@echo off
REM ╔════════════════════════════════════════════════════════╗
REM ║     🔄 BACKUP & RESTORE MANAGER                        ║
REM ║     🚀 START HERE - DOUBLE CLICK THIS FILE!           ║
REM ╚════════════════════════════════════════════════════════╝

REM Get the directory where this script is located
cd /d "%~dp0"

REM Clear screen and show logo
cls
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║                                                        ║
echo ║     🔄  BACKUP & RESTORE MANAGER                      ║
echo ║     📦  Database Backup, Restore & Schema Merge        ║
echo ║                                                        ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is available
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo.
    echo 📥 Please install Node.js from:
    echo    https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 First time setup: Installing dependencies...
    echo    This may take a minute...
    echo.
    where npm >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        call npm install
        if %ERRORLEVEL% NEQ 0 (
            echo.
            echo ❌ Failed to install dependencies
            pause
            exit /b 1
        )
        echo.
        echo ✅ Dependencies installed successfully!
        echo.
    ) else (
        echo ❌ Error: npm is not installed
        echo Please install Node.js (which includes npm) from https://nodejs.org/
        pause
        exit /b 1
    )
)

REM Check if the script exists
if not exist "backup-restore-manager.mjs" (
    echo ❌ Error: backup-restore-manager.mjs not found
    pause
    exit /b 1
)

REM Run the app
echo 🚀 Launching Backup & Restore Manager...
echo.
timeout /t 1 /nobreak >nul
node backup-restore-manager.mjs

REM Keep window open if there's an error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ App exited with error code: %ERRORLEVEL%
    pause
)
