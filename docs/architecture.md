# Architecture and implementation scope

## Execution lifecycle

User query → supervisor classification → TF-IDF episodic retrieval → category/reliability tool ranking → conditional single or multiple specialist execution → validation/reflection → computed summary or optional model summary → episode and tool-statistics persistence.

LangGraph carries typed state and conditional routing. A thread pool executes independent specialties; failed tools retry once. Execution traces contain concise summaries and evidence, not hidden chain-of-thought. Confidence describes execution completeness, not prediction correctness.

## Agent roles

| Role | Function |
| --- | --- |
| Supervisor | Classify, route and combine evidence |
| Sales | Revenue/profit, product/category/region comparisons |
| Customers | K-Means on recency, frequency, monetary value |
| Inventory | Latest snapshot, coverage, reorder target |
| Forecasting | Trend plus weekly regression; chronological holdout |
| Anomaly detection | Isolation Forest on daily business patterns |
| Memory | Owner-scoped TF-IDF cosine similarity |
| Reflection | Execution evaluation, limitations, improvements |
| Adaptive tools | Relevance/reliability ranking and statistics |
| Reports | Evidence summaries and PDF/CSV exports |

The registry contains ten executable analytical and supporting tools, including SQL/Pandas alternatives, regression/seasonal forecasting alternatives, retrieval, visualization-series construction and summary generation. Auxiliary roles coordinate those tools rather than pretending ten external services exist. SQLAlchemy parameterizes database operations; arbitrary user-generated SQL is not executed.

## Controlled adaptation

Tool scores combine category relevance (0.80 for preferred tools, 0.78 for alternatives) and 0.20 times observed reliability, with a neutral prior for untried tools. Actual tool outcomes update reliability statistics. Configuration changes retain versions and can be reversed. Retrieved episodes supply related prior context; no model retraining or autonomous weight changes occur. Recommendation quality and tool-selection accuracy remain unmeasured unless appropriate evaluation evidence exists.

## Data semantics

Sample records are synthetic and deterministic (seed 42). Retention means observed repeat purchase proportion, not cohort survival. Customer value is observed spend, not discounted future value. Churn risk is a recency heuristic. Forecast intervals use residual dispersion and are approximate. Inventory uses latest stock and a 30-day demand target without supplier lead-time optimization. Statistical anomalies require business review and do not establish causality or fraud.

## Honest requirement status

| Area | Delivered | Further production work |
| --- | --- | --- |
| Workspace | Fifteen routes, computed charts/tables, filters, responsive design | Extended accessibility and device audits |
| Orchestration | LangGraph state/routing, parallel tools, retries, trace | Distributed durable jobs, cancellation, global deadlines |
| Memory | Persisted episodes, TF-IDF retrieval, feedback | External embeddings, pgvector, large-scale indexing |
| Reflection | Structured limitations, execution scores, logged reversible settings | Outcome-labeled recommendation evaluation at scale |
| Models | K-Means, regression, Isolation Forest | Labeled churn training and calibrated prediction intervals |
| Uploads | Mapping, type validation, duplicate cleaning, exports | Independently joined domain tables and large-file ETL |
| Storage | Five indexed relational tables, JSON payloads, SQLite/PostgreSQL adapter | Full enterprise schema, migration lifecycle, backup operations |
| Identity | Signed owner-scoped anonymous cookies | SSO, RBAC and centralized quotas/rate limits |
| Reports | Generated evidence summaries, data charts, PDF/CSV | Advanced report layouts and scheduled delivery |
| Hosting | Vercel Next.js/Python function, Docker | Durable cloud DB provisioning and operational monitoring |

SQLite persists locally but Vercel `/tmp` is temporary and instance-local. Configure PostgreSQL for durable cloud memory. Clearing cookies or changing the signing secret changes anonymous ownership. The app is a functional demonstration, not a fully hardened enterprise deployment.
