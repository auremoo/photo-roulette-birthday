# Installe tout ce qu'il faut : environnement Python + dépendances + cloudflared.
# À lancer UNE SEULE FOIS (idéalement la veille, avec du wifi qui marche).
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "== 1/3 Environnement Python ==" -ForegroundColor Cyan
if (-not (Test-Path "$root\.venv")) { python -m venv .venv }
$py = "$root\.venv\Scripts\python.exe"

Write-Host "== 2/3 Dépendances ==" -ForegroundColor Cyan
& $py -m pip install --upgrade pip --quiet --disable-pip-version-check
& $py -m pip install -r requirements.txt --disable-pip-version-check

Write-Host "== 3/3 cloudflared ==" -ForegroundColor Cyan
& "$PSScriptRoot\get-cloudflared.ps1"

Write-Host "`nSetup terminé ! Lance la soirée avec : .\scripts\start-all.ps1" -ForegroundColor Green
