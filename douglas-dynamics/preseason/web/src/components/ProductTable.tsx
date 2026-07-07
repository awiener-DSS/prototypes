import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Filter, Search } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { shipMonthFieldId } from '../lib/orderValidation';
import { PartNumberLink } from './PartPreview';
import type { CatalogKey, Product, ShipMonth } from '../types';
import { SHIP_MONTHS } from '../types';
import { formatCurrency } from '../lib/calculations';

interface ProductTableProps {
  catalogKey: CatalogKey;
  products: Product[];
  getQty: (part: string) => number;
  setQty: (part: string, qty: number) => void;
  getShipMonth?: (part: string) => ShipMonth;
  setShipMonth?: (part: string, month: ShipMonth) => void;
  showUnitEquiv?: boolean;
  showShipMonths?: boolean;
  search?: string;
  inOrderOnly?: boolean;
}

function matchesSearch(p: Product, q: string) {
  if (!q) return true;
  const lower = q.toLowerCase();
  return p.part.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower);
}

export function ProductTable({
  catalogKey,
  products,
  getQty,
  setQty,
  getShipMonth,
  setShipMonth,
  showUnitEquiv,
  showShipMonths,
  search = '',
  inOrderOnly = false,
}: ProductTableProps) {
  const { hasFieldError, hasSectionError, clearValidation, validationIssues } = useOrder();
  const sectionId = `section-catalog-${catalogKey}`;

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      if (!matchesSearch(p, search)) continue;
      const qty = getQty(p.part);
      if (inOrderOnly && qty === 0) continue;
      const cat = p.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return [...map.entries()];
  }, [products, search, inOrderOnly, getQty]);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const categoryHasError = (items: Product[]) =>
    items.some((p) => hasFieldError(shipMonthFieldId(catalogKey, p.part)));

  useEffect(() => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (const [category, items] of grouped) {
        if (categoryHasError(items)) next.delete(category);
      }
      return next;
    });
  }, [grouped, validationIssues, catalogKey]);

  const toggleCategory = (category: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  if (grouped.length === 0) {
    return (
      <p className="table-empty-hint">
        {inOrderOnly ? 'No items in this section match your order.' : 'No products match your search.'}
      </p>
    );
  }

  return (
    <div id={sectionId} className={`product-sections ${hasSectionError(sectionId) ? 'has-error' : ''}`}>
      {hasSectionError(sectionId) && (
        <p className="section-error-msg">Complete required ship months for items in this section.</p>
      )}
      {grouped.map(([category, items]) => {
        const isCollapsed = collapsed.has(category) && !categoryHasError(items);
        const inOrderCount = items.filter((p) => getQty(p.part) > 0).length;
        return (
          <div key={category} className="product-category">
            <button
              type="button"
              className="category-title category-toggle"
              onClick={() => toggleCategory(category)}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              <span>{category}</span>
              {inOrderCount > 0 && <span className="category-count">{inOrderCount} in order</span>}
            </button>
            {!isCollapsed && (
              <div className="table-wrap">
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Part #</th>
                      <th>Description</th>
                      <th className="num">List Price</th>
                      {showUnitEquiv && <th className="num">Units</th>}
                      <th className="num">Qty</th>
                      {showShipMonths && <th>Ship Month</th>}
                      <th className="num">Extended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => {
                      const qty = getQty(p.part);
                      const extended = qty * p.listPrice * 0.6;
                      const missingShip = showShipMonths && qty > 0 && !getShipMonth?.(p.part);
                      const shipFieldId = shipMonthFieldId(catalogKey, p.part);
                      const shipInvalid = hasFieldError(shipFieldId);
                      return (
                        <tr key={p.part} className={`${qty > 0 ? 'has-qty' : ''} ${missingShip || shipInvalid ? 'missing-ship' : ''}`}>
                          <td className="part-num">
                            <PartNumberLink part={p.part} product={p} catalogKey={catalogKey} />
                          </td>
                          <td>{p.description}</td>
                          <td className="num">{formatCurrency(p.listPrice)}</td>
                          {showUnitEquiv && (
                            <td className="num muted">{p.unitEquiv ?? '—'}</td>
                          )}
                          <td className="num">
                            <input
                              type="number"
                              min={0}
                              value={qty || ''}
                              placeholder="0"
                              onChange={(e) => {
                                clearValidation();
                                setQty(p.part, Math.max(0, parseInt(e.target.value, 10) || 0));
                              }}
                              className="qty-input"
                              aria-label={`Quantity for ${p.part}`}
                            />
                          </td>
                          {showShipMonths && (
                            <td>
                              {qty > 0 ? (
                                <select
                                  id={shipFieldId}
                                  className={`month-select ${missingShip || shipInvalid ? 'required' : ''}`}
                                  value={getShipMonth?.(p.part) ?? ''}
                                  onChange={(e) => {
                                    clearValidation();
                                    setShipMonth?.(p.part, e.target.value as ShipMonth);
                                  }}
                                  aria-invalid={shipInvalid}
                                  aria-label={`Ship month for ${p.part}`}
                                >
                                  <option value="">Select month *</option>
                                  {SHIP_MONTHS.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                              ) : '—'}
                            </td>
                          )}
                          <td className="num extended">{qty > 0 ? formatCurrency(extended) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProductFilters({
  search,
  onSearch,
  inOrderOnly,
  onInOrderOnly,
}: {
  search: string;
  onSearch: (q: string) => void;
  inOrderOnly: boolean;
  onInOrderOnly: (v: boolean) => void;
}) {
  return (
    <div className="product-filters">
      <div className="search-bar">
        <Search size={18} />
        <input
          type="search"
          placeholder="Filter by part # or description..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={inOrderOnly}
          onChange={(e) => onInOrderOnly(e.target.checked)}
        />
        <Filter size={14} />
        In my order only
      </label>
    </div>
  );
}

const SERVICE_PAGE_SIZE = 50;

interface ServicePartsSearchProps {
  catalogKey: CatalogKey;
  products: Product[];
  getQty: (part: string) => number;
  setQty: (part: string, qty: number) => void;
  getShipMonth?: (part: string) => ShipMonth;
  setShipMonth?: (part: string, month: ShipMonth) => void;
  showShipMonths?: boolean;
  search: string;
  onSearch: (q: string) => void;
  inOrderOnly?: boolean;
}

export function ServicePartsSearch({
  catalogKey,
  products,
  getQty,
  setQty,
  getShipMonth,
  setShipMonth,
  showShipMonths,
  search,
  onSearch,
  inOrderOnly = false,
}: ServicePartsSearchProps) {
  const { hasFieldError, clearValidation } = useOrder();
  const [page, setPage] = useState(0);

  const allResults = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return products.filter((p) => {
      const qty = getQty(p.part);
      if (inOrderOnly && qty === 0) return false;
      return p.part.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    });
  }, [products, search, inOrderOnly, getQty]);

  const totalPages = Math.max(1, Math.ceil(allResults.length / SERVICE_PAGE_SIZE));
  const results = allResults.slice(page * SERVICE_PAGE_SIZE, (page + 1) * SERVICE_PAGE_SIZE);

  const handleSearch = (q: string) => {
    onSearch(q);
    setPage(0);
  };

  return (
    <div className="service-parts">
      <div className="search-bar">
        <Search size={18} />
        <input
          type="search"
          placeholder="Search 4,600+ service parts by part # or description..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      {search.length >= 2 && (
        <>
          <div className="table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Part #</th>
                  <th>Description</th>
                  <th className="num">List</th>
                  <th className="num">Qty</th>
                  {showShipMonths && <th>Ship Month</th>}
                  <th className="num">Extended</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr><td colSpan={showShipMonths ? 6 : 5} className="empty">No parts found</td></tr>
                ) : (
                  results.map((p) => {
                    const qty = getQty(p.part);
                    const missingShip = showShipMonths && qty > 0 && !getShipMonth?.(p.part);
                    const shipFieldId = shipMonthFieldId(catalogKey, p.part);
                    const shipInvalid = hasFieldError(shipFieldId);
                    return (
                      <tr key={p.part} className={`${qty > 0 ? 'has-qty' : ''} ${missingShip || shipInvalid ? 'missing-ship' : ''}`}>
                        <td className="part-num">
                          <PartNumberLink part={p.part} product={p} catalogKey={catalogKey} />
                        </td>
                        <td>{p.description}</td>
                        <td className="num">{formatCurrency(p.listPrice)}</td>
                        <td className="num">
                          <input
                            type="number"
                            min={0}
                            value={qty || ''}
                            placeholder="0"
                            onChange={(e) => {
                              clearValidation();
                              setQty(p.part, Math.max(0, parseInt(e.target.value, 10) || 0));
                            }}
                            className="qty-input"
                          />
                        </td>
                        {showShipMonths && (
                          <td>
                            {qty > 0 ? (
                              <select
                                id={shipFieldId}
                                className={`month-select ${missingShip || shipInvalid ? 'required' : ''}`}
                                value={getShipMonth?.(p.part) ?? ''}
                                onChange={(e) => {
                                  clearValidation();
                                  setShipMonth?.(p.part, e.target.value as ShipMonth);
                                }}
                                aria-invalid={shipInvalid}
                                aria-label={`Ship month for ${p.part}`}
                              >
                                <option value="">Select month *</option>
                                {SHIP_MONTHS.map((m) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            ) : '—'}
                          </td>
                        )}
                        <td className="num">{qty > 0 ? formatCurrency(qty * p.listPrice * 0.6) : '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {allResults.length > SERVICE_PAGE_SIZE && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page + 1} of {totalPages} ({allResults.length} results)
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
