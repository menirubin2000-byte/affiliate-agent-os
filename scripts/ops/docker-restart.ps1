# Rebuild and restart Docker container
param([switch]$NoBuild)

$root = Split-Path (Split-Path $PSScriptRoot)
Push-Location $root

if (-not $NoBuild) {
    Write-Host "[1/3] Building..." -ForegroundColor Cyan
    docker compose build
    if ($LASTEXITCODE -ne 0) { Write-Host "Build failed!" -ForegroundColor Red; Pop-Location; exit 1 }
}

Write-Host "[2/3] Restarting..." -ForegroundColor Cyan
docker compose down
docker compose up -d

Write-Host "[3/3] Waiting for health..." -ForegroundColor Cyan
Start-Sleep 3
$r = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction SilentlyContinue
if ($r.StatusCode -eq 200) {
    Write-Host "App is UP on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "App may not be ready yet. Check: docker compose logs" -ForegroundColor Yellow
}

Pop-Location
