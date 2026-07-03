@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Photo Roulette - Admin
echo Ouverture de la page d'administration (moderation, export ZIP, reset)...
echo PIN par defaut : 1234
start "" "http://localhost:8000/admin?pin=1234"
