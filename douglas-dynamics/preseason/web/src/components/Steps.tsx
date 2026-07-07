import { useState } from 'react';
import { useOrder } from '../context/OrderContext';
import { countLineItemsForStep, getStepDefs } from '../lib/stepConfig';
import { validateStep0 } from '../lib/orderValidation';
import { ProductTable, ProductFilters, ServicePartsSearch } from './ProductTable';
import { BulkPartEntry } from './BulkPartEntry';
import type { CatalogKey } from '../types';

export function StepNav() {
  const { step, goToStep, program, lineItems, dealer, payment, hasStepError } = useOrder();
  const steps = getStepDefs(program);
  const step0Valid = validateStep0(dealer, payment, program).valid;

  return (
    <nav className="step-nav">
      {steps.map((s, i) => {
        const count = countLineItemsForStep(i, program, lineItems);
        const isDone = i === 0 ? step0Valid : count > 0;
        return (
          <button
            key={s.id}
            type="button"
            className={`step-btn ${i === step ? 'active' : ''} ${i < step || isDone ? 'done' : ''} ${hasStepError(i) ? 'has-error' : ''}`}
            onClick={() => goToStep(i)}
          >
            <span className="step-label">{s.label}</span>
            {count > 0 && i > 0 && i < 4 && (
              <span className="step-count">{count}</span>
            )}
            {i === 0 && step0Valid && <span className="step-check">✓</span>}
          </button>
        );
      })}
    </nav>
  );
}

export function ProductStep({ catalogKeys, title, subtitle, showUnitEquiv, showMountWarning }: {
  catalogKeys: CatalogKey[];
  title: string;
  subtitle?: string;
  showUnitEquiv?: boolean;
  showMountWarning?: boolean;
}) {
  const { catalog, getQty, setQty, getShipMonth, setShipMonth, showShipMonths, summary, hasSectionError } = useOrder();
  const [search, setSearch] = useState('');
  const [inOrderOnly, setInOrderOnly] = useState(false);

  return (
    <div className="product-step">
      <div
        id="section-products"
        className={`step-intro ${hasSectionError('section-products') ? 'has-error' : ''}`}
      >
        <h2>{title}</h2>
        {hasSectionError('section-products') && (
          <p className="section-error-msg">Add at least one product before continuing to Review.</p>
        )}
        {subtitle && <p>{subtitle}</p>}
        {showShipMonths && (
          <p className="ship-month-hint">Floor plan selected — assign a shipment month for each line item.</p>
        )}
      </div>

      {showMountWarning && summary.mountRatioWarning && (
        <div className="alert alert-warning mount-ratio-banner">
          <strong>Mount ratio exceeds 150%</strong> — volume discount may not qualify.
        </div>
      )}

      <BulkPartEntry />

      <ProductFilters
        search={search}
        onSearch={setSearch}
        inOrderOnly={inOrderOnly}
        onInOrderOnly={setInOrderOnly}
      />

      {catalogKeys.map((key) => (
        <ProductTable
          key={key}
          catalogKey={key}
          products={catalog[key] ?? []}
          getQty={(part) => getQty(key, part)}
          setQty={(part, qty) => setQty(key, part, qty)}
          getShipMonth={(part) => getShipMonth(key, part)}
          setShipMonth={(part, month) => setShipMonth(key, part, month)}
          showUnitEquiv={showUnitEquiv}
          showShipMonths={showShipMonths}
          search={search}
          inOrderOnly={inOrderOnly}
        />
      ))}
    </div>
  );
}

const TRUCK_PARTS_KEYS: CatalogKey[] = [
  'cuttingEdges', 'plowAccessories', 'hydraulic',
  'hopperAccessories', 'sidewalk', 'tailgateAccessories',
];

const NONTRUCK_PARTS_KEYS: CatalogKey[] = [
  'cuttingEdges', 'plowAccessories', 'hydraulic',
  'hopperAccessories', 'sidewalk', 'tailgateAccessories',
];

export function PartsStep() {
  const {
    catalog, getQty, setQty, getShipMonth, setShipMonth, showShipMonths, program,
  } = useOrder();
  const [search, setSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [inOrderOnly, setInOrderOnly] = useState(false);
  const keys = program === 'truck' ? TRUCK_PARTS_KEYS : NONTRUCK_PARTS_KEYS;

  return (
    <div className="product-step">
      <div className="step-intro">
        <h2>Parts, Accessories & Sidewalk Products</h2>
        <p>Standard 40% dealer discount applies. Volume discounts available on cutting edges and hydraulic products.</p>
        {showShipMonths && (
          <p className="ship-month-hint">Floor plan selected — assign a shipment month for each line item.</p>
        )}
      </div>

      <BulkPartEntry />

      <ProductFilters
        search={search}
        onSearch={setSearch}
        inOrderOnly={inOrderOnly}
        onInOrderOnly={setInOrderOnly}
      />

      {keys.map((key) => (
        <ProductTable
          key={key}
          catalogKey={key}
          products={catalog[key] ?? []}
          getQty={(part) => getQty(key, part)}
          setQty={(part, qty) => setQty(key, part, qty)}
          getShipMonth={(part) => getShipMonth(key, part)}
          setShipMonth={(part, month) => setShipMonth(key, part, month)}
          showShipMonths={showShipMonths}
          search={search}
          inOrderOnly={inOrderOnly}
        />
      ))}

      <div className="step-intro" style={{ marginTop: '2rem' }}>
        <h2>Service Parts</h2>
        <p>Search from 4,600+ service parts by part number or description.</p>
      </div>
      <ServicePartsSearch
        catalogKey="serviceParts"
        products={catalog.serviceParts ?? []}
        getQty={(part) => getQty('serviceParts', part)}
        setQty={(part, qty) => setQty('serviceParts', part, qty)}
        getShipMonth={(part) => getShipMonth('serviceParts', part)}
        setShipMonth={(part, month) => setShipMonth('serviceParts', part, month)}
        showShipMonths={showShipMonths}
        search={serviceSearch}
        onSearch={setServiceSearch}
        inOrderOnly={inOrderOnly}
      />
    </div>
  );
}
