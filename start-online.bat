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
echo Paste your Google OAuth Web Client ID, or leave blank for Guest Mode only.
set "GOOGLE_CLIENT_ID="
set /p "GOOGLE_CLIENT_ID=Google OAuth Web Client ID: "
if "%GOOGLE_CLIENT_ID%"=="" (
  echo Starting without Google Sign-In. Guest Mode will still work.
) else (
  echo Google Sign-In Client ID loaded for this server session.
)
start "" "http://localhost:4173"
"%NODE%" "%~dp0server.js"
pause
