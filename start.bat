@echo off
title NextGen Realtors — Dev Server
echo.
echo  =======================================
echo   NextGen Realtors — Starting Servers
echo  =======================================
echo.

cd /d "%~dp0"

echo  [0/2] Cleaning up any existing servers...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo  [1/2] Starting SMS Proxy Server (port 3001)...
start "SMS Proxy -- port 3001" cmd /k "node server.js"

timeout /t 2 /nobreak >nul

echo  [2/2] Starting Frontend Server (port 3000)...
start "Frontend -- port 3000" cmd /k "npx http-server . -p 3000 -o"

echo.
echo  Both servers are starting in separate windows.
echo  Frontend : http://localhost:3000
echo  SMS Proxy: http://localhost:3001
echo.
pause
