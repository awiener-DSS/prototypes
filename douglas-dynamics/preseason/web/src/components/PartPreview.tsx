import { useState } from 'react';
import { Info, Search, X } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { usePartPreview } from '../context/PartPreviewContext';
import { formatCurrency, STANDARD_DISCOUNT, TRUCK_META, NONTRUCK_META } from '../lib/calculations';
import { sheetForKey, unitTypeLabel } from '../lib/excelRefs';
import type { CatalogKey, Product } from '../types';

function catalogLabel(key: CatalogKey, program: 'truck' | 'nontruck'): string {
  const meta = program === 'truck' ? TRUCK_META : NONTRUCK_META;
  return meta[key]?.label ?? key;
}

export function PartPreviewModal() {
  const { preview, closePartPreview, lookupPart, openPartPreview } = usePartPreview();
  const { program, getQty, getShipMonth, isAdmin } = useOrder();
  const [lookupInput, setLookupInput] = useState('');
  const [lookupError, setLookupError] = useState('');

  if (!preview) return null;

  const { product, catalogKey } = preview;
  const qty = getQty(catalogKey, product.part);
  const shipMonth = getShipMonth(catalogKey, product.part);
  const netUnit = product.listPrice * (1 - STANDARD_DISCOUNT);
  const extendedNet = qty * netUnit;
  const unitContrib = product.unitEquiv ? qty * product.unitEquiv : null;

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const found = lookupPart(lookupInput);
    if (found) {
      openPartPreview(found.product, found.catalogKey);
      setLookupInput('');
      setLookupError('');
    } else {
      setLookupError(`Part "${lookupInput}" not found in ${program} catalog.`);
    }
  };

  return (
    <div className="part-preview-overlay" onClick={closePartPreview}>
      <div className="part-preview-modal" onClick={(e) => e.stopPropagation()}>
        <header className="part-preview-header">
          <div>
            <span className="part-preview-label">Part Details</span>
            <h2 className="part-preview-number">{product.part}</h2>
          </div>
          <button className="audit-close" onClick={closePartPreview} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="part-preview-body">
          <p className="part-preview-description">{product.description}</p>

          <div className="part-preview-tags">
            <span className="part-tag">{catalogLabel(catalogKey, program)}</span>
            {product.category && <span className="part-tag muted">{product.category}</span>}
            {product.type && <span className="part-tag type">{unitTypeLabel(product.type)}</span>}
          </div>

          <div className="part-preview-grid">
            <DetailRow label="List Price" value={formatCurrency(product.listPrice)} excel={isAdmin ? 'P column' : undefined} />
            <DetailRow
              label="Net Unit Price"
              value={formatCurrency(netUnit)}
              excel={isAdmin ? `Q = P × (1 − ${STANDARD_DISCOUNT})` : undefined}
            />
            <DetailRow label="Standard Discount" value={`${STANDARD_DISCOUNT * 100}%`} excel={isAdmin ? 'P5' : undefined} />
            {product.unitEquiv != null && (
              <DetailRow label="Unit Equivalent" value={String(product.unitEquiv)} excel={isAdmin ? 'W column' : undefined} />
            )}
            {isAdmin && <DetailRow label="Excel Sheet" value={sheetForKey(catalogKey)} />}
            {isAdmin && <DetailRow label="Catalog Section" value={catalogKey} />}
          </div>

          {qty > 0 && (
            <div className="part-preview-order">
              <h3>On This Order</h3>
              <div className="part-preview-grid">
                <DetailRow label="Quantity" value={String(qty)} />
                <DetailRow label="Extended Net" value={formatCurrency(extendedNet)} excel={isAdmin ? 'R = A × Q' : undefined} />
                {unitContrib != null && (
                  <DetailRow label="Unit Contribution" value={unitContrib.toFixed(2)} excel={isAdmin ? 'V = W × A' : undefined} />
                )}
                {shipMonth && <DetailRow label="Ship Month" value={shipMonth} />}
              </div>
            </div>
          )}

          <form className="part-lookup-form" onSubmit={handleLookup}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Look up another part #..."
              value={lookupInput}
              onChange={(e) => { setLookupInput(e.target.value); setLookupError(''); }}
            />
            <button type="submit" className="btn btn-secondary btn-sm">Look up</button>
          </form>
          {lookupError && <p className="part-lookup-error">{lookupError}</p>}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, excel }: { label: string; value: string; excel?: string }) {
  return (
    <div className="part-detail-row">
      <span className="part-detail-label">
        {label}
        {excel && <code className="part-detail-excel">{excel}</code>}
      </span>
      <span className="part-detail-value">{value}</span>
    </div>
  );
}

interface PartNumberLinkProps {
  part: string;
  product: Product;
  catalogKey: CatalogKey;
}

export function PartNumberLink({ part, product, catalogKey }: PartNumberLinkProps) {
  const { openPartPreview } = usePartPreview();

  return (
    <button
      type="button"
      className="part-num-link"
      onClick={() => openPartPreview(product, catalogKey)}
      title="View part details"
    >
      <span>{part}</span>
      <Info size={12} className="part-info-icon" />
    </button>
  );
}
