# === LANCEMENT SOIRÉE (mode internet via tunnel Cloudflare) ===
# Démarre le serveur + le tunnel public, récupère l'URL publique et génère le QR.
# Les téléphones peuvent scanner depuis N'IMPORTE QUEL réseau (4G, wifi…).
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$py = "$root\.venv\Scripts\python.exe"
$cf = "$root\bin\cloudflared.exe"

if (-not (Test-Path $py)) { Write-Host "Lance d'abord .\scripts\setup.ps1" -ForegroundColor Red; exit 1 }
if (-not (Test-Path $cf)) { & "$PSScriptRoot\get-cloudflared.ps1" }

# 1) Serveur web (uvicorn) en arrière-plan
Write-Host "Démarrage du serveur…" -ForegroundColor Cyan
$server = Start-Process $py -ArgumentList "-m","uvicorn","server.app:app","--host","0.0.0.0","--port","8000" `
  -PassThru -WindowStyle Minimized

# 2) Tunnel Cloudflare, on capture sa sortie pour lire l'URL publique
$log = "$root\bin\tunnel.log"
if (Test-Path $log) { Remove-Item $log -Force }
Write-Host "Ouverture du tunnel public…" -ForegroundColor Cyan
$tunnel = Start-Process $cf `
  -ArgumentList "tunnel","--url","http://localhost:8000","--no-autoupdate" `
  -PassThru -WindowStyle Minimized -RedirectStandardError $log -RedirectStandardOutput "$root\bin\tunnel.out"

# 3) On attend l'URL https://xxxx.trycloudflare.com
$publicUrl = $null
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 800
  foreach ($f in @($log, "$root\bin\tunnel.out")) {
    if (Test-Path $f) {
      $m = Select-String -Path $f -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($m) { $publicUrl = $m.Matches[0].Value; break }
    }
  }
  if ($publicUrl) { break }
}

if (-not $publicUrl) {
  Write-Host "`n⚠ Impossible de lire l'URL du tunnel. Regarde $log" -ForegroundColor Yellow
  Write-Host "Le serveur tourne quand même en local : http://localhost:8000" -ForegroundColor Yellow
  exit 1
}

# 4) QR code + récap
& $py "$PSScriptRoot\make_qr.py" $publicUrl

Write-Host ""
Write-Host "==================== PRÊT ! 🎉 ====================" -ForegroundColor Green
Write-Host " QR / téléphones  : $publicUrl"                     -ForegroundColor White
Write-Host " Écran diffusion  : $publicUrl/display"             -ForegroundColor White
Write-Host " QR image (print) : $root\bin\qr.png"               -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Green
Write-Host " Pour tout arrêter : ferme cette fenêtre puis .\scripts\stop-all.ps1" -ForegroundColor DarkGray

# 5) Ouvre l'écran de diffusion + le QR sur ce PC
Start-Process "$publicUrl/display"
Start-Process "$root\bin\qr.png"

# garde les PID pour l'arrêt
"$($server.Id)`n$($tunnel.Id)" | Set-Content "$root\bin\pids.txt"
Write-Host "`n(Serveur PID $($server.Id), tunnel PID $($tunnel.Id))" -ForegroundColor DarkGray
