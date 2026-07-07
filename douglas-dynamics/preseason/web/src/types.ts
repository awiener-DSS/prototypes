export interface Product {
  part: string;
  description: string;
  category: string;
  listPrice: number;
  unitEquiv: number | null;
  type: string | null;
}

export interface TruckCatalog {
  blades: Product[];
  electrical: Product[];
  cuttingEdges: Product[];
  plowAccessories: Product[];
  hydraulic: Product[];
  hopper: Product[];
  hopperAccessories: Product[];
  tailgate: Product[];
  sidewalk: Product[];
  tailgateAccessories: Product[];
  serviceParts: Product[];
}

export interface NonTruckCatalog {
  utvPlows: Product[];
  subcompactPlows: Product[];
  pusherPlows: Product[];
  tractorSkidSteerPlows: Product[];
  cuttingEdges: Product[];
  plowAccessories: Product[];
  hydraulic: Product[];
  hopper: Product[];
  hopperAccessories: Product[];
  tailgate: Product[];
  tailgateAccessories: Product[];
  rotaryBroom: Product[];
  sidewalk: Product[];
  serviceParts: Product[];
}

export type ProgramType = 'truck' | 'nontruck';
export type TruckCatalogKey = keyof TruckCatalog;
export type NonTruckCatalogKey = keyof NonTruckCatalog;
export type CatalogKey = TruckCatalogKey | NonTruckCatalogKey;

export const SHIP_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October'] as const;
export type ShipMonth = (typeof SHIP_MONTHS)[number] | '';

export interface PaymentTerm {
  label: string;
  discount: number;
  code: string;
  description: string;
  creditCard: boolean;
  floorPlan: boolean;
  shipMonth?: string | null;
}

export interface VolumeTier {
  min: number;
  max: number | null;
  discount: number;
  label: string;
}

export interface DealerInfo {
  accountNumber: string;
  dealerName: string;
  poNumber: string;
  contact: string;
  phone: string;
  address: string;
  cityState: string;
  zipCode: string;
  comments: string;
}

export interface TruckPaymentSelections {
  snowplows: string;
  hopper: string;
  tailgate: string;
  partsAccessories: string;
}

export interface NonTruckPaymentSelections {
  snowplows: string;
  hopper: string;
  tailgate: string;
  rotaryBroom: string;
  partsAccessories: string;
}

export type PaymentSelections = TruckPaymentSelections | NonTruckPaymentSelections;

export interface LineItem {
  part: string;
  qty: number;
  catalogKey: CatalogKey;
  shipMonth?: ShipMonth;
}

export interface CategorySummary {
  key: string;
  label: string;
  units: number;
  net: number;
  volumeSavings: number;
  netLessVolume: number;
  volumeRate: number;
  volumeLabel: string;
}

export interface OrderSummary {
  plowUnits: number;
  bladeUnits: number;
  attachmentUnits: number;
  mountUnits: number;
  mountRatioWarning: boolean;
  hopperUnits: number;
  tailgateUnits: number;
  totalProgramUnits: number;
  partsDollars: number;
  qualifiesPreseason: boolean;
  qualifiesFreeFreight: boolean;
  qualifiesHalfFreight: boolean;
  categories: CategorySummary[];
  grandTotal: number;
  grandVolumeSavings: number;
  grandNetLessVolume: number;
}

/** Per-line calculation trace matching Excel column logic */
export interface LineCalcStep {
  label: string;
  excelRef: string;
  formula: string;
  value: number | string;
}

export interface LineCalcAudit {
  part: string;
  description: string;
  catalogKey: CatalogKey;
  excelSheet: string;
  qty: number;
  steps: LineCalcStep[];
}

/** Category-level volume & totals trace */
export interface CategoryCalcAudit {
  key: string;
  label: string;
  excelSheet: string;
  totalList: number;
  totalNet: number;
  itemCount: number;
  unitCount: number;
  volumeSteps: LineCalcStep[];
  volumeSavings: number;
  netLessVolume: number;
}

/** Program-level qualification trace */
export interface QualificationAudit {
  label: string;
  excelRef: string;
  formula: string;
  threshold: string;
  actual: string;
  result: boolean;
}

export interface CalculationAudit {
  program: ProgramType;
  excelWorkbook: string;
  constants: LineCalcStep[];
  lineItems: LineCalcAudit[];
  unitBreakdown: LineCalcStep[];
  mountRatio: LineCalcStep[];
  volumeTierLookup: LineCalcStep[];
  categories: CategoryCalcAudit[];
  qualifications: QualificationAudit[];
  totals: LineCalcStep[];
}

export interface OrderCalculationResult {
  summary: OrderSummary;
  audit: CalculationAudit;
}

export interface SubmittedOrder {
  id: string;
  submittedAt: string;
  program: ProgramType;
  dealer: DealerInfo;
  payment: PaymentSelections;
  lineItems: LineItem[];
  summary: OrderSummary;
}
