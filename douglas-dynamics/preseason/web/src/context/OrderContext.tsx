import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import truckCatalogData from '../data/catalog.json';
import nonTruckCatalogData from '../data/catalog-nontruck.json';
import configData from '../data/config.json';
import { calculateOrderFull } from '../lib/calculations';
import { getMissingShipMonths, validateBeforeStep, validateStep0, scrollToWizardTop, type ValidationIssue } from '../lib/orderValidation';
import type {
  CalculationAudit,
  CatalogKey,
  DealerInfo,
  LineItem,
  NonTruckPaymentSelections,
  OrderSummary,
  Product,
  ProgramType,
  ShipMonth,
  TruckPaymentSelections,
} from '../types';

const ADMIN_SESSION_KEY = 'western-admin';
const LEGACY_DRAFT_KEY = 'western-order-draft';

const defaultDealer: DealerInfo = {
  accountNumber: '',
  dealerName: '',
  poNumber: '',
  contact: '',
  phone: '',
  address: '',
  cityState: '',
  zipCode: '',
  comments: '',
};

const defaultTruckPayment: TruckPaymentSelections = {
  snowplows: '',
  hopper: '',
  tailgate: '',
  partsAccessories: '',
};

const defaultNonTruckPayment: NonTruckPaymentSelections = {
  snowplows: '',
  hopper: '',
  tailgate: '',
  rotaryBroom: '',
  partsAccessories: '',
};

function hasFloorPlan(payment: TruckPaymentSelections | NonTruckPaymentSelections, program: ProgramType): boolean {
  const terms =
    program === 'truck'
      ? [...configData.paymentTerms.snowplows, ...configData.paymentTerms.hopperTailgate]
      : configData.paymentTerms.nonTruck;
  const selected = Object.values(payment).filter(Boolean);
  return selected.some((label) => terms.find((t) => t.label === label)?.floorPlan);
}

interface OrderContextValue {
  program: ProgramType;
  trySetProgram: (p: ProgramType) => void;
  catalog: Record<string, Product[]>;
  dealer: DealerInfo;
  setDealer: (dealer: DealerInfo) => void;
  payment: TruckPaymentSelections | NonTruckPaymentSelections;
  setPayment: (payment: TruckPaymentSelections | NonTruckPaymentSelections) => void;
  lineItems: LineItem[];
  setQty: (catalogKey: CatalogKey, part: string, qty: number) => void;
  setShipMonth: (catalogKey: CatalogKey, part: string, shipMonth: ShipMonth) => void;
  getQty: (catalogKey: CatalogKey, part: string) => number;
  getShipMonth: (catalogKey: CatalogKey, part: string) => ShipMonth;
  showShipMonths: boolean;
  missingShipMonthCount: number;
  summary: OrderSummary;
  audit: CalculationAudit;
  isAdmin: boolean;
  showAuditPanel: boolean;
  setShowAuditPanel: (show: boolean) => void;
  toggleAdmin: () => void;
  step: number;
  setStep: (step: number) => boolean;
  goToStep: (step: number) => boolean;
  validationIssues: ValidationIssue[];
  hasFieldError: (fieldId: string) => boolean;
  hasSectionError: (sectionId: string) => boolean;
  hasStepError: (stepIndex: number) => boolean;
  clearValidation: () => void;
  showValidationIssues: (issues: ValidationIssue[]) => void;
  lookupProduct: (partNumber: string) => { product: Product; catalogKey: CatalogKey } | null;
  bulkAddParts: (entries: { part: string; qty: number }[]) => { added: number; notFound: string[] };
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [program, setProgramState] = useState<ProgramType>('truck');
  const [dealer, setDealer] = useState<DealerInfo>(defaultDealer);
  const [truckPayment, setTruckPayment] = useState<TruckPaymentSelections>(defaultTruckPayment);
  const [nonTruckPayment, setNonTruckPayment] = useState<NonTruckPaymentSelections>(defaultNonTruckPayment);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [step, setStepState] = useState(0);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1' || new URLSearchParams(window.location.search).has('admin');
  });
  const [showAuditPanel, setShowAuditPanel] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('admin')) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
      setIsAdmin(true);
    }
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  }, []);

  const toggleAdmin = useCallback(() => {
    setIsAdmin((prev) => {
      const next = !prev;
      if (next) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
      else {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        setShowAuditPanel(false);
      }
      return next;
    });
  }, []);

  const catalog = program === 'truck'
    ? (truckCatalogData as Record<string, Product[]>)
    : (nonTruckCatalogData as Record<string, Product[]>);

  const payment = program === 'truck' ? truckPayment : nonTruckPayment;
  const showShipMonths = hasFloorPlan(payment, program);
  const missingShipMonthCount = getMissingShipMonths(lineItems, payment, program).length;

  const trySetProgram = useCallback(
    (p: ProgramType) => {
      if (p === program) return;
      const hasData =
        lineItems.length > 0 ||
        Object.values(dealer).some((v) => v.trim()) ||
        Object.values(payment).some(Boolean);
      if (hasData && !window.confirm('Switching programs will clear your current order. Continue?')) return;
      setProgramState(p);
      setLineItems([]);
      setStepState(0);
      setValidationIssues([]);
      if (p === 'truck') setNonTruckPayment(defaultNonTruckPayment);
      else setTruckPayment(defaultTruckPayment);
    },
    [program, lineItems, dealer, payment],
  );

  const setPayment = useCallback(
    (p: TruckPaymentSelections | NonTruckPaymentSelections) => {
      if (program === 'truck') setTruckPayment(p as TruckPaymentSelections);
      else setNonTruckPayment(p as NonTruckPaymentSelections);
    },
    [program],
  );

  const setQty = useCallback((catalogKey: CatalogKey, part: string, qty: number) => {
    setLineItems((prev) => {
      const existing = prev.find((i) => i.catalogKey === catalogKey && i.part === part);
      const next = prev.filter((i) => !(i.catalogKey === catalogKey && i.part === part));
      if (qty > 0) {
        next.push({ catalogKey, part, qty, shipMonth: existing?.shipMonth ?? '' });
      }
      return next;
    });
  }, []);

  const setShipMonth = useCallback((catalogKey: CatalogKey, part: string, shipMonth: ShipMonth) => {
    setLineItems((prev) =>
      prev.map((i) => (i.catalogKey === catalogKey && i.part === part ? { ...i, shipMonth } : i)),
    );
  }, []);

  const getQty = useCallback(
    (catalogKey: CatalogKey, part: string) =>
      lineItems.find((i) => i.catalogKey === catalogKey && i.part === part)?.qty ?? 0,
    [lineItems],
  );

  const getShipMonth = useCallback(
    (catalogKey: CatalogKey, part: string): ShipMonth =>
      lineItems.find((i) => i.catalogKey === catalogKey && i.part === part)?.shipMonth ?? '',
    [lineItems],
  );

  const lookupProduct = useCallback(
    (partNumber: string): { product: Product; catalogKey: CatalogKey } | null => {
      const q = partNumber.trim().toLowerCase();
      if (!q) return null;
      for (const [key, products] of Object.entries(catalog)) {
        const product = products.find((p) => p.part.toLowerCase() === q);
        if (product) return { product, catalogKey: key as CatalogKey };
      }
      return null;
    },
    [catalog],
  );

  const bulkAddParts = useCallback(
    (entries: { part: string; qty: number }[]) => {
      let added = 0;
      const notFound: string[] = [];
      const updates: { catalogKey: CatalogKey; part: string; qty: number }[] = [];

      for (const { part, qty } of entries) {
        const found = lookupProduct(part);
        if (found && qty > 0) {
          updates.push({ catalogKey: found.catalogKey, part: found.product.part, qty });
          added++;
        } else if (!found) {
          notFound.push(part);
        }
      }

      if (updates.length > 0) {
        setLineItems((prev) => {
          const next = [...prev];
          for (const { catalogKey, part, qty } of updates) {
            const idx = next.findIndex((i) => i.catalogKey === catalogKey && i.part === part);
            const shipMonth = idx >= 0 ? next[idx].shipMonth : '';
            if (idx >= 0) next[idx] = { ...next[idx], qty };
            else next.push({ catalogKey, part, qty, shipMonth: shipMonth ?? '' });
          }
          return next;
        });
      }

      return { added, notFound };
    },
    [lookupProduct],
  );

  const clearValidation = useCallback(() => setValidationIssues([]), []);

  const hasFieldError = useCallback(
    (fieldId: string) => validationIssues.some((i) => i.fieldId === fieldId),
    [validationIssues],
  );

  const hasSectionError = useCallback(
    (sectionId: string) => validationIssues.some((i) => i.sectionId === sectionId),
    [validationIssues],
  );

  const hasStepError = useCallback(
    (stepIndex: number) => validationIssues.some((i) => i.step === stepIndex),
    [validationIssues],
  );

  const applyValidationFailure = useCallback((issues: ValidationIssue[]) => {
    if (issues.length === 0) return;
    setValidationIssues(issues);
    setStepState(issues[0].step);
  }, []);

  const goToStep = useCallback(
    (targetStep: number): boolean => {
      if (targetStep === step) return true;
      const validation = validateBeforeStep(targetStep, dealer, payment, program, lineItems);
      if (!validation.valid) {
        applyValidationFailure(validation.issues);
        return false;
      }
      setValidationIssues([]);
      setStepState(targetStep);
      if (targetStep > step) {
        window.setTimeout(() => scrollToWizardTop(), 50);
      }
      return true;
    },
    [step, dealer, payment, program, lineItems, applyValidationFailure],
  );

  const setStep = useCallback(
    (next: number | ((s: number) => number)): boolean => {
      const target = typeof next === 'function' ? next(step) : next;
      return goToStep(target);
    },
    [step, goToStep],
  );

  const { summary, audit } = useMemo(
    () => calculateOrderFull(catalog, lineItems, program),
    [catalog, lineItems, program],
  );

  return (
    <OrderContext.Provider
      value={{
        program,
        trySetProgram,
        catalog,
        dealer,
        setDealer,
        payment,
        setPayment,
        lineItems,
        setQty,
        setShipMonth,
        getQty,
        getShipMonth,
        showShipMonths,
        missingShipMonthCount,
        summary,
        audit,
        isAdmin,
        showAuditPanel,
        setShowAuditPanel,
        toggleAdmin,
        step,
        setStep,
        goToStep,
        validationIssues,
        hasFieldError,
        hasSectionError,
        hasStepError,
        clearValidation,
        showValidationIssues: applyValidationFailure,
        lookupProduct,
        bulkAddParts,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrder must be used within OrderProvider');
  return ctx;
}

export { validateStep0 };
