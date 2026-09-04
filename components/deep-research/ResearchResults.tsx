'use client';

import React from 'react';
import {
  Bot,
  Calendar,
  CheckCircle2,
  Cpu,
  ExternalLink,
  FileText,
  Gauge,
  Link2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Zap,
  Clock,
} from 'lucide-react';
import type {
  DeepResearchResponse,
  ResearchActivity,
  ResearchErrorType,
  ResearchProgress,
  ResearchSourcePreview,
} from '@/services/research';
import ResearchProgressView from './ResearchProgress';

interface ResearchResultsProps {
  query: string;
  data?: DeepResearchResponse | null;
  loading?: boolean;
  error?: string | null;
  errorType?: ResearchErrorType | null;
  retryAfter?: number | null;
  progress?: ResearchProgress | null;
  activities?: ResearchActivity[];
  sourcePreviews?: ResearchSourcePreview[];
}

function extractAbstract(text: string): string {
  const lines = text.split('\n');
  const paragraphs: string[] = [];
  for (const line of lines) {
    if (line.startsWith('## ') && paragraphs.length > 0) break;
    const clean = line.replace(/^##\s*Abstract\s*/i, '').trim();
    if (clean) paragraphs.push(clean);
  }
  return paragraphs.join(' ').slice(0, 600);
}

function sourceCategory(sourceType: string): 'Academic' | 'Web' {
  const normalized = sourceType.toLowerCase().replace(/[-\s]/g, '_');
  return ['openalex', 'arxiv', 'semantic_scholar', 'crossref', 'doi'].includes(normalized)
    ? 'Academic'
    : 'Web';
}

/** Inline: bold **text**, citation [1], links */
function renderInline(text: string, key: number): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <React.Fragment key={key}>
      {parts.map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          return <strong key={i} className="font-black text-slate-800">{part.slice(2, -2)}</strong>;
        }
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#135bec] hover:underline">{linkMatch[1]}</a>;
        }
        return part;
      })}
    </React.Fragment>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let skipAbstract = false;

  while (i < lines.length) {
    const line = lines[i];

    if (line.match(/^##\s*Abstract\s*$/i)) {
      skipAbstract = true;
      i++;
      continue;
    }
    if (skipAbstract) {
      if (line.startsWith('## ')) {
        skipAbstract = false;
      } else {
        i++;
        continue;
      }
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="mt-12 border-b border-slate-200 pb-3 text-2xl font-black tracking-tight text-slate-900 first:mt-0">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="mt-8 mb-3 text-lg font-black text-slate-800">{line.slice(4)}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="mb-5 space-y-2 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-3 text-[14px] leading-relaxed text-slate-600">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#135bec]" />
              <span>{renderInline(item, j)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    } else if (line.trim() !== '') {
      elements.push(<p key={i} className="mb-4 text-[15px] leading-[1.85] text-slate-600">{renderInline(line, i)}</p>);
    }

    i++;
  }

  return <>{elements}</>;
}

function SourceCard({ source }: { source: DeepResearchResponse['sources'][number] }) {
  return (
    <a
      href={source.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-black text-[#135bec]">{source.index}</span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-bold leading-snug text-slate-700 group-hover:text-slate-900">{source.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <span>{sourceCategory(source.source_type)}</span>
            {source.apa_year && <><span>·</span><span>{source.apa_year}</span></>}
            {source.score > 0 && <><span>·</span><span className="font-bold text-emerald-600">{Math.round(source.score * 100)}% match</span></>}
          </div>
        </div>
        <ExternalLink size={13} className="mt-1 shrink-0 text-slate-300 transition-colors group-hover:text-[#135bec]" />
      </div>
    </a>
  );
}

function ResultAttribution({ data }: { data: DeepResearchResponse }) {
  const accepted = data.decision === 'accept';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">
        <Bot size={12} /> WriterAgent
      </span>
      {accepted && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">
          <ShieldCheck size={12} /> ReviewerAgent approved
        </span>
      )}
    </div>
  );
}

export default function ResearchResults({
  query,
  data,
  loading,
  error,
  errorType,
  retryAfter,
  progress,
  activities,
  sourcePreviews,
}: ResearchResultsProps) {
  const abstract = data ? extractAbstract(data.answer) : '';
  const hasCompletedTrace = Boolean(
    progress
      && (progress.phase === 'completed' || progress.phase === 'failed')
      && activities
      && activities.length > 0,
  );
  const [showTraceDetails, setShowTraceDetails] = React.useState(false);
  const traceDetailsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!hasCompletedTrace) setShowTraceDetails(false);
  }, [hasCompletedTrace]);

  React.useEffect(() => {
    if (!showTraceDetails) return undefined;
    const frame = window.requestAnimationFrame(() => {
      traceDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showTraceDetails]);

  return (
    <div className="bg-[#f6f6f8]">
      <main className="w-full">
        <div className="mx-auto max-w-[1240px] px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <header className="mb-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#135bec]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
                  <Sparkles size={14} className="fill-[#135bec]" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Deep Research Output</span>
              </div>
              {loading && (
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" /> Live pipeline
                </span>
              )}
            </div>

            <h1 className="mt-5 max-w-4xl text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">{query}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5"><Calendar size={13} />{new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span className="flex items-center gap-1.5"><Cpu size={13} />DeepScholar AI</span>
              {data && <span className="flex items-center gap-1.5"><Gauge size={13} />Confidence {Math.round(data.confidence_score * 100)}%</span>}
              {data && <span className="flex items-center gap-1.5"><FileText size={13} />{data.iterations_used} iteration{data.iterations_used !== 1 ? 's' : ''}</span>}
            </div>
            {data && <div className="mt-4"><ResultAttribution data={data} /></div>}
          </header>

          {loading && (
            <ResearchProgressView
              progress={progress}
              activities={activities}
              sourcePreviews={sourcePreviews}
            />
          )}

          {error && !loading && (
            errorType === 'rate_limit' ? (
              <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-8 sm:p-12">
                <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-sm"><Zap size={28} /></div>
                  <div className="space-y-2">
                    <p className="text-xl font-black text-slate-800">AI service is busy</p>
                    <p className="text-sm font-medium leading-relaxed text-slate-600">The available token capacity has been reached for this minute. Please wait a moment and try again.</p>
                    {retryAfter && <p className="flex items-center justify-center gap-1.5 pt-1 text-xs font-bold text-amber-700"><Clock size={12} />Try again in about {retryAfter} seconds</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4 rounded-[28px] border border-red-200 bg-red-50 p-6">
                <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
                <div className="space-y-1">
                  <p className="text-sm font-black text-red-700">{errorType === 'network' ? 'Unable to connect to AI service' : 'Something went wrong'}</p>
                  <p className="text-xs leading-relaxed text-red-600">{error}</p>
                </div>
              </div>
            )
          )}

          {data && !loading && (
            <>
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
                  {abstract && (
                    <div className="relative mb-10 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#135bec]"><Sparkles size={13} /> Abstract</div>
                      <p className="mt-3 text-[15px] font-medium leading-[1.8] text-slate-600">{abstract}</p>
                    </div>
                  )}
                  <div><MarkdownContent content={data.answer} /></div>
                </article>

                <aside className="space-y-4 xl:sticky xl:top-24" aria-label="Sources and research summary">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500"><Link2 size={14} className="text-[#135bec]" /> Evidence</div>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-[#135bec]">{data.sources.length}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">Sources used to build this answer.</p>
                    <div className="mt-4 space-y-2.5">
                      {data.sources.map((source) => <SourceCard key={source.index} source={source} />)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500"><CheckCircle2 size={14} className="text-[#135bec]" /> Model & verification</div>
                    <dl className="mt-4 space-y-3 text-xs">
                      <div className="flex items-start justify-between gap-3"><dt className="shrink-0 text-slate-400">Writer model</dt><dd className="max-w-[175px] break-words text-right font-mono text-[10px] font-bold text-slate-800">{data.writer_model?.selected_model || data.writer_model?.model || 'Model unavailable'}</dd></div>
                      <div className="flex items-center justify-between gap-3"><dt className="text-slate-400">Provider</dt><dd className="font-bold text-slate-700">{data.writer_model?.selected_provider || data.writer_model?.provider || 'Configured provider'}</dd></div>
                      {data.writer_model?.routing && <div className="flex items-start justify-between gap-3"><dt className="text-slate-400">Routing</dt><dd className="max-w-[170px] text-right font-medium leading-relaxed text-slate-600">{data.writer_model.routing}</dd></div>}
                      {data.writer_model?.fallback_used && <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] font-bold leading-relaxed text-amber-800">Fallback route used after an earlier model attempt.</div>}
                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3"><dt className="text-slate-400">Reviewed by</dt><dd className="font-bold text-slate-700">ReviewerAgent</dd></div>
                      <div className="flex items-center justify-between gap-3"><dt className="text-slate-400">Confidence</dt><dd className="font-bold text-emerald-600">{Math.round(data.confidence_score * 100)}%</dd></div>
                      <div className="flex items-center justify-between gap-3"><dt className="text-slate-400">Decision</dt><dd className="font-bold text-slate-700">{data.decision === 'accept' ? 'Accepted' : data.decision}</dd></div>
                    </dl>
                    {data.writer_model?.attempts && data.writer_model.attempts.length > 1 && (
                      <details className="mt-4 border-t border-slate-100 pt-3">
                        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Model attempts</summary>
                        <div className="mt-2 space-y-1.5">
                          {data.writer_model.attempts.map((attempt, index) => (
                            <div key={`${attempt.model}-${index}`} className="flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px]">
                              <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${attempt.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span className="min-w-0 flex-1 break-words font-mono text-slate-600">{attempt.model}</span>
                              <span className={`shrink-0 font-bold ${attempt.status === 'success' ? 'text-emerald-600' : 'text-amber-700'}`}>{attempt.status === 'success' ? 'Selected' : 'Failed'}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    {data.model_usage && Object.keys(data.model_usage).length > 0 && (
                      <details className="mt-3 border-t border-slate-100 pt-3">
                        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Agent model usage</summary>
                        <div className="mt-2 space-y-1.5">
                          {Object.entries(data.model_usage).map(([agent, usage]) => (
                            <div key={agent} className="flex items-start justify-between gap-2 text-[10px]">
                              <span className="font-bold capitalize text-slate-600">{agent.replace('_', ' ')}</span>
                              <span className="max-w-[180px] break-words text-right font-mono text-slate-400">{usage.model || usage.status || 'Not called'}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                  {hasCompletedTrace && (
                    <ResearchProgressView
                      progress={progress}
                      activities={activities}
                      sourcePreviews={sourcePreviews}
                      terminalLayout="summary"
                      traceOpen={showTraceDetails}
                      onTraceToggle={() => setShowTraceDetails((value) => !value)}
                    />
                  )}
                </aside>
              </div>
              {hasCompletedTrace && showTraceDetails && (
                <div ref={traceDetailsRef} className="mt-6 scroll-mt-24 sm:mt-8">
                  <ResearchProgressView
                    progress={progress}
                    activities={activities}
                    sourcePreviews={sourcePreviews}
                    terminalLayout="details"
                  />
                </div>
              )}
            </>
          )}

          {!data && !loading && hasCompletedTrace && (
            <div className="mt-6 sm:mt-8">
              <ResearchProgressView
                progress={progress}
                activities={activities}
                sourcePreviews={sourcePreviews}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
