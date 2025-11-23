@echo off

REM Get the directory where this script is located
set "PROJECT_DIR=%~dp0"

REM === CLIENT WINDOW (Windows PowerShell) ===
start wt -p "Windows PowerShell" -d "%PROJECT_DIR%" powershell -noexit -command "npm run dev"

REM === SERVER WINDOW (Windows PowerShell) ===
start wt -p "Windows PowerShell" -d "%PROJECT_DIR%server" powershell -noexit -command "npm run dev"