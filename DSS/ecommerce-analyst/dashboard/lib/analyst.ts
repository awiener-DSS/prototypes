import { env } from 'cloudflare:workers';
import type { Opportunity } from '@/lib/opportunities';
import type { ImpactMath, InvestigationStep } from '@/lib/investigate';

export type AnalystWriteUp = {
  narrative: string;
  likely_cause: string;
  recommendation: string;
  confidence: number;
};

const SYSTEM = `You are a read-only ecommerce analyst writing a brief for a human merchandiser.
You receive a detector opportunity plus investigation steps already computed from GA4 BigQuery.
Rules:
- Use only the provided evidence. Do not invent metrics, SKUs, or causes.
- If product_context is present, use it for product identity and related/substitute SKUs only.
- ICM stock is not loaded for this site — never conclude availability from catalog context.
- Prefer GA4 zero-stock / commerce events for availability friction.
- Stay read-only: never claim you changed the storefront, catalog, pricing, ads, or analytics.
- Be specific and concise. Prefer one sharp likely cause over a laundry list.
- Recommendation must be a concrete next human step, not "investigate further" alone.
- If learning_context is present, use it to calibrate recommendation tone and priority — do not invent new statistics.
- confidence is 0 to 1 reflecting evidence strength, not model certainty theater.
Return JSON only with keys: narrative, likely_cause, recommendation, confidence.`;

function groqConfig() {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  return {
    apiKey: runtimeEnv.GROQ_API_KEY?.trim() ?? '',
    model: runtimeEnv.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b',
  };
}

export function groqConfigured() {
  return Boolean(groqConfig().apiKey);
}

export async function writeInvestigationBrief(input: {
  opportunity: Opportunity;
  steps: InvestigationStep[];
  impact_math: ImpactMath | null;
  product_context?: unknown;
  learning_context?: string;
}): Promise<AnalystWriteUp | null> {
  const { apiKey, model } = groqConfig();
  if (!apiKey) return null;

  const payload = {
    opportunity: {
      id: input.opportunity.id,
      category: input.opportunity.category,
      title: input.opportunity.title,
      problem: input.opportunity.problem,
      likely_cause: input.opportunity.likely_cause,
      evidence: input.opportunity.evidence,
      recommendation: input.opportunity.recommendation,
      confidence: input.opportunity.confidence,
      date: input.opportunity.date,
      estimated_monthly_revenue_usd: input.opportunity.estimated_monthly_revenue_usd,
      impact: input.opportunity.impact,
      metrics: input.opportunity.metrics,
    },
    investigation_steps: input.steps,
    impact_math: input.impact_math,
    product_context: input.product_context ?? [],
    learning_context: input.learning_context ?? '',
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Write the investigation brief from this evidence:\n${JSON.stringify(payload)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Groq write-up failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const body = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Groq returned an empty write-up');

  const parsed = JSON.parse(content) as Partial<AnalystWriteUp>;
  const narrative = String(parsed.narrative ?? '').trim();
  const likely_cause = String(parsed.likely_cause ?? '').trim();
  const recommendation = String(parsed.recommendation ?? '').trim();
  const confidence = Number(parsed.confidence);
  if (!narrative || !likely_cause || !recommendation || !Number.isFinite(confidence)) {
    throw new Error('Groq write-up missing required fields');
  }

  return {
    narrative,
    likely_cause,
    recommendation,
    confidence: Math.min(1, Math.max(0, confidence)),
  };
}
