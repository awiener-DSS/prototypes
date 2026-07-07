import type { CatalogKey, ProgramType } from '../types';

export const TOTAL_STEPS = 5;

export const TRUCK_STEP_DEFS = [
  { id: 'dealer', label: 'Dealer Info' },
  { id: 'plows', label: 'Snowplows' },
  { id: 'spreaders', label: 'Spreaders' },
  { id: 'parts', label: 'Parts & Accessories' },
  { id: 'review', label: 'Review' },
] as const;

export const NONTRUCK_STEP_DEFS = [
  { id: 'dealer', label: 'Dealer Info' },
  { id: 'plows', label: 'Plows' },
  { id: 'spreaders', label: 'Spreaders & Broom' },
  { id: 'parts', label: 'Parts & Accessories' },
  { id: 'review', label: 'Review' },
] as const;

const TRUCK_PARTS_KEYS: CatalogKey[] = [
  'cuttingEdges', 'plowAccessories', 'hydraulic',
  'hopperAccessories', 'sidewalk', 'tailgateAccessories', 'serviceParts',
];

const NONTRUCK_PARTS_KEYS: CatalogKey[] = [
  'cuttingEdges', 'plowAccessories', 'hydraulic',
  'hopperAccessories', 'sidewalk', 'tailgateAccessories', 'serviceParts',
];

export function getStepDefs(program: ProgramType) {
  return program === 'truck' ? TRUCK_STEP_DEFS : NONTRUCK_STEP_DEFS;
}

export function getStepCatalogKeys(step: number, program: ProgramType): CatalogKey[] {
  if (step === 1) {
    return program === 'truck'
      ? ['blades', 'electrical']
      : ['utvPlows', 'subcompactPlows', 'pusherPlows', 'tractorSkidSteerPlows'];
  }
  if (step === 2) {
    return program === 'truck'
      ? ['hopper', 'tailgate']
      : ['hopper', 'tailgate', 'rotaryBroom'];
  }
  if (step === 3) {
    return program === 'truck' ? TRUCK_PARTS_KEYS : NONTRUCK_PARTS_KEYS;
  }
  return [];
}

export function countLineItemsForStep(
  step: number,
  program: ProgramType,
  lineItems: { catalogKey: CatalogKey; qty: number }[],
): number {
  if (step <= 0 || step >= 4) return 0;
  const keys = new Set(getStepCatalogKeys(step, program));
  return lineItems.filter((i) => keys.has(i.catalogKey) && i.qty > 0).length;
}
