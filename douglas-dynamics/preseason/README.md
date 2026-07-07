# Western Products — 2024 Preseason Order Form

Online replacement for the **Copy of 1.18 One Prep - 2024 WESTERN EOF** Excel workbook.

## Features

- **Truck & Non-Truck programs** with 10,000+ products total
- **5-step wizard** with live calculations
- **Shipment month columns** when floor plan payment terms are selected
- **PDF export** of completed orders
- **Order submission API** saves orders as JSON files

## Quick Start

Run both the web app and API server:

```bash
# Terminal 1 — API server (port 3001)
cd server && npm install && npm run dev

# Terminal 2 — Web app (port 5173)
cd web && npm install && npm run dev
```

Open http://localhost:5173

## GitHub Pages (live demo)

After enabling GitHub Pages on the `gh-pages` branch (repo **Settings → Pages → Branch: gh-pages / root**), the app deploys automatically on push to `main`:

**https://awiener-DSS.github.io/prototypes/douglas-dynamics/preseason/web/**

The GitHub Pages build is static only: calculations, PDF export, and admin calc audit work. Order submission requires running the API locally (see Quick Start).

## Programs

| Program | Products | Categories |
|---------|----------|------------|
| **Truck** | 5,148 | Blades, electrical, hoppers, tailgates, parts, service parts |
| **Non-Truck** | 4,951 | UTV/tractor/pusher plows, spreaders, rotary broom, parts |

## Calculations

- 40% standard dealer discount
- Volume discounts (snowplows, hoppers, tailgates, cutting edges, hydraulic)
- Mount ratio warning (>150%)
- Preseason & freight qualification
- Program-specific freight thresholds

## Order Submission

POST orders to `http://localhost:3001/api/orders`. Saved to `server/data/orders/{id}.json`.

From the Review step, click **Submit Order** or **Download PDF**.

## Admin Calculation Audit

To verify calculations match the Excel workbook:

1. Open **http://localhost:5173/?admin=1** (or click **Admin** in the header to toggle admin mode)
2. Click **Calc Audit** in the header (or **View Calc Audit** in the sidebar)
3. Inspect five tabs:
   - **Line Items** — P, Q, R, V column logic per product row
   - **Categories** — volume discount formulas (T14, R12, etc.)
   - **Units & Mounts** — plow unit totals, mount ratio warning
   - **Qualification** — preseason/freight IF formulas from Volume & Freight Summary
   - **Constants** — P5 standard discount, volume tier thresholds
4. Use **Export JSON** to dump the full audit trail for spreadsheet comparison

Each step shows the Excel cell reference (e.g. `Blades, Attachments, Mounts!Q23`) and the formula used.

## Build for Production

```bash
cd web && npm run build
cd server && npm start
```

Serve `web/dist` with any static host; proxy `/api` to the Node server.

## Data Files

- `web/src/data/catalog.json` — Truck products
- `web/src/data/catalog-nontruck.json` — Non-Truck products
- `web/src/data/config.json` — Payment terms, volume rules, freight thresholds

Re-extract from the reference Excel in `reference/` using Python/openpyxl scripts.
