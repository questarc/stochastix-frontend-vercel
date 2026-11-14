# Stochastix AI — Features (front end)

Angular front end for **Stochastix AI**. Portfolio and model results come from the FastAPI
back end (separate repository); the Technical Indicators page calculates from local CSV price data.

Results are projections, not guarantees, and not investment advice.

## Feature overview

| Area | What the advisor can do |
|---|---|
| Header | Stochastix AI navigation on every page; client name, account, portfolio value, age, risk profile, and model on Quant Models |
| 📊 MarketWatch | Main page with economic news, upcoming earnings, corporate actions, and market heatmap |
| 📈 Quant Models | Monte Carlo simulation, portfolio settings, rebalancing, orders, and methodology |
| 📄 E*TRADE Agent | Upload text-based PDFs; transfer-activity documents show parsed cash movement totals and rows |
| 📄 Fidelity Agent | Fidelity PDF analytics and positions CSV import with view-only holdings metrics |
| 📉 Time Series | Upload date-aligned historical CSV data; fit linear forward-return and logistic up-probability regressions |
| 🔮 Predictive Pricing Agent | Enter a stock ticker and current price to view five LSTM-based daily direction and percent-change estimates with an expected-price chart |
| 📊 Technical Indicators | Calculate and chart RSI, MACD, and Bollinger Bands from a sample or uploaded historical price CSV |

Predictive Pricing is enabled on the `PredictAnalysisfeature` branch for local LSTM inference. The production branch keeps it hidden until a separately hosted pricing service is configured for Vercel.
| Sidebar — Stochastix AI | Choose source agent, account and model portfolio; load a positions CSV or go back to the default file |
| Sidebar — Plan assumptions | Retirement age, plan end age, annual contribution, annual withdrawal (reset per account) |
| Sidebar — Simulation | Trials (1k–50k), seed, sampling (PRNG/LHS/Sobol), copula (Gaussian/Student-t, df 3–30), return distribution |
| Sidebar — AI model | NVIDIA (default), Ollama, OpenAI, Anthropic or **WebLLM (in browser)**; model; API-key status |
| 🎲 Simulation tab | Positions, allocation chart and drift table, success cards, fan chart, histograms and run settings |
| ⚖️ Rebalance tab | Drift tolerance, minimum trade, whole shares; trades, allocation after trades, success before/after; Generate orders |
| 🧾 Orders tab | Blotter with sorting and paging, metrics, Export CSV/JSON, Clear orders; badge with order count |
| 📖 How it works tab | 30 sample paths chart and methodology panels |
| 💬 Stochastix AI chat | Available on every page; markdown answers, tool trace and orders notice |

## Simulation
- Re-runs automatically when the account, model, plan or settings change: 400 ms debounce, duplicate requests skipped,
  previous request cancelled.
- Cards: current and model probability of success with the difference in percentage points, median ending value
  (today's $). Toggle the projection between current and model portfolio.
- Plotly charts (lazy-loaded): P10–P90 / P25–P75 fan chart with retirement marker, ending-value and depletion-age
  histograms ("No trials ran out of money" when none fail).

## Audio summary (VoiceGenAgent)
- The AI can also create audio on request. Numbers are reworded for speech, never changed; disclaimer always included.

## MarketWatch (Market agents)
- **📰 Economic news** (MarketAnalyzerAgent): headlines linked to the source, topic chips, publish time.
- **📈 Upcoming earnings** (EarningsAgent, 14 days): date, symbol, before/after market, EPS estimate.
- **🏦 Corporate actions** (CorporateActionsAgent, 30 days): dividends (ex-date, pay date, amount) and splits (ratio);
  **Client holdings** filter.
- **🗺️ Market heatmap** (MarketHeatmapAgent): Plotly treemap of the largest US companies grouped by sector; tile
  size = market cap, colour = daily change (red → green, ±3% scale); ★ marks tickers held by clients; 50/100/200
  companies; cap-weighted market change, up/down breadth and sector chips.
- Green **Held** badge with the accounts holding the ticker; per-widget refresh, "Updated" time, unavailable-source
  notes; collapsible MarketWatch widgets.

## E*TRADE statement reader
- Load one text-based PDF statement (20 MB / 500-page limit); transfer activity shows parsed cash movement totals and
  rows in the E*TRADE Agent tab.
- The original PDF and unredacted text are processed temporarily in memory and never written to disk/database.
- Only allowlisted transfer dates, statuses, and amounts—or sanitized section/column labels for unrecognized formats—
  are retained in backend memory per browser session until cleared or restart. Names, SSNs, passwords, addresses,
  account labels, and the original filename are not retained.
- This session key is not authentication. The app has no sign-in, so use only in a trusted environment.
- Analytics are view-only; no brokerage actions are submitted. Transfer activity is not a holdings statement and does
  not establish portfolio value or investment performance.
- The displayed preview is built from allowlisted analytics, not the original text. Automated protection cannot
  guarantee every sensitive value in an uploaded document is identified.
- Password-protected and scanned/image-only PDFs are not supported. This initial reader does not yet extract holdings,
  calculate portfolio analytics, or answer questions about the statement.
- Fidelity Agent uses the same reader and keeps its statement separate from E*TRADE data. When the first-page
  overview labels and amount sequence are unambiguous, it displays portfolio value, period change, and total including
  other holdings. It also displays Portfolio Summary income and aggregate Top Holdings totals, plus account-level
  balance, activity, income, and aggregate Top Holdings figures when recognized. It displays numeric holdings rows
  without security names or ticker symbols, and recognized Activity transaction rows with requested security details
  and numeric columns. Its positions CSV loader displays the supplied position, price, gain/loss, and cost-basis
  columns, while excluding account names and numbers. Personal and account identifiers are not retained.
  The positions view calculates available portfolio value, cost-basis, daily and total gain/loss summaries, and
  estimated return percentages, with allocation and gain/loss charts. These aggregates are based only on values
  present in the CSV and are not time-weighted investment returns.

## Time Series & Statistical Models
- Upload a wide CSV (up to 20 MB) containing a date/timestamp, a positive asset-price column, and numeric predictors.
- Download `public/time-series-sample.csv` from the agent as a 120-row synthetic monthly example (2016–2025) for
  testing both regression types; it is not historical market data. The agent loads this sample automatically when
  opened, while retaining the download and upload controls.
- Linear regression estimates forward simple returns; logistic regression estimates the probability of a positive
  forward return. Choose the prediction horizon in observations and choose the predictor columns explicitly.
- Data is sorted chronologically, incomplete rows are dropped, predictors are standardized on the training period,
  and the final 20% of complete observations are held out for testing. Results include test metrics, coefficients,
  and actual/predicted charts.
- CSV contents are processed in memory and not retained. The model estimates statistical associations, not causal
  effects or investment advice; the holdout is not a validated trading strategy.

## Predictive Pricing Agent
- Enter a stock ticker and the current price to request a five-trading-session forecast from the backend.
- The backend fetches daily Open, High, Low, Close and Volume values from Yahoo Finance for the latest 30 calendar days, then trains a CPU PyTorch LSTM per request. At least 12 complete observations are required.
- Results show one `Up` / `Down` direction and expected percent price change per day, expected prices anchored to the entered price, recent close history, and a combined historical/forecast chart.
- Market data availability and trading dates depend on Yahoo Finance. Forecasts are experimental, use a short history, and are not investment advice or validated trading signals. The entered price is used as the current-price anchor, not as a replacement for Yahoo Finance's model inputs.

## Technical Indicators
- Calculates Wilder RSI (14 periods), MACD (12/26 EMA with a 9-period signal), and 20-period Bollinger Bands
  (two standard deviations) in the browser from the selected date and positive price columns.
- Opens with the built-in synthetic sample; users can upload a CSV (up to 20 MB) and choose its date and price columns.
  At least 34 usable observations are needed to show the full MACD signal.
- Uploaded data is processed locally in the browser and is not sent to the back end. Indicator readings are descriptive,
  based on historical prices, and are not investment advice or predictions.

## Stochastix AI chat
- Available on every page.
- Sends the question with the on-screen account and model; 180 s timeout; "Thinking…" indicator.
- Answers rendered with ngx-markdown (`$` escaped); expandable "Data used (N tool calls)".
- Orders created by the AI refresh the Orders badge. New conversation clears memory (`crypto.randomUUID()` thread).
- Errors from the back end shown as a "⚠️" message.

## WebLLM (in browser)
- Runs the model on the advisor's GPU in a Web Worker (`@mlc-ai/web-llm`); first use downloads 1.6–5 GB, then cached.
- Models: Qwen2.5 7B (default), Hermes-3 Llama 3.1 8B, Llama 3.1 8B, Qwen2.5 3B, Qwen2.5 1.5B.
- The tool loop runs in the browser (max 6 steps); every tool executes in the back end, so numbers still come from
  Python. Needs WebGPU (recent Chrome or Edge). Conversation memory lasts for the browser tab.

## Look and feel
- Ambient dark-blue theme (Angular Material dark, navy surfaces, soft blue glows); colours set once in `src/styles.scss`.
- Money as `$1,234,567`, probabilities as `84.2%` (shared pipes). Errors shown in snack bars by an interceptor.
- Keyboard accessible with ARIA labels; sidebar becomes an overlay below 960 px.

## Structure
```
src/app/
  core/models        account, simulation, rebalance, order, chat, llm, market, etrade
  core/services      api, sources, simulation, rebalance, orders, chat, llm, methodology, voice, market, etrade, fidelity
  core/state         workspace.store, simulation.store, orders.store (signals)
  core/webllm        WebLLM engine, worker, browser agent, tool-call parsing
  core/interceptors  error.interceptor
  layout             header, sidebar
  features           simulation, rebalance, orders, methodology, advisor-ai, market, broker-statement, etrade-agent, fidelity-agent
  shared             plotly-chart, confirm-dialog, pipes
```

## Run
```powershell
npm install          # .npmrc sets legacy-peer-deps
npm start            # http://localhost:4200, calls http://localhost:8000/api
npx ng test --watch=false   # 33 tests
npx ng build
```
Docker: multi-stage `Dockerfile` (Node build → nginx on port 8080). nginx serves the app, proxies `/api/` to the back
end (180 s timeout) and never caches `index.html`, so new deployments load immediately.
With the back end: `docker compose up -d --build` from the parent folder → `http://localhost:8080`.

## Known limitations
- No login; everyone who can reach the app shares the same orders.
- Orders, uploads, imported E*TRADE statement text and audio live in back-end memory and are lost when it restarts.
- Market data comes from free public sources; check their terms before production use.
