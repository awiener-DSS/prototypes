import { useState } from 'react';
import { Calculator, ChevronDown, ChevronRight, Copy, Download, X } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { formatCurrency } from '../lib/calculations';
import { EXCEL_WORKBOOK, EXCEL_WORKBOOK_DOWNLOAD } from '../lib/excelRefs';
import type { LineCalcStep } from '../types';

type AuditTab = 'lines' | 'categories' | 'units' | 'qualify' | 'constants';

function StepRow({ step }: { step: LineCalcStep }) {
  const display =
    typeof step.value === 'number'
      ? Number.isInteger(step.value) && step.value > 100
        ? formatCurrency(step.value)
        : typeof step.value === 'number' && step.value < 1 && step.value > 0
          ? `${(step.value * 100).toFixed(1)}%`
          : step.value
      : step.value;

  return (
    <div className="audit-step">
      <div className="audit-step-header">
        <span className="audit-label">{step.label}</span>
        <code className="audit-ref">{step.excelRef}</code>
      </div>
      <div className="audit-formula">{step.formula}</div>
      <div className="audit-value">= {display}</div>
    </div>
  );
}

function CopyAuditButton() {
  const { audit } = useOrder();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(audit, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
      <Copy size={14} /> {copied ? 'Copied!' : 'Export JSON'}
    </button>
  );
}

export function AdminCalcPanel() {
  const { audit, isAdmin, showAuditPanel, setShowAuditPanel, program } = useOrder();
  const [tab, setTab] = useState<AuditTab>('lines');
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  if (!isAdmin || !showAuditPanel) return null;

  const toggleLine = (key: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const tabs: { id: AuditTab; label: string; count?: number }[] = [
    { id: 'lines', label: 'Line Items', count: audit.lineItems.length },
    { id: 'categories', label: 'Categories', count: audit.categories.length },
    { id: 'units', label: 'Units & Mounts' },
    { id: 'qualify', label: 'Qualification' },
    { id: 'constants', label: 'Constants' },
  ];

  return (
    <div className="audit-overlay" onClick={() => setShowAuditPanel(false)}>
      <div className="audit-panel" onClick={(e) => e.stopPropagation()}>
        <header className="audit-header">
          <div>
            <h2><Calculator size={20} /> Calculation Audit</h2>
            <p className="audit-subtitle">
              {audit.excelWorkbook} · {program === 'truck' ? 'Truck' : 'Non-Truck'} Program
            </p>
          </div>
          <div className="audit-header-actions">
            <a
              href={EXCEL_WORKBOOK_DOWNLOAD}
              className="audit-workbook-link"
              download={EXCEL_WORKBOOK}
              title={`Download ${EXCEL_WORKBOOK} for side-by-side comparison`}
            >
              <Download size={14} />
              Download spreadsheet
            </a>
            <CopyAuditButton />
            <button className="audit-close" onClick={() => setShowAuditPanel(false)} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="audit-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`audit-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.count !== undefined && <span className="audit-count">{t.count}</span>}
            </button>
          ))}
        </div>

        <div className="audit-body">
          {tab === 'lines' && (
            <div className="audit-section">
              <p className="audit-intro">
                Each line mirrors Excel columns: <strong>P</strong> (list) → <strong>Q</strong> (net unit) →{' '}
                <strong>R</strong> (extended) → <strong>V</strong> (unit contribution).
              </p>
              {audit.lineItems.length === 0 ? (
                <p className="audit-empty">Add products to see line-level calculations.</p>
              ) : (
                audit.lineItems.map((line) => {
                  const key = `${line.catalogKey}-${line.part}`;
                  const open = expandedLines.has(key);
                  return (
                    <div key={key} className="audit-line-card">
                      <button className="audit-line-header" onClick={() => toggleLine(key)}>
                        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span className="part-num">{line.part}</span>
                        <span className="audit-line-desc">{line.description}</span>
                        <code className="audit-sheet-tag">{line.excelSheet}</code>
                        <span className="audit-line-qty">×{line.qty}</span>
                      </button>
                      {open && (
                        <div className="audit-line-steps">
                          {line.steps.map((s) => (
                            <StepRow key={s.label} step={s} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'categories' && (
            <div className="audit-section">
              <p className="audit-intro">
                Category totals and volume discount logic — matches Excel summary rows (R13, T14, R12, etc.).
              </p>
              {audit.categories.length === 0 ? (
                <p className="audit-empty">No category totals yet.</p>
              ) : (
                audit.categories.map((cat) => (
                  <div key={cat.key} className="audit-cat-card">
                    <div className="audit-cat-header">
                      <h3>{cat.label}</h3>
                      <code>{cat.excelSheet}</code>
                    </div>
                    <div className="audit-cat-summary">
                      <span>List: {formatCurrency(cat.totalList)}</span>
                      <span>Net: {formatCurrency(cat.totalNet)}</span>
                      <span>Vol Savings: {formatCurrency(cat.volumeSavings)}</span>
                      <span className="highlight">Net Less Vol: {formatCurrency(cat.netLessVolume)}</span>
                    </div>
                    {cat.volumeSteps.map((s) => (
                      <StepRow key={s.label} step={s} />
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'units' && (
            <div className="audit-section">
              <h3 className="audit-section-title">Unit Breakdown</h3>
              {audit.unitBreakdown.map((s) => (
                <StepRow key={s.label} step={s} />
              ))}
              <h3 className="audit-section-title">Mount Ratio Check</h3>
              {audit.mountRatio.map((s) => (
                <StepRow key={s.label} step={s} />
              ))}
              <h3 className="audit-section-title">Volume Tier Table</h3>
              {audit.volumeTierLookup.map((s) => (
                <StepRow key={s.label} step={s} />
              ))}
            </div>
          )}

          {tab === 'qualify' && (
            <div className="audit-section">
              <p className="audit-intro">
                Freight & preseason qualification from <strong>{audit.excelWorkbook}</strong> → Volume &amp; Freight Summary sheet.
              </p>
              {audit.qualifications.map((q) => (
                <div key={q.label} className={`audit-qual-card ${q.result ? 'pass' : 'fail'}`}>
                  <div className="audit-qual-header">
                    <span>{q.label}</span>
                    <span className={`qual-result ${q.result ? 'yes' : 'no'}`}>
                      {q.result ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <code className="audit-ref">{q.excelRef}</code>
                  <div className="audit-formula">{q.formula}</div>
                  <div className="audit-qual-detail">
                    <span>Threshold: {q.threshold}</span>
                    <span>Actual: {q.actual}</span>
                  </div>
                </div>
              ))}
              <h3 className="audit-section-title">Order Totals</h3>
              {audit.totals.map((s) => (
                <StepRow key={s.label} step={s} />
              ))}
            </div>
          )}

          {tab === 'constants' && (
            <div className="audit-section">
              <p className="audit-intro">
                Fixed values from the Excel workbook used in all calculations.
              </p>
              {audit.constants.map((s) => (
                <StepRow key={s.label} step={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminToggle() {
  const { isAdmin, showAuditPanel, setShowAuditPanel, toggleAdmin, audit } = useOrder();

  if (!isAdmin) {
    return (
      <button className="admin-unlock-btn" onClick={toggleAdmin} title="Enter admin mode">
        Admin
      </button>
    );
  }

  return (
    <div className="admin-controls">
      <button
        className="admin-mode-btn active"
        onClick={toggleAdmin}
        title="Exit admin mode — view as dealer"
      >
        Admin · ON
      </button>
      <button
        className={`admin-audit-btn ${showAuditPanel ? 'active' : ''}`}
        onClick={() => setShowAuditPanel(!showAuditPanel)}
        title={showAuditPanel ? 'Hide calculation audit' : 'Show calculation audit'}
      >
        <Calculator size={16} />
        Calc Audit
        {audit.lineItems.length > 0 && (
          <span className="audit-badge">{audit.lineItems.length}</span>
        )}
      </button>
    </div>
  );
}
