@echo off
title History of Kazakhstan Trainer v4
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js 18 or newer, then run this file again.
  pause
  exit /b 1
)
if exist ".env" (
  echo Loading settings from .env...
  node --env-file-if-exists=.env server.mjs
  pause
  exit /b %errorlevel%
)

if "%OPENAI_API_KEY%"=="" (
  echo Enter your OpenAI API key. It will only remain in this terminal session.
  set /p OPENAI_API_KEY=OpenAI API key:
)
if "%OPENAI_API_KEY%"=="" (
  echo No API key was entered.
  pause
  exit /b 1
)
node server.mjs
pause
