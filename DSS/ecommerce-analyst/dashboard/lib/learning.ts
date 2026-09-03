import type { ActionRecord } from '@/lib/actions';
import type { WeekOpportunity } from '@/lib/week';

export type OutcomeVerdict = 'lift' | 'flat' | 'worse' | 'inconclusive';

export type OutcomeRecord = {
  action_id: string;
  category: string;
  fix_type: string;
  target_metric: string;
  before_value: number | null;
  after_value: number | null;
  delta_pct: number | null;
  verdict: OutcomeVerdict;
  before_days: number;
  after_days: number;
  measured_at: string;
};

export type CategoryLearning = {
  category: string;
  attempts: number;
  measured: number;
  successes: number;
  success_rate: number | null;
  avg_lift_pct: number | null;
  boost: number;
  insight: string;
};

export type LearningSummary = {
  categories: CategoryLearning[];
  global_insight: string;
};

export function verdictFromDelta(deltaPct: number | null, beforeDays: number, afterDays: number): OutcomeVerdict {
  if (deltaPct == null || beforeDays < 2 || afterDays < 2) return 'inconclusive';
  if (deltaPct >= 0.05) return 'lift';
  if (deltaPct <= -0.05) return 'worse';
  return 'flat';
}

export function computeLearning(actions: ActionRecord[], outcomes: OutcomeRecord[]): LearningSummary {
  const applied = actions.filter((action) => action.status === 'applied');
  const outcomesByAction = new Map(outcomes.map((outcome) => [outcome.action_id, outcome]));
  const categories = ['Inventory', 'Search', 'Funnel', 'Anomaly', 'Landing', 'Taxonomy', 'Acquisition'];

  const categoryRows = categories.map((category) => {
    const related = applied.filter((action) => action.category === category);
    const measuredOutcomes = related
      .map((action) => outcomesByAction.get(action.id))
      .filter((outcome): outcome is OutcomeRecord => Boolean(outcome));
    const successes = measuredOutcomes.filter((outcome) => outcome.verdict === 'lift');
    const lifts = measuredOutcomes
      .map((outcome) => outcome.delta_pct)
      .filter((value): value is number => value != null);
    const successRate = measuredOutcomes.length ? successes.length / measuredOutcomes.length : null;
    const avgLift = lifts.length ? lifts.reduce((sum, value) => sum + value, 0) / lifts.length : null;
    const boost = categoryBoost(successRate, avgLift, measuredOutcomes.length);
    const insight = measuredOutcomes.length
      ? `${category}: ${successes.length}/${measuredOutcomes.length} applied fixes showed lift${avgLift != null ? ` (avg ${(avgLift * 100).toFixed(0)}%)` : ''}.`
      : `${category}: no measured outcomes yet — using detector defaults.`;

    return {
      category,
      attempts: related.length,
      measured: measuredOutcomes.length,
      successes: successes.length,
      success_rate: successRate,
      avg_lift_pct: avgLift,
      boost,
      insight,
    };
  });

  const measured = categoryRows.filter((row) => row.measured > 0);
  const globalInsight = measured.length
    ? `Learning loop active across ${measured.length} categories. Recommendations are boosted when similar fixes previously lifted target metrics.`
    : 'Learning loop is collecting outcomes. Apply fixes and revisit after a few days to sharpen recommendations.';

  return { categories: categoryRows, global_insight: globalInsight };
}

function categoryBoost(successRate: number | null, avgLift: number | null, measured: number): number {
  if (!measured || successRate == null) return 1;
  if (successRate >= 0.66 && (avgLift ?? 0) > 0.1) return 1.12;
  if (successRate >= 0.5) return 1.06;
  if (successRate <= 0.2 && measured >= 2) return 0.92;
  return 1;
}

export function applyLearningBoost(opportunities: WeekOpportunity[], learning: LearningSummary): WeekOpportunity[] {
  const boosts = new Map(learning.categories.map((row) => [row.category, row.boost]));
  return opportunities
    .map((opportunity) => {
      const learning_boost = boosts.get(opportunity.category) ?? 1;
      const base = opportunity.estimated_monthly_revenue_usd ?? opportunity.confidence * 1000;
      return {
        ...opportunity,
        learning_boost,
        adjusted_score: Math.round(base * learning_boost * 100) / 100,
      };
    })
    .sort((a, b) => (b.adjusted_score ?? -1) - (a.adjusted_score ?? -1));
}

export function learningContextForPrompt(learning: LearningSummary): string {
  const lines = learning.categories
    .filter((row) => row.measured > 0)
    .map((row) => row.insight);
  return lines.length ? lines.join(' ') : learning.global_insight;
}

export function insightForCategory(learning: LearningSummary, category: string): string | null {
  return learning.categories.find((row) => row.category === category)?.insight ?? null;
}
