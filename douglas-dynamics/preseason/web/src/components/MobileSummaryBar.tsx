import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { formatCurrency } from '../lib/calculations';
import { OrderSummaryPanel } from './OrderSummary';

export function MobileSummaryBar() {
  const { summary, missingShipMonthCount, lineItems } = useOrder();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="mobile-summary-bar">
        <button
          type="button"
          className="mobile-summary-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="mobile-summary-totals">
            <span className="mobile-summary-label">Order total</span>
            <span className="mobile-summary-value">{formatCurrency(summary.grandNetLessVolume)}</span>
          </div>
          <div className="mobile-summary-meta">
            <span>{lineItems.length} items</span>
            {missingShipMonthCount > 0 && (
              <span className="mobile-summary-warn">{missingShipMonthCount} missing ship mo.</span>
            )}
            <ChevronUp size={18} className={expanded ? 'rotated' : ''} />
          </div>
        </button>
      </div>
      {expanded && (
        <div className="mobile-summary-drawer">
          <OrderSummaryPanel compact />
        </div>
      )}
    </>
  );
}
