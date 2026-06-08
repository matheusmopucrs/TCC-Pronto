# train.ps1 — Executa o pipeline de treinamento offline
# Baixa dados, treina LSTM + XGBoost para os 20 ativos (~2–4 horas)
# Uso: .\train.ps1

$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TCC — Pipeline de Treinamento" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Isso pode levar 2–4 horas. Nao feche esta janela." -ForegroundColor Yellow
Write-Host ""

$venvPython = "$ROOT\Backend\venv\Scripts\python.exe"

if (Test-Path $venvPython) {
    $PYTHON = $venvPython
    Write-Host "Usando venv em Backend\venv\" -ForegroundColor Green
} else {
    $PYTHON = "python"
    Write-Host "Usando Python global (venv nao encontrado em Backend\venv\)" -ForegroundColor Yellow
}

$env:PYTHONUTF8 = "1"

& $PYTHON "$ROOT\Backend\train.py"

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "Treinamento concluido com sucesso!" -ForegroundColor Green
    Write-Host "Modelos salvos em Backend\models\" -ForegroundColor Green
    Write-Host "Agora rode .\start.ps1 para iniciar o sistema." -ForegroundColor Cyan
} else {
    Write-Host "Treinamento encerrou com erros (codigo $LASTEXITCODE)." -ForegroundColor Red
}
Write-Host ""
pause
