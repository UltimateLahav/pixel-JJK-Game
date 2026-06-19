@echo off
setlocal
title Void Limit Online Server

REM Your Google OAuth WEB Client ID. This is not a Client Secret.
set "GOOGLE_CLIENT_ID=985537852640-mj77hcjhvvpj0at4bmthoek3afbk88og.apps.googleusercontent.com"

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
echo Void Limit Online Server
echo ------------------------
echo Google Sign-In Client ID loaded:
echo %GOOGLE_CLIENT_ID%
echo.
echo Opening game at:
echo http://localhost:4173
echo.
echo To test the config, open:
echo http://localhost:4173/api/config
echo.

start "" "http://localhost:4173"
"%NODE%" "%~dp0server.js"

pause
