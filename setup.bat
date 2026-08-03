@echo off
setlocal EnableExtensions
title dorkA setup

set "APP_DIR=%~dp0"
set "DORKA_APP_DIR=%APP_DIR%"

echo.
echo   dorkA setup
echo   Local search-operator workspace
echo.

where npm.cmd >nul 2>nul
if not errorlevel 1 goto :install_dependencies

echo Node.js was not found. Installing the current Node.js LTS release...
where winget.exe >nul 2>nul
if errorlevel 1 goto :missing_package_manager

winget.exe install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :node_install_failed

rem A newly installed Node.js may not be in this CMD session's PATH yet.
set "PATH=%ProgramFiles%\nodejs;%PATH%"
where npm.cmd >nul 2>nul
if errorlevel 1 goto :node_install_failed

:install_dependencies
echo Installing dorkA dependencies...
pushd "%APP_DIR%"
call npm.cmd install --no-audit --no-fund
if errorlevel 1 (
  popd
  echo.
  echo Dependency installation failed. Check your internet connection and run setup.bat again.
  pause
  exit /b 1
)
popd

echo Creating desktop launcher and dA icon...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$app=$env:DORKA_APP_DIR; $desktop=[Environment]::GetFolderPath('Desktop'); $iconFile=Join-Path $app 'dorkA.ico'; Add-Type -AssemblyName System.Drawing; $bmp=New-Object System.Drawing.Bitmap 256,256; $g=[System.Drawing.Graphics]::FromImage($bmp); $g.SmoothingMode='AntiAlias'; $g.Clear([System.Drawing.Color]::FromArgb(11,11,13)); $redBrush=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(229,57,53)); $pinkBrush=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,151,147)); $g.FillRectangle($redBrush,24,24,208,208); $font=New-Object System.Drawing.Font('Arial',102,[System.Drawing.FontStyle]::Bold); $g.DrawString('dA',$font,$pinkBrush,36,62); $icon=[System.Drawing.Icon]::FromHandle($bmp.GetHicon()); $stream=New-Object System.IO.FileStream($iconFile,[System.IO.FileMode]::Create); $icon.Save($stream); $stream.Close(); $icon.Dispose(); $font.Dispose(); $redBrush.Dispose(); $pinkBrush.Dispose(); $g.Dispose(); $bmp.Dispose(); $package=Get-ChildItem -LiteralPath (Join-Path $app 'release') -Filter 'dorkA *.exe' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1; $target=if($package){$package.FullName}else{Join-Path $app 'start-dorka.bat'}; $shell=New-Object -ComObject WScript.Shell; $shortcut=$shell.CreateShortcut((Join-Path $desktop 'dorkA.lnk')); $shortcut.TargetPath=$target; $shortcut.WorkingDirectory=$app; $shortcut.IconLocation=($iconFile + ',0'); $shortcut.Description='Open the dorkA desktop search workspace'; $shortcut.Save()"
if errorlevel 1 goto :shortcut_failed

dir /b "%APP_DIR%release\dorkA *.exe" >nul 2>nul
if not errorlevel 1 goto :setup_complete

echo Building the dorkA desktop app (one-time step)...
pushd "%APP_DIR%"
call npm.cmd run package:win
if errorlevel 1 (
  popd
  echo.
  echo The desktop app could not be packaged. Run setup.bat again to retry.
  pause
  exit /b 1
)
popd

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$app=$env:DORKA_APP_DIR; $desktop=[Environment]::GetFolderPath('Desktop'); $iconFile=Join-Path $app 'dorkA.ico'; $package=Get-ChildItem -LiteralPath (Join-Path $app 'release') -Filter 'dorkA *.exe' -ErrorAction Stop | Sort-Object LastWriteTime -Descending | Select-Object -First 1; $shell=New-Object -ComObject WScript.Shell; $shortcut=$shell.CreateShortcut((Join-Path $desktop 'dorkA.lnk')); $shortcut.TargetPath=$package.FullName; $shortcut.WorkingDirectory=$app; $shortcut.IconLocation=($iconFile + ',0'); $shortcut.Description='Open the dorkA desktop search workspace'; $shortcut.Save()"
if errorlevel 1 goto :shortcut_failed

:setup_complete
echo.
echo Setup complete.
echo A dorkA launcher is now on your desktop.
echo Open it any time to launch the dorkA desktop app.
pause
exit /b 0

:missing_package_manager
echo.
echo Node.js is required, but neither Node.js nor winget was found.
echo Install Node.js LTS from https://nodejs.org/ and run setup.bat again.
pause
exit /b 1

:node_install_failed
echo.
echo Node.js could not be installed automatically.
echo Install Node.js LTS from https://nodejs.org/ and run setup.bat again.
pause
exit /b 1

:shortcut_failed
echo.
echo Dependencies were installed, but Windows could not create the desktop launcher.
echo You can still start the app by running start-dorka.bat from this folder.
pause
exit /b 1
