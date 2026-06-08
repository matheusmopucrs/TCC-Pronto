# start.ps1 — Inicia o Backend (FastAPI) e o Frontend (Vite) em paralelo
# Uso: .\start.ps1
# Requisitos: Python (com venv ou dependencias globais), Node.js

$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TCC — Stock Forecasting" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Backend ───────────────────────────────────────────────────────────────────

$venvPython = "$ROOT\Backend\venv\Scripts\python.exe"
$globalPython = "python"

if (Test-Path $venvPython) {
    $PYTHON = $venvPython
    Write-Host "[Backend] Usando venv em Backend\venv\" -ForegroundColor Green
} else {
    $PYTHON = $globalPython
    Write-Host "[Backend] Usando Python global (venv nao encontrado em Backend\venv\)" -ForegroundColor Yellow
}

Write-Host "[Backend] Iniciando FastAPI na porta 8000..." -ForegroundColor Cyan

$backendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title Backend - FastAPI && cd /d `"$ROOT\Backend`" && `"$PYTHON`" -m uvicorn main:app --reload --port 8000" -PassThru

# ── Frontend ──────────────────────────────────────────────────────────────────

Write-Host "[Frontend] Iniciando Vite na porta 5173..." -ForegroundColor Cyan

$frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title Frontend - Vite && cd /d `"$ROOT\Frontend`" && npm run dev" -PassThru

# ── Info ──────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Servidores iniciados em janelas separadas." -ForegroundColor Green
Write-Host ""
Write-Host "  Backend : http://localhost:8000" -ForegroundColor White
Write-Host "  Docs API: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Feche as janelas do Backend e Frontend para encerrar." -ForegroundColor DarkGray
Write-Host ""
