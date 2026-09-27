@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo         KAS RC ARENA - STARTER
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed on this computer.
  echo.
  echo Please install Node.js 18 or newer from nodejs.org,
  echo then double-click this file again.
  echo.
  pause
  exit /b 1
)

start "KAS RC Arena Server" cmd /k "cd /d \"%~dp0\" && node server.js"

timeout /t 2 /nobreak >nul
start "" "http://localhost:4173"
exit /b 0
