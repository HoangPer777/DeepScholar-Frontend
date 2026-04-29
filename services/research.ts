// Use proxy to avoid mixed-content when deployed on Vercel (https) calling http backend
const AI_URL = typeof window === 'undefined'
  ? (process.env.AI_URL || process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8001/api')
  : '/api/ai-proxy';

export type ResearchErrorType = 'rate_limit' | 'network' | 'server';

export class ResearchError extends Error {
  type: ResearchErrorType;
  retryAfter?: number; // seconds
  constructor(message: string, type: ResearchErrorType, retryAfter?: number) {
    super(message);
    this.type = type;
    this.retryAfter = retryAfter;
  }
}

export interface ResearchSource {
  index: number;
  title: string;
  url: string;
  score: number;
  source_type: string;
  apa_year?: string;
  apa_authors?: string;
  apa_venue?: string;
}

export interface DeepResearchResponse {
  answer: string;
  sources: ResearchSource[];
  planner_decision: {
    need_clarification: boolean;
    need_external_search: boolean;
    focus_sections: string[];
    search_queries: string[];
    clarified_question: string | null;
  };
  confidence_score: number;
  iterations_used: number;
  decision: string;
  review_feedback: string | null;
}

export async function runDeepResearch(query: string): Promise<DeepResearchResponse> {
  // Step 1: Start the job
  let startRes: Response;
  try {
    startRes = await fetch(`${AI_URL}/research/deep-research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
  } catch (networkErr: any) {
    throw new ResearchError(
      `Cannot reach AI service. Make sure the service is running.`,
      'network'
    );
  }

  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({ detail: startRes.statusText }));
    throw new ResearchError(`AI service returned ${startRes.status}: ${err.detail}`, 'server');
  }

  const { task_id } = await startRes.json();
  if (!task_id) {
    throw new ResearchError('No task_id returned from AI service', 'server');
  }

  // Step 2: Poll until done
  const pollUrl = `${AI_URL}/research/status/${task_id}`;
  const maxWaitMs = 5 * 60 * 1000; // 5 minutes
  const intervalMs = 3000;
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    await new Promise((r) => setTimeout(r, intervalMs));

    let pollRes: Response;
    try {
      pollRes = await fetch(pollUrl);
    } catch {
      // transient network error, keep polling
      continue;
    }

    if (pollRes.status === 404) {
      throw new ResearchError('Research task not found', 'server');
    }

    if (!pollRes.ok) {
      const err = await pollRes.json().catch(() => ({ detail: pollRes.statusText }));
      const detail: string = err.detail || pollRes.statusText;
      if (pollRes.status === 500 && detail.includes('rate_limit_exceeded')) {
        const waitMatch = detail.match(/try again in ([\d.]+)s/);
        const retryAfter = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) : 60;
        throw new ResearchError('rate_limit', 'rate_limit', retryAfter);
      }
      throw new ResearchError(`AI service error: ${detail}`, 'server');
    }

    const data = await pollRes.json();
    if (data.status === 'done') {
      return data as DeepResearchResponse;
    }
    // status === 'pending', keep polling
  }

  throw new ResearchError(
    'Research timed out after 5 minutes. Please try again.',
    'network'
  );
}
