'use client';

import { LogoLoader } from '@/components/logo-loader';
import {
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  type DateRangeSelection,
  inputDateToYmd,
  ymdToInputDate,
} from '@/lib/date-range';

type DateRangeSelectorProps = {
  value: DateRangeSelection;
  onChange: (value: DateRangeSelection) => void;
  resolvedLabel?: string | null;
  exportDays?: number;
  loading?: boolean;
};

export function DateRangeSelector({
  value,
  onChange,
  resolvedLabel,
  exportDays,
  loading = false,
}: DateRangeSelectorProps) {
  function setPreset(preset: DateRangePreset) {
    onChange({ preset, from: value.from, to: value.to });
  }

  return (
    <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
      {loading ? (
        <LogoLoader size="sm" inline label="Loading…" className="text-muted-foreground [&_span]:text-xs" />
      ) : null}
      <label className="flex items-center gap-2">
        <span className="sr-only">Date range</span>
        <select
          value={value.preset}
          disabled={loading}
          onChange={(event) => setPreset(event.target.value as DateRangePreset)}
          className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs font-medium disabled:cursor-wait disabled:opacity-60"
        >
          {DATE_RANGE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.label}</option>
          ))}
        </select>
      </label>
      {value.preset === 'custom' ? (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            disabled={loading}
            value={value.from ? ymdToInputDate(value.from) : ''}
            onChange={(event) => onChange({
              ...value,
              from: event.target.value ? inputDateToYmd(event.target.value) : undefined,
            })}
            className="h-8 rounded-lg border border-border bg-card px-2 text-xs disabled:cursor-wait disabled:opacity-60"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            disabled={loading}
            value={value.to ? ymdToInputDate(value.to) : ''}
            onChange={(event) => onChange({
              ...value,
              to: event.target.value ? inputDateToYmd(event.target.value) : undefined,
            })}
            className="h-8 rounded-lg border border-border bg-card px-2 text-xs disabled:cursor-wait disabled:opacity-60"
            aria-label="To date"
          />
        </div>
      ) : null}
      {resolvedLabel ? (
        <span className="hidden text-[11px] text-muted-foreground lg:inline">
          {resolvedLabel}
          {exportDays != null ? ` · ${exportDays} export day${exportDays === 1 ? '' : 's'}` : ''}
        </span>
      ) : null}
    </div>
  );
}
