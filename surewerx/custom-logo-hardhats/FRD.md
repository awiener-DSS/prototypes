# Functional Requirements Document (FRD)
## Custom Logo Hard Hat Configurator — SureWerx Connect

| Field | Value |
|-------|-------|
| **Document Version** | 1.0 |
| **Date** | June 10, 2026 |
| **Product** | XS2-500 Type 2 Safety Helmet – Non-Vented – Black |
| **Platform** | SureWerx Connect (B2B e-commerce) |
| **Status** | Draft — based on working prototype (`custom-logo-hard-hats.html`) |

---

## 1. Purpose

This document defines the functional requirements for the **Custom Logo Hard Hat Configurator** feature within SureWerx Connect. The feature allows authenticated B2B buyers to configure custom logo printing on safety helmets, receive pricing estimates, and generate/submit custom logo quotes.

The prototype in this repository demonstrates intended behavior, UI layout, validation rules, and pricing logic. Production implementation may integrate with backend services not present in the prototype.

---

## 2. Scope

### In Scope
- Logo upload and configuration for up to four helmet print locations
- Per-location dimension and color entry
- Global unique color count selection
- Real-time pricing calculation based on quantity, colors, and logo locations
- Selection summary with quantity entry
- Custom Logo Quote creation, preview (PDF), save, and submit
- Minimum order quantity enforcement

### Out of Scope (Prototype / Future Phase)
- Backend persistence of quotes and logo file storage
- Entripy decorator integration and proof workflow automation
- Multi-product support beyond XS2-500
- Inventory and custom part number generation
- Payment and purchase order submission
- User authentication (prototype uses static user data)

---

## 3. Users & Personas

| Persona | Description | Primary Actions |
|---------|-------------|-----------------|
| **B2B Buyer** | Distributor or end-user purchaser logged into SureWerx Connect | Configure logos, review pricing, submit quotes |
| **Sales / Staff** | Internal SureWerx staff assisting distributors | Configure on behalf of customer, preview quotes |
| **Decorator (Entripy)** | External partner | Receives proof requests post-submission (manual today) |

---

## 4. Product Context

| Attribute | Value |
|-----------|-------|
| Product Name | XS2-500 Type 2 Safety Helmet – Non-Vented – Black |
| Product Number | XS2-500 |
| Helmet Color | Black |
| Default Unit Price | $23.97 (distributor product price; may vary by account) |
| Decorator Partner | Entripy |
| Quote Validity | 30 days |

---

## 5. User Flows

### 5.1 Configure Logo Placement

```
[Product Page] → [Logo Configurator]
    → Upload logo(s) per location (optional: 1–4 locations)
    → Enter width/height per uploaded logo
    → Select colors per location (1–4)
    → Select unique colors across all logos (1–4)
    → [Confirm Logo Placement]
    → [Selection Summary + Pricing]
    → Enter quantity (min 20)
    → Optional comments
    → [Add to Quote]
```

### 5.2 Quote Management

```
[Add to Quote] → [Custom Logo Quotes View]
    → Review/edit quote information
    → [Save Quote] (optional)
    → [Preview Quote] → PDF opens in new tab
    → [Submit Quote] → Status = Submitted
    → [← Back to product] returns to configurator
```

### 5.3 Edit After Confirm

After confirming logo placement, the user may click **Edit** in the Selection Summary to restore all logo location data and unique color selection into the configuration form for modification.

---

## 6. Functional Requirements

### 6.1 Logo Location Configuration

The configurator supports **four independent logo locations**:

| # | Location | Max Width | Max Height |
|---|----------|-----------|------------|
| 1 | Front | 4" | 4.3" |
| 2 | Back | 5" | 7" |
| 3 | Left Side | 4" | 7" |
| 4 | Right Side | 5" | 7" |

**FR-LOC-01** Each location shall display its name, dimension inputs, upload control, and per-location color selector.

**FR-LOC-02** A user may configure one or more locations; at least one location with a logo is required to proceed.

**FR-LOC-03** Width and height are required for every location where a logo file is uploaded.

**FR-LOC-04** Dimension values must be numeric. Non-numeric input shall display: *"Please enter a numeric value."*

**FR-LOC-05** Dimension values must not exceed the location-specific maximum. Exceeding the max shall display: *"Maximum allowed is {max}\"."*

**FR-LOC-06** A helmet illustration shall be displayed showing available logo locations.

---

### 6.2 Logo File Upload

**FR-UP-01** Users shall upload logo files via a modal ("Add Your Logo") triggered from each location's upload button.

**FR-UP-02** Accepted file formats: `.pdf`, `.ai`, `.eps`, `.png`.

**FR-UP-03** Maximum file size: **2.4 MB**.

**FR-UP-04** Invalid file extension shall display an alert: *"Please select a .pdf, .ai, .eps, or .png file."*

**FR-UP-05** Upon successful upload, the file name shall be displayed at the location with a remove (trash) control.

**FR-UP-06** Removing a logo shall clear the file name, hide file info, reset the per-location color selector, and recalculate pricing.

**FR-UP-07** Production: uploaded files shall be transmitted to backend/decorator storage. Prototype: file is referenced by name only (no upload persistence).

---

### 6.3 Color Selection

**FR-COL-01** Maximum colors per logo location: **4** (options 1, 2, 3, 4).

**FR-COL-02** Maximum unique colors across all uploaded logos: **4**.

**FR-COL-03** Per-location color count is required for every location with an uploaded logo.

**FR-COL-04** Unique colors field label: *"How many unique colors exist across all your uploaded logos? (Max 4)"*

**FR-COL-05** Unique colors shall default to the highest per-location color count among uploaded logos.

**FR-COL-06** Unique colors selectable range:
- Minimum: highest per-location color count (when logos are present)
- Maximum: 4

**FR-COL-07** Options below the per-location minimum shall be hidden in the unique colors dropdown.

**FR-COL-08** User-selected unique colors below the minimum or above 4 shall be automatically corrected to the valid range.

**FR-COL-09** Pricing lookup shall reject color counts greater than 4.

---

### 6.4 Confirm Logo Placement

**FR-CON-01** The **Confirm Logo Placement** button shall remain disabled until:
- At least one logo is uploaded
- All uploaded locations have valid width, height, and color selections
- No dimension validation errors are visible
- Unique colors is selected

**FR-CON-02** On confirm, the system shall:
1. Persist selections to an in-session summary (locations, dimensions, file names, colors, unique colors)
2. Render the Selection Summary panel
3. Display quantity input (default: 20)
4. Display pricing summary box
5. Display comments field
6. Display **Add to Quote** button
7. Clear the configuration form (locations reset; summary retains data)
8. Disable Confirm button until user re-configures or uses Edit

**FR-CON-03** Selection Summary shall display per location:
- Location number and name
- Width and height (in inches)
- File name
- Color count

**FR-CON-04** Selection Summary shall display total unique colors.

**FR-CON-05** Selection Summary shall include an **Edit** link to restore all saved values to the configuration form.

---

### 6.5 Quantity & Minimum Order

**FR-QTY-01** Minimum order quantity (MOQ): **20 units**.

**FR-QTY-02** Quantity input shall enforce `min="20"`.

**FR-QTY-03** If quantity is changed below 20, the system shall reset it to 20.

**FR-QTY-04** Pricing calculations shall not apply printing costs when quantity is 0 or below MOQ; helmet/base product price still displays.

**FR-QTY-05** Selection Summary shall display helper text: *"Minimum order quantity: 20 units"*

---

### 6.6 Pricing Calculation

Pricing is derived from a rate table (`Math/pricing-vertical.csv` / embedded `calculationData`) with the following structure:

| Field | Description |
|-------|-------------|
| Code | SKU/pricing code (e.g., CPP021) |
| # of Units Min | Lower bound of quantity tier |
| # of Units Max | Upper bound (blank = open-ended, e.g., 3500+) |
| # of Colors | 1–4 (UI-limited; table contains legacy 5–6 rows) |
| Price | Per-unit printing cost for that location |
| Description | Human-readable tier description |

#### Special Pricing Codes

| Code | Description | Price (prototype) |
|------|-------------|-------------------|
| CPPH | Handling (per unit) | $0.85 |
| CPPS1C | 1st Color Setup (order-level) | $75.00 |
| CPPSAC | Set-up / Color (per additional color) | $45.00 |

#### Quantity Tiers (summary)

| Units Min | Units Max |
|-----------|-----------|
| 20 | 29 |
| 30 | 39 |
| 40 | 49 |
| 50 | 59 |
| 60 | 69 |
| 70 | 79 |
| 80 | 89 |
| 90 | 99 |
| 100 | 199 |
| 200 | 299 |
| 300 | 399 |
| 400 | 499 |
| 500 | 999 |
| 1000 | 1999 |
| 2000 | 3499 |
| 3500 | (open) |

**FR-PRC-01** For each configured logo location, look up the per-unit printing price using **order quantity** and **that location's color count**.

**FR-PRC-02** Logo Location Sub-Total = sum of per-location printing prices.

**FR-PRC-03** Setup cost (order-level):
```
Setup = (1st Color Setup × 1) + (Unique Colors − 1) × Set-up/Color
```

**FR-PRC-04** Setup per unit:
```
Setup / Unit = Setup ÷ Quantity
```

**FR-PRC-05** Handling + Setup per unit:
```
Handling + Setup / Unit = Setup / Unit + Handling
```

**FR-PRC-06** Total Printing per unit:
```
Total Printing / Unit = (Logo Location Sub-Total + Handling + Setup / Unit) × 1.1
```
The **1.1 multiplier** represents a 10% markup on printing costs.

**FR-PRC-07** Total Cost per helmet:
```
Total Cost / Helmet = Product Price + Total Printing / Unit
```
Rounded to the nearest cent (hundredth).

**FR-PRC-08** Total order cost:
```
Total Cost = Total Cost / Helmet × Quantity
```

**FR-PRC-09** Selection Summary pricing box shall display:

| Label | Description |
|-------|-------------|
| Helmet Price | Base product unit price |
| Printing Price | Total Printing / Unit |
| Total Price / Unit | Total Cost / Helmet |
| Total Cost | Total order cost |

**FR-PRC-10** Pricing shall recalculate when quantity, per-location colors, unique colors, or product price changes.

**FR-PRC-11** After Confirm, pricing shall use saved selection data (not cleared form state).

---

### 6.7 Comments

**FR-CMT-01** An optional comments textarea shall appear in the Selection Summary after confirm.

**FR-CMT-02** Comments shall carry forward to the quote product details and PDF preview.

---

### 6.8 Add to Quote

**FR-QT-01** **Add to Quote** shall navigate from the Configurator view to the Custom Logo Quotes view.

**FR-QT-02** Product details table shall be populated with:
- Product name
- Total price per unit
- Quantity
- Edit / Delete action buttons (prototype: display only)

**FR-QT-03** Quote summary shall show:
- Decorating Costs = Printing Price × Quantity
- Quote Total = Total Cost from summary

**FR-QT-04** Comments (if any) shall appear as a row below the product line.

---

### 6.9 Custom Logo Quotes View

**FR-QV-01** Quote Information fields:

| Field | Required | Notes |
|-------|----------|-------|
| Quote Number | Read-only | System-generated (e.g., CLA00002468) |
| Status | Read-only | "Not Submitted" → "Submitted" |
| Quote Name | Yes | User-editable |
| Logo Brand Name | Yes | User-editable |

**FR-QV-02** Contact fields:

| Field | Required | Notes |
|-------|----------|-------|
| Contact Person/Email | Read-only | From logged-in user |
| Distributor Name | No | Dropdown from account |
| Distributor Email | Yes | Editable |
| Phone # | No | Editable |

**FR-QV-03** **Save Quote** shall persist quote data (production: API; prototype: no-op).

**FR-QV-04** **Submit Quote** shall:
- Set status to "Submitted"
- Disable the submit button
- Production: trigger backend workflow and Entripy notification

**FR-QV-05** **Back to product** shall return to the Configurator view without losing in-session state.

---

### 6.10 Preview Quote (PDF)

**FR-PDF-01** **Preview Quote** shall generate a PDF and open it in a new browser tab. Preview does not submit the quote.

**FR-PDF-02** PDF shall include:

**Header**
- Title: "Custom Logo Quote"
- Customer Name
- Distributor Name
- Helmet Model, Color, Product Number
- Distributor Product Price
- Order Quantity

**Body**
- Comments (if provided)
- Logo Pricing section:
  - Logo location table (Name, Cost, Code, Description)
  - Logo Location Sub-Total
  - Handling + Setup table
  - Handling, Setup, Setup/Unit, Handling + Setup totals
  - Total Printing / Unit
  - Product Price
  - Total Cost / Helmet
  - Total Cost

**Footer**
- Important Note (Next Steps, Shipping, Proceed With Quote) — static content per business rules

**FR-PDF-03** PDF shall display pricing **values only** (no calculation formula text).

---

### 6.11 Important Note (Static Content)

Displayed on Quote view and PDF.

**Next Steps**
- Entripy emails proof within 1 business day
- Proof approval required before order proceeds
- Custom logo part numbers created in parallel
- Logo part numbers and due dates provided with PO
- Unique quote number generated on order — include on PO

**Shipping**
- Orders ≥ $1,500: Prepaid shipping from decorator
- Orders < $1,500: Prepaid & Charge shipping from decorator
- PO must indicate mode of transport

**Proceed With Quote**
- Save quote for future reference if not placing PO immediately
- Quote valid 30 days

---

## 7. UI Layout Requirements

### 7.1 Configurator View (3-column)

| Column | Content |
|--------|---------|
| Left (col-sm-3) | Helmet illustration |
| Center (col-sm-6) | Product name, logo location form, confirm button |
| Right (col-sm-3) | Selection Summary, pricing box, comments, Add to Quote |

### 7.2 Demo Pricing Section (Prototype Only)

Full-width panels below the configurator showing:
- Cost-per-location breakdown with codes
- Handling + setup breakdown with math
- Editable product price override
- Full pricing rate table

> **Note:** Demo Pricing panels are for internal validation and are not required in production UI. Production should use the Selection Summary pricing box only, unless business requests admin visibility.

### 7.3 Visual Design

- Bootstrap 3.4.1 layout
- SureWerx theme (`swrx-ca.theme.min.css`)
- Brand accent color: `#D64227` (pricing highlights)
- Primary action buttons: SureWerx orange styling

---

## 8. Data Requirements

### 8.1 Session / Quote Data Model

```
Quote {
  quoteNumber: string
  status: "Not Submitted" | "Submitted"
  quoteName: string
  logoBrandName: string
  contactPerson: string
  contactEmail: string
  distributorName: string
  distributorEmail: string
  phone: string
  product: {
    sku: "XS2-500"
    name: string
    helmetColor: "Black"
    unitPrice: number
    quantity: number (>= 20)
    comments: string
  }
  logoLocations: [
    {
      locationId: 1-4
      locationName: string
      fileName: string
      width: number
      height: number
      numColors: 1-4
    }
  ]
  uniqueColors: 1-4
  pricing: {
    helmetPrice: number
    printingPricePerUnit: number
    totalPricePerUnit: number
    totalCost: number
    decoratingCosts: number
  }
}
```

### 8.2 Pricing Rate Table

- Source of truth: `Math/pricing-vertical.csv`
- Converted to JSON via `Math/convert-to-json.js` → `Math/calculation.json`
- Embedded in production front-end or served via API
- Must support quantity tier lookup and special handling/setup codes

---

## 9. Validation Summary

| Rule | Constraint | Error / Behavior |
|------|------------|------------------|
| MOQ | Quantity ≥ 20 | Auto-correct to 20 |
| File type | .pdf, .ai, .eps, .png | Alert on invalid |
| File size | ≤ 2.4 MB | TBD in production |
| Dimensions | Numeric, ≤ location max | Inline error message |
| Colors per location | 1–4, required if logo present | Disable Confirm |
| Unique colors | 1–4, ≥ max per-location | Auto-correct range |
| Confirm | All above satisfied | Button enabled |

---

## 10. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | Page shall be responsive (Bootstrap grid; mobile breakpoints in CSS) |
| NFR-02 | Pricing recalculation shall feel immediate (< 500ms on client) |
| NFR-03 | PDF generation shall complete client-side without server round-trip |
| NFR-04 | Feature shall be accessible to authenticated SureWerx Connect B2B users |
| NFR-05 | Pricing data updates shall not require code deploy (prefer API/config feed) |

---

## 11. Prototype vs Production Gaps

| Area | Prototype Behavior | Production Requirement |
|------|-------------------|------------------------|
| File upload | Name only; no server upload | Upload to storage; virus scan; size validation |
| User/contact | Hardcoded "Adam Wiener" | Pull from session / account API |
| Quote number | Static CLA00002468 | Server-generated sequential ID |
| Save Quote | Button present; no persistence | API save with confirmation |
| Submit Quote | UI status change only | API + email to Entripy + internal workflow |
| Pricing table | Embedded JS array | API or config service |
| Demo Pricing section | Visible on page | Remove or restrict to admin |
| Product price | Manual override input | Account-specific catalog price |
| Edit/Delete on quote | Non-functional icons | Full CRUD on quote line items |
| 5–6 color pricing rows | Present in CSV, unused | Remove from rate table or retain for legacy orders |

---

## 12. Acceptance Criteria

### Configuration
- [ ] User can upload logos to 1–4 locations with valid file types
- [ ] Dimension validation enforces location-specific maximums
- [ ] Color selectors only offer 1–4; unique colors respects max 4
- [ ] Confirm is disabled until all required fields are valid
- [ ] Edit restores prior configuration from summary

### Pricing
- [ ] Pricing matches rate table for all quantity tiers (20–3500+)
- [ ] Per-location cost uses that location's color count
- [ ] Setup uses unique colors (not sum of per-location colors)
- [ ] 10% markup applied to (location subtotal + handling + setup/unit)
- [ ] Summary box updates when quantity changes

### Quote
- [ ] Add to Quote populates product details and totals
- [ ] Preview Quote PDF opens with correct pricing values
- [ ] Submit Quote changes status and disables re-submit
- [ ] Important Note content matches specification

---

## 13. References

| Asset | Path |
|-------|------|
| Prototype HTML | `custom-logo-hard-hats.html` |
| Prototype CSS | `custom-logo-hard-hats.css` |
| Pricing CSV | `Math/pricing-vertical.csv` |
| Pricing JSON | `Math/calculation.json` |
| SureWerx theme reference | `SureWerx Connect CA.html` |

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-10 | — | Initial FRD from prototype; 4-color maximum enforced |
