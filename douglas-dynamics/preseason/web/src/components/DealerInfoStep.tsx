import { useOrder } from '../context/OrderContext';
import configData from '../data/config.json';
import type { ProgramType } from '../types';

const TRUCK_TERM_GROUPS = [
  { key: 'snowplows' as const, label: 'Snowplows', terms: configData.paymentTerms.snowplows },
  { key: 'hopper' as const, label: 'Hoppers & Pre-Wet', terms: configData.paymentTerms.hopperTailgate },
  { key: 'tailgate' as const, label: 'Tailgate Spreaders', terms: configData.paymentTerms.hopperTailgate },
  { key: 'partsAccessories' as const, label: 'Parts, Accessories & Sidewalk', terms: configData.paymentTerms.snowplows },
];

const NONTRUCK_TERM_GROUPS = [
  { key: 'snowplows' as const, label: 'Non-Truck Snowplows', terms: configData.paymentTerms.nonTruck },
  { key: 'hopper' as const, label: 'Hoppers & Drop Spreaders', terms: configData.paymentTerms.nonTruck },
  { key: 'tailgate' as const, label: 'Tailgate Spreaders', terms: configData.paymentTerms.nonTruck },
  { key: 'rotaryBroom' as const, label: 'Rotary Broom', terms: configData.paymentTerms.nonTruck },
  { key: 'partsAccessories' as const, label: 'Parts, Accessories & Sidewalk', terms: configData.paymentTerms.nonTruck },
];

export function ProgramSelector() {
  const { program, trySetProgram } = useOrder();

  return (
    <div className="program-selector">
      <button
        type="button"
        className={`program-btn ${program === 'truck' ? 'active' : ''}`}
        onClick={() => trySetProgram('truck')}
      >
        Truck Program
      </button>
      <button
        type="button"
        className={`program-btn ${program === 'nontruck' ? 'active' : ''}`}
        onClick={() => trySetProgram('nontruck')}
      >
        Non-Truck Program
      </button>
    </div>
  );
}

export function DealerInfoStep() {
  const { dealer, setDealer, program, hasFieldError, hasSectionError, clearValidation } = useOrder();

  const update = (field: keyof typeof dealer, value: string) => {
    clearValidation();
    setDealer({ ...dealer, [field]: value });
  };

  const fieldClass = (fieldId: string) => (hasFieldError(fieldId) ? 'field-error' : '');
  const sectionClass = (sectionId: string) =>
    hasSectionError(sectionId) ? 'form-section has-error' : 'form-section';

  return (
    <div className="form-grid">
      <section className="form-section full">
        <h2>Program Selection</h2>
        <ProgramSelector />
        <p className="program-hint">
          {program === 'truck'
            ? 'Truck-mounted snowplows, hopper spreaders, tailgates, and related products.'
            : 'UTV, tractor, pusher, and skid-steer plows plus non-truck spreaders and accessories.'}
        </p>
      </section>

      <section id="section-contact" className={sectionClass('section-contact')}>
        <h2>Account & Contact Info</h2>
        {hasSectionError('section-contact') && (
          <p className="section-error-msg">Please complete all required contact fields.</p>
        )}
        <div className="fields two-col">
          <label className={fieldClass('field-accountNumber')}>
            Account # <span className="req">*</span>
            <input
              id="field-accountNumber"
              value={dealer.accountNumber}
              onChange={(e) => update('accountNumber', e.target.value)}
              aria-invalid={hasFieldError('field-accountNumber')}
            />
          </label>
          <label className={fieldClass('field-dealerName')}>
            Dealer Name <span className="req">*</span>
            <input
              id="field-dealerName"
              value={dealer.dealerName}
              onChange={(e) => update('dealerName', e.target.value)}
              aria-invalid={hasFieldError('field-dealerName')}
            />
          </label>
          <label className={fieldClass('field-poNumber')}>
            PO # <span className="req">*</span>
            <input
              id="field-poNumber"
              value={dealer.poNumber}
              onChange={(e) => update('poNumber', e.target.value)}
              aria-invalid={hasFieldError('field-poNumber')}
            />
          </label>
          <label className={fieldClass('field-contact')}>
            Contact <span className="req">*</span>
            <input
              id="field-contact"
              value={dealer.contact}
              onChange={(e) => update('contact', e.target.value)}
              aria-invalid={hasFieldError('field-contact')}
            />
          </label>
          <label className={fieldClass('field-phone')}>
            Phone Number <span className="req">*</span>
            <input
              id="field-phone"
              type="tel"
              value={dealer.phone}
              onChange={(e) => update('phone', e.target.value)}
              aria-invalid={hasFieldError('field-phone')}
            />
          </label>
        </div>
      </section>

      <section id="section-shipping" className={sectionClass('section-shipping')}>
        <h2>Shipping Location</h2>
        {hasSectionError('section-shipping') && (
          <p className="section-error-msg">Please complete the shipping address.</p>
        )}
        <div className="fields">
          <label className={fieldClass('field-address')}>
            Address <span className="req">*</span>
            <input
              id="field-address"
              value={dealer.address}
              onChange={(e) => update('address', e.target.value)}
              aria-invalid={hasFieldError('field-address')}
            />
          </label>
          <div className="two-col">
            <label className={fieldClass('field-cityState')}>
              City, State/Province <span className="req">*</span>
              <input
                id="field-cityState"
                value={dealer.cityState}
                onChange={(e) => update('cityState', e.target.value)}
                aria-invalid={hasFieldError('field-cityState')}
              />
            </label>
            <label className={fieldClass('field-zipCode')}>
              Zip / Postal Code <span className="req">*</span>
              <input
                id="field-zipCode"
                value={dealer.zipCode}
                onChange={(e) => update('zipCode', e.target.value)}
                aria-invalid={hasFieldError('field-zipCode')}
              />
            </label>
          </div>
        </div>
      </section>

      <section id="section-payment" className={`${sectionClass('section-payment')} full`}>
        <h2>Payment Terms & Shipment Months</h2>
        {hasSectionError('section-payment') && (
          <p className="section-error-msg">Please select a payment term for each category.</p>
        )}
        <PaymentTermsFields program={program} />
      </section>

      <section className="form-section full">
        <label>
          Comments / Shipping Instructions
          <textarea
            rows={3}
            value={dealer.comments}
            onChange={(e) => update('comments', e.target.value)}
            placeholder="Receiving limitations, special instructions..."
          />
        </label>
      </section>
    </div>
  );
}

function PaymentTermsFields({ program }: { program: ProgramType }) {
  const { payment, setPayment, hasFieldError, clearValidation } = useOrder();
  const groups = program === 'truck' ? TRUCK_TERM_GROUPS : NONTRUCK_TERM_GROUPS;

  const update = (key: string, value: string) => {
    clearValidation();
    setPayment({ ...payment, [key]: value });
  };

  return (
    <div className="terms-grid">
      {groups.map(({ key, label, terms }) => {
        const paymentRecord = payment as unknown as Record<string, string>;
        const selected = terms.find((t) => t.label === paymentRecord[key]);
        const fieldId = `field-payment-${key}`;
        return (
          <div key={key} className={`term-card ${hasFieldError(fieldId) ? 'has-error' : ''}`}>
            <h3>{label}</h3>
            <select
              id={fieldId}
              value={paymentRecord[key] ?? ''}
              onChange={(e) => update(key, e.target.value)}
              aria-invalid={hasFieldError(fieldId)}
            >
              <option value="">Select Your Term *</option>
              {terms.map((t) => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
            {selected && (
              <div className="term-detail">
                <span className="term-code">Code: {selected.code}</span>
                <p>{selected.description}</p>
                {(selected as { shipMonth?: string }).shipMonth && (
                  <p className="ship-month">Ship: {(selected as { shipMonth?: string }).shipMonth}</p>
                )}
                {selected.floorPlan && <span className="badge badge-floor">Floor Plan — assign ship months per line item</span>}
                {selected.creditCard && <span className="badge badge-cc">Credit Card</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
