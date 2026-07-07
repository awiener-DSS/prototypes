import type { CatalogKey, ProgramType } from '../types';

/** Maps catalog keys to Excel sheet names in the 1.18 workbook */
export const EXCEL_SHEET_MAP: Record<string, string> = {
  blades: 'Blades, Attachments, Mounts',
  electrical: 'Headlights,Controls,Electrical',
  cuttingEdges: 'Cutting Edges & Backdrag Edges',
  plowAccessories: 'Snowplow Accessories',
  hydraulic: 'Hydraulic Fluid & Grease',
  hopper: 'Hopper Spreaders & Pre-Wet',
  hopperAccessories: 'Hopper Accessories',
  tailgate: 'Tailgate Spreaders',
  sidewalk: 'Sidewalk Products',
  tailgateAccessories: 'Tailgate & Sidewalk Accessories',
  serviceParts: 'Service Parts - All Product',
  utvPlows: 'NT UTV Plows',
  subcompactPlows: 'NT Subcompact Tractor Plows',
  pusherPlows: 'NT Pusher Plows',
  tractorSkidSteerPlows: 'NT Tractor & Skid-Steer Plows',
  rotaryBroom: 'NT Rotary Broom',
};

export const EXCEL_WORKBOOK = 'Copy of 1.18 One Prep - 2024 WESTERN EOF.xlsx';

export const EXCEL_WORKBOOK_DOWNLOAD = '/api/reference/workbook';

export const VOLUME_SHEET = 'Volume & Freight Summary';

export function sheetForKey(key: CatalogKey): string {
  return EXCEL_SHEET_MAP[key] ?? key;
}

export function unitTypeLabel(type: string | null): string {
  switch (type) {
    case 'PL': return 'Blade (¼ unit)';
    case 'AT': return 'Attachment (½ unit)';
    case 'CH': return 'Central Hyd Attach (1 unit)';
    case 'MT': return 'Mount (¼ unit)';
    default: return type ?? '—';
  }
}

export function programLabel(program: ProgramType): string {
  return program === 'truck' ? 'Truck Program' : 'Non-Truck Program';
}
