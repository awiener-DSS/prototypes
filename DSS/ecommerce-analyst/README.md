# Commerce Analyst MVP

A read-only Python foundation for analyzing GA4 event exports in BigQuery and letting a Groq model investigate performance through a small set of controlled tools.

The first version includes:

- BigQuery connection through Google Application Default Credentials (ADC)
- a read-only query runner with byte limits and dry-run support
- GA4 tools for site summary, funnel, products, search, and segments
- a Groq (OpenAI-compatible) tool-calling loop
- configuration that remains valid before the GA4 dataset appears
- offline unit tests (no cloud credentials or billable queries required)

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env
```

The application can load while `GA4_DATASET` is blank. Check readiness with:

```bash
commerce-analyst status
```

Once GA4 creates a dataset named like `analytics_123456789`, add it to `.env`. Dataset names must be bare identifiers, not a full `project.dataset` path.

### Configure multiple sites

Copy the registry example and add one entry per GA4 property:

```bash
cp sites.toml.example sites.toml
```

Each site has a short key, display name, Google Cloud project, and GA4 dataset. It is fine to leave a new site's dataset blank until its first export arrives. List readiness with:

```bash
commerce-analyst sites
```

Select a site on any data command:

```bash
commerce-analyst query --site connect_canada --sql-file sql/verify_export.sql --start-date 20260827 --end-date 20260827
commerce-analyst ask --site connect_canada "Analyze yesterday"
```

Set `ACTIVE_SITE=connect_canada` in `.env` to make `--site` optional. The original `GCP_PROJECT_ID` and `GA4_DATASET` configuration remains supported as a single site named `default` when no `sites.toml` exists.

## Google Cloud authentication (read-only)

For local development, install the Google Cloud CLI and create ADC credentials:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project adam-test-506904
```

Grant the human or service identity only:

- **BigQuery Job User** on the billing/query project (allows query jobs)
- **BigQuery Data Viewer** on the GA4 dataset (allows reading tables and metadata)

Do not grant Data Editor, Data Owner, or commerce-platform permissions. The code also rejects mutating SQL and sets `use_legacy_sql=False` plus a configurable maximum-bytes-billed cap. Cloud IAM remains the real security boundary.

## Verify BigQuery

After the dataset exists:

```bash
commerce-analyst check-bigquery
commerce-analyst query --sql-file sql/verify_export.sql --start-date 20260826 --end-date 20260827
```

The checked-in SQL runner accepts only one read-only `SELECT`/`WITH` statement. Named values use `@start_date` and `@end_date`.

## Run the analyst

Set `GROQ_API_KEY` and then:

```bash
commerce-analyst ask "Analyze yesterday's ecommerce performance"
```

Product analytics without AI:

```bash
commerce-analyst top-products --date 20260829 --days 90
commerce-analyst product-affinity V3520250-M --date 20260829 --days 90
```

A Groq key is not needed for the bounded GA4-only daily report:

```bash
commerce-analyst report --date 20260827
```

The report includes the site summary, authenticated ecommerce funnel, leading products and searches, zero-stock friction, and acquisition/device segments.

Tool results are sent to the model as JSON. The model has no tool that writes to BigQuery, GA4, a store, an ad platform, or any commerce system.

## Catalog enrichment

On-demand Intershop ICM lookups (anonymous token by default) enrich investigations with product identity and related items. Stock is not loaded into ICM for Connect Canada, so availability friction stays GA4-based. Configure via `sites.toml` (`icm_base_url`, `icm_site`) or `.env` (`ICM_BASE_URL`, `ICM_SITE`).

Named tools: `get_product`, `find_related_products`, `search_catalog`.

## Tests

```bash
pytest
```

Tests inject fake BigQuery and LLM clients, so they run without credentials or network access.

## Repository layout

```text
src/commerce_analyst/
  agent.py             Groq tool-calling orchestration
  bigquery.py          guarded read-only query client
  config.py            environment configuration
  query_runner.py      simple SQL-file runner
  tools/               five GA4 analysis tools
sql/                   example verification query
tests/                 offline unit tests
```

## GA4 assumptions

Queries target standard GA4 daily export tables (`events_YYYYMMDD`). Product analysis uses repeated `items`; revenue uses the `purchase` event; search analysis expects the `search` event and `search_term` event parameter. Adjust those conventions if the site's tagging differs.

Revenue metrics in cross-currency summaries use GA4's normalized USD fields. Currency-specific diagnostics retain local purchase revenue and group it by the event's `currency` parameter.
