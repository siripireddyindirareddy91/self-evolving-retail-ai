# Backend architecture and API

`backend.app.main:app` is the FastAPI ASGI application. `api/index.py` exports the same app for Vercel. Next.js proxies to port 8000 in local development; production rewrites `/api/*` to the Python function.

## Persistence

SQLAlchemy supports SQLite by default and PostgreSQL through `DATABASE_URL`. The core schema uses UUID identifiers, ownership indexes, a reflection-to-episode foreign key, timestamps and complete JSON execution payloads. Run `python -m backend.migrate`; the PostgreSQL DDL is in `backend/migrations/001_initial.sql`.

The implemented schema deliberately consolidates detailed execution/result records into five tables (`datasets`, `episodic_memories`, `reflection_records`, `tool_executions`, `system_settings`), rather than providing unused tables. This is an application demo schema, not the complete 24-table enterprise design from the original brief.

Local SQLite persists across restarts. Vercel `/tmp` storage is ephemeral and isolated per function instance: configure PostgreSQL and a stable `SESSION_SECRET` for durable shared cloud storage. Existing anonymous user identity requires the same `SESSION_SECRET` across process restarts.

## Agent workflow

The compiled LangGraph state machine performs supervisor classification, TF-IDF memory retrieval, transparent reliability-weighted tool ranking, conditional single/parallel specialist execution, validation/reflection, then episode persistence. Tools retry once on exceptions. Provider HTTP requests have a 20-second timeout; Vercel limits the overall function to 60 seconds. LLM output summarizes computed results only when a server-side key is configured. Fallback mode is always labeled.

Improvement is controlled historical ranking, versioned reversible routing settings, and retrieved experience. No weights are retrained. Confidence measures execution completeness; recommendation quality and tool-selection correctness remain unmeasured until feedback or actual outcomes are supplied.

## Analytics

Sales aggregates verified rows. Customer segmentation uses K-Means over standardized recency, frequency and observed spend. Recency-based churn is a heuristic, not a trained probability. Inventory uses latest recorded stock and observed daily demand. Forecasting uses linear regression with weekly seasonal features and chronological holdout error. Forecast bands are approximate residual bands. Isolation Forest flags unusual daily revenue/order/quantity patterns for human review.

Sample data is deterministic synthetic data through 2026-11-04. Dashboard periods are relative to the latest date in the active dataset. Uploaded data is validated and duplicate rows removed. Missing cost explicitly produces a warning and zero-cost assumptions.

## Security and limits

Signed HttpOnly SameSite cookies scope anonymous demo data. This is not account authentication or enterprise RBAC. Configure a stable `SESSION_SECRET` before deployment. SQL access uses parameterized ORM operations. File uploads are CSV-only, 5 MB and 20,000 rows maximum. CSV downloads neutralize spreadsheet formula prefixes. The in-memory 120 requests/minute limiter is per instance and does not replace a distributed edge limiter. CORS origins are explicit. Secrets stay in server environment variables.

Semantic retrieval currently uses TF-IDF cosine similarity. External embeddings, pgvector ANN indexing, trained churn labels, production identity/roles, and production distributed rate limits are not implemented.

## Verification

Run `python -m unittest discover -s backend/tests -v`. Six integration/analytical tests cover aggregation invariants, K-Means segment counts, inventory, holdout forecasting, anomaly flags, schema validation, duplicate cleaning, the five-specialist workflow, owner isolation, memory retrieval, reflection persistence, feedback, PDF/CSV exports, dataset upload/selection and reversible settings.
