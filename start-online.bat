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
set "GOOGLE_CLIENT_ID=985537852640-mj77hcjhvvpj0at4bmthoek3afbk88og.apps.googleusercontent.com"
echo Google Sign-In Client ID loaded for this server session.
if defined APPDATA (
  set "VOID_LIMIT_DATA_DIR=%APPDATA%\VoidLimit\account-data"
) else (
  set "VOID_LIMIT_DATA_DIR=%USERPROFILE%\Documents\VoidLimit\account-data"
)
if not exist "%VOID_LIMIT_DATA_DIR%" mkdir "%VOID_LIMIT_DATA_DIR%"
echo Account save folder: %VOID_LIMIT_DATA_DIR%
start "" "http://localhost:4173"
"%NODE%" "%~dp0server.js"
pause
