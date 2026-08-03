@echo off
setlocal EnableExtensions

set "APP_DIR=%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to start dorkA.
  echo Run setup.bat first, then try again.
  pause
  exit /b 1
)

if not exist "%APP_DIR%node_modules\" (
  echo dorkA dependencies are missing. Running setup...
  call "%APP_DIR%setup.bat"
  if errorlevel 1 exit /b 1
)

echo Starting dorkA desktop app...
start "dorkA desktop app" /min cmd.exe /c "cd /d ""%APP_DIR%"" && npm.cmd run desktop > ""%TEMP%\dorka-desktop.log"" 2>&1"
exit /b 0
