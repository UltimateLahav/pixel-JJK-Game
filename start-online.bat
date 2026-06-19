@echo off
setlocal
title Void Limit Online Server

where node >nul 2>nul
if not errorlevel 1 set "NODE=node"

if not defined NODE set "NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if /i not "%NODE%"=="node" if not exist "%NODE%" (
  echo Node.js was not found.
  echo Install Node.js or run this game from Codex.
  pause
  exit /b 1
)

echo.
echo Google Sign-In setup:
echo Paste your Google OAuth WEB CLIENT ID.
echo It should end with: .apps.googleusercontent.com
echo Leave blank only if you want Guest Mode only.
echo.

set "GOOGLE_CLIENT_ID="
set /p "GOOGLE_CLIENT_ID=Google OAuth Web Client ID: "

echo.
if "%GOOGLE_CLIENT_ID%"=="" (
  echo Starting without Google Sign-In. Guest Mode will still work.
) else (
  echo Google Sign-In Client ID loaded:
  echo %GOOGLE_CLIENT_ID%
)

echo.
echo Starting server...
echo Open this in your browser:
echo http://localhost:4173
echo.
echo Test config here:
echo http://localhost:4173/api/config
echo.

"%NODE%" "%~dp0server.js"

pause
