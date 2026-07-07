import configData from '../data/config.json';
import type {
  CatalogKey,
  LineItem,
  NonTruckPaymentSelections,
  PaymentTerm,
  ProgramType,
  TruckPaymentSelections,
} from '../types';

type PaymentKey = keyof TruckPaymentSelections | keyof NonTruckPaymentSelections;

const SNOWPLOW_KEYS: CatalogKey[] = [
  'blades', 'electrical', 'utvPlows', 'subcompactPlows', 'pusherPlows', 'tractorSkidSteerPlows',
];
const HOPPER_KEYS: CatalogKey[] = ['hopper', 'hopperAccessories'];
const TAILGATE_KEYS: CatalogKey[] = ['tailgate', 'tailgateAccessories'];

export function paymentKeyForCatalog(catalogKey: CatalogKey): PaymentKey {
  if (SNOWPLOW_KEYS.includes(catalogKey)) return 'snowplows';
  if (HOPPER_KEYS.includes(catalogKey)) return 'hopper';
  if (TAILGATE_KEYS.includes(catalogKey)) return 'tailgate';
  if (catalogKey === 'rotaryBroom') return 'rotaryBroom';
  return 'partsAccessories';
}

function paymentTermsForKey(key: PaymentKey, program: ProgramType): PaymentTerm[] {
  if (program === 'truck') {
    if (key === 'snowplows' || key === 'partsAccessories') return configData.paymentTerms.snowplows;
    if (key === 'hopper' || key === 'tailgate') return configData.paymentTerms.hopperTailgate;
    return configData.paymentTerms.snowplows;
  }
  return configData.paymentTerms.nonTruck;
}

export function selectedPaymentTerm(
  catalogKey: CatalogKey,
  payment: TruckPaymentSelections | NonTruckPaymentSelections,
  program: ProgramType,
): PaymentTerm | undefined {
  const key = paymentKeyForCatalog(catalogKey);
  const label = (payment as unknown as Record<string, string>)[key];
  if (!label) return undefined;
  return paymentTermsForKey(key, program).find((t) => t.label === label);
}

/** Line-item month for floor plan, or payment-term month otherwise. */
export function effectiveShipMonth(
  item: LineItem,
  payment: TruckPaymentSelections | NonTruckPaymentSelections,
  program: ProgramType,
): string {
  if (item.shipMonth) return item.shipMonth;
  const term = selectedPaymentTerm(item.catalogKey, payment, program);
  if (term?.floorPlan) return '';
  return term?.shipMonth ?? '';
}
