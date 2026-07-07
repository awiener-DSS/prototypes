import configData from '../data/config.json';
import type { OrderSummary } from '../types';

export interface VolumeHint {
  id: string;
  label: string;
  message: string;
}

export function getVolumeHints(summary: OrderSummary): VolumeHint[] {
  const hints: VolumeHint[] = [];
  const plowTiers = configData.volumeRules.snowplows;

  if (summary.plowUnits > 0) {
    const current = [...plowTiers].reverse().find((t) => summary.plowUnits >= t.min);
    const next = plowTiers.find((t) => summary.plowUnits < t.min);
    if (next) {
      const needed = next.min - summary.plowUnits;
      hints.push({
        id: 'plow-next',
        label: 'Snowplow volume',
        message: `Add ${needed.toFixed(2)} more plow unit${needed === 1 ? '' : 's'} for ${(next.discount * 100).toFixed(0)}% volume savings (${next.label})`,
      });
    } else if (current) {
      hints.push({
        id: 'plow-max',
        label: 'Snowplow volume',
        message: `At top tier: ${(current.discount * 100).toFixed(0)}% volume savings (${current.label})`,
      });
    }
  }

  const hopperCat = summary.categories.find((c) => c.key === 'hopper');
  if (hopperCat && hopperCat.units > 0) {
    const hopperTiers = configData.volumeRules.hopper;
    const next = hopperTiers.find((t) => hopperCat.units < t.min);
    if (next) {
      hints.push({
        id: 'hopper-next',
        label: 'Hopper volume',
        message: `Add ${next.min - hopperCat.units} more hopper${next.min - hopperCat.units === 1 ? '' : 's'} for ${(next.discount * 100).toFixed(0)}% off list (${next.label})`,
      });
    }
  }

  const tailgateCat = summary.categories.find((c) => c.key === 'tailgate');
  if (tailgateCat && tailgateCat.units > 0) {
    const tgTiers = configData.volumeRules.tailgate;
    const next = tgTiers.find((t) => tailgateCat.units < t.min);
    if (next) {
      hints.push({
        id: 'tailgate-next',
        label: 'Tailgate volume',
        message: `Add ${next.min - tailgateCat.units} more tailgate${next.min - tailgateCat.units === 1 ? '' : 's'} for ${(next.discount * 100).toFixed(0)}% off list (${next.label})`,
      });
    }
  }

  return hints;
}
