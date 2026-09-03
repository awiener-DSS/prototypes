export type ActionStatus = 'created' | 'applied' | 'dismissed';
export type MonitoringStatus = 'active' | 'closed';

export type ActionRecord = {
  id: string;
  opportunity_id: string;
  category: string;
  title: string;
  fix_type: string;
  recommendation: string;
  target_metric: string;
  status: ActionStatus;
  monitoring?: MonitoringStatus;
  week_end: string;
  created_at: string;
  applied_at?: string;
  dismissed_at?: string;
  monitoring_closed_at?: string;
  metadata?: Record<string, string | number | null>;
};

export type ActionStore = {
  version: 1;
  actions: ActionRecord[];
};

export function targetMetricForCategory(category: string): string {
  if (category === 'Inventory') return 'zero_stock_views';
  if (category === 'Search') return 'search_result_view_rate';
  if (category === 'Funnel' || category === 'Taxonomy') return 'view_to_cart_rate';
  if (category === 'Landing' || category === 'Acquisition') return 'purchase_rate';
  return 'revenue_per_session';
}

export function fixTypeForCategory(category: string): string {
  if (category === 'Inventory') return 'substitute_merchandising';
  if (category === 'Search') return 'search_relevance';
  if (category === 'Funnel') return 'pdp_conversion';
  if (category === 'Landing') return 'landing_quality';
  if (category === 'Taxonomy') return 'taxonomy_merchandising';
  if (category === 'Acquisition') return 'acquisition_reallocation';
  return 'merchandising_recovery';
}

export function newAction(input: {
  opportunity_id: string;
  category: string;
  title: string;
  recommendation: string;
  week_end: string;
  fix_type?: string;
}): ActionRecord {
  const now = new Date().toISOString();
  return {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    opportunity_id: input.opportunity_id,
    category: input.category,
    title: input.title,
    fix_type: input.fix_type ?? fixTypeForCategory(input.category),
    recommendation: input.recommendation,
    target_metric: targetMetricForCategory(input.category),
    status: 'created',
    monitoring: undefined,
    week_end: input.week_end,
    created_at: now,
  };
}

export function latestActionForOpportunity(actions: ActionRecord[], opportunityId: string) {
  return [...actions]
    .filter((action) => action.opportunity_id === opportunityId && action.status !== 'dismissed')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

export function isMonitoringActive(action: ActionRecord): boolean {
  return action.status === 'applied' && (action.monitoring ?? 'active') === 'active';
}

export function appliedActions(actions: ActionRecord[]): ActionRecord[] {
  return [...actions]
    .filter((action) => action.status === 'applied')
    .sort((a, b) => (b.applied_at ?? b.created_at).localeCompare(a.applied_at ?? a.created_at));
}

export function pendingActions(actions: ActionRecord[]): ActionRecord[] {
  return [...actions]
    .filter((action) => action.status === 'created')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function activeMonitors(actions: ActionRecord[]): ActionRecord[] {
  return appliedActions(actions).filter(isMonitoringActive);
}
