# Commerce Signals — Functional, Technical & Architecture Spec

**Product name (UI):** Commerce Signals  
**Codebase:** `commerce-analyst`  
**Document status:** Reflects the V1 implementation as of 2026-09-03  
**Origin:** [ChatGPT origin conversation](./chatgpt-origin-conversation.md) · always-on rules in `.cursor/rules/chatgpt-origin.mdc`

---

## 1. Executive summary

Commerce Signals is a **read-only AI eCommerce analyst**. It is not another analytics dashboard and not an open-ended “ask your data anything” chatbot.

Standing goal: continuously find opportunities to **increase revenue**.

Core loop:

```
detect → investigate → quantify impact → recommend → prioritize
```

Each opportunity is structured (issue, evidence, estimated monthly impact, likely cause, next step, confidence). A **human** decides what to change. After a fix is applied, **Monitor** tracks before/after metrics and feeds **learning** back into ranking.

V1 never writes to the storefront, catalog, pricing, merchandising, ads, or GA4.

---

## 2. Functional specification

### 2.1 Primary users and jobs

| Job | What the product does |
|-----|------------------------|
| **Detect** | Surface ranked revenue opportunities from GA4 event data |
| **Inspect** | Open a detail drawer with evidence, impact math, and Investigate |
| **Investigate** | Run deeper SQL checks + optional Groq write-up |
| **Act (manual)** | Create a monitor action when a human plans or applies a fix |
| **Monitor** | Measure 7-day before/after lift on a target metric |
| **Learn** | Boost categories where applied fixes showed lift |

### 2.2 Overview briefing (five questions)

The Overview organizes the analyst’s day around five pillars (Baymard-aligned equal-weight cards):

| # | Question | Content |
|---|----------|---------|
| 1 | **Where are we losing money?** | Top ranked opportunities by estimated monthly impact |
| 2 | **What are customers trying to find?** | Search demand by attention then volume; Inspect opens matching Search opportunities |
| 3 | **What’s causing friction?** | Search, inventory, funnel, anomaly, landing, acquisition, taxonomy signals |
| 4 | **What opportunities are buried in behavior?** | Low-convert SKUs, OOS+cart patterns, repeat search |
| 5 | **What changed?** | Period-over-period metric deltas + revenue/purchase chart |

Estimates always read as estimates (`Est. $X/mo`), never as actual lost revenue.

### 2.3 Opportunity model

Every opportunity includes:

| Field | Purpose |
|-------|---------|
| `id` | Stable slug (e.g. `search-safety-glasses`, `landing-…`) |
| `category` | Detector family (see below) |
| `title` / `problem` | Scannable headline + short problem statement |
| `likely_cause` | Hypothesis for why the pattern exists |
| `evidence` | Bullet facts from GA4 |
| `recommendation` | Concrete next step for a human |
| `confidence` | 0–1 model/detector confidence |
| `estimated_monthly_revenue_usd` | Recovery-style estimate or `null` |
| `impact` | `High` \| `Medium` \| `Low` |
| `status` | Open (action lifecycle is separate) |
| `metrics` | Category-specific dimensions for investigate / monitor |

**Categories (dashboard):**

| Category | Typical signal |
|----------|----------------|
| `Inventory` | `zero_stock_view` demand on unavailable PDPs |
| `Search` | Weak / no results, repeat intent, demand terms |
| `Funnel` | Site or SKU view→cart leakage (SKU rows labeled **Product** in UI) |
| `Anomaly` | Revenue or funnel rate vs prior-day baseline |
| `Landing` | High-traffic entry paths with weak purchase rate |
| `Taxonomy` | Leaf **category** views with low add-to-cart (Shop / `(not set)` / Brand opps excluded) |
| `Acquisition` | Source/medium/campaign traffic that under-converts to purchase |

### 2.4 In-app surfaces

| View | Function |
|------|----------|
| **Overview** | Five-question briefing |
| **Opportunities** | Ranked feed (learning-boosted) |
| **Search** | Search opportunities + term table with attention status |
| **Funnel** | Funnel opportunities |
| **Products** | Hidden behavior + zero-stock pressure |
| **Recommendations AI** | Top sellers + product affinity explorer |
| **Monitor** | Pending / active / closed actions and outcomes |

### 2.5 Inspect & Investigate

1. User clicks **Inspect** on a briefing or opportunity row.  
2. Right **OpportunityDrawer** opens with evidence, impact formula, and actions.  
3. **Investigate** calls `GET /api/explain`, which:
   - Rebuilds the same opportunity set as the report (including commerce signals)
   - Runs category-specific investigation steps (`lib/investigate.ts`)
   - Optionally asks Groq for a short write-up (`lib/analyst.ts`)
4. Results render inside the drawer (no toast banner on success).

### 2.6 Monitor loop (human-in-the-loop)

```
Opportunity
  → Create action          (status: created / pending)
  → Record fix applied     (status: applied, monitoring: active)
  → Measure outcome        (≈7d before vs ≈7d after target metric)
  → Close or reopen monitoring
  → Learning boost feeds next ranking
```

| Category | Target metric (intent) |
|----------|------------------------|
| Inventory | `zero_stock_views` (lower is better) |
| Search | `search_result_view_rate` |
| Funnel / Taxonomy | `view_to_cart_rate` |
| Landing / Acquisition | `purchase_rate` |

Outcome verdicts: `lift` | `flat` | `worse` | `inconclusive`.

**Important:** Monitor logs and measures **human-applied** work in analytics. It does not change the store or catalog.

### 2.7 Explicit non-goals (V1)

- Writing to Intershop / storefront / pricing / merchandising  
- Streaming GA4 or user-level PII export  
- Autonomous synonym, ranking, or pricing changes  
- Multi-agent frameworks (LangChain, CrewAI, etc.)  
- Replacing GA4 UI for ad-hoc exploration  

---

## 3. Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Humans (browser)                          │
│   Overview · Opportunities · Inspect · Monitor · Recs AI         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    vinext / Cloudflare Worker
                    (dashboard/ · port 3000)
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
  Named BQ SQL             Groq (optional)        Local store
  (report, signals,        Investigate brief      actions.json /
   products, outcomes)                            outcomes.json
        │                       │                 (or in-memory)
        ▼                       │
┌───────────────────┐           │
│ GA4 daily export  │◄──────────┘
│ BigQuery events_* │     Python CLI (parallel foundation)
│ adam-test-506904  │     commerce-analyst ask|report|…
└───────────────────┘
        ▲
        │ optional read
┌───────────────────┐
│ Intershop ICM     │  product identity / related / search
│ (anonymous token) │  NOT stock truth
└───────────────────┘
```

### 3.1 Two surfaces, one product intent

| Surface | Role |
|---------|------|
| **Dashboard** | Interactive product: briefing, inspect, monitor, affinities |
| **Python CLI** | Foundation: reports, detectors, `ask` agent, offline tests |

Detectors, opportunity shape, week merge, and learning are **mirrored** in TypeScript and Python. When changing behavior, keep both aligned.

### 3.2 Autonomy ladder

| Tier | Capability |
|------|------------|
| **V1 (current)** | Read-only detect / investigate / recommend; log manual actions & measure |
| **V2** | Tickets, reports, proposed experiments; notify team |
| **V3** | Changes only with human approval |
| **V4** | Limited autonomous changes; **never pricing without approval** |

Do not skip tiers unless product explicitly expands scope.

---

## 4. Technical specification

### 4.1 Repository layout

| Path | Purpose |
|------|---------|
| `src/commerce_analyst/` | Python package (config, BQ, agent, detect, report, tools) |
| `tests/` | Offline unit tests (fake BQ/LLM) |
| `sql/` | Checked-in read-only diagnostic SQL |
| `dashboard/` | vinext React app + Worker APIs |
| `data/` | Cache + optional action/outcome JSON |
| `docs/` | Origin conversation + this spec |
| `sites.toml` | Multi-site GA4 / ICM registry |
| `.cursor/rules/` | Product + Baymard UX rules |

### 4.2 Data: GA4 BigQuery

- **Project (current):** `adam-test-506904`  
- **Dataset:** site-specific `analytics_*` (e.g. Connect Canada)  
- **Location:** `US`  
- **Tables:** `{project}.{dataset}.events_YYYYMMDD` via `events_*` + `_TABLE_SUFFIX`  
- **Mode:** Daily export, event data only — no streaming, no user-data export  

**Event / param conventions used by tools:**

| Domain | Events / fields |
|--------|-----------------|
| Commerce funnel | `view_item`, `add_to_cart`, `begin_checkout`, `purchase` |
| Items | Unnested `items` (id, name, brand, `item_category`…`item_category5`, revenue) |
| Revenue | `ecommerce.purchase_revenue_in_usd` / item USD helpers |
| Search | `search`, `view_search_results`, `search_no_results`; param `search_term` |
| Inventory friction | Custom `zero_stock_view` (+ cart cross-check) |
| Landing | First-hit `page_path` / `page_location`; engagement `engagement_time_msec` |
| Acquisition | `traffic_source` source/medium/name + campaign params |

**Taxonomy category rule:** use deepest non-empty `item_category5`→`item_category`; ignore `Shop` and `(not set)`. Brand opportunities are not emitted in the dashboard detector.

### 4.3 Named analysis tools (not raw dumps)

#### Python agent tools (`src/commerce_analyst/tools/`)

**GA4 / analytics**

- `site_summary`  
- `funnel`  
- `product_performance`  
- `top_selling_products`  
- `search_performance`  
- `segmentation`  
- `inventory_friction`  
- `landing_page_performance`  
- `acquisition_quality`  
- `taxonomy_performance` (`brand` \| `category`)  
- `product_affinities`  

**Catalog (ICM)**

- `get_product`  
- `find_related_products`  
- `search_catalog`  

Also used by report/detect: `available_event_dates`, `daily_performance`.

#### Dashboard BigQuery mirrors

- Day report metrics, searches, products, inventory (`lib/report-data.ts`)  
- Commerce signals (`lib/commerce-signals.ts`): landings, taxonomy, acquisition  
- Products / affinities (`lib/products.ts`)  
- Outcome metric series (`lib/outcomes.ts`)  

Python `BigQueryRunner` rejects mutating SQL (`assert_read_only`) and caps bytes billed. IAM should be Job User + Data Viewer only.

### 4.4 Opportunity detection pipeline (dashboard)

```
Date range
  → fetchDayReport(s)           # daily Inventory/Search/Funnel/Anomaly
  → fetchPeriodSearches
  → fetchLanding / Taxonomy / Acquisition
  → hiddenAlignedOpportunities  # search demand + hidden patterns
  → commerceSignalOpportunities # Landing / Category / Acquisition
  → mergeWeeklyOpportunities
  → applyLearningBoost
  → opportunities (top) + all_opportunities (inspectable)
```

`GET /api/explain` rebuilds the **same** opportunity universe so Inspect works for Landing / Taxonomy / Acquisition / Search demand.

### 4.5 Investigation

`investigateOpportunity` runs category-specific steps (device splits, SKU family, search term mix, etc.) and builds impact math. Optional Groq brief via `writeInvestigationBrief` when `GROQ_API_KEY` is set.

### 4.6 Auth

| Item | Behavior |
|------|----------|
| Enablement | Auth on when `DASHBOARD_AUTH_PASSWORD` is set |
| Credentials | `DASHBOARD_AUTH_EMAIL` + password (env only) |
| Session | HMAC cookie `commerce_signals_session` |
| UI | Email may prefill; **password never prefilled or displayed** |
| Middleware | Protects app routes; `/sign-in`, `/api/auth/*`, `/api/accounts` public |

### 4.7 Persistence

| Data | Storage |
|------|---------|
| GA4 analytics | BigQuery (source of truth) |
| Query results | Memory + `data/cache/*.json` TTL cache |
| Monitor actions / outcomes | In-memory; optional `data/actions.json` & `data/outcomes.json` when Node FS works |

Under Wrangler local/dev, disk persist may fail → Monitor state can reset on process restart. **Not a production database.**

### 4.8 Environment variables (names only)

**Python:** `GCP_PROJECT_ID`, `GA4_DATASET`, `SITES_CONFIG_FILE`, `ACTIVE_SITE`, `BIGQUERY_*`, `GROQ_API_KEY`, `GROQ_MODEL`, `ICM_*`

**Dashboard:** `GOOGLE_SERVICE_ACCOUNT_JSON`, `BIGQUERY_PROJECT_ID`, `BIGQUERY_DATASET`, `BIGQUERY_LOCATION`, `GROQ_*`, `ICM_*`, `DASHBOARD_AUTH_EMAIL`, `DASHBOARD_AUTH_PASSWORD`, `AUTH_SECRET`, `SITES_REGISTRY_JSON` (build-injected from `sites.toml`)

Secrets live in gitignored `.env` / `dashboard/.env.local` only.

### 4.9 Dashboard stack

| Layer | Choice |
|-------|--------|
| Runtime | Node ≥ 22.13 |
| Framework | vinext (Vite + Next-like App Router) |
| Deploy target | Cloudflare Workers (`wrangler`) |
| UI | React 19, Tailwind 4, shadcn/Base UI, Recharts, Lucide |
| UX rule | Baymard-aligned: equal-weight cards, honest estimate labels, clear primary CTA |

**API routes:**

| Route | Role |
|-------|------|
| `GET /api/report` | Live briefing + opportunities |
| `GET /api/products` | Top sellers / search / affinities |
| `GET\|POST /api/actions` | Monitor action lifecycle |
| `GET /api/outcomes` | Measure / fetch outcomes |
| `GET /api/explain` | Investigate |
| `POST /api/auth/login` · `logout` | Session |
| `GET /api/session` · `/api/accounts` | Site + session |

### 4.10 Python CLI

```bash
commerce-analyst sites|status|check-bigquery|query|ask|report|opportunities|top-products|product-affinity
```

Agent: `CommerceAnalystAgent` — Groq OpenAI-compatible tool calling, read-only system instructions.

---

## 5. Key user journeys

### 5.1 Daily briefing → fix → learn

1. Open Overview for a date range.  
2. Scan pillars; Inspect a high-impact opportunity.  
3. Investigate; review recommendation.  
4. Create Monitor action; apply when fixed in the store.  
5. Return later; review outcome verdict.  
6. Learning boosts that category on future rankings.

### 5.2 Search demand

1. Overview “Trying to find” lists attention-ranked queries.  
2. Inspect opens the matching Search opportunity (including healthy demand terms with demand-oriented copy).  
3. Search view shows full term table + ranked Search opportunities.

### 5.3 Recommendations AI

1. Browse top sellers (orders / revenue / units).  
2. Click a SKU or search in affinity explorer.  
3. See purchased-together and same-session cart affinities for merchandising ideas (still read-only).

---

## 6. Security & compliance posture

- Read-only analytics by design (SQL guards + IAM).  
- No storefront write APIs.  
- Session cookie httpOnly; password not sent to the client as a default.  
- Do not commit `.env` / service account JSON.  
- Catalog ICM used for identity enrichment; stock truth remains GA4 `zero_stock_view`.

---

## 7. Local runbook

### Dashboard

```bash
cd dashboard
# Node 22+
npm install
# configure dashboard/.env.local
npm run build && npm run start   # wrangler on :3000
```

UI is **not** hot-reload: rebuild + hard refresh after UI changes.

### Python

```bash
python3 -m venv .venv && source .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env && cp sites.toml.example sites.toml
gcloud auth application-default login
commerce-analyst status
pytest
```

---

## 8. Design principles (non-negotiable)

1. **Opportunities, not charts-first.** Charts support the story; ranked actions are the product.  
2. **Named tools over table dumps.** Bound the model’s reach.  
3. **Honest estimates.** Always label recovery math as estimates.  
4. **Human decides.** V1 recommends; Monitor measures what humans applied.  
5. **Baymard UX.** Equal-weight list rows, progressive disclosure, one primary CTA per decision area.  
6. **Stay on the autonomy ladder.** No silent jumps to autonomous merchandising or pricing.

---

## 9. Known limitations & near-term gaps

| Area | Current state |
|------|----------------|
| Monitor persistence | In-memory / fragile under Workers; needs a real DB for production |
| Dual Python/TS detectors | Must stay in sync manually |
| User properties | Not yet in analysis layer |
| Multi-step path graphs | Landing first-hit only; not full path analysis |
| Brand demand | Tool exists; dashboard Brand opportunities intentionally disabled |
| Outcome SQL coverage | Some categories fall back to coarser metric series |
| Git hosting | Project may live inside a larger monorepo; dedicated remote recommended for publish |

---

## 10. Related documents

- `docs/chatgpt-origin-conversation.md` — product origin and ladder  
- `README.md` — Python MVP quick start  
- `CURSOR_SETUP.md` — Cursor / dashboard setup notes  
- `.cursor/rules/chatgpt-origin.mdc` — always-applied product constraints  
- `.cursor/rules/baymard-ux.mdc` — dashboard UX constraints  

---

*End of specification.*
