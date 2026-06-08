# TCC — Previsão de Preços com LSTM e LSTM+XGBoost Híbrido

Plataforma web para análise e previsão de preços de ações utilizando redes neurais LSTM e um modelo híbrido LSTM+XGBoost. Cobre 20 ativos (10 internacionais NASDAQ + 10 brasileiros B3).

**Stack:** Python 3.11 · FastAPI · TensorFlow/Keras · XGBoost · React 19 · TypeScript · Vite · Recharts

---

## Arquitetura

```
train.py  (roda uma vez, ~2–4h)
    └── Baixa dados históricos via yfinance (2013–hoje)
    └── Treina LSTM + XGBoost híbrido para cada ativo
    └── Salva modelos em Backend/models/
    └── Gera Frontend/src/data/assets-stats.json

main.py  (servidor FastAPI, porta 8000)
    └── GET /api/stocks/{slug}       → dados reais em tempo real
    └── GET /api/predictions/{slug}  → predições + forecast 30 dias
    └── GET /api/backtest/{slug}     → Sharpe, Drawdown, Profit Factor

Frontend  (Vite + React, porta 5173)
    └── /                → introdução e metodologia
    └── /dados-iniciais  → snapshot de mercado + gráfico 12 meses
    └── /previsoes       → predições, métricas e backtesting
```

---

## Pré-requisitos

- Python 3.11+
- Node.js 20+

---

## Setup (primeira vez)

**1. Criar ambiente virtual e instalar dependências Python**

```powershell
cd Backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

**2. Instalar dependências do frontend**

```powershell
cd Frontend
npm install
cd ..
```

---

## Treinar os modelos

Execute uma única vez antes de rodar o sistema. Leva aproximadamente 2–4 horas para os 20 ativos.

```powershell
.\train.ps1
```

Os artefatos são salvos em `Backend/models/` (gitignored). O arquivo `Frontend/src/data/assets-stats.json` também é atualizado.

> Para retreinar do zero, basta rodar novamente. Os arquivos antigos são sobrescritos.

---

## Rodar o sistema

Após o treinamento, inicie o backend e o frontend com um único comando:

```powershell
.\start.ps1
```

Isso abre duas janelas de terminal: uma para o Backend (FastAPI) e outra para o Frontend (Vite).

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Documentação API (Swagger) | http://localhost:8000/docs |

---

## Ativos cobertos

| Slug | Ticker | Empresa | Bolsa |
|---|---|---|---|
| aapl | AAPL | Apple Inc. | NASDAQ |
| msft | MSFT | Microsoft Corp. | NASDAQ |
| googl | GOOGL | Alphabet Inc. | NASDAQ |
| amzn | AMZN | Amazon.com Inc. | NASDAQ |
| meta | META | Meta Platforms | NASDAQ |
| nvda | NVDA | NVIDIA Corp. | NASDAQ |
| tsla | TSLA | Tesla Inc. | NASDAQ |
| nflx | NFLX | Netflix Inc. | NASDAQ |
| adbe | ADBE | Adobe Inc. | NASDAQ |
| intc | INTC | Intel Corp. | NASDAQ |
| petr4 | PETR4.SA | Petrobras | B3 |
| vale3 | VALE3.SA | Vale S.A. | B3 |
| itub4 | ITUB4.SA | Itaú Unibanco | B3 |
| bbdc4 | BBDC4.SA | Bradesco | B3 |
| bbas3 | BBAS3.SA | Banco do Brasil | B3 |
| abev3 | ABEV3.SA | Ambev | B3 |
| mglu3 | MGLU3.SA | Magazine Luiza | B3 |
| wege3 | WEGE3.SA | WEG S.A. | B3 |
| suzb3 | SUZB3.SA | Suzano | B3 |
| eqtl3 | EQTL3.SA | Equatorial Energia | B3 |

---

## Estrutura do projeto

```
TCC-Final/
├── Backend/
│   ├── main.py              ← servidor FastAPI
│   ├── train.py             ← pipeline de treinamento offline
│   ├── requirements.txt
│   ├── data_processor.py    ← geração de PNGs históricos (requer TA-Lib)
│   ├── models_pipeline.py   ← gráficos comparativos (requer TA-Lib)
│   └── services/
│       ├── data_service.py  ← dados reais via yfinance (cache 15 min)
│       ├── ml_service.py    ← carrega modelos, forecast autorregressivo
│       └── finance_service.py ← backtesting: Sharpe, Drawdown, Profit Factor
├── Frontend/
│   ├── src/
│   │   ├── routes/          ← páginas da aplicação
│   │   ├── components/      ← MetricCard, SiteSidebar, PipelineFigure
│   │   ├── services/api.ts  ← cliente HTTP tipado
│   │   └── data/            ← metadados e assets-stats.json
│   └── package.json
├── docs/
│   └── Estruturacao.md      ← documentação técnica detalhada da arquitetura
├── start.ps1                ← inicia backend + frontend
├── train.ps1                ← executa o pipeline de treinamento
└── README.md
```

---

## Notas

- `Backend/models/` e `Backend/venv/` são gitignored — não são versionados.
- O treinamento precisa rodar novamente após cada `git pull` que altere `train.py`.
- Dados de mercado são sempre em tempo real via yfinance; apenas predições usam modelos pré-treinados.
- A geração de PNGs históricos requer TA-Lib instalado separadamente. Sem ele, o sistema funciona normalmente sem os gráficos estáticos.
