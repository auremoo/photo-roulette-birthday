# === MODE SECOURS : pas d'internet ===
# Tout le monde se connecte au MÊME réseau (le hotspot wifi de ton PC, ou le
# wifi de la salle). Pas de tunnel : on utilise l'adresse IP locale du PC.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$py = "$root\.venv\Scripts\python.exe"
if (-not (Test-Path $py)) { Write-Host "Lance d'abord .\scripts\setup.ps1" -ForegroundColor Red; exit 1 }

# Trouve l'IPv4 locale (on ignore loopback et adresses APIPA 169.254.x)
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" } |
  Sort-Object -Property InterfaceMetric |
  Select-Object -First 1).IPAddress

if (-not $ip) { $ip = "localhost" }
$url = "http://${ip}:8000"

Write-Host "Démarrage du serveur (mode local)…" -ForegroundColor Cyan
$server = Start-Process $py -ArgumentList "-m","uvicorn","server.app:app","--host","0.0.0.0","--port","8000" `
  -PassThru -WindowStyle Minimized

Start-Sleep -Seconds 2
& $py "$PSScriptRoot\make_qr.py" $url

Write-Host ""
Write-Host "============ PRÊT (mode local) 🎉 ============" -ForegroundColor Green
Write-Host " Tous sur le MÊME wifi/hotspot, puis :"          -ForegroundColor White
Write-Host " Téléphones      : $url"                         -ForegroundColor White
Write-Host " Écran diffusion : $url/display"                 -ForegroundColor White
Write-Host "=============================================="   -ForegroundColor Green
Write-Host " Astuce hotspot : Paramètres Windows > Réseau > Point d'accès sans fil mobile" -ForegroundColor DarkGray

Start-Process "$url/display"
Start-Process "$root\bin\qr.png"
"$($server.Id)" | Set-Content "$root\bin\pids.txt"
