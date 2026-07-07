import { useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, Download, Package, Pencil, Send, Snowflake, Truck } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { formatCurrency, formatNumber } from '../lib/calculations';
import { EXCEL_WORKBOOK, EXCEL_WORKBOOK_DOWNLOAD } from '../lib/excelRefs';
import { exportOrderPdf, submitOrder } from '../lib/orderExport';
import { validateOrderReady } from '../lib/orderValidation';
import { getVolumeHints } from '../lib/volumeHints';
import { getQualificationMotivators, type QualificationMotivator } from '../lib/qualificationHints';
import { effectiveShipMonth } from '../lib/shipMonth';
import { PartNumberLink } from './PartPreview';

export function OrderSummaryPanel({ compact = false }: { compact?: boolean }) {
  const {
    summary, dealer, payment, program, isAdmin, setShowAuditPanel,
    missingShipMonthCount, lineItems,
  } = useOrder();

  const volumeHints = getVolumeHints(summary);
  const qualificationMotivators = getQualificationMotivators(summary, program);
  const showMotivators = lineItems.length > 0;

  return (
    <div className={`summary-panel ${compact ? 'compact' : ''}`}>
      <div className="summary-header">
        <h2>Order Summary</h2>
        <p className="dealer-name">{dealer.dealerName || 'New Order'}</p>
        {lineItems.length > 0 && (
          <p className="summary-item-count">{lineItems.length} line item{lineItems.length === 1 ? '' : 's'}</p>
        )}
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <Snowflake size={20} />
          <div>
            <span className="stat-label">Plow Units</span>
            <span className="stat-value">{formatNumber(summary.plowUnits)}</span>
          </div>
        </div>
        <div className="stat-card">
          <Truck size={20} />
          <div>
            <span className="stat-label">Hoppers</span>
            <span className="stat-value">{summary.hopperUnits}</span>
          </div>
        </div>
        <div className="stat-card">
          <Package size={20} />
          <div>
            <span className="stat-label">Program Units</span>
            <span className="stat-value">{formatNumber(summary.totalProgramUnits)}</span>
          </div>
        </div>
      </div>

      {missingShipMonthCount > 0 && (
        <div className="alert alert-warning">
          <AlertTriangle size={16} />
          {missingShipMonthCount} item{missingShipMonthCount === 1 ? '' : 's'} missing ship month
        </div>
      )}

      {summary.mountRatioWarning && (
        <div className="alert alert-warning">
          <AlertTriangle size={16} />
          Mounts exceed 150% of plow equivalents. Volume discount may not qualify.
        </div>
      )}

      {volumeHints.length > 0 && (
        <div className="volume-hints">
          {volumeHints.map((hint) => (
            <div key={hint.id} className="volume-hint">
              <span className="volume-hint-label">{hint.label}</span>
              <span className="volume-hint-msg">{hint.message}</span>
            </div>
          ))}
        </div>
      )}

      {showMotivators && qualificationMotivators.length > 0 && (
        <div className="qualification-motivators">
          <h3 className="qualification-motivators-title">Program Benefits</h3>
          {qualificationMotivators.map((motivator) => (
            <QualificationMotivatorCard key={motivator.id} motivator={motivator} />
          ))}
        </div>
      )}

      {summary.categories.length > 0 && (
        <div className="category-breakdown">
          {summary.categories.map((cat) => (
            <div key={cat.key} className="cat-row">
              <div className="cat-name">{cat.label}</div>
              <div className="cat-nums">
                <span>{formatCurrency(cat.netLessVolume)}</span>
                {cat.volumeSavings > 0 && (
                  <span className="savings">-{formatCurrency(cat.volumeSavings)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="totals">
        <div className="total-row">
          <span>Net Total</span>
          <span>{formatCurrency(summary.grandTotal)}</span>
        </div>
        <div className="total-row savings-row">
          <span>Volume Savings</span>
          <span>-{formatCurrency(summary.grandVolumeSavings)}</span>
        </div>
        <div className="total-row grand">
          <span>Net Less Volume</span>
          <span>{formatCurrency(summary.grandNetLessVolume)}</span>
        </div>
      </div>

      {!compact && payment.snowplows && (
        <div className="payment-summary">
          <h4>Payment Terms</h4>
          {Object.entries(payment).map(([k, v]) => v && (
            <p key={k}><strong>{k}:</strong> {v}</p>
          ))}
        </div>
      )}

      {!compact && isAdmin && (
        <a
          href={EXCEL_WORKBOOK_DOWNLOAD}
          className="audit-workbook-sidebar-link"
          download={EXCEL_WORKBOOK}
        >
          <Download size={16} /> Download Excel workbook
        </a>
      )}

      {!compact && isAdmin && (
        <button type="button" className="btn btn-secondary audit-sidebar-btn" onClick={() => setShowAuditPanel(true)}>
          <Calculator size={16} /> View Calc Audit
        </button>
      )}
    </div>
  );
}

function QualificationMotivatorCard({ motivator }: { motivator: QualificationMotivator }) {
  return (
    <div className={`qualification-motivator ${motivator.qualified ? 'qualified' : ''}`}>
      <div className="qualification-motivator-header">
        <span className="qualification-motivator-label">
          {motivator.qualified ? <CheckCircle2 size={14} /> : <span className="dot" />}
          {motivator.label}
        </span>
        <span className="qualification-motivator-pct">{motivator.progress}%</span>
      </div>
      <div className="qualification-progress">
        <div
          className="qualification-progress-fill"
          style={{ width: `${motivator.progress}%` }}
        />
      </div>
      <p className="qualification-motivator-msg">{motivator.message}</p>
    </div>
  );
}

function ReviewEditLink({ step, label }: { step: number; label: string }) {
  const { goToStep } = useOrder();
  return (
    <button type="button" className="review-edit-link" onClick={() => goToStep(step)}>
      <Pencil size={14} /> {label}
    </button>
  );
}

export function FinalReview() {
  const { dealer, summary, lineItems, catalog, program, payment, showValidationIssues, showShipMonths } = useOrder();
  const qualificationMotivators = getQualificationMotivators(summary, program);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; message: string } | null>(null);

  const orderedItems = lineItems
    .map((item) => {
      const product = catalog[item.catalogKey]?.find((p) => p.part === item.part);
      if (!product) return null;
      return { ...item, product, extended: item.qty * product.listPrice * 0.6 };
    })
    .filter(Boolean);

  const orderData = { program, dealer, payment, lineItems, catalog, summary };

  const handlePdf = () => exportOrderPdf(orderData);

  const handleSubmit = async () => {
    const validation = validateOrderReady(dealer, payment, program, lineItems);
    if (!validation.valid) {
      showValidationIssues(validation.issues);
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);
    try {
      const result = await submitOrder(orderData);
      setSubmitResult({ ok: true, message: result.message });
    } catch (err) {
      setSubmitResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Submission failed. Is the API server running?',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="final-review">
      <div className="review-section">
        <div className="review-section-header">
          <h2>Dealer Information</h2>
          <ReviewEditLink step={0} label="Edit" />
        </div>
        <dl className="review-dl">
          <dt>Program</dt><dd>{program === 'truck' ? 'Truck Program' : 'Non-Truck Program'}</dd>
          <dt>Account #</dt><dd>{dealer.accountNumber || '—'}</dd>
          <dt>Dealer</dt><dd>{dealer.dealerName || '—'}</dd>
          <dt>PO #</dt><dd>{dealer.poNumber || '—'}</dd>
          <dt>Contact</dt><dd>{dealer.contact ? `${dealer.contact} · ${dealer.phone}` : '—'}</dd>
          <dt>Ship To</dt><dd>{dealer.address ? `${dealer.address}, ${dealer.cityState} ${dealer.zipCode}` : '—'}</dd>
        </dl>
      </div>

      <div className="review-section">
        <div className="review-section-header">
          <h2>Line Items ({orderedItems.length})</h2>
          <div className="review-edit-group">
            <ReviewEditLink step={1} label="Plows" />
            <ReviewEditLink step={2} label="Spreaders" />
            <ReviewEditLink step={3} label="Parts" />
          </div>
        </div>
        {orderedItems.length === 0 ? (
          <p className="review-empty">No products added yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="product-table compact">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Description</th>
                  <th className="num">Qty</th>
                  <th>Ship Month</th>
                  <th className="num">Net</th>
                </tr>
              </thead>
              <tbody>
                {orderedItems.map((item) => item && (
                  <tr
                    key={`${item.catalogKey}-${item.part}`}
                    className={
                      showShipMonths && !effectiveShipMonth(item, payment, program) ? 'missing-ship' : ''
                    }
                  >
                    <td className="part-num">
                      <PartNumberLink part={item.part} product={item.product} catalogKey={item.catalogKey} />
                    </td>
                    <td>{item.product.description}</td>
                    <td className="num">{item.qty}</td>
                    <td>{effectiveShipMonth(item, payment, program) || '—'}</td>
                    <td className="num">{formatCurrency(item.extended)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="review-section">
        <h2>Program Qualification</h2>
        <div className="qual-grid">
          <div><strong>Total Program Units:</strong> {formatNumber(summary.totalProgramUnits)}</div>
          <div><strong>P&A Dollars:</strong> {formatCurrency(summary.partsDollars)}</div>
        </div>
        {qualificationMotivators.length > 0 && (
          <div className="qualification-motivators review-motivators">
            {qualificationMotivators.map((motivator) => (
              <QualificationMotivatorCard key={motivator.id} motivator={motivator} />
            ))}
          </div>
        )}
      </div>

      <div className="review-section totals-box">
        <div className="total-row grand">
          <span>Order Total (Net Less Volume Savings)</span>
          <span>{formatCurrency(summary.grandNetLessVolume)}</span>
        </div>
      </div>

      <div className="review-actions">
        <button type="button" className="btn btn-secondary" onClick={handlePdf}>
          <Download size={18} /> Download PDF
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          <Send size={18} /> {submitting ? 'Submitting...' : 'Submit Order'}
        </button>
      </div>

      {submitResult && (
        <div className={`alert ${submitResult.ok ? 'alert-success' : 'alert-warning'}`}>
          {submitResult.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {submitResult.message}
        </div>
      )}

      <p className="submit-note">
        Submit saves your order to the server. Download PDF for your records or email to your Western Products representative.
      </p>
    </div>
  );
}
