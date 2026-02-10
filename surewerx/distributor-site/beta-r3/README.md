# Voucher Distributor Portal – Distributor-Site Prototype

**Static, production-style prototype of the Voucher Distributor Portal distributor experience.**  
Built with Bootstrap 3, jQuery 3, and LESS — **no build step, no backend required.**

---

## Table of Contents

- [Overview](#overview)
- [Core Capabilities](#core-capabilities)
- [Screens & Navigation](#screens--navigation)
- [Quick Start](#quick-start)
- [Tech Stack & Architecture](#tech-stack--architecture)
- [Project Structure](#project-structure)
- [Testing the Prototype](#testing-the-prototype)
- [Limitations](#limitations)

---

## Overview

This prototype implements the **distributor-side portal** used to:

- Onboard and configure customers
- Manage users, user groups, employees, and products
- Configure voucher programs and qualified products
- View distributor- and customer-level reporting

It is a **front-end–only implementation** intended to validate UX, flows, and screen-based functional requirements that are captured in the FRD (`SureWerx/FRD/Distributor_Site_Functional_Requirements_Document.md`).

---

## Core Capabilities

### Authentication & Roles

- Multi-role login:
  - Distributor users (tenant-level configuration and reporting)
  - Customer users (scoped to their own customer)
  - SureWerx users (multi-distributor access)
- Role-based navigation:
  - Distributor / SureWerx → Dashboard
  - Customer → Customer Detail (their own instance)
- Demo **Sign in with Microsoft** entry point (front-end placeholder)
- Demo **Multi-Factor Authentication** step (front-end flow stub only)
- Session-style behavior via in-memory `AppState` (no real sessions or security)

### Customer & Group Management

- **Customer multi-step wizard**:
  - Basic details and branding (name, logo, URL)
  - Employee authentication field configuration
  - Terms & Conditions selection
  - Review step before save
  - Editing existing customers with URL/auth fields locked (modeled behavior)
- **User Groups**:
  - Create / edit / delete groups
  - Department and location fields (incl. Location ID)
  - Group-level metrics (e.g., counts) in the UI

### Employee Management

- Customer Detail → Employees tab:
  - Add / edit / delete individual employees
  - Bulk CSV import with front-end validation
  - Bulk operations (e.g., change group)
  - Sortable / filterable table with selection controls
  - Expandable voucher detail views for each employee (front-end only)

### Voucher Programs

- Voucher Form:
  - Create / edit vouchers
  - Configure basic voucher attributes (name, amount, start/end, status, rollover rule – modeled)
  - Assign vouchers to user groups
- Voucher Product Selection:
  - Separate screen to select qualified products for a voucher
  - Front-end enforcement of: **one product per active voucher per group**
  - Simple conflict validation UX (prototype-only)

### Product Management & Visibility

- Product Management page:
  - Maintain product catalog
  - Map distributor SKUs to SureWerx SKUs (for reporting alignment)
  - CSV import for custom SKUs (front-end mock)
  - Category and basic price fields
- Group Product Visibility:
  - Configure which products are visible for a specific user group
  - Independent of reporting SKU mapping

### Reporting

- Distributor Reporting:
  - Transactions view with multiple line items per order
  - Filters such as customer, voucher, date range, and Location ID (modeled)
  - CSV export of report data
  - Cost and payment breakdown fields (distributor-only visibility)
- Customer Reporting:
  - Customer-only report view, scoped to a single customer
  - Uses similar filters and export behavior, without cross-customer data

### UX & Utilities

- Responsive layout (Bootstrap 3)
- Loading spinners, confirmation modals, toast-style notifications
- Centralized UI helper functions (`ui-helpers.js`)
- Simple navigation helpers (`navigation.js`)

---

## Screens & Navigation

Key HTML entry points in this prototype:

- `index.html` – Redirects to `login.html`
- `login.html` – Role-based login screen (includes Microsoft sign-in + MFA stubs)
- `dashboard.html` – Distributor / SureWerx landing page
- `customer-detail.html` – Customer-centric view with tabs:
  - User Groups
  - Employees
  - Vouchers
- `customer-form.html` – Multi-step customer create/edit wizard
- `user-group-form.html` – Create / edit user groups
- `group-product-visibility.html` – Product visibility per group
- `voucher-form.html` – Create / edit voucher programs
- `voucher-product-selection.html` – Define qualified products for a voucher
- `products.html` – Product catalog and SKU mapping
- `reporting.html` – Distributor reporting
- `customer-reporting.html` – Customer reporting
- `settings.html` – Distributor branding settings
- `user-management.html` – User management (create/edit users and roles)

Routing logic is implemented in small per-page `<script>` blocks that:

- Initialize `AppState`
- Check authentication and role
- Redirect to the correct page if preconditions fail
- Call the appropriate component `init(...)` function

---

## Quick Start

### Prerequisites

- Any static web server (Apache, Nginx, `python -m http.server`, etc.)
- Modern browser (Chrome, Edge, Firefox, Safari)

### Run Locally

From the `Prototypes/surewerx/distributor-site` directory:

```bash
python -m http.server 8000
# then open:
# http://localhost:8000/login.html
```

Demo credentials (front-end only, no real auth):

- Distributor: `admin@distributor.com` / `admin123`
- Customer: `customer@techsolutions.com` / `customer123`
- SureWerx: `surewerx@example.com` / `surewerx123`

Clicking the logo in the login UI reveals available demo credentials.

---

## Tech Stack & Architecture

- **Bootstrap 3.4.1** – layout and components
- **jQuery 3.6.0** – DOM and events
- **LESS → CSS** – styling (`styles/main.less` → `styles/main.css`)
- **Plain ES5 JavaScript** – no bundler or transpiler

Architecture highlights:

- `AppState` is a simple in-memory store for:
  - Current user and role
  - Customers, groups, employees, products, vouchers, and reporting data (mocked)
- Component-based JS files under `js/components/`:
  - Each main screen has a corresponding component (e.g., `DashboardComponent`, `CustomerDetailComponent`)
- Templates under `js/templates/` provide reusable HTML string snippets
- UI utilities under `js/utils/` handle spinners, modals, toasts, and navigation

---

## Project Structure

```text
Prototypes/surewerx/distributor-site/
├── index.html
├── login.html
├── dashboard.html
├── customer-detail.html
├── customer-form.html
├── customer-reporting.html
├── reporting.html
├── voucher-form.html
├── voucher-product-selection.html
├── group-product-visibility.html
├── user-group-form.html
├── products.html
├── settings.html
├── user-management.html
├── styles/
│   ├── globals.css
│   ├── main.less
│   ├── main.css
│   ├── mixins.less
│   └── variables.less
├── js/
│   ├── app.js
│   ├── utils/
│   │   ├── helpers.js
│   │   ├── state.js
│   │   ├── ui-helpers.js
│   │   └── navigation.js
│   ├── templates/
│   │   ├── templates.js
│   │   ├── templates-updated.js
│   │   ├── templates-partner-detail-fix.js
│   │   ├── templates-partner-detail-update.js
│   │   ├── employee-table-template.js
│   │   └── employee-modals.js
│   └── components/
│       ├── header.js
│       ├── login.js
│       ├── dashboard.js
│       ├── customer-detail.js
│       ├── customer-detail-enhanced.js
│       ├── customer-form.js
│       ├── customer-reporting.js
│       ├── employee-table-enhanced.js
│       ├── employee-bulk-import.js
│       ├── reporting.js
│       ├── voucher-form.js
│       ├── voucher-product-selection.js
│       ├── group-product-visibility.js
│       ├── user-group-form.js
│       ├── products.js
│       ├── settings.js
│       └── user-management.js
└── images/
    └── ... logos used for the prototype
```

---

## Testing the Prototype

Manually exercise these flows:

- Login as each role and verify landing pages and redirects
- Create/edit a customer through the wizard
- Manage user groups, employees, and product visibility for a customer
- Create/edit vouchers and configure qualified products
- Run distributor and customer reports, apply filters, and export CSV

For more detailed test steps, see the documents in `docs/` (if present in your copy of the repo), such as:

- `TESTING_GUIDE.md`
- `TESTING_GUIDE_ENHANCED.md`
- `IMPLEMENTATION_STATUS.md`

---

## Limitations

This is a **prototype**, not a production system:

- No real authentication, MFA, or Microsoft integration (front-end only)
- No persistence (all data is in-memory and resets on refresh)
- No real file uploads (logo and CSV flows are simulated)
- No backend validation, security, or integrations

Use this project as a **source of truth for UI behavior and FRD alignment**, not as a deployable production application.

