# Arrête le serveur et le tunnel lancés par start-all.ps1 / start-local.ps1.
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path $PSScriptRoot -Parent
$pidFile = "$root\bin\pids.txt"

if (Test-Path $pidFile) {
  Get-Content $pidFile | ForEach-Object {
    if ($_ -match '^\d+$') {
      Stop-Process -Id ([int]$_) -Force -ErrorAction SilentlyContinue
      Write-Host "Processus $_ arrêté." -ForegroundColor Green
    }
  }
  Remove-Item $pidFile -Force
} else {
  Write-Host "Aucun PID enregistré. Ferme les fenêtres uvicorn/cloudflared manuellement." -ForegroundColor Yellow
}
