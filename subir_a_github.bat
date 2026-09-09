@echo off
chcp 65001 >nul
title Palacio Barolo - Subir a GitHub
echo ========================================================
echo   🏛️ PALACIO BAROLO - SUBIR REPOSITORIO A GITHUB
echo ========================================================
echo.
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git config --global credential.helper manager

echo 1. Comprobando estado local de Git...
git status
echo.
echo 2. Subiendo rama main a GitHub...
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================================
    echo ⚠️  Si la subida falló, verificá lo siguiente:
    echo ========================================================
    echo 1. Asegurate de que el repositorio esté creado en tu cuenta:
    echo    Entrá a: https://github.com/new
    echo    Nombre del repositorio: calculadoraBarolo
    echo.
    echo 2. Si te pide contraseña, recordá que GitHub requiere
    echo    un Personal Access Token (PAT) con permiso 'repo':
    echo    https://github.com/settings/tokens
    echo ========================================================
) else (
    echo.
    echo ✅ ¡Repositorio subido exitosamente a GitHub!
)

echo.
pause
