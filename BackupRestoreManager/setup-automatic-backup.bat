@echo off
REM Automatic Backup Setup Script for Windows
REM This helps you set up Task Scheduler for automatic backups

echo ╔════════════════════════════════════════════════════════╗
echo ║     📅 AUTOMATIC BACKUP SETUP (Windows)              ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Get current directory
set BACKUP_DIR=%~dp0
set NODE_PATH=node

echo 📁 Backup directory: %BACKUP_DIR%
echo 🔧 Node.js: %NODE_PATH%
echo.

REM Check if Node.js is available
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: Node.js not found in PATH
    echo Please install Node.js or provide full path
    pause
    exit /b 1
)

REM Check if connections file exists
if not exist "%BACKUP_DIR%.db-connections.json" (
    echo ⚠️  No saved connections found!
    echo Please run the main app first and add a connection.
    pause
    exit /b 1
)

echo 📋 Available connections:
type "%BACKUP_DIR%.db-connections.json" | findstr "name"
echo.

set /p CONNECTION_NAME="Enter connection name: "

set /p BACKUP_TYPE_CHOICE="Backup type (1=Full, 2=Data, 3=Schema) [1]: "
if "%BACKUP_TYPE_CHOICE%"=="" set BACKUP_TYPE_CHOICE=1

if "%BACKUP_TYPE_CHOICE%"=="1" set BACKUP_TYPE=full
if "%BACKUP_TYPE_CHOICE%"=="2" set BACKUP_TYPE=data
if "%BACKUP_TYPE_CHOICE%"=="3" set BACKUP_TYPE=schema

set /p BACKUP_NAME="Backup name prefix [daily]: "
if "%BACKUP_NAME%"=="" set BACKUP_NAME=daily

echo.
echo ════════════════════════════════════════════════════════
echo 📝 TASK SCHEDULER SETUP INSTRUCTIONS
echo ════════════════════════════════════════════════════════
echo.
echo 1. Press Win+R, type: taskschd.msc
echo 2. Click "Create Basic Task"
echo 3. Name: Database Backup Daily
echo 4. Trigger: Daily, set your time
echo 5. Action: Start a program
echo 6. Program: %NODE_PATH%
echo 7. Arguments: scheduled-backup.mjs "%CONNECTION_NAME%" "%BACKUP_TYPE%" "%BACKUP_NAME%"
echo 8. Start in: %BACKUP_DIR%
echo.
echo Or use this PowerShell command:
echo.
echo schtasks /create /tn "Database Backup Daily" /tr "%NODE_PATH% scheduled-backup.mjs \"%CONNECTION_NAME%\" \"%BACKUP_TYPE%\" \"%BACKUP_NAME%\"" /sc daily /st 02:00 /f
echo.
echo ════════════════════════════════════════════════════════
echo.

set /p TEST_NOW="🧪 Test the backup now? (y/n): "
if /i "%TEST_NOW%"=="y" (
    echo.
    echo 🧪 Running test backup...
    cd /d "%BACKUP_DIR%"
    %NODE_PATH% scheduled-backup.mjs "%CONNECTION_NAME%" "%BACKUP_TYPE%" "test-%date:~-4,4%%date:~-10,2%%date:~-7,2%"
    echo.
    echo ✅ Test complete! Check PROD BACKUP folder.
)

echo.
echo ✅ Setup instructions displayed above!
pause
