"use client";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Blocks,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  Command,
  Database,
  FileText,
  History,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  MessageSquare,
  Package,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Users,
  Workflow,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { motion } from "framer-motion";
import Papa from "papaparse";
import { useForm } from "react-hook-form";
import { z } from "zod";

type Obj = Record<string, any>;
const NAV = [
  ["dashboard", "Overview", LayoutDashboard],
  ["command-center", "AI Command Center", Command],
  ["agents", "Multi-Agent Workspace", Workflow],
  ["analytics", "Retail Analytics", BarChart3],
  ["sales", "Sales Intelligence", TrendingUp],
  ["customers", "Customer Intelligence", Users],
  ["inventory", "Inventory Intelligence", Package],
  ["forecasting", "Demand Forecasting", Target],
  ["memory", "Episodic Memory", BrainCircuit],
  ["reflection", "Reflection Center", History],
  ["tools", "Adaptive Tool Selection", Wrench],
  ["performance", "Agent Performance", Activity],
  ["datasets", "Data Management", Database],
  ["reports", "Reports & Insights", FileText],
  ["settings", "Settings", Settings],
] as const;
const COLORS = [
  "#7771f9",
  "#42c5ba",
  "#61a5fb",
  "#f3b56b",
  "#bd8dee",
  "#ee819c",
];
const money = (v: any) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
const num = (v: any) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
    Number(v) || 0,
  );
const pct = (v: any) => (v == null ? "—" : `${num(v)}%`);
async function api(path: string, options?: RequestInit) {
  const r = await fetch("/api/" + path, {
    signal: AbortSignal.timeout(65000),
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });
  if (!r.ok) {
    let message = `Request failed (${r.status})`;
    try {
      const b = await r.json();
      message =
        typeof b.detail === "string" ? b.detail : JSON.stringify(b.detail || b);
    } catch {}
    throw Error(message);
  }
  return r.json();
}
function Card({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={"card " + className}>
      {title && (
        <div className="card-heading">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
function Tag({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"tag " + tone}>{children}</span>;
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <BrainCircuit size={28} />
      <p>{children}</p>
    </div>
  );
}
function Table({
  rows,
  columns,
  onRow,
}: {
  rows: Obj[];
  columns: {
    key: string;
    label: string;
    format?: (v: any, row: Obj) => ReactNode;
  }[];
  onRow?: (row: Obj) => void;
}) {
  const [page, setPage] = useState(0);
  const [term, setTerm] = useState("");
  const size = 12;
  const filtered = (rows || []).filter(
    (r) =>
      !term ||
      Object.values(r).some((v) =>
        String(v).toLowerCase().includes(term.toLowerCase()),
      ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages - 1);
  return (
    <div>
      {(rows?.length || 0) > size && (
        <div className="table-search">
          <Search size={13} />
          <input
            aria-label="Filter table rows"
            placeholder="Filter records…"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setPage(0);
            }}
          />
          <span>{filtered.length} records</span>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered
              .slice(current * size, (current + 1) * size)
              .map((r, i) => (
                <tr
                  key={r.id || i}
                  onClick={() => onRow?.(r)}
                  className={onRow ? "clickable" : ""}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      title={
                        typeof r[c.key] !== "object"
                          ? String(r[c.key] ?? "")
                          : undefined
                      }
                    >
                      {c.format
                        ? c.format(r[c.key], r)
                        : r[c.key] == null
                          ? "—"
                          : typeof r[c.key] === "object"
                            ? JSON.stringify(r[c.key])
                            : typeof r[c.key] === "number"
                              ? num(r[c.key])
                              : String(r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
        {!filtered.length && (
          <Empty>
            {term
              ? "No matching records."
              : "No records yet. Run an analysis to get started."}
          </Empty>
        )}
      </div>
      {pages > 1 && (
        <div className="pagination">
          <span>
            Page {current + 1} of {pages}
          </span>
          <button
            className="button secondary"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </button>
          <button
            className="button secondary"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function Chart({
  data,
  type = "area",
  x = "date",
  keys = ["revenue"],
  height = 265,
}: {
  data: Obj[];
  type?: string;
  x?: string;
  keys?: string[];
  height?: number;
}) {
  if (x === "date" && data?.[0]?.order_date)
    data = data.map((r) => ({ ...r, date: r.order_date }));
  const tooltip = {
    contentStyle: {
      background: "#182238",
      border: "1px solid #344058",
      borderRadius: 10,
      color: "#fff",
    },
    labelStyle: { color: "#c8d2e5" },
  };
  return (
    <div style={{ height, width: "100%", minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === "pie" ? (
          <PieChart>
            <Pie
              data={data}
              dataKey={keys[0]}
              nameKey={x}
              innerRadius={70}
              outerRadius={95}
              paddingAngle={4}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltip} />
            <Legend iconType="circle" />
          </PieChart>
        ) : type === "bar" ? (
          <BarChart
            data={data}
            margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 5"
              vertical={false}
              stroke="#273147"
            />
            <XAxis
              dataKey={x}
              tick={{ fill: "#8290a8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8290a8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
            />
            <Tooltip {...tooltip} />
            {keys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                fill={COLORS[i % COLORS.length]}
                radius={[5, 5, 0, 0]}
                maxBarSize={36}
              />
            ))}
          </BarChart>
        ) : (
          <AreaChart
            data={data}
            margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
          >
            <defs>
              {keys.map((k, i) => (
                <linearGradient
                  key={k}
                  id={"fill-" + k}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={COLORS[i]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 5"
              vertical={false}
              stroke="#273147"
            />
            <XAxis
              dataKey={x}
              tick={{ fill: "#8290a8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              tick={{ fill: "#8290a8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
              }
            />
            <Tooltip {...tooltip} />
            {keys.map((k, i) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2.5}
                fill={"url(#fill-" + k + ")"}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
function JsonDetails({ data }: { data: any }) {
  if (data == null) return <span className="muted">Not measured</span>;
  if (Array.isArray(data)) {
    if (data.length && typeof data[0] === "object") {
      const keys = Object.keys(data[0])
        .filter((k) => typeof data[0][k] !== "object")
        .slice(0, 18);
      return (
        <Table
          rows={data}
          columns={keys.map((k) => ({
            key: k,
            label: k.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "),
          }))}
        />
      );
    }
    return (
      <ul className="findings">
        {data.map((s, i) => (
          <li key={i}>{String(s)}</li>
        ))}
      </ul>
    );
  }
  if (typeof data === "object")
    return (
      <div className="detail-grid">
        {Object.entries(data).map(([k, v]) => (
          <div className="detail-field" key={k}>
            <h4>
              {k.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ")}
            </h4>
            {typeof v === "object" ? (
              <JsonDetails data={v} />
            ) : (
              <p>{String(v ?? "—")}</p>
            )}
          </div>
        ))}
      </div>
    );
  return <p>{String(data)}</p>;
}

export default function RetailApp() {
  const pathname = usePathname();
  const page = pathname.split("/")[1] || "dashboard";
  const current = NAV.find((n) => n[0] === page);
  const [overview, setOverview] = useState<Obj | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState(false);
  const [light, setLight] = useState(false);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [dataset, setDataset] = useState("");
  const [datasets, setDatasets] = useState<Obj[]>([]);
  const [modal, setModal] = useState<Obj | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Obj | null>(null);
  const [memorySearch, setMemorySearch] = useState("");
  const [notifications, setNotifications] = useState(false);
  const { register, handleSubmit, setValue } = useForm<{ query: string }>();
  const notify = useCallback((s: string) => {
    setNotice(s);
    setTimeout(() => setNotice(""), 4500);
  }, []);
  const filter = `?period=${range}&dataset_id=${dataset || "sample"}`;
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [o, ds] = await Promise.all([
        api("dashboard/overview" + filter),
        api("datasets"),
      ]);
      setOverview(o);
      setDatasets(Array.isArray(ds) ? ds : ds.datasets || []);
      const endpoints: Record<string, string> = {
        analytics: "analytics/anomalies",
        sales: "analytics/sales",
        customers: "analytics/customers",
        inventory: "analytics/inventory",
        forecasting: "analytics/forecast",
        agents: "agents/status",
        memory: "memory/episodes",
        reflection: "reflection/history",
        tools: "tools/performance",
        performance: "agents/executions",
        reports: "reports",
        settings: "settings",
      };
      setData(endpoints[page] ? await api(endpoints[page] + filter) : null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    setMenu(false);
    setResult(null);
  }, [page]);
  useEffect(() => {
    const saved = localStorage.getItem("retailmind-theme");
    setLight(saved === "light");
  }, []);
  async function run(query: string) {
    const parsed = z
      .string()
      .trim()
      .min(5, "Please enter at least 5 characters.")
      .max(2000)
      .safeParse(query);
    if (!parsed.success) {
      notify(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api("agents/query", {
        method: "POST",
        body: JSON.stringify({
          query: parsed.data,
          datasetId: dataset || "sample",
          period: range,
        }),
      });
      setResult(r);
      notify("Analysis completed. Reflection and memory saved.");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("workspace-search")?.focus();
      }
      if (e.key === "Escape") {
        setSearch("");
        setModal(null);
        setNotifications(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const k = overview?.kpis || {};
  const rows: Obj[] = Array.isArray(data) ? data : data?.tools || [];
  const metric = (label: string, value: any, icon: ReactNode, sub: string) => (
    <div className="metric" key={label}>
      <div className="metric-top">
        <span>{label}</span>
        <div className="metric-icon">{icon}</div>
      </div>
      <strong>{value}</strong>
      <div className="metric-sub">{sub}</div>
    </div>
  );
  const renderEpisode = (e: Obj) => (
    <div className="episode-content">
      <div className="row spread">
        <Tag tone="purple">{e.category || e.task_category || "Analysis"}</Tag>
        <Tag>{e.status || "completed"}</Tag>
      </div>
      <h3>{e.query || e.user_task || e.task}</h3>
      {e.summary && (
        <div className="info-note wide">
          <Sparkles size={18} />
          <p>{e.summary}</p>
        </div>
      )}
      <JsonDetails data={e.result || e.results || e.results_summary} />
      {e.recommendations && (
        <>
          <h4>Recommended next steps</h4>
          <JsonDetails data={e.recommendations} />
        </>
      )}
      {e.memoryReferences?.length > 0 && (
        <>
          <h4>Retrieved experiences</h4>
          <JsonDetails data={e.memoryReferences} />
        </>
      )}
      {e.trace && (
        <>
          <h4>Execution trace</h4>
          <div className="timeline">
            {e.trace.map((t: any, i: number) => (
              <div key={i}>
                <span className="step">{i + 1}</span>
                <div>
                  {typeof t === "string" ? (
                    t
                  ) : (
                    <>
                      <b>{t.step || t.node || t.agent || t.stage}</b>
                      <p>
                        {t.summary ||
                          t.detail ||
                          t.message ||
                          JSON.stringify(t)}
                      </p>
                    </>
                  )}
                </div>
                <Check size={15} />
              </div>
            ))}
          </div>
        </>
      )}
      {e.tools && (
        <>
          <h4>Selected tools</h4>
          <div className="chips">
            {e.tools.map((t: any, i: number) => (
              <Tag key={i} tone="purple">
                {typeof t === "string" ? t : t.name || t.id}
              </Tag>
            ))}
          </div>
        </>
      )}
      {e.reflection && (
        <>
          <h4>Reflection</h4>
          <JsonDetails data={e.reflection} />
        </>
      )}
      <div className="row">
        <a
          className="button secondary"
          href={`/api/reports/${e.id}/download?format=pdf`}
        >
          <ArrowDownToLine size={14} /> PDF
        </a>
        <a
          className="button secondary"
          href={`/api/reports/${e.id}/download?format=csv`}
        >
          CSV
        </a>
      </div>
      <div className="row">
        <span className="muted">Was this analysis useful?</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            className="score"
            key={n}
            onClick={async () => {
              try {
                await api(`memory/episodes/${e.id}/feedback`, {
                  method: "POST",
                  body: JSON.stringify({ score: n }),
                });
                notify("Feedback recorded");
              } catch (err) {
                notify((err as Error).message);
              }
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className={"app " + (light ? "light" : "")}>
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <Link href="/dashboard" className="brand">
          <div className="brand-mark">
            <BrainCircuit size={26} />
          </div>
          <span>
            RETAILMIND <b>AI</b>
            <small>RETAIL INTELLIGENCE, EVOLVED</small>
          </span>
        </Link>
        <div className="workspace-label">
          WORKSPACE <span>DEMO</span>
        </div>
        <nav>
          {NAV.map(([id, label, Icon], i) => (
            <div key={id}>
              {i === 8 && (
                <div className="nav-divider">INTELLIGENCE ENGINE</div>
              )}
              {i === 12 && <div className="nav-divider">MANAGEMENT</div>}
              <Link href={"/" + id} className={page === id ? "active" : ""}>
                <Icon size={17} />
                <span>{label}</span>
                {id === "command-center" && <span className="new">AI</span>}
                {page === id && <span className="active-dot" />}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="engine-label">
            <span className="live-dot" /> Intelligence engine{" "}
            <span>Online</span>
          </div>
          <div className="engine-progress">
            <i />
          </div>
          <p>Rule-based demo · No API key required</p>
        </div>
        <button
          className="profile"
          onClick={() => {
            location.href = "/settings";
          }}
        >
          <span className="avatar">RA</span>
          <span>
            Retail Analyst<small>Demo workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>
      </aside>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-toggle"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <span>{current?.[1] || "Page not found"}</span>
          </div>
          <div className="top-actions">
            <div className="global-search">
              <Search size={15} />
              <input
                id="workspace-search"
                aria-label="Search workspace"
                placeholder="Search workspace..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>⌘ K</kbd>
              {search && (
                <div className="search-results">
                  {NAV.filter((n) =>
                    n[1].toLowerCase().includes(search.toLowerCase()),
                  ).map((n) => (
                    <Link
                      key={n[0]}
                      href={"/" + n[0]}
                      onClick={() => setSearch("")}
                    >
                      {n[1]}
                      <ArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <span className="system-status">
              <span className="live-dot" /> System operational
            </span>
            <button
              className="icon-button"
              aria-label="Toggle theme"
              onClick={() => {
                setLight(!light);
                localStorage.setItem(
                  "retailmind-theme",
                  !light ? "light" : "dark",
                );
              }}
            >
              <Sun size={18} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => setNotifications(!notifications)}
            >
              <Bell size={18} />
              <i />
            </button>
            <span className="avatar small">RA</span>
          </div>
          {notifications && (
            <div className="notification-panel">
              <h3>Intelligence updates</h3>
              {overview?.insights?.map((s: string, i: number) => (
                <p key={i}>
                  <Sparkles size={15} />
                  {s}
                </p>
              ))}
              {!overview?.insights?.length && (
                <p>Connect a dataset to see updates.</p>
              )}
            </div>
          )}
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> RETAILMIND INTELLIGENCE PLATFORM
              </div>
              <h1>
                {current?.[1] || "Page not found"}
                {page === "dashboard" && (
                  <span className="heading-tag">Live overview</span>
                )}
              </h1>
              <p>
                {
                  (
                    {
                      dashboard:
                        "Your business at a glance. Insights that turn data into decisions.",
                      "command-center":
                        "Ask a question. Let specialized agents do the analysis.",
                      agents:
                        "A coordinated team of specialized retail intelligence agents.",
                      analytics:
                        "Explore the signals behind your retail performance.",
                      sales:
                        "Understand what sells, where it sells, and what drives growth.",
                      customers:
                        "Know your customers. Build relationships that last.",
                      inventory:
                        "The right stock, in the right place, at the right time.",
                      forecasting:
                        "Plan ahead with transparent, evaluated demand forecasts.",
                      memory:
                        "Every analysis is an experience your agents can learn from.",
                      reflection:
                        "Inspect outcomes, understand limitations, improve the next decision.",
                      tools:
                        "Explainable tool selection, informed by execution history.",
                      performance:
                        "Real execution metrics for your intelligence engine.",
                      datasets:
                        "Bring your retail data into one intelligent workspace.",
                      reports:
                        "From analytical evidence to actionable business reports.",
                      settings:
                        "Configure your workspace and intelligence preferences.",
                    } as Record<string, string>
                  )[page]
                }
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary"
                onClick={() => refresh()}
                disabled={loading}
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} />{" "}
                Refresh
              </button>
              <Link className="button primary" href="/command-center">
                <Sparkles size={16} /> Run analysis
              </Link>
            </div>
          </div>
          <div className="filterbar">
            <div className="row">
              <span className="filter-label">DATA VIEW</span>
              <select
                aria-label="Date period"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option value="all">All available dates</option>
                <option value="30d">Last 30 days of data</option>
                <option value="90d">Last 90 days of data</option>
                <option value="180d">Last 180 days of data</option>
              </select>
              <select
                aria-label="Active dataset"
                value={dataset}
                onChange={(e) => setDataset(e.target.value)}
              >
                <option value="">Sample retail dataset</option>
                {datasets
                  .filter((d) => !d.demo)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
            <span className="demo-label">
              <ShieldCheck size={13} /> Transparent demo mode{" "}
              <span
                className="help-title"
                title="Analytics are calculated from data. Agents use deterministic routing unless an LLM is configured."
              >
                ⓘ
              </span>
            </span>
          </div>
          {error && (
            <div className="error-banner">
              <b>Unable to complete request.</b> {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {loading && !overview ? (
            <div className="loading">
              <LoaderCircle className="spin" />
              <p>Preparing your intelligence workspace…</p>
            </div>
          ) : (
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {page === "dashboard" && overview && (
                <>
                  <div className="metrics-grid">
                    {metric(
                      "Total revenue",
                      money(k.revenue),
                      <TrendingUp size={17} />,
                      `${num(k.growth)}% change vs. previous period`,
                    )}
                    {metric(
                      "Total orders",
                      num(k.orders),
                      <Package size={17} />,
                      "Transactions in selected dataset",
                    )}
                    {metric(
                      "Total customers",
                      num(k.customers),
                      <Users size={17} />,
                      `${num(k.retention)}% repeat customer rate`,
                    )}
                    {metric(
                      "Average order value",
                      money(k.aov),
                      <BarChart3 size={17} />,
                      "Revenue per distinct order",
                    )}
                  </div>
                  <div className="dashboard-grid">
                    <Card
                      title="Revenue overview"
                      subtitle="Revenue and profit across your selected period"
                      action={<Tag tone="purple">Revenue · Profit</Tag>}
                    >
                      <Chart
                        data={overview.revenueTrend || []}
                        keys={["revenue", "profit"]}
                      />
                      <div className="chart-footer">
                        <span>
                          <i style={{ background: COLORS[0] }} /> Total revenue{" "}
                          <b>{money(k.revenue)}</b>
                        </span>
                        <span>
                          <i style={{ background: COLORS[1] }} /> Total profit{" "}
                          <b>{money(k.profit)}</b>
                        </span>
                      </div>
                    </Card>
                    <Card
                      title="Revenue by category"
                      subtitle="Where your business earns"
                      action={<BarChart3 size={17} />}
                    >
                      <Chart
                        data={overview.categories || []}
                        type="pie"
                        x="name"
                        keys={["revenue"]}
                      />
                    </Card>
                  </div>
                  <div className="insights-banner">
                    <div className="insight-icon">
                      <Sparkles size={23} />
                    </div>
                    <div>
                      <div className="row">
                        <h3>Your intelligence briefing</h3>
                        <Tag tone="purple">Data-driven insights</Tag>
                      </div>
                      <p>
                        {overview.insights?.[0] ||
                          "Run an analysis to uncover business opportunities."}
                      </p>
                    </div>
                    <Link href="/command-center">
                      Explore insights <ArrowRight size={16} />
                    </Link>
                  </div>
                  <div className="dashboard-grid">
                    <Card
                      title="Top-performing products"
                      subtitle="Ranked by revenue"
                      action={
                        <Link className="text-link" href="/sales">
                          View sales <ArrowUpRight size={14} />
                        </Link>
                      }
                    >
                      <Table
                        rows={(overview.products || []).slice(0, 5)}
                        columns={[
                          {
                            key: "name",
                            label: "Product",
                            format: (v, r) => (
                              <div className="product-name">
                                <span className="product-icon">
                                  <Package size={15} />
                                </span>
                                {v || r.product_name}
                              </div>
                            ),
                          },
                          { key: "quantity", label: "Units", format: num },
                          { key: "revenue", label: "Revenue", format: money },
                          { key: "profit", label: "Profit", format: money },
                        ]}
                      />
                    </Card>
                    <Card
                      title="Intelligence activity"
                      subtitle="Recent episodes from your agent team"
                      action={<span className="live-dot" />}
                    >
                      {overview.recentEpisodes?.length ? (
                        <div className="activity-list">
                          {overview.recentEpisodes.slice(0, 4).map((e: Obj) => (
                            <button key={e.id} onClick={() => setModal(e)}>
                              <span className="activity-icon">
                                <BrainCircuit size={17} />
                              </span>
                              <span>
                                <b>{e.query || e.task || e.user_task}</b>
                                <small>
                                  {e.category || e.task_category} · {e.status}
                                </small>
                              </span>
                              <ChevronRight size={15} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Empty>
                          Your first analysis starts the learning loop.
                          <Link href="/command-center">
                            Ask your agents <ArrowRight size={14} />
                          </Link>
                        </Empty>
                      )}
                      <div className="mini-stats">
                        <div>
                          <b>{num(overview.recentEpisodes?.length)}</b>
                          <span>Recent episodes</span>
                        </div>
                        <div>
                          <b>10</b>
                          <span>Specialized roles</span>
                        </div>
                        <div>
                          <b>Rules</b>
                          <span>Demo execution</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                  <div className="metrics-grid secondary-metrics">
                    {metric(
                      "Products",
                      num(k.products),
                      <Package size={17} />,
                      "Distinct products",
                    )}
                    {metric(
                      "Inventory value",
                      money(k.inventoryValue),
                      <Database size={17} />,
                      "Stock at cost",
                    )}
                    {metric(
                      "Sales growth",
                      pct(k.growth),
                      <TrendingUp size={17} />,
                      "Compared with previous period",
                    )}
                    {metric(
                      "Customer retention",
                      pct(k.retention),
                      <Users size={17} />,
                      "Customers with repeat orders",
                    )}
                  </div>
                </>
              )}
              {page === "command-center" && (
                <>
                  <div className="command-layout">
                    <Card className="command-card">
                      <div className="command-hero">
                        <div className="hero-orb">
                          <BrainCircuit size={36} />
                        </div>
                        <Tag tone="purple">YOUR RETAIL INTELLIGENCE TEAM</Tag>
                        <h2>
                          Better questions.
                          <br />
                          <span>Smarter retail decisions.</span>
                        </h2>
                        <p>
                          Sales, customers, inventory, and forecasting.
                          <br />
                          One question brings the right agents together.
                        </p>
                      </div>
                      <form
                        onSubmit={handleSubmit((v) => run(v.query))}
                        className="command-form"
                      >
                        <textarea
                          {...register("query")}
                          aria-label="Ask your retail agents"
                          placeholder="What would you like to understand about your business?"
                          maxLength={2000}
                        />
                        <div>
                          <span>
                            <ShieldCheck size={13} /> Rule-based analytics ·
                            Explainable execution
                          </span>
                          <button
                            type="submit"
                            className="button primary"
                            disabled={busy}
                          >
                            {busy ? (
                              <LoaderCircle size={16} className="spin" />
                            ) : (
                              <Send size={16} />
                            )}{" "}
                            {busy ? "Analyzing…" : "Ask agents"}
                          </button>
                        </div>
                      </form>
                      <div className="suggestions">
                        {[
                          "Analyze sales performance for the last three months",
                          "Which products may run out of stock?",
                          "Predict next month’s sales",
                          "Find customers at risk of churn",
                          "Compare sales across regions",
                          "Generate an executive retail performance report",
                        ].map((q, i) => (
                          <button
                            disabled={busy}
                            key={q}
                            onClick={() => {
                              setValue("query", q);
                              run(q);
                            }}
                          >
                            <span>
                              {
                                [
                                  <TrendingUp key="s" size={16} />,
                                  <Package key="i" size={16} />,
                                  <Target key="f" size={16} />,
                                  <Users key="c" size={16} />,
                                  <BarChart3 key="r" size={16} />,
                                  <FileText key="e" size={16} />,
                                ][i]
                              }
                            </span>
                            {q}
                            <ArrowUpRight size={14} />
                          </button>
                        ))}
                      </div>
                    </Card>
                    <Card
                      title="How intelligence works"
                      subtitle="A transparent learning loop"
                    >
                      <div className="workflow-steps">
                        {[
                          [
                            "Understand",
                            "Classify your question and coordinate agents",
                          ],
                          ["Remember", "Retrieve relevant past experiences"],
                          ["Select", "Rank tools by relevance and reliability"],
                          [
                            "Analyze",
                            "Execute calculations on your retail data",
                          ],
                          [
                            "Reflect",
                            "Validate results and identify limitations",
                          ],
                          [
                            "Learn",
                            "Store the episode and update tool statistics",
                          ],
                        ].map(([t, d], i) => (
                          <div key={t}>
                            <span>{i + 1}</span>
                            <div>
                              <h4>{t}</h4>
                              <p>{d}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="info-note">
                        <ShieldCheck size={17} />
                        <p>
                          Controlled adaptation through memory and performance
                          statistics. No model retraining is claimed.
                        </p>
                      </div>
                    </Card>
                  </div>
                  {busy && (
                    <Card>
                      <div className="row">
                        <LoaderCircle className="spin" /> Agents are executing
                        your request. Results and measured trace will appear
                        when completed.
                      </div>
                    </Card>
                  )}
                  {result && (
                    <Card
                      title="Analysis result"
                      subtitle="Evidence, execution trace, and reflection"
                    >
                      {renderEpisode(result)}
                    </Card>
                  )}
                </>
              )}
              {page === "agents" && (
                <>
                  <div className="section-intro">
                    <Workflow size={22} />
                    <div>
                      <h3>Specialists working as one</h3>
                      <p>
                        Task-dependent routing activates the agents your
                        question needs.
                      </p>
                    </div>
                    <Link href="/command-center" className="button primary">
                      <Play size={14} /> Start a workflow
                    </Link>
                  </div>
                  <div className="agents-grid">
                    {rows.map((a: Obj, i: number) => (
                      <Card key={a.id || i}>
                        <div className="row spread">
                          <span className="agent-icon">
                            {i % 3 === 0 ? (
                              <BrainCircuit />
                            ) : i % 3 === 1 ? (
                              <TrendingUp />
                            ) : (
                              <Workflow />
                            )}
                          </span>
                          <Tag
                            tone={a.status === "running" ? "purple" : "green"}
                          >
                            {a.status || "idle"}
                          </Tag>
                        </div>
                        <h3 className="agent-name">{a.name}</h3>
                        <p className="agent-description">
                          {a.description || a.role}
                        </p>
                        <div className="agent-numbers">
                          <div>
                            <b>{num(a.executions || a.execution_count)}</b>
                            <span>Executions</span>
                          </div>
                          <div>
                            <b>{pct(a.successRate)}</b>
                            <span>Success rate</span>
                          </div>
                        </div>
                        <p className="agent-last">
                          Last execution:{" "}
                          {a.lastExecution
                            ? new Date(a.lastExecution).toLocaleString()
                            : "Not yet executed"}
                        </p>
                      </Card>
                    ))}
                  </div>
                </>
              )}
              {page === "sales" && data && (
                <>
                  <div className="metrics-grid">
                    {metric(
                      "Revenue",
                      money(data.revenue ?? k.revenue),
                      <TrendingUp size={17} />,
                      "Selected data period",
                    )}
                    {metric(
                      "Gross profit",
                      money(data.profit ?? k.profit),
                      <BarChart3 size={17} />,
                      "Revenue less product cost",
                    )}
                    {metric(
                      "Orders",
                      num(data.orders ?? k.orders),
                      <Package size={17} />,
                      "Distinct transactions",
                    )}
                    {metric(
                      "Growth",
                      pct(data.growth ?? k.growth),
                      <TrendingUp size={17} />,
                      "Previous period comparison",
                    )}
                  </div>
                  <div className="dashboard-grid">
                    <Card
                      title="Sales trend"
                      subtitle="Revenue and profit over time"
                    >
                      <Chart
                        data={
                          data.revenueTrend ||
                          data.trend ||
                          overview?.revenueTrend ||
                          []
                        }
                        keys={["revenue", "profit"]}
                      />
                    </Card>
                    <Card title="Regional performance">
                      <Chart
                        data={data.regions || overview?.regions || []}
                        type="bar"
                        x="name"
                        keys={["revenue"]}
                      />
                    </Card>
                  </div>
                  <Card title="Product performance">
                    <Table
                      rows={data.products || overview?.products || []}
                      columns={[
                        { key: "name", label: "Product" },
                        { key: "quantity", label: "Units", format: num },
                        { key: "revenue", label: "Revenue", format: money },
                        { key: "profit", label: "Profit", format: money },
                      ]}
                    />
                  </Card>
                  <div className="dashboard-grid">
                    <Card title="Monthly sales">
                      <Chart
                        data={
                          data.monthly ||
                          data.revenueTrend ||
                          overview?.revenueTrend ||
                          []
                        }
                        type="bar"
                        x={data.monthly ? "month" : "date"}
                        keys={["revenue"]}
                      />
                    </Card>
                    <Card title="Category performance">
                      <Chart
                        data={data.categories || overview?.categories || []}
                        x="name"
                        type="pie"
                        keys={["revenue"]}
                      />
                    </Card>
                  </div>
                </>
              )}
              {page === "customers" && data && (
                <>
                  <div className="metrics-grid">
                    {metric(
                      "Customers",
                      num(data.total_customers ?? data.total ?? k.customers),
                      <Users size={17} />,
                      "Unique customer identities",
                    )}
                    {metric(
                      "Repeat purchase rate",
                      pct(data.retention_rate ?? data.retention ?? k.retention),
                      <History size={17} />,
                      "Customers with repeat purchases",
                    )}
                    {metric(
                      "Average lifetime value",
                      money(
                        data.averageLifetimeValue ??
                          data.average_clv ??
                          data.avg_clv,
                      ),
                      <TrendingUp size={17} />,
                      "Observed historical revenue",
                    )}
                    {metric(
                      "At-risk customers",
                      num(
                        data.atRisk ??
                          data.at_risk_count ??
                          data.at_risk?.length,
                      ),
                      <Activity size={17} />,
                      "Recency-based churn heuristic",
                    )}
                  </div>
                  <div className="dashboard-grid">
                    <Card
                      title="Customer segments"
                      subtitle="Data-based purchasing groups"
                    >
                      <Chart
                        data={data.segments || overview?.segments || []}
                        x="name"
                        keys={["value"]}
                        type="pie"
                      />
                    </Card>
                    <Card
                      title="Customer intelligence"
                      subtitle="Segmentation and churn methodology"
                    >
                      <JsonDetails
                        data={
                          data.method ||
                          data.methodology ||
                          data.summary || {
                            segmentation:
                              "K-means on recency, frequency and monetary value when enough customers are available.",
                            churn:
                              "Recency-based risk indicator; no supervised churn labels are available.",
                          }
                        }
                      />
                    </Card>
                  </div>
                  <Card
                    title="Customer profiles"
                    subtitle="Observed lifetime value and purchasing behavior"
                  >
                    <JsonDetails
                      data={data.customers || data.top_customers || data}
                    />
                  </Card>
                </>
              )}
              {page === "inventory" && data && (
                <>
                  <div className="metrics-grid">
                    {metric(
                      "Inventory value",
                      money(
                        data.inventoryValue ??
                          data.inventory_value ??
                          k.inventoryValue,
                      ),
                      <Package size={17} />,
                      "Current stock at cost",
                    )}
                    {metric(
                      "Low stock products",
                      num(
                        data.lowStock ??
                          data.low_stock_count ??
                          data.low_stock?.length,
                      ),
                      <Activity size={17} />,
                      "Below reorder threshold",
                    )}
                    {metric(
                      "Overstock products",
                      num(
                        data.overstock ??
                          data.overstock_count ??
                          data.overstock?.length,
                      ),
                      <Database size={17} />,
                      "Above estimated demand",
                    )}
                    {metric(
                      "Products monitored",
                      num(
                        data.products?.length ??
                          data.items?.length ??
                          k.products,
                      ),
                      <Target size={17} />,
                      "Replenishment coverage",
                    )}
                  </div>
                  <Card
                    title="Stock health & replenishment"
                    subtitle="Current stock, turnover, and calculated reorder recommendations"
                  >
                    <JsonDetails data={data.products || data.items || data} />
                  </Card>
                </>
              )}
              {page === "forecasting" && data && (
                <>
                  <div className="info-note wide">
                    <Target size={20} />
                    <p>
                      Forecasts are estimates, not guarantees. The model is
                      evaluated on a held-out portion of the dataset; prediction
                      intervals describe uncertainty.
                    </p>
                  </div>
                  <Card
                    title="Demand forecast"
                    subtitle="Historical revenue · Forecast · Approximate upper band"
                  >
                    <Chart
                      data={[
                        ...(data.history || []),
                        ...(data.forecast || data.predictions || []),
                      ]}
                      keys={["revenue", "forecast", "upper"]}
                      x="date"
                      height={330}
                    />
                  </Card>
                  <div className="dashboard-grid">
                    <Card title="Forecast evaluation">
                      <JsonDetails
                        data={
                          data.metrics ||
                          data.evaluation || {
                            forecastRevenue: money(data.totalForecast),
                            horizon: `${data.horizon} days`,
                            mae: money(data.mae),
                            mape: pct(data.mape),
                            trainingDays: data.trainingDays,
                            validationDays: data.validationDays,
                          }
                        }
                      />
                    </Card>
                    <Card title="Model & limitations">
                      <JsonDetails
                        data={
                          data.method ||
                          data.methodology ||
                          data.limitations ||
                          data.model ||
                          "Trend and weekly seasonality baseline with held-out evaluation."
                        }
                      />
                    </Card>
                  </div>
                  <Card
                    title="Forecast explorer"
                    subtitle="Choose a product and forecast horizon"
                  >
                    <div className="row">
                      <select
                        aria-label="Forecast product"
                        value={data.product || ""}
                        onChange={async (e) => {
                          try {
                            setData(
                              await api(
                                "analytics/forecast" +
                                  filter +
                                  "&product=" +
                                  e.target.value + "&horizon=" + (data.horizon || 30),
                              ),
                            );
                          } catch (err) {
                            notify((err as Error).message);
                          }
                        }}
                      >
                        <option value="">All products</option>
                        {overview?.products?.map((p: Obj) => (
                          <option key={p.product_id} value={p.product_id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Forecast horizon"
                        value={String(data.horizon || 30)}
                        onChange={async (e) => {
                          try {
                            setData(
                              await api(
                                "analytics/forecast" +
                                  filter +
                                  "&horizon=" +
                                  e.target.value +
                                  (data.product
                                    ? "&product=" + data.product
                                    : ""),
                              ),
                            );
                          } catch (err) {
                            notify((err as Error).message);
                          }
                        }}
                      >
                        <option value="7">Next 7 days</option>
                        <option value="30">Next 30 days</option>
                        <option value="90">Next 90 days</option>
                      </select>
                    </div>
                    <Table
                      rows={data.forecast || []}
                      columns={[
                        { key: "date", label: "Date" },
                        {
                          key: "forecast",
                          label: "Projected revenue",
                          format: money,
                        },
                        {
                          key: "lower",
                          label: "Lower estimate",
                          format: money,
                        },
                        {
                          key: "upper",
                          label: "Upper estimate",
                          format: money,
                        },
                      ]}
                    />
                  </Card>
                </>
              )}
              {page === "analytics" && data && (
                <>
                  <div className="dashboard-grid">
                    <Card title="Regional sales">
                      <Chart
                        data={overview?.regions || []}
                        type="bar"
                        x="name"
                        keys={["revenue"]}
                      />
                    </Card>
                    <Card title="Inventory distribution">
                      <Chart
                        data={Object.entries(
                          (overview?.inventory || []).reduce(
                            (a: Obj, r: Obj) => {
                              a[r.category] =
                                (a[r.category] || 0) + r.inventory_stock;
                              return a;
                            },
                            {},
                          ),
                        ).map(([name, value]) => ({ name, value }))}
                        type="pie"
                        x="name"
                        keys={["value"]}
                      />
                    </Card>
                  </div>
                  <Card
                    title="Anomaly detection"
                    subtitle="Unusual patterns identified through statistical and Isolation Forest analysis"
                  >
                    <JsonDetails data={data} />
                  </Card>
                </>
              )}
              {page === "memory" && (
                <>
                  <div className="metrics-grid">
                    {metric(
                      "Stored episodes",
                      num(rows.length),
                      <BrainCircuit size={17} />,
                      "Completed and failed experiences",
                    )}
                    {metric(
                      "Successful episodes",
                      num(rows.filter((e) => e.status === "success").length),
                      <Check size={17} />,
                      "Validated execution outcomes",
                    )}
                    {metric(
                      "Failed episodes",
                      num(rows.filter((e) => e.status === "failed").length),
                      <Activity size={17} />,
                      "Retained for reflection",
                    )}
                    {metric(
                      "Feedback received",
                      num(rows.filter((e) => e.feedback != null).length),
                      <MessageSquare size={17} />,
                      "User-rated experiences",
                    )}
                  </div>
                  <div className="section-intro">
                    <BrainCircuit size={24} />
                    <div>
                      <h3>{rows.length} stored experiences</h3>
                      <p>
                        Search previous tasks and inspect the evidence behind
                        each decision.
                      </p>
                    </div>
                    <form
                      className="inline-search"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          const r = await api("memory/search", {
                            method: "POST",
                            body: JSON.stringify({ query: memorySearch }),
                          });
                          setData(
                            Array.isArray(r)
                              ? r
                              : r.episodes || r.results || [],
                          );
                        } catch (err) {
                          notify((err as Error).message);
                        }
                      }}
                    >
                      <Search size={16} />
                      <input
                        value={memorySearch}
                        onChange={(e) => setMemorySearch(e.target.value)}
                        placeholder="Search episodes…"
                      />
                      <button className="button secondary">Search</button>
                    </form>
                  </div>
                  <Card
                    title="Episode library"
                    subtitle="Click an experience to inspect its results, tools, and reflection"
                  >
                    <Table
                      rows={rows}
                      onRow={setModal}
                      columns={[
                        {
                          key: "query",
                          label: "Task",
                          format: (v, r) => v || r.user_task || r.task,
                        },
                        {
                          key: "category",
                          label: "Category",
                          format: (v, r) => (
                            <Tag tone="purple">{v || r.task_category}</Tag>
                          ),
                        },
                        {
                          key: "status",
                          label: "Status",
                          format: (v) => <Tag>{v}</Tag>,
                        },
                        {
                          key: "confidence",
                          label: "Completeness",
                          format: (v) =>
                            pct(Number(v) <= 1 ? Number(v) * 100 : v),
                        },
                        {
                          key: "createdAt",
                          label: "Recorded",
                          format: (v) =>
                            v ? new Date(v).toLocaleString() : "—",
                        },
                        {
                          key: "similarity",
                          label: "Similarity",
                          format: (v) => (v != null ? num(v) : "—"),
                        },
                      ]}
                    />
                  </Card>
                </>
              )}
              {page === "reflection" && (
                <>
                  <div className="info-note wide">
                    <History size={22} />
                    <p>
                      Reflection checks data availability, selected tools,
                      output validity, and limitations. Adaptation is logged;
                      the underlying model is not retrained.
                    </p>
                  </div>
                  {rows.length ? (
                    rows.map((r: Obj, i: number) => (
                      <Card
                        key={r.id || i}
                        title={
                          r.objective ||
                          r.task_objective ||
                          "Execution reflection"
                        }
                        action={
                          <Tag tone="purple">
                            Score{" "}
                            {num(
                              r.score || r.overall_score || r.evaluation_score,
                            )}
                          </Tag>
                        }
                      >
                        <JsonDetails data={r} />
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <Empty>
                        Reflections appear after your first agent analysis.
                      </Empty>
                    </Card>
                  )}
                </>
              )}
              {page === "tools" && (
                <>
                  <div className="section-intro">
                    <Wrench size={23} />
                    <div>
                      <h3>Tools selected with evidence</h3>
                      <p>
                        Ranking combines task relevance and historical
                        reliability. Every execution updates the record.
                      </p>
                    </div>
                  </div>
                  <div className="agents-grid">
                    {rows.map((t: Obj, i: number) => (
                      <Card key={t.id || i}>
                        <div className="row spread">
                          <span className="agent-icon">
                            <Wrench size={21} />
                          </span>
                          <Tag>{t.status || "available"}</Tag>
                        </div>
                        <h3 className="agent-name">{t.name}</h3>
                        <p className="agent-description">{t.description}</p>
                        <div className="chips">
                          {(t.categories || t.supported_categories || []).map(
                            (s: string) => (
                              <Tag tone="purple" key={s}>
                                {s}
                              </Tag>
                            ),
                          )}
                        </div>
                        <div className="agent-numbers">
                          <div>
                            <b>{pct(t.successRate)}</b>
                            <span>Success rate</span>
                          </div>
                          <div>
                            <b>{num(t.executions || t.usage_count)}</b>
                            <span>Executions</span>
                          </div>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => setModal(t)}
                        >
                          Inspect schema & performance <ArrowRight size={14} />
                        </button>
                      </Card>
                    ))}
                  </div>
                  <div className="dashboard-grid" style={{ marginTop: 20 }}>
                    <Card
                      title="Tool usage comparison"
                      subtitle="Actual recorded executions"
                    >
                      <Chart
                        data={rows.map((t) => ({
                          name: t.id,
                          executions: t.executions || 0,
                        }))}
                        type="bar"
                        x="name"
                        keys={["executions"]}
                      />
                    </Card>
                    <Card
                      title="Tool reliability"
                      subtitle="Observed success rates; unused tools have no measured baseline"
                    >
                      <Table
                        rows={rows}
                        columns={[
                          { key: "name", label: "Tool" },
                          { key: "successRate", label: "Success", format: pct },
                          {
                            key: "averageDuration",
                            label: "Average ms",
                            format: num,
                          },
                        ]}
                      />
                    </Card>
                  </div>
                  <Card
                    title="Tool execution history"
                    subtitle="Measured durations, selection scores, and fallback outcomes"
                  >
                    <JsonDetails data={data?.history || []} />
                  </Card>
                </>
              )}
              {page === "performance" && (
                <>
                  <div className="metrics-grid">
                    {metric(
                      "Recorded executions",
                      num(rows.length),
                      <Activity size={17} />,
                      "Measured agent tasks",
                    )}
                    {metric(
                      "Successful tasks",
                      num(
                        rows.filter(
                          (r) =>
                            r.status === "success" || r.status === "completed",
                        ).length,
                      ),
                      <Check size={17} />,
                      "Completed without errors",
                    )}
                    {metric(
                      "Average duration",
                      num(
                        rows.reduce(
                          (s, r) =>
                            s + Number(r.duration_ms || r.duration || 0),
                          0,
                        ) / (rows.length || 1),
                      ) + " ms",
                      <Zap size={17} />,
                      "Measured execution time",
                    )}
                    {metric(
                      "Failed executions",
                      num(rows.filter((r) => r.status === "failed").length),
                      <ShieldCheck size={17} />,
                      "Failures retained for review",
                    )}
                  </div>
                  <Card title="Execution ledger">
                    <JsonDetails data={rows} />
                  </Card>
                </>
              )}
              {page === "datasets" && (
                <DataManager
                  datasets={datasets}
                  notify={notify}
                  refresh={refresh}
                  onSelect={setDataset}
                />
              )}
              {page === "reports" && (
                <>
                  <div className="report-grid">
                    {[
                      [
                        "sales",
                        "Sales performance",
                        "Revenue, products, categories and regional trends",
                      ],
                      [
                        "customers",
                        "Customer intelligence",
                        "Segmentation, retention and customer value",
                      ],
                      [
                        "inventory",
                        "Inventory health",
                        "Stock alerts and replenishment priorities",
                      ],
                      [
                        "forecast",
                        "Demand forecast",
                        "Demand estimates and model evaluation",
                      ],
                      [
                        "anomalies",
                        "Anomaly detection",
                        "Unusual business signals and potential risks",
                      ],
                      [
                        "executive",
                        "Executive intelligence",
                        "A complete business performance briefing",
                      ],
                    ].map(([id, title, desc]) => (
                      <Card key={id}>
                        <span className="agent-icon">
                          <FileText size={24} />
                        </span>
                        <h3 className="agent-name">{title}</h3>
                        <p className="agent-description">{desc}</p>
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              const r = await api("reports/generate", {
                                method: "POST",
                                body: JSON.stringify({
                                  query: `Generate a ${title} report`,
                                  datasetId: dataset || "sample",
                                  period: range,
                                }),
                              });
                              setModal(r);
                              notify("Report generated");
                              refresh();
                            } catch (e) {
                              notify((e as Error).message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          <Plus size={14} /> Generate report
                        </button>
                      </Card>
                    ))}
                  </div>
                  <Card
                    title="Generated reports"
                    subtitle="Download a report as CSV or PDF"
                  >
                    <Table
                      rows={rows}
                      onRow={setModal}
                      columns={[
                        {
                          key: "title",
                          label: "Report",
                          format: (v, r) => v || r.type || r.category,
                        },
                        {
                          key: "createdAt",
                          label: "Generated",
                          format: (v) =>
                            v ? new Date(v).toLocaleString() : "—",
                        },
                        {
                          key: "id",
                          label: "Export",
                          format: (v) => (
                            <div className="row">
                              <a
                                className="text-link"
                                href={`/api/reports/${v}/download?format=pdf`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ArrowDownToLine size={14} /> PDF
                              </a>
                              <a
                                className="text-link"
                                href={`/api/reports/${v}/download?format=csv`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                CSV
                              </a>
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Card>
                </>
              )}
              {page === "settings" && (
                <>
                  <div className="dashboard-grid">
                    <Card
                      title="Workspace preferences"
                      subtitle="Saved locally in your browser"
                    >
                      <div className="settings-row">
                        <div>
                          <h4>Light appearance</h4>
                          <p>Switch the workspace color palette.</p>
                        </div>
                        <button
                          className={"toggle " + (light ? "on" : "")}
                          aria-label="Switch appearance"
                          onClick={() => {
                            setLight(!light);
                            localStorage.setItem(
                              "retailmind-theme",
                              !light ? "light" : "dark",
                            );
                          }}
                        >
                          <i />
                        </button>
                      </div>
                      <div className="settings-row">
                        <div>
                          <h4>Adaptive tool selection</h4>
                          <p>
                            Use logged reliability to rank matching tools.
                            Version {data?.version || 1}.
                          </p>
                        </div>
                        <button
                          className={"toggle " + (data?.adaptive ? "on" : "")}
                          aria-label="Toggle adaptive tool selection"
                          onClick={async () => {
                            try {
                              await api("settings", {
                                method: "POST",
                                body: JSON.stringify({
                                  adaptive: !data?.adaptive,
                                  theme: light ? "light" : "dark",
                                  model: "rule-based",
                                }),
                              });
                              notify("Routing preference version saved");
                              await refresh();
                            } catch (e) {
                              notify((e as Error).message);
                            }
                          }}
                        >
                          <i />
                        </button>
                      </div>
                      <div className="settings-row">
                        <div>
                          <h4>Restore previous configuration</h4>
                          <p>Adaptive changes are logged and reversible.</p>
                        </div>
                        <button
                          className="button secondary"
                          disabled={!data?.history?.length}
                          onClick={async () => {
                            try {
                              await api("settings/revert", { method: "POST" });
                              notify("Previous routing configuration restored");
                              await refresh();
                            } catch (e) {
                              notify((e as Error).message);
                            }
                          }}
                        >
                          Restore
                        </button>
                      </div>
                      <div className="settings-row">
                        <div>
                          <h4>Execution mode</h4>
                          <p>
                            Rule-based analytics, no external model required.
                          </p>
                        </div>
                        <Tag tone="purple">Demo</Tag>
                      </div>
                      <div className="settings-row">
                        <div>
                          <h4>Active dataset</h4>
                          <p>
                            {datasets.find((d) => d.id === dataset)?.name ||
                              "Sample retail dataset"}
                          </p>
                        </div>
                        <Link href="/datasets" className="text-link">
                          Manage <ArrowRight size={14} />
                        </Link>
                      </div>
                    </Card>
                    <Card
                      title="Service configuration"
                      subtitle="Secrets are managed through server environment variables"
                    >
                      <JsonDetails data={data || overview?.system} />
                      <div className="info-note">
                        <ShieldCheck size={20} />
                        <p>
                          Configure DATABASE_URL for durable PostgreSQL storage.
                          OPENAI_API_KEY enables optional model summaries. Keys
                          are never sent to the browser.
                        </p>
                      </div>
                    </Card>
                  </div>
                  <Card title="Data & privacy">
                    <p className="body-copy">
                      This demonstration uses signed anonymous sessions to
                      separate uploaded datasets and analysis history. Use
                      sample or non-sensitive data. Local SQLite persists
                      between local restarts; Vercel temporary storage can reset
                      at any time. Configure PostgreSQL and authentication
                      before using private business data.
                    </p>
                  </Card>
                </>
              )}
              {!current && (
                <Card>
                  <Empty>
                    This page does not exist.{" "}
                    <Link href="/dashboard">Return to overview</Link>
                  </Empty>
                </Card>
              )}
            </motion.div>
          )}
          <footer>
            <span>
              <BrainCircuit size={14} /> RETAILMIND AI
            </span>
            <p>Self-evolving intelligence. Transparent by design.</p>
            <span className="footer-state">
              <span className="live-dot" />{" "}
              {overview?.system?.persistence || "Local analytics engine"}
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast">
          <Check size={17} />
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <h2>{modal.name || modal.title || "Execution details"}</h2>
              <button
                className="icon-button"
                onClick={() => setModal(null)}
                aria-label="Close details"
              >
                <X />
              </button>
            </div>
            {modal.query || modal.user_task || modal.trace ? (
              renderEpisode(modal)
            ) : (
              <JsonDetails data={modal} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DataManager({
  datasets,
  notify,
  refresh,
  onSelect,
}: {
  datasets: Obj[];
  notify: (s: string) => void;
  refresh: () => Promise<void>;
  onSelect: (s: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Obj[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState<Obj | null>(null);
  const fields = [
    "order_id",
    "order_date",
    "customer_id",
    "product_id",
    "product_name",
    "category",
    "quantity",
    "unit_price",
    "discount",
    "revenue",
    "cost",
    "profit",
    "region",
    "inventory_stock",
    "reorder_level",
  ];
  function choose(f: File) {
    if (f.size > 5 * 1024 * 1024) {
      notify("Please use a CSV under 5 MB.");
      return;
    }
    setFile(f);
    Papa.parse<Obj>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => {
        setColumns(r.meta.fields || []);
        setPreview(r.data.slice(0, 8));
        const m: Record<string, string> = {};
        (r.meta.fields || []).forEach((c) => {
          const match = fields.find(
            (k) => k === c.trim().toLowerCase().replaceAll(" ", "_"),
          );
          if (match) m[match] = c;
        });
        setMapping(m);
        setValidation({
          rows: r.data.length,
          columns: r.meta.fields?.length,
          parse_errors: r.errors.map((e) => e.message),
          missing_cells: r.data.reduce(
            (s, row) =>
              s +
              Object.values(row).filter((v) => v === "" || v == null).length,
            0,
          ),
          duplicates:
            r.data.length - new Set(r.data.map((v) => JSON.stringify(v))).size,
        });
      },
    });
  }
  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const f = new FormData();
      f.append("file", file);
      f.append(
        "mapping",
        JSON.stringify(
          Object.fromEntries(
            Object.entries(mapping)
              .filter(([, v]) => v)
              .map(([k, v]) => [v, k]),
          ),
        ),
      );
      f.append("clean", "true");
      const r = await api("datasets/upload", { method: "POST", body: f });
      notify(`Dataset ${r.name || file.name} uploaded and validated`);
      setValidation(r.validation || r);
      onSelect(r.id);
      await refresh();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card
        title="Upload your retail data"
        subtitle="CSV files up to 5 MB · Preview, map columns, and validate before analysis"
      >
        <label className="upload-zone">
          <span className="upload-icon">
            <ArrowDownToLine size={24} />
          </span>
          <h3>{file ? file.name : "Drop your CSV here, or click to browse"}</h3>
          <p>Sales, customers, inventory, and product records</p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && choose(e.target.files[0])}
          />
        </label>
        {file && (
          <>
            <div className="mapping-grid">
              {fields.map((k) => (
                <label key={k}>
                  {k.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ")}
                  <select
                    value={mapping[k] || ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [k]: e.target.value })
                    }
                  >
                    <option value="">Not mapped</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="info-note wide">
              <ShieldCheck size={18} />
              <p>
                Missing values and duplicate rows are detected. The backend
                validates mapped types, rejects invalid rows, and stores a
                cleaned dataset with a validation report.
              </p>
            </div>
            <button className="button primary" disabled={busy} onClick={upload}>
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Plus size={16} />
              )}{" "}
              Save validated dataset
            </button>
          </>
        )}
      </Card>
      {validation && (
        <Card title="Validation report">
          <JsonDetails data={validation} />
        </Card>
      )}
      {preview.length > 0 && (
        <Card title="Data preview" subtitle="First eight records">
          <Table
            rows={preview}
            columns={columns.slice(0, 10).map((k) => ({ key: k, label: k }))}
          />
        </Card>
      )}
      <Card
        title="Dataset library"
        subtitle="Select a dataset to update your analytical workspace"
      >
        <Table
          rows={datasets}
          columns={[
            { key: "name", label: "Dataset" },
            {
              key: "row_count",
              label: "Rows",
              format: (v, r) => num(v ?? r.rows),
            },
            {
              key: "createdAt",
              label: "Added",
              format: (v) => (v ? new Date(v).toLocaleDateString() : "Sample"),
            },
            {
              key: "id",
              label: "Actions",
              format: (v, r) => (
                <div className="row">
                  <button
                    className="text-link"
                    onClick={() => {
                      onSelect(r.demo ? "" : v);
                      notify("Dataset selected");
                    }}
                  >
                    Use dataset <ArrowRight size={14} />
                  </button>
                  <a className="text-link" href={`/api/datasets/${v}/download`}>
                    <ArrowDownToLine size={14} /> CSV
                  </a>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
