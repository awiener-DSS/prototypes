export type DateRangePreset =
  | 'last_7_days'
  | 'month_to_date'
  | 'last_90_days'
  | 'year_to_date'
  | 'custom';

export type DateRangeSelection = {
  preset: DateRangePreset;
  from?: string;
  to?: string;
};

export type ResolvedDateRange = {
  preset: DateRangePreset;
  start_date: string;
  end_date: string;
  export_dates: string[];
  export_days: number;
  label: string;
};

export const DATE_RANGE_PRESETS: Array<{ id: DateRangePreset; label: string }> = [
  { id: 'last_7_days', label: 'Last 7 days' },
  { id: 'month_to_date', label: 'Month to date' },
  { id: 'last_90_days', label: 'Last 90 days' },
  { id: 'year_to_date', label: 'Year to date' },
  { id: 'custom', label: 'Custom range' },
];

const PRESET_SET = new Set<DateRangePreset>(DATE_RANGE_PRESETS.map((item) => item.id));

export function isDateRangePreset(value: string | null | undefined): value is DateRangePreset {
  return Boolean(value && PRESET_SET.has(value as DateRangePreset));
}

function parseYmd(value: string): Date {
  return new Date(Date.UTC(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8)),
  ));
}

function formatYmd(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function addDays(value: string, days: number): string {
  const date = parseYmd(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatYmd(date);
}

function formatDisplayDate(value: string): string {
  if (value.length !== 8) return value;
  return `${value.slice(4, 6)}/${value.slice(6, 8)}/${value.slice(0, 4)}`;
}

function presetLabel(preset: DateRangePreset, startDate: string, endDate: string): string {
  if (preset === 'last_7_days') return 'Last 7 days';
  if (preset === 'month_to_date') return 'Month to date';
  if (preset === 'last_90_days') return 'Last 90 days';
  if (preset === 'year_to_date') return 'Year to date';
  return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
}

export function defaultDateRangeSelection(): DateRangeSelection {
  return { preset: 'last_7_days' };
}

export function resolveDateRange(
  availableDates: string[],
  selection: DateRangeSelection,
): ResolvedDateRange {
  const sorted = [...new Set(availableDates)].sort();
  if (!sorted.length) {
    throw new Error('No GA4 export dates available');
  }

  const latest = sorted.at(-1)!;
  let calendarEnd = selection.preset === 'custom' && selection.to ? selection.to : latest;
  if (calendarEnd > latest) calendarEnd = latest;

  let calendarStart: string;
  switch (selection.preset) {
    case 'last_7_days':
      calendarStart = addDays(calendarEnd, -6);
      break;
    case 'last_90_days':
      calendarStart = addDays(calendarEnd, -89);
      break;
    case 'month_to_date':
      calendarStart = `${calendarEnd.slice(0, 6)}01`;
      break;
    case 'year_to_date':
      calendarStart = `${calendarEnd.slice(0, 4)}0101`;
      break;
    case 'custom': {
      const from = selection.from ?? calendarEnd;
      const to = selection.to ?? latest;
      calendarStart = from <= to ? from : to;
      calendarEnd = from <= to ? to : from;
      if (calendarEnd > latest) calendarEnd = latest;
      break;
    }
    default:
      calendarStart = addDays(calendarEnd, -6);
  }

  const exportDates = sorted.filter((date) => date >= calendarStart && date <= calendarEnd);

  return {
    preset: selection.preset,
    start_date: calendarStart,
    end_date: calendarEnd,
    export_dates: exportDates,
    export_days: exportDates.length,
    label: presetLabel(selection.preset, calendarStart, calendarEnd),
  };
}

export function dateRangeSearchParams(selection: DateRangeSelection): string {
  const params = new URLSearchParams({ preset: selection.preset });
  if (selection.preset === 'custom') {
    if (selection.from) params.set('from', selection.from);
    if (selection.to) params.set('to', selection.to);
  }
  return params.toString();
}

export function parseDateRangeSearchParams(
  searchParams: URLSearchParams,
  availableDates: string[],
): ResolvedDateRange {
  const presetParam = searchParams.get('preset');
  const preset = isDateRangePreset(presetParam) ? presetParam : 'last_7_days';
  const from = searchParams.get('from')
    ?? searchParams.get('start_date')
    ?? undefined;
  const to = searchParams.get('to')
    ?? searchParams.get('end_date')
    ?? undefined;
  return resolveDateRange(availableDates, { preset, from, to });
}

export function inputDateToYmd(value: string): string {
  return value.replace(/-/g, '');
}

export function ymdToInputDate(value: string): string {
  if (value.length !== 8) return '';
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}
