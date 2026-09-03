import type { Opportunity } from '@/lib/opportunities';

export type RevenueImpactOpportunity = Pick<Opportunity, 'category' | 'estimated_monthly_revenue_usd' | 'metrics'> & {
  day_count?: number;
};

export function formatMonthlyImpact(value: number | null | undefined, suffix = '/mo') {
  if (value == null) return 'Est. impact TBD';
  return `Est. ${value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}${suffix}`;
}

function pct(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

export function revenueImpactFormula(opportunity: RevenueImpactOpportunity): string {
  const metrics = opportunity.metrics;

  if (opportunity.category === 'Inventory') {
    const rate = Number(metrics.recovery_rate ?? 0.2);
    return `affected users × site AOV × ${pct(rate)} recovery × 30 days`;
  }
  if (opportunity.category === 'Search') {
    const rate = Number(metrics.recovery_rate ?? 0.1);
    return `searching users × site AOV × ${pct(rate)} recovery × 30 days`;
  }
  if (opportunity.category === 'Funnel') {
    if (metrics.item_id) {
      const rate = Number(metrics.recovery_rate ?? 0.08);
      return `product views × site AOV × ${pct(rate)} recovery × 30 days`;
    }
    return 'non-cart viewers × 2% recovery × cart→purchase × AOV × 30 (capped at 15% of daily revenue)';
  }
  if (opportunity.category === 'Anomaly') {
    if (opportunity.estimated_monthly_revenue_usd == null) {
      return 'signal flagged — no dollar estimate for this anomaly type';
    }
    return 'baseline revenue/session gap × sessions × 30 days';
  }
  if (opportunity.category === 'Landing' || opportunity.category === 'Acquisition') {
    return 'non-purchasing sessions × ~2.5–3% recovery × AOV × 30 days';
  }
  if (opportunity.category === 'Taxonomy') {
    return 'views × add-rate gap × AOV × partial recovery × 30 days';
  }
  return 'observed daily pattern × 30 days';
}

export function revenueImpactExplanation(opportunity: RevenueImpactOpportunity): string {
  const formula = revenueImpactFormula(opportunity);
  const periodNote = opportunity.day_count && opportunity.day_count > 1
    ? ` Averaged across ${opportunity.day_count} days in your selected range (daily estimates are not summed).`
    : '';
  const lead = opportunity.estimated_monthly_revenue_usd == null
    ? 'No dollar estimate yet for this signal.'
    : 'Estimated monthly upside if the issue is fixed — not actual lost revenue.';
  return `${lead} Uses GA4 counts and site average order value. Formula: ${formula}.${periodNote} Recovery rates are conservative placeholders until experiment results exist.`;
}

export function averageMonthlyEstimates(values: Array<number | null | undefined>): number | null {
  const present = values.filter((value): value is number => value != null);
  if (!present.length) return null;
  return Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 100) / 100;
}
