# Deployment

## Vercel frontend and Python API

The repository root contains Next.js, `requirements.txt`, and `api/index.py`. `vercel.json` routes `/api/*` to the FastAPI function.

1. Import the GitHub repository into Vercel. Keep the root at the repository root; framework: Next.js.
2. Install with `npm ci`; build using `npm run build`.
3. Set a strong stable `SESSION_SECRET` in Vercel server environment settings. Never commit it.
4. For durable data, set `DATABASE_URL` to PostgreSQL/Supabase, preferably its serverless pooler endpoint with TLS.
5. Optionally set `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`. These are server-only values. No secret uses a `NEXT_PUBLIC_` prefix.
6. Deploy, inspect `/api/health`, then run `python scripts/smoke.py https://YOUR-PROJECT.vercel.app`.

CLI alternative, after Vercel authentication:

```powershell
vercel link
vercel env add SESSION_SECRET production
vercel env add DATABASE_URL production
vercel --prod
```

Enter secret values through the prompt or secure host configuration, not shell arguments. If PostgreSQL is unavailable, omit `DATABASE_URL` to use the explicitly labeled ephemeral demo. It cannot guarantee cross-instance memory or uploaded-data persistence.

## Database and identity

SQLAlchemy initializes five compact demo tables: `datasets`, `episodic_memories`, `reflection_records`, `system_settings`, `tool_executions`. UUIDs, owner/category indexes and a reflection foreign key are included. Domain records reside partly in JSON payloads. Full proposed enterprise normalization, pgvector and production versioned migrations are not supplied.

Signed anonymous sessions scope records to browser cookies. The same signing secret must be used across all instances. This is not SSO/RBAC. Add identity-provider authentication, role controls, centralized rate limiting, operational monitoring and backup/recovery procedures before using private production data. Rate limiting currently applies per process.

## Separate Python hosting

A Docker-compatible service such as Render or Railway can host the backend. Build using repository root as context and `backend/Dockerfile`. Set `DATABASE_URL`, `SESSION_SECRET`, and `ALLOWED_ORIGINS` to your frontend origin. Adapt the host startup command to its assigned port if required:

```sh
uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

For this topology, replace Vercel's bundled function rewrite with an external `/api/:path*` rewrite to `https://YOUR-BACKEND/api/:path*`, or set an appropriate `BACKEND_URL` when building Next.js and remove the conflicting bundled-function rewrite. The checked-in default uses the Vercel Python function.

## Verification

Confirm health, all analytics categories, task execution, memory retrieval, reflection, feedback, uploads, cleaned download, and PDF/CSV exports. Verify another browser session cannot open another owner's episode. Check date filters, navigation, theme, empty/error states and mobile layout in a browser. Inspect server logs if any call fails.

Local execution requires no paid service. Configured external-provider quotas and billing apply separately. Vercel default SQLite is temporary; PostgreSQL provisioning is an explicit additional step.

## Current deployment

Application: https://self-evolving-retail-ai.vercel.app

Source repository: https://github.com/siripireddyindirareddy91/self-evolving-retail-ai

Deployment was performed directly with the authenticated Vercel CLI. Automatic GitHub-to-Vercel deployment is not connected because the available Vercel GitHub integration lacks the required repository administration/write access. Until an authorized repository integration is connected, push code using Git and redeploy using `vercel --prod`.
