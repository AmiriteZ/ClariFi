@echo off

REM === CLIENT WINDOW (Windows PowerShell) ===
start wt -p "Windows PowerShell" -d "C:\Users\arser\Desktop\Final Year Project\ClariFi" powershell -noexit -command "npm run dev"

REM === SERVER WINDOW (Windows PowerShell) ===
start wt -p "Windows PowerShell" -d "C:\Users\arser\Desktop\Final Year Project\ClariFi\server" powershell -noexit -command "npm run dev"