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
start "" "http://localhost:4173"
"%NODE%" "%~dp0server.js"
pause
