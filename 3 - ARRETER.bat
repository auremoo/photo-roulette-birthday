@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Photo Roulette - Arret
echo Arret du serveur et du tunnel...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-all.ps1"
echo.
pause
