@echo off
REM Amen Bank Chatbot launcher (Windows .bat wrapper).
REM Calls the PowerShell launcher bypassing the execution policy so it runs from cmd or git-bash.

cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-chatbot.ps1"
pause
