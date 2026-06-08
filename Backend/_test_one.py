"""Script temporário — testa o pipeline com apenas AAPL."""
import sys, warnings, json
warnings.filterwarnings("ignore")
sys.path.insert(0, ".")

from train import processar_ativo, MODELS_DIR

print("Iniciando teste com AAPL...\n")
stats = processar_ativo("AAPL")

if stats:
    print("\n=== RESULTADO ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")

    print("\n=== ARQUIVOS GERADOS ===")
    for ext in ["_lstm.keras", "_xgb.pkl", "_scaler.pkl", "_predictions.json"]:
        p = MODELS_DIR / f"AAPL{ext}"
        status = f"OK ({p.stat().st_size // 1024} KB)" if p.exists() else "FALTANDO"
        print(f"  AAPL{ext}: {status}")

    pred_file = MODELS_DIR / "AAPL_predictions.json"
    if pred_file.exists():
        with open(pred_file) as f:
            data = json.load(f)
        m = data["metrics"]
        print("\n=== METRICAS DO TEST SET ===")
        print(f"  LSTM    -> RMSE: {m['lstm']['rmse']:.4f}  MAE: {m['lstm']['mae']:.4f}  DA: {m['lstm']['directional_accuracy']:.1f}%")
        print(f"  Hibrido -> RMSE: {m['hybrid']['rmse']:.4f}  MAE: {m['hybrid']['mae']:.4f}  DA: {m['hybrid']['directional_accuracy']:.1f}%")
        print(f"  Pontos no test set: {len(data['test_dates'])}")
        print(f"  Primeiro ponto: {data['test_dates'][0]}")
        print(f"  Ultimo ponto:   {data['test_dates'][-1]}")
else:
    print("ERRO: processar_ativo retornou None")
