# Market Intelligence AI Platform

Uma plataforma web de inteligencia financeira para **centralizar, visualizar e prever dados relevantes de grandes empresas de tecnologia e ativos de diferentes setores do mercado**. O projeto combina um frontend moderno com um pipeline backend de dados, indicadores tecnicos e modelos de inteligencia artificial aplicados a series temporais financeiras.

O sistema foi criado para resolver uma dor comum em analises de mercado: dados historicos, estatisticas, graficos e previsoes normalmente ficam espalhados entre diferentes ferramentas. Aqui, a proposta e reunir tudo em um unico fluxo, permitindo que o usuario acompanhe desempenho historico, compare ativos e consulte previsoes inteligentes de forma mais organizada.

Como projeto de portfolio, a solucao demonstra integracao entre **engenharia de dados, visualizacao financeira e aprendizado de maquina**, com foco em empresas Big Tech e ativos relevantes do mercado brasileiro e internacional.

---

## 🧩 Arquitetura e Tecnologias

| Camada | Tecnologias | Papel no projeto |
| --- | --- | --- |
| **Frontend** | React, TypeScript, Vite, TanStack Router, Tailwind CSS, Radix UI, Recharts | Interface web, navegacao, componentes visuais e exibicao dos dados/graficos |
| **Backend** | Python, Pandas, NumPy, yfinance, Matplotlib, Seaborn, TA-Lib | Coleta de dados financeiros, engenharia de atributos, indicadores tecnicos e geracao de imagens |
| **Inteligencia Artificial** | TensorFlow, Keras, Scikit-Learn, XGBoost | Treinamento, avaliacao e comparacao de modelos preditivos |
| **Dados** | Yahoo Finance via `yfinance` | Fonte historica de precos OHLCV dos ativos analisados |

---

## 🧠 Modelos de Inteligencia Artificial

O coracao analitico do projeto esta no pipeline de previsao, que combina modelos de deep learning e aprendizado supervisionado para estimar tendencias futuras com base no historico dos ativos.

> **LSTM (Long Short-Term Memory)**  
> Rede neural recorrente especializada em sequencias temporais. No projeto, a LSTM aprende padroes a partir de janelas historicas de precos de fechamento, sendo adequada para dados que dependem fortemente da ordem temporal.

> **XGBoost**  
> Modelo de Gradient Boosting baseado em arvores de decisao, reconhecido por sua alta performance em dados tabulares. Aqui, ele atua em conjunto com a LSTM para ajustar residuos e capturar padroes complementares que a rede neural pode nao ter aprendido sozinha.

> **Modelo Hibrido LSTM + XGBoost**  
> Estrategia que combina a previsao sequencial da LSTM com a capacidade do XGBoost de corrigir erros residuais. O objetivo e gerar uma previsao mais robusta do que o uso isolado de apenas um modelo.

---

## 📊 Funcionalidades

- Coleta automatizada de dados historicos de ativos via Yahoo Finance.
- Analise de Big Techs e empresas de diferentes setores do mercado.
- Calculo de indicadores tecnicos como medias moveis, RSI, MACD, Bollinger Bands e volatilidade.
- Geracao de estatisticas resumidas por ativo.
- Criacao de graficos historicos, valorizacao acumulada e comparacao de previsoes.
- Pipeline de previsao com LSTM e modelo hibrido LSTM + XGBoost.
- Frontend modular para navegacao e visualizacao das informacoes geradas.

---

## 🚀 Guia de Inicializacao Rapida

### Pre-requisitos

Antes de rodar o projeto, tenha instalado:

- **Python 3.10+**
- **pip**
- **Node.js 18+**
- **npm**
- **TA-Lib** instalado no ambiente do sistema, pois o backend usa indicadores tecnicos via `talib`

---

## Backend

Entre na pasta do backend:

```bash
cd Backend
```

Crie um ambiente virtual:

```bash
py -3.11 -m venv venv
```

Ative o ambiente virtual no Windows:

```bash
.\venv\Scripts\Activate.ps1
```

No macOS/Linux:

```bash
source .venv/bin/activate
```

Instale as dependencias:

```bash
pip install -r requirements.txt
```

Execute o pipeline:

```bash
python main.py
```

O backend ira baixar os dados, processar os indicadores, treinar os modelos e gerar arquivos de saida como graficos e estatisticas.

---

## Frontend

Entre na pasta do frontend:

```bash
cd Frontend
```

Instale as dependencias:

```bash
npm install
```

Rode em modo de desenvolvimento:

```bash
npm run dev
```

Depois, acesse a URL exibida no terminal, normalmente:

```text
http://localhost:5173
```

---

## 📁 Estrutura do Projeto

```text
TCC-Final/
├── Backend/
│   ├── data_processor.py
│   ├── main.py
│   ├── models_pipeline.py
│   └── requirements.txt
├── Frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── .gitignore
└── README.md
```

---

## 📌 Observacoes

- O diretorio `node_modules/`, ambientes virtuais Python, caches, builds e arquivos gerados sao ignorados pelo Git.
- Os graficos e estatisticas podem ser recriados executando novamente o pipeline do backend.
- O projeto foi estruturado para fins academicos e de portfolio, com foco em demonstrar uma solucao completa de dados financeiros, visualizacao e previsao.
