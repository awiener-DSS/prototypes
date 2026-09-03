export type SearchTermRow = {
  search_term: string;
  searches: number;
  result_views: number;
  no_result_events: number;
  users: number;
};

export type SearchAttentionLevel = 'critical' | 'warning' | 'healthy';

export type SearchAttention = {
  level: SearchAttentionLevel;
  label: string;
  reason: string;
  needsAttention: boolean;
  sortRank: number;
};

export function classifySearchTerm(term: SearchTermRow): SearchAttention {
  if (term.no_result_events > 0) {
    return {
      level: 'critical',
      label: 'No results',
      reason: `${term.no_result_events} no-result event${term.no_result_events === 1 ? '' : 's'} reported`,
      needsAttention: true,
      sortRank: 0,
    };
  }

  if (term.searches >= 5 && term.result_views === 0) {
    return {
      level: 'critical',
      label: 'No result views',
      reason: `${term.searches} searches with zero result-view events`,
      needsAttention: true,
      sortRank: 1,
    };
  }

  if (term.searches >= 5 && term.result_views < term.searches) {
    return {
      level: 'warning',
      label: 'Weak engagement',
      reason: `${term.result_views} result views for ${term.searches} searches`,
      needsAttention: true,
      sortRank: 2,
    };
  }

  if (term.searches >= 3 && term.result_views < Math.ceil(term.searches * 0.5)) {
    return {
      level: 'warning',
      label: 'Low match rate',
      reason: 'Result views lag behind search volume',
      needsAttention: true,
      sortRank: 3,
    };
  }

  return {
    level: 'healthy',
    label: 'Healthy',
    reason: 'Search volume aligns with result engagement',
    needsAttention: false,
    sortRank: 9,
  };
}

export function sortSearchTermsByAttention(terms: SearchTermRow[]): Array<SearchTermRow & { attention: SearchAttention }> {
  return terms
    .map((term) => ({ ...term, attention: classifySearchTerm(term) }))
    .sort((left, right) => {
      if (left.attention.sortRank !== right.attention.sortRank) {
        return left.attention.sortRank - right.attention.sortRank;
      }
      if (right.searches !== left.searches) return right.searches - left.searches;
      return right.users - left.users;
    });
}

export function searchMatchRate(term: SearchTermRow): number {
  if (term.searches <= 0) return 0;
  return Math.min(100, Math.round((term.result_views / term.searches) * 100));
}
