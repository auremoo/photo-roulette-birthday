@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Photo Roulette - Soiree en cours
echo ============================================================
echo   Photo Roulette Birthday - demarrage...
echo   (serveur + tunnel internet + QR code + ecran /display)
echo ============================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1"
echo.
echo ------------------------------------------------------------
echo  LAISSE CETTE FENETRE OUVERTE pendant toute la soiree.
echo  Pour tout arreter : double-clique sur "3 - ARRETER.bat".
echo ------------------------------------------------------------
pause
