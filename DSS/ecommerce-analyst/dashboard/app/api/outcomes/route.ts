import { NextResponse } from 'next/server';
import { readActions, readOutcomes } from '@/lib/server-store';
import { measureActionOutcome } from '@/lib/outcomes';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const actionId = url.searchParams.get('action_id');
    const opportunityId = url.searchParams.get('opportunity_id');
    const actions = readActions().actions;
    const outcomes = readOutcomes().items;

    if (actionId) {
      const action = actions.find((item) => item.id === actionId);
      if (!action) return NextResponse.json({ error: 'Action not found.' }, { status: 404 });
      let outcome = outcomes.find((item) => item.action_id === actionId) ?? null;
      if (!outcome && action.status === 'applied') {
        outcome = await measureActionOutcome(action);
      }
      return NextResponse.json({ action, outcome });
    }

    if (opportunityId) {
      const action = [...actions]
        .filter((item) => item.opportunity_id === opportunityId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
      const outcome = action ? outcomes.find((item) => item.action_id === action.id) ?? null : null;
      return NextResponse.json({ action, outcome });
    }

    return NextResponse.json({ outcomes });
  } catch (error) {
    console.error('Outcome read error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Outcome data unavailable.' }, { status: 503 });
  }
}
