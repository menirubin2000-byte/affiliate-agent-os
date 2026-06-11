# Push current state to Vercel via git
param([string]$Message = "deploy: update from ops")

$root = Split-Path (Split-Path $PSScriptRoot)
Push-Location $root

Write-Host "[1/4] Checking git status..." -ForegroundColor Cyan
git status --short

Write-Host "[2/4] Adding changes..." -ForegroundColor Cyan
git add -A

Write-Host "[3/4] Committing..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "[4/4] Pushing to trigger Vercel deploy..." -ForegroundColor Cyan
git push origin main

Write-Host "Pushed. Vercel will auto-deploy." -ForegroundColor Green
Pop-Location
