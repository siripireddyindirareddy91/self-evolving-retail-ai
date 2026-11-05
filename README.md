# RetailMind AI

**A Self-Evolving Multi-Agent Retail Analytics System Using Episodic Memory, Reflection, and Adaptive Tool Selection**

A working Next.js and FastAPI retail intelligence application. Dashboard metrics are calculated from transactions. The included synthetic sample contains 5,540 transactions over one year. No API key or paid service is required for the local demo.

## Implemented features

- Fifteen separate workspace routes: overview, command center, agents, analytics, sales, customers, inventory, forecasting, memory, reflection, tools, performance, datasets, reports, settings.
- Revenue, profit, order, category, product and regional calculations; dataset/date filters.
- K-Means customer segmentation, observed customer value, repeat purchase rate, and recency-based churn indicators.
- Stock coverage, low-stock/overstock flags and calculated replenishment recommendations.
- Linear-regression forecasts with weekly features, chronological holdout evaluation and approximate uncertainty bands.
- Isolation Forest anomaly detection on daily revenue, orders and quantity.
- Actual LangGraph state management, conditional single/multiple specialist routing, parallel tool execution, retries, validation and reflection.
- Owner-scoped episodes, TF-IDF similarity search, feedback, reflection history and measured tool execution statistics.
- Explainable adaptive tool scores and reversible configuration. No model retraining is claimed.
- CSV preview, column mapping, validation, duplicate removal, cleaned downloads, dataset selection, PDF/CSV reports.
- Optional server-side OpenAI-compatible summary generation; explicitly labeled rule-based fallback.

## Quick start

Node.js 20.9+ and Python 3.12 recommended. From the repository root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
npm ci
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

In another terminal run `npm run dev`, then open http://localhost:3000. API docs: http://127.0.0.1:8000/api/docs. Ask the command center to generate an executive retail performance report, then inspect Memory, Reflection, Tools and Reports.

## Architecture and workflow

The root `app/` and `components/` contain Next.js/React/TypeScript, Tailwind CSS, Recharts, Lucide, Framer Motion, React Hook Form, Zod and Papa Parse. `backend/app/` contains FastAPI/Pydantic, SQLAlchemy, Pandas, NumPy, scikit-learn and LangGraph. `api/index.py` exports the Vercel Python function.

User query → supervisor classification → episodic retrieval → relevance/reliability tool ranking → conditional specialist execution → validation/reflection → computed summary → episode and tool-statistics storage. Multiple analytical specialties execute concurrently. Ten agent roles coordinate ten registered analytical and supporting tools, including SQL/Pandas sales alternatives and regression/seasonal forecast alternatives. Optional LLM calls summarize computed evidence; routing and calculations remain local.

## Storage and environment

SQLite persists locally in `retailmind.db`. SQLAlchemy automatically creates the compact demo schema. Configure `DATABASE_URL` for PostgreSQL/Supabase and a strong, stable `SESSION_SECRET` for signed anonymous identity cookies. See [.env.example](.env.example). Python does not automatically load `.env`; export variables or configure the host/Compose environment.

On Vercel, default `/tmp/retailmind.db` is **temporary and instance-local**. Uploads, memory, settings and feedback can disappear or differ between instances. Durable cloud persistence requires PostgreSQL.

## Validation

```powershell
npm run typecheck
npm run build
python -m unittest discover -s backend/tests -p "test_*.py" -v
python scripts/smoke.py http://127.0.0.1:8000
```

Tests check analytical invariants, forecasting, anomalies, validation, graph execution, memory, reflection, feedback, exports, uploads, configuration reversal and cross-session ownership. The smoke script uses real HTTP and can target the deployed application. Particular run results should be reported separately from these commands.

## Deployment and limits

See [local setup](LOCAL_SETUP.md), [deployment](DEPLOYMENT.md), and [architecture/scope](docs/architecture.md). `docker compose up --build` runs the local demo with a persistent SQLite volume.

This is a functional demonstration, not a certified enterprise service. Identity is a signed anonymous session, not SSO/RBAC; rate limiting is process-local. The compact relational schema stores domain payloads as JSON. It does not implement every proposed normalized enterprise table or pgvector. Memory uses TF-IDF rather than external embedding inference. Baseline forecasts/churn indicators need business validation. Do not mistake execution completeness scores for prediction probabilities.

Live demo: https://self-evolving-retail-ai.vercel.app
