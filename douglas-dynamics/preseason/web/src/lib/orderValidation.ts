import configData from '../data/config.json';
import { getStepCatalogKeys } from './stepConfig';
import type {
  CatalogKey,
  DealerInfo,
  LineItem,
  NonTruckPaymentSelections,
  ProgramType,
  TruckPaymentSelections,
} from '../types';

export interface ValidationIssue {
  step: number;
  sectionId: string;
  fieldId?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** @deprecated use issues */
  errors: string[];
}

const DEALER_REQUIRED: (keyof DealerInfo)[] = [
  'accountNumber', 'dealerName', 'poNumber', 'contact', 'phone',
  'address', 'cityState', 'zipCode',
];

const DEALER_SECTION: Partial<Record<keyof DealerInfo, string>> = {
  accountNumber: 'section-contact',
  dealerName: 'section-contact',
  poNumber: 'section-contact',
  contact: 'section-contact',
  phone: 'section-contact',
  address: 'section-shipping',
  cityState: 'section-shipping',
  zipCode: 'section-shipping',
};

const DEALER_LABELS: Record<keyof DealerInfo, string> = {
  accountNumber: 'Account #',
  dealerName: 'Dealer Name',
  poNumber: 'PO #',
  contact: 'Contact',
  phone: 'Phone Number',
  address: 'Address',
  cityState: 'City, State/Province',
  zipCode: 'Zip / Postal Code',
  comments: 'Comments',
};

const TRUCK_PAYMENT_KEYS: (keyof TruckPaymentSelections)[] = [
  'snowplows', 'hopper', 'tailgate', 'partsAccessories',
];

const NONTRUCK_PAYMENT_KEYS: (keyof NonTruckPaymentSelections)[] = [
  'snowplows', 'hopper', 'tailgate', 'rotaryBroom', 'partsAccessories',
];

const TRUCK_PAYMENT_LABELS: Record<keyof TruckPaymentSelections, string> = {
  snowplows: 'Snowplows payment term',
  hopper: 'Hoppers & Pre-Wet payment term',
  tailgate: 'Tailgate Spreaders payment term',
  partsAccessories: 'Parts & Accessories payment term',
};

const NONTRUCK_PAYMENT_LABELS: Record<keyof NonTruckPaymentSelections, string> = {
  snowplows: 'Non-Truck Snowplows payment term',
  hopper: 'Hoppers & Drop Spreaders payment term',
  tailgate: 'Tailgate Spreaders payment term',
  rotaryBroom: 'Rotary Broom payment term',
  partsAccessories: 'Parts & Accessories payment term',
};

function result(issues: ValidationIssue[]): ValidationResult {
  return {
    valid: issues.length === 0,
    issues,
    errors: issues.map((i) => i.message),
  };
}

function hasFloorPlan(
  payment: TruckPaymentSelections | NonTruckPaymentSelections,
  program: ProgramType,
): boolean {
  const terms =
    program === 'truck'
      ? [...configData.paymentTerms.snowplows, ...configData.paymentTerms.hopperTailgate]
      : configData.paymentTerms.nonTruck;
  const selected = Object.values(payment).filter(Boolean);
  return selected.some((label) => terms.find((t) => t.label === label)?.floorPlan);
}

function catalogKeyToStep(catalogKey: CatalogKey, program: ProgramType): number {
  for (let step = 1; step <= 3; step++) {
    if (getStepCatalogKeys(step, program).includes(catalogKey)) return step;
  }
  return 1;
}

export function shipMonthFieldId(catalogKey: CatalogKey, part: string): string {
  return `field-ship-${catalogKey}-${part.replace(/[^a-zA-Z0-9-]/g, '_')}`;
}

export function collectDealerIssues(
  dealer: DealerInfo,
  payment: TruckPaymentSelections | NonTruckPaymentSelections,
  program: ProgramType,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const key of DEALER_REQUIRED) {
    if (!dealer[key]?.trim()) {
      issues.push({
        step: 0,
        sectionId: DEALER_SECTION[key] ?? 'section-contact',
        fieldId: `field-${key}`,
        message: `${DEALER_LABELS[key]} is required`,
      });
    }
  }

  if (program === 'truck') {
    for (const key of TRUCK_PAYMENT_KEYS) {
      if (!payment[key as keyof typeof payment]) {
        issues.push({
          step: 0,
          sectionId: 'section-payment',
          fieldId: `field-payment-${key}`,
          message: `${TRUCK_PAYMENT_LABELS[key]} is required`,
        });
      }
    }
  } else {
    const nt = payment as NonTruckPaymentSelections;
    for (const key of NONTRUCK_PAYMENT_KEYS) {
      if (!nt[key]) {
        issues.push({
          step: 0,
          sectionId: 'section-payment',
          fieldId: `field-payment-${key}`,
          message: `${NONTRUCK_PAYMENT_LABELS[key]} is required`,
        });
      }
    }
  }

  return issues;
}

export function validateDealerInfo(dealer: DealerInfo): ValidationResult {
  const issues: ValidationIssue[] = [];
  for (const key of DEALER_REQUIRED) {
    if (!dealer[key]?.trim()) {
      issues.push({
        step: 0,
        sectionId: DEALER_SECTION[key] ?? 'section-contact',
        fieldId: `field-${key}`,
        message: `${DEALER_LABELS[key]} is required`,
      });
    }
  }
  return result(issues);
}

export function validatePaymentTerms(
  payment: TruckPaymentSelections | NonTruckPaymentSelections,
  program: ProgramType,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (program === 'truck') {
    for (const key of TRUCK_PAYMENT_KEYS) {
      if (!payment[key as keyof typeof payment]) {
        issues.push({
          step: 0,
          sectionId: 'section-payment',
          fieldId: `field-payment-${key}`,
          message: `${TRUCK_PAYMENT_LABELS[key]} is required`,
        });
      }
    }
  } else {
    const nt = payment as NonTruckPaymentSelections;
    for (const key of NONTRUCK_PAYMENT_KEYS) {
      if (!nt[key]) {
        issues.push({
          step: 0,
          sectionId: 'section-payment',
          fieldId: `field-payment-${key}`,
          message: `${NONTRUCK_PAYMENT_LABELS[key]} is required`,
        });
      }
    }
  }
  return result(issues);
}

export function validateStep0(
  dealer: DealerInfo,
  payment: TruckPaymentSelections | NonTruckPaymentSelections,
  program: ProgramType,
): ValidationResult {
  return result(collectDealerIssues(dealer, payment, program));
}

export function getMissingShipMonths(
  lineItems: LineItem[],
  payment: TruckPaymentSelections | NonTruckPaymentSelections,
  program: ProgramType,
): LineItem[] {
  if (!hasFloorPlan(payment, program)) return [];
  return lineItems.filter((i) => i.qty > 0 && !i.shipMonth);
}

export function validateOrderReady(
  dealer: DealerInfo,
  payment: TruckPaymentSelections | NonTruckPaymentSelections,
  program: ProgramType,
  lineItems: LineItem[],
): ValidationResult {
  const issues = collectDealerIssues(dealer, payment, program);

  if (lineItems.filter((i) => i.qty > 0).length === 0) {
    issues.push({
      step: 1,
      sectionId: 'section-products',
      message: 'Add at least one product to the order',
    });
  }

  const missingShip = getMissingShipMonths(lineItems, payment, program);
  for (const item of missingShip) {
    issues.push({
      step: catalogKeyToStep(item.catalogKey, program),
      sectionId: `section-catalog-${item.catalogKey}`,
      fieldId: shipMonthFieldId(item.catalogKey, item.part),
      message: `Ship month required for part ${item.part}`,
    });
  }

  return result(issues);
}

export function validateBeforeStep(
  targetStep: number,
  dealer: DealerInfo,
  payment: TruckPaymentSelections | NonTruckPaymentSelections,
  program: ProgramType,
  lineItems: LineItem[],
): ValidationResult {
  if (targetStep === 0) return result([]);
  if (targetStep < 4) return validateStep0(dealer, payment, program);
  return validateOrderReady(dealer, payment, program, lineItems);
}

export function scrollToValidationIssue(issue: ValidationIssue) {
  const targetId = issue.fieldId ?? issue.sectionId;
  const el = document.getElementById(targetId);
  if (!el) return;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  ) {
    window.setTimeout(() => el.focus({ preventScroll: true }), 300);
  }
}

export function scrollToWizardTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelector('.form-area')?.scrollTo({ top: 0, behavior: 'smooth' });
}
