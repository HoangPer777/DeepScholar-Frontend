// Use proxy to avoid mixed-content when deployed on Vercel (https) calling http backend
const AI_URL = typeof window === 'undefined'
  ? (process.env.AI_URL || process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8001/api')
  : '/api/ai-proxy';

// For polling: if NEXT_PUBLIC_AI_URL is set (e.g. production EC2 URL), poll directly
// from the browser to bypass the Vercel serverless proxy timeout.
// In local Docker dev, NEXT_PUBLIC_AI_URL is not set so we fall back to the proxy.
const POLL_URL = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_AI_URL
  ? process.env.NEXT_PUBLIC_AI_URL
  : AI_URL;

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
// Follow-up chat (async polling — same pattern as deep research)
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
  is_fast_chat?: boolean;
}

/**
 * Send a follow-up question using async job pattern.
 * POST /chat/start → get task_id → poll /chat/status/{task_id} until done.
 * This avoids Vercel serverless proxy timeout (60s) for long LLM workflows.
 */
export async function sendFollowUp(
  question: string,
  sessionId?: string | null,
): Promise<FollowUpResponse> {
  const baseUrl = typeof window === 'undefined'
    ? `${process.env.AI_URL || process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8001/api'}`
    : '/api/ai-proxy';

  // Step 1: Start the async chat job
  let startRes: Response;
  try {
    startRes = await fetch(`${baseUrl}/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, article_id: null, session_id: sessionId ?? null }),
    });
  } catch {
    throw new ResearchError('Cannot reach AI service.', 'network');
  }

  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({ detail: startRes.statusText }));
    let detail = err.detail || startRes.statusText;
    if (typeof detail === 'object') detail = JSON.stringify(detail);
    throw new ResearchError(`AI service error: ${detail}`, 'server');
  }

  const { task_id } = await startRes.json();
  if (!task_id) {
    throw new ResearchError('No task_id returned from chat service', 'server');
  }

  // Step 2: Poll until done — use POLL_URL to bypass Vercel proxy for polling
  const pollBase = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_AI_URL
    ? process.env.NEXT_PUBLIC_AI_URL
    : baseUrl;
  const pollUrl = `${pollBase}/chat/status/${task_id}`;

  const maxWaitMs = 10 * 60 * 1000; // 10 min max for follow-up
  const FAST_CHAT_POLL_INTERVAL_MS = 1000;
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    await new Promise((r) => setTimeout(r, FAST_CHAT_POLL_INTERVAL_MS));

    let pollRes: Response;
    try {
      pollRes = await fetch(pollUrl);
    } catch {
      continue; // network blip — retry
    }

    if (pollRes.status === 404) {
      throw new ResearchError('Chat task not found — server may have restarted.', 'server');
    }

    if (!pollRes.ok) {
      const err = await pollRes.json().catch(() => ({ detail: pollRes.statusText }));
      const detail: string = err.detail || pollRes.statusText;
      throw new ResearchError(`AI service error: ${detail}`, 'server');
    }

    const data = await pollRes.json();
    if (data.status === 'done') {
      return data as FollowUpResponse;
    }
    // status === 'pending' → keep polling
  }

  throw new ResearchError(
    'Follow-up timed out after 10 minutes. Please try again.',
    'network'
  );
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
  // Use POLL_URL (direct to AI service if public URL available) to avoid
  // routing every poll through the Vercel serverless proxy (60s maxDuration limit).
  const pollUrl = `${POLL_URL}/research/status/${task_id}`;
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
