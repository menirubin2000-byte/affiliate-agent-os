@echo off
setlocal
title Kapture MCP Server

set "PORT=61822"

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  echo Kapture server is already running on port %PORT%.
  echo.
  echo Leave this window open if you want to keep the server visible.
  pause
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on this machine.
  echo Install Node.js and try again.
  pause
  exit /b 1
)

echo Starting Kapture MCP server on port %PORT%...
echo Keep this window open while you want Kapture available.
echo.
npx --yes kapture-mcp@latest server

echo.
echo Kapture server stopped.
pause
