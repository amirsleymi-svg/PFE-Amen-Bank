# Amen Bank Chatbot launcher (Windows PowerShell).
# Starts Ollama if missing, ensures the model is pulled, then runs the FastAPI service on https://localhost:8000.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$OllamaUrl   = "http://localhost:11434"
$OllamaModel = "llama3.2:1b"

function Test-Url($url) {
    try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 | Out-Null; return $true } catch { return $false }
}

Write-Host "== Amen Bank Chatbot launcher ==" -ForegroundColor Cyan

# 1. Ensure Ollama is running
if (-not (Test-Url "$OllamaUrl/api/tags")) {
    Write-Host "Ollama not reachable at $OllamaUrl - attempting to start..." -ForegroundColor Yellow
    $ollama = Get-Command ollama -ErrorAction SilentlyContinue
    if (-not $ollama) {
        Write-Host "Ollama is not installed. Download it from https://ollama.com/download" -ForegroundColor Red
        exit 1
    }
    Start-Process -WindowStyle Hidden -FilePath ollama -ArgumentList "serve"
    Start-Sleep -Seconds 4
    if (-not (Test-Url "$OllamaUrl/api/tags")) {
        Write-Host "Failed to start Ollama. Start it manually (ollama serve) and retry." -ForegroundColor Red
        exit 1
    }
}
Write-Host "Ollama OK at $OllamaUrl" -ForegroundColor Green

# 2. Ensure model is pulled
$tags = (Invoke-WebRequest -Uri "$OllamaUrl/api/tags" -UseBasicParsing).Content | ConvertFrom-Json
$hasModel = $tags.models | Where-Object { $_.name -eq $OllamaModel }
if (-not $hasModel) {
    Write-Host "Model $OllamaModel not found - pulling (this may take a few minutes)..." -ForegroundColor Yellow
    & ollama pull $OllamaModel
}
Write-Host "Model $OllamaModel ready" -ForegroundColor Green

# 3. Ensure venv + deps
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual env..." -ForegroundColor Yellow
    python -m venv .venv
}
$VenvPython = ".\.venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "Virtual env Python not found at $VenvPython" -ForegroundColor Red
    exit 1
}

& $VenvPython -m pip install --upgrade pip
& $VenvPython -m pip install -q -r requirements.txt

# 4. Launch FastAPI
if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "Created default .env - edit if needed." -ForegroundColor Yellow
}

Write-Host "Starting chatbot on https://localhost:8000 ..." -ForegroundColor Cyan
& $VenvPython main.py
