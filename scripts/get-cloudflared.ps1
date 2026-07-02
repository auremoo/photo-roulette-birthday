# Télécharge cloudflared.exe (tunnel Cloudflare) dans bin/ — aucun compte requis.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$binDir = Join-Path $root "bin"
if (-not (Test-Path $binDir)) { New-Item -ItemType Directory $binDir | Out-Null }
$dest = Join-Path $binDir "cloudflared.exe"

if (Test-Path $dest) {
  Write-Host "cloudflared déjà présent : $dest" -ForegroundColor Green
  return
}

$url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
Write-Host "Téléchargement de cloudflared…" -ForegroundColor Cyan
Invoke-WebRequest -Uri $url -OutFile $dest
Write-Host "OK -> $dest" -ForegroundColor Green
