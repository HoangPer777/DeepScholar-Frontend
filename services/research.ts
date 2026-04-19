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
  let res: Response;

  try {
    res = await fetch(`${AI_URL}/research/deep-research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
  } catch (networkErr: any) {
    const isTimeout = networkErr?.message?.toLowerCase().includes('timeout');
    throw new ResearchError(
      isTimeout
        ? `Request timed out. The AI pipeline can take up to 3 minutes — please try again.`
        : `Cannot reach AI service at ${AI_URL}. Make sure the service is running on port 8001.`,
      'network'
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail: string = err.detail || res.statusText;

    if (res.status === 500 && detail.includes('rate_limit_exceeded')) {
      const waitMatch = detail.match(/try again in ([\d.]+)s/);
      const retryAfter = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) : 60;
      throw new ResearchError('rate_limit', 'rate_limit', retryAfter);
    }

    throw new ResearchError(`AI service returned ${res.status}: ${detail}`, 'server');
  }

  return res.json();
}
