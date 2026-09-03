import { NextResponse } from 'next/server';
import { newAction, fixTypeForCategory } from '@/lib/actions';
import { measureActionOutcome } from '@/lib/outcomes';
import { readActions, readOutcomes, writeActions, writeOutcomes } from '@/lib/server-store';
import { decodeDisplayText } from '@/lib/text';

function decodeActionRecord<T extends { title?: string; recommendation?: string }>(record: T): T {
  return {
    ...record,
    title: record.title ? decodeDisplayText(record.title) : record.title,
    recommendation: record.recommendation ? decodeDisplayText(record.recommendation) : record.recommendation,
  };
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const actions = readActions();
    const outcomes = readOutcomes();
    return NextResponse.json({
      actions: actions.actions.map(decodeActionRecord),
      outcomes: outcomes.items,
    });
  } catch (error) {
    console.error('Actions read error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Action log unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      action?: 'create' | 'apply' | 'refresh_outcome' | 'close_monitoring' | 'reopen_monitoring';
      opportunity_id?: string;
      category?: string;
      title?: string;
      recommendation?: string;
      week_end?: string;
      fix_type?: string;
      metadata?: Record<string, string | number | null>;
      action_id?: string;
    };

    const store = readActions();
    const now = new Date().toISOString();

    if (body.action === 'create') {
      if (!body.opportunity_id || !body.category || !body.title || !body.recommendation || !body.week_end) {
        return NextResponse.json({ error: 'Missing fields for create.' }, { status: 400 });
      }
      const record = newAction({
        opportunity_id: body.opportunity_id,
        category: body.category,
        title: body.title,
        recommendation: body.recommendation,
        week_end: body.week_end,
        fix_type: body.fix_type ?? fixTypeForCategory(body.category),
      });
      record.metadata = body.metadata ?? {};
      store.actions.push(decodeActionRecord(record));
      writeActions(store);
      return NextResponse.json({ action: decodeActionRecord(record) });
    }

    const action = store.actions.find((item) => item.id === body.action_id);
    if (!action) return NextResponse.json({ error: 'Action not found.' }, { status: 404 });

    if (body.action === 'apply') {
      action.status = 'applied';
      action.applied_at = now;
      action.monitoring = 'active';
      action.monitoring_closed_at = undefined;
      if (body.metadata) action.metadata = { ...action.metadata, ...body.metadata };
      writeActions(store);

      const outcome = await measureActionOutcome(action);
      const outcomes = readOutcomes();
      const without = outcomes.items.filter((item) => item.action_id !== action.id);
      outcomes.items = [...without, outcome];
      writeOutcomes(outcomes);
      return NextResponse.json({ action: decodeActionRecord(action), outcome });
    }

    if (body.action === 'refresh_outcome') {
      if (action.status !== 'applied') {
        return NextResponse.json({ error: 'Only applied fixes can be measured.' }, { status: 400 });
      }
      const outcome = await measureActionOutcome(action);
      const outcomes = readOutcomes();
      const without = outcomes.items.filter((item) => item.action_id !== action.id);
      outcomes.items = [...without, outcome];
      writeOutcomes(outcomes);
      return NextResponse.json({ action: decodeActionRecord(action), outcome });
    }

    if (body.action === 'close_monitoring') {
      if (action.status !== 'applied') {
        return NextResponse.json({ error: 'Only applied fixes can be closed.' }, { status: 400 });
      }
      action.monitoring = 'closed';
      action.monitoring_closed_at = now;
      writeActions(store);
      return NextResponse.json({ action: decodeActionRecord(action) });
    }

    if (body.action === 'reopen_monitoring') {
      if (action.status !== 'applied') {
        return NextResponse.json({ error: 'Only applied fixes can be reopened.' }, { status: 400 });
      }
      action.monitoring = 'active';
      action.monitoring_closed_at = undefined;
      writeActions(store);
      return NextResponse.json({ action: decodeActionRecord(action) });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    console.error('Actions write error', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to update action log.' }, { status: 503 });
  }
}
