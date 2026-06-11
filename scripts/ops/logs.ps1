# Tail Docker logs
param(
    [int]$Lines = 50,
    [switch]$Follow
)

$root = Split-Path (Split-Path $PSScriptRoot)
Push-Location $root

if ($Follow) {
    docker compose logs -f --tail $Lines
} else {
    docker compose logs --tail $Lines
}

Pop-Location
