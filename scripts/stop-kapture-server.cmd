@echo off
setlocal
set "PORT=61822"
set "FOUND=0"

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  set "FOUND=1"
  echo Stopping process %%P on port %PORT%...
  taskkill /PID %%P /F >nul
)

if "%FOUND%"=="0" (
  echo No Kapture server is listening on port %PORT%.
) else (
  echo Kapture server stopped.
)

pause
