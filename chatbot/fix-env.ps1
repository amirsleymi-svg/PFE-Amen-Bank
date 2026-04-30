# Repair script for chatbot Python environment (Windows PowerShell)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "== Repair chatbot environment ==" -ForegroundColor Cyan

if (-not (Test-Path ".venv")) {
    Write-Host "Creating .venv ..." -ForegroundColor Yellow
    python -m venv .venv
}

$VenvPython = ".\.venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "Cannot find $VenvPython" -ForegroundColor Red
    exit 1
}

Write-Host "Using Python: $(& $VenvPython -c "import sys; print(sys.executable)")" -ForegroundColor Green

& $VenvPython -m pip install --upgrade pip setuptools wheel
& $VenvPython -m pip install --force-reinstall --no-cache-dir -r requirements.txt

Write-Host "Checking jwt/cryptography import..." -ForegroundColor Cyan
& $VenvPython -c "import jwt, cryptography; print('OK:', jwt.__version__)"

Write-Host "Environment fixed. Start with: .\start-chatbot.ps1" -ForegroundColor Green
