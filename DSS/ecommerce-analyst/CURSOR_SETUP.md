# Open in Cursor

This export contains two applications:

- The Python read-only analyst in the repository root.
- The hosted dashboard in `dashboard/`.

No credentials or API keys are included.

## Python analyst

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env
pytest
commerce-analyst report --date 20260827
```

Local BigQuery access uses Google Application Default Credentials. Run `gcloud auth application-default login` if the machine is not already authenticated.

## Dashboard

```bash
cd dashboard
npm install
npm run dev
```

The dashboard expects these server-side runtime variables:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `BIGQUERY_PROJECT_ID=adam-test-506904`
- `BIGQUERY_DATASET=analytics_468657312`
- `BIGQUERY_LOCATION=US`

Keep `GOOGLE_SERVICE_ACCOUNT_JSON` in a secret manager or an ignored local environment file. Never commit it. The deployed Sites environment already has its own encrypted copy; it is intentionally absent from this export.

The application is read-only by design. Its service identity should have only BigQuery Job User on the query project and dataset-level BigQuery Data Viewer on Connect Canada.
