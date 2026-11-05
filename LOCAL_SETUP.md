# Local setup

## Native development

Requirements: Node.js 20.9+ and Python 3.12 recommended. From the repository root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
npm ci
$env:SESSION_SECRET = python -c "import secrets; print(secrets.token_hex(32))"
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Keep that terminal open. In another terminal run `npm run dev`. Open http://localhost:3000 and keep the hostname consistent. Cookies provide the anonymous demo identity. Clearing cookies changes that owner and hides its records. Keep `SESSION_SECRET` stable across restarts to preserve browser-session access.

macOS/Linux: use `python3 -m venv .venv`, `source .venv/bin/activate`, and `export SESSION_SECRET=...`.

For a local production frontend build, set `BACKEND_URL=http://127.0.0.1:8000` before `npm run build`, then `npm start`. The backend must remain running. Proxy destinations are evaluated at build time.

## Docker

```powershell
docker compose up --build
```

The frontend is at http://localhost:3000 and backend at http://localhost:8000. SQLite persists in the `retailmind-data` volume. Stop with `docker compose down`; retain that volume to retain data. Do not use `down -v` unless you intend to remove demo data.

## Optional PostgreSQL

Set `DATABASE_URL` before starting the backend:

```powershell
$env:DATABASE_URL = 'postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres?sslmode=require'
```

The database user needs schema creation permission for automatic demo initialization. Existing SQLite records are not automatically moved to PostgreSQL. Production requires a controlled schema migration and backup process.

## CSV schema

Required canonical columns: `order_id`, `order_date`, `customer_id`, `product_id`, `product_name`, `category`, `quantity`, `unit_price`, `region`. Map your headers in Data Management. Dates must parse, quantities must be positive, and unit prices nonnegative. Optional fields: `discount`, `revenue`, `cost`, `profit`, `inventory_stock`, `reorder_level`.

Discount is a fraction from 0 to 1. Cost is the line's **total cost**, not unit cost. Missing revenue is quantity × unit price × (1 − discount); profit is recalculated as revenue minus total cost. Missing cost defaults to zero with a warning. Stock is a latest-recorded snapshot, not an inventory movement ledger. Upload limit: 5 MB and 20,000 rows. Complete analysis requires sales-shaped data; separate sample customer/product files are reference data rather than independently joined imports.

## Troubleshooting

- If pages load but API calls fail, start Uvicorn on port 8000. Configure `BACKEND_URL` before starting/building Next.js for another address.
- If port 3000 is occupied, use `npm run dev -- --port 3001`; update `ALLOWED_ORIGINS` if directly accessing the backend.
- Hosted records disappearing: inspect `/api/health`; Vercel temporary SQLite is not durable storage.
- Optional model unavailable: calculations still run and the episode records rule-based fallback.
- Detailed API examples and validation schemas are available at `/api/docs`.
