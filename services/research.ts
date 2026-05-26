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
  session_id?: string;
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

// ---------------------------------------------------------------------------
// Follow-up chat (memory chatbot)
// ---------------------------------------------------------------------------

export interface FollowUpResponse {
  answer: string;
  citations: Array<{
    index: number;
    title: string;
    url: string;
    score: number;
    source_type: string;
    apa_year?: string;
  }>;
  confidence_score: number;
  review_feedback: string | null;
  need_clarification: boolean;
  clarification_question: string | null;
}

/**
 * Send a follow-up question using the existing /api/chat/ endpoint.
 * article_id is null for deep-research mode (no PDF context).
 */
export async function sendFollowUp(
  question: string,
  sessionId?: string | null,
): Promise<FollowUpResponse> {
  const url = typeof window === 'undefined'
    ? `${process.env.AI_URL || process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8001/api'}/chat/`
    : '/api/ai-proxy/chat/';

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, article_id: null, session_id: sessionId ?? null }),
    });
  } catch {
    throw new ResearchError('Cannot reach AI service.', 'network');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    let detail = err.detail || res.statusText;
    if (typeof detail === 'object') detail = JSON.stringify(detail);
    throw new ResearchError(`AI service error: ${detail}`, 'server');
  }

  return res.json() as Promise<FollowUpResponse>;
}

// ---------------------------------------------------------------------------
// Deep research (one-shot, async polling)
// ---------------------------------------------------------------------------

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
  const maxWaitMs = 20 * 60 * 1000;
  const INITIAL_INTERVAL_MS = 3000;
  const MAX_INTERVAL_MS = 8000;
  const BACKOFF_MULTIPLIER = 1.15;
  const BACKOFF_AFTER_N_POLLS = 10;

  let currentInterval = INITIAL_INTERVAL_MS;
  let consecutivePending = 0;
  let pollInFlight = false;
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    await new Promise((r) => setTimeout(r, currentInterval));

    if (pollInFlight) continue;

    pollInFlight = true;
    let pollRes: Response;
    try {
      pollRes = await fetch(pollUrl);
    } catch {
      pollInFlight = false;
      continue;
    } finally {
      pollInFlight = false;
    }

    if (pollRes.status === 404) {
      throw new ResearchError('Research task not found — server may have restarted. Please try again.', 'server');
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

    consecutivePending++;
    if (consecutivePending % BACKOFF_AFTER_N_POLLS === 0) {
      currentInterval = Math.min(currentInterval * BACKOFF_MULTIPLIER, MAX_INTERVAL_MS);
    }
  }

  throw new ResearchError(
    'Research timed out after 20 minutes. The query may be too complex — please try a more specific topic.',
    'network'
  );
}
