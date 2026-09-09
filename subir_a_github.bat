@echo off
title Subir Proyecto a GitHub - Palacio Barolo
cd /d "%~dp0"
set PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\bin

echo ========================================================
echo   SUBIR PLATAFORMA WEB A GITHUB (Palacio Barolo)
echo ========================================================
echo.
echo Repositorio destino:
echo https://github.com/urbanbatesviandas-blip/calculadoraPalacio
echo.
echo --------------------------------------------------------
echo OPCIONES DE AUTENTICACION:
echo.
echo 1. Si tenes un Personal Access Token (PAT):
echo    Pegalo cuando te pida Password (los tokens empiezan con ghp_).
echo.
echo 2. O inicia sesion en el navegador cuando se abra la
echo    ventana de GitHub.
echo --------------------------------------------------------
echo.
echo Ejecutando: git push -u origin main...
echo.

git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   EXITO: El codigo fue subido correctamente a GitHub!
    echo ========================================================
) else (
    echo.
    echo --------------------------------------------------------
    echo NOTA SOBRE GITHUB:
    echo GitHub ya no permite contrasenas comunes por linea de comandos.
    echo Necesitas un Personal Access Token (PAT):
    echo 1. Entra a: https://github.com/settings/tokens
    echo 2. Toca "Generate new token (classic)"
    echo 3. Marca la casilla "repo" y genera el token
    echo 4. Copia el token (ghp_...) y usalo como contrasena.
    echo --------------------------------------------------------
)

echo.
pause
