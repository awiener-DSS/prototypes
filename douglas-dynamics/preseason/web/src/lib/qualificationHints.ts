import configData from '../data/config.json';
import type { OrderSummary, ProgramType } from '../types';

export interface QualificationMotivator {
  id: string;
  label: string;
  qualified: boolean;
  message: string;
  /** Combined progress 0–100 toward this benefit */
  progress: number;
}

function formatPartsDollars(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function progressPct(actual: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(1, actual / target);
}

function combinedProgress(
  units: number,
  unitTarget: number,
  parts: number,
  partsTarget: number,
): number {
  const unitPct = progressPct(units, unitTarget);
  const partsPct = progressPct(parts, partsTarget);
  return Math.round(((unitPct + partsPct) / 2) * 100);
}

function gapParts(
  unitsNeeded: number,
  partsNeeded: number,
  benefit: string,
  unitTarget: number,
  partsTarget: number,
): string {
  const gaps: string[] = [];
  if (unitsNeeded > 0) {
    gaps.push(
      `Add ${unitsNeeded.toFixed(1)} more program unit${unitsNeeded === 1 ? '' : 's'}`,
    );
  }
  if (partsNeeded > 0) {
    gaps.push(`Add ${formatPartsDollars(partsNeeded)} more in parts & accessories`);
  }
  if (gaps.length === 0) return `You qualify for ${benefit}!`;
  const reqs = `(${unitTarget} units + ${formatPartsDollars(partsTarget)} P&A)`;
  return `${gaps.join(' and ')} to unlock ${benefit} ${reqs}`;
}

function buildMotivator(
  id: string,
  label: string,
  qualified: boolean,
  message: string,
  units: number,
  unitTarget: number,
  parts: number,
  partsTarget: number,
): QualificationMotivator {
  return {
    id,
    label,
    qualified,
    message,
    progress: qualified ? 100 : combinedProgress(units, unitTarget, parts, partsTarget),
  };
}

export function getQualificationMotivators(
  summary: OrderSummary,
  program: ProgramType,
): QualificationMotivator[] {
  const freight = program === 'truck' ? configData.freight : configData.nonTruck.freight;
  const { totalProgramUnits, partsDollars } = summary;
  const motivators: QualificationMotivator[] = [];

  const preseasonUnits = freight.minUnits;
  const preseasonParts = freight.minPartsDollars;
  const unitsToPreseason = Math.max(0, preseasonUnits - totalProgramUnits);
  const partsToPreseason = Math.max(0, preseasonParts - partsDollars);

  motivators.push(
    buildMotivator(
      'preseason',
      'Preseason',
      summary.qualifiesPreseason,
      summary.qualifiesPreseason
        ? 'You qualify for preseason pricing on program products.'
        : gapParts(unitsToPreseason, partsToPreseason, 'preseason pricing', preseasonUnits, preseasonParts),
      totalProgramUnits,
      preseasonUnits,
      partsDollars,
      preseasonParts,
    ),
  );

  if (program !== 'truck') return motivators;

  const freeFreightUnits = configData.freight.freeFreightUnits;
  const unitsToFreeFreight = Math.max(0, freeFreightUnits - totalProgramUnits);
  const partsToFreeFreight = Math.max(0, preseasonParts - partsDollars);

  motivators.push(
    buildMotivator(
      'free-freight',
      'Free Freight',
      summary.qualifiesFreeFreight,
      summary.qualifiesFreeFreight
        ? 'You qualify for free freight on this order.'
        : gapParts(
            unitsToFreeFreight,
            partsToFreeFreight,
            'free freight',
            freeFreightUnits,
            preseasonParts,
          ),
      totalProgramUnits,
      freeFreightUnits,
      partsDollars,
      preseasonParts,
    ),
  );

  if (totalProgramUnits < freeFreightUnits) {
    const halfFreightMax = freeFreightUnits - 1;
    const unitsToHalfFreight = Math.max(0, preseasonUnits - totalProgramUnits);
    const partsToHalfFreight = Math.max(0, preseasonParts - partsDollars);
    const inHalfFreightRange =
      totalProgramUnits >= preseasonUnits && totalProgramUnits < freeFreightUnits;

    let halfMessage: string;
    if (summary.qualifiesHalfFreight) {
      const unitsToFree = freeFreightUnits - totalProgramUnits;
      halfMessage = `You have 50% freight! Add ${unitsToFree.toFixed(1)} more program unit${unitsToFree === 1 ? '' : 's'} for free freight.`;
    } else if (inHalfFreightRange && partsToHalfFreight > 0) {
      halfMessage = `Add ${formatPartsDollars(partsToHalfFreight)} more in parts & accessories to unlock 50% freight (${preseasonUnits}–${halfFreightMax} units + ${formatPartsDollars(preseasonParts)} P&A).`;
    } else {
      halfMessage = gapParts(
        unitsToHalfFreight,
        partsToHalfFreight,
        '50% freight',
        preseasonUnits,
        preseasonParts,
      );
    }

    const halfUnitTarget = summary.qualifiesHalfFreight ? freeFreightUnits : preseasonUnits;

    motivators.push(
      buildMotivator(
        'half-freight',
        '50% Freight',
        summary.qualifiesHalfFreight,
        halfMessage,
        totalProgramUnits,
        halfUnitTarget,
        partsDollars,
        preseasonParts,
      ),
    );
  }

  return motivators;
}
