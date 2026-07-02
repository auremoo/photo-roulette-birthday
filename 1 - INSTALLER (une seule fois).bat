@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Photo Roulette - Installation
echo ============================================================
echo   Installation de Photo Roulette Birthday
echo   (a faire UNE SEULE FOIS, avec une bonne connexion wifi)
echo ============================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup.ps1"
echo.
echo Termine. Tu peux fermer cette fenetre.
pause
