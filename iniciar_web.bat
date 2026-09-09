@echo off
title Palacio Barolo - Sistema Web de Eventos
cd /d "%~dp0"
echo ========================================================
echo   PALACIO BAROLO - SISTEMA WEB DE EVENTOS & RENTABILIDAD
echo ========================================================
echo.
echo Iniciando servidor web interactivo...
echo.
echo Presiona Ctrl+C para detener el servidor.
echo.
start "" "http://localhost:3000"
npm.cmd run dev -- --host
pause
