'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Database,
  ExternalLink,
  FileSearch,
  FileText,
  Layers3,
  Loader2,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  ResearchActivity,
  ResearchAgent,
  ResearchPhase,
  ResearchProgress as ResearchProgressData,
  ResearchSourcePreview,
} from '@/services/research';

interface ResearchProgressProps {
  progress?: ResearchProgressData | null;
  activities?: ResearchActivity[];
  sourcePreviews?: ResearchSourcePreview[];
  terminalLayout?: 'default' | 'summary' | 'details';
  traceOpen?: boolean;
  onTraceToggle?: () => void;
}

type StageKey =
  | 'planning'
  | 'clarifying'
  | 'searching'
  | 'synthesizing'
  | 'drafting'
  | 'reviewing'
  | 'finalizing';

interface StageDefinition {
  key: StageKey;
  label: string;
  phases: ResearchPhase[];
}

interface AgentMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  badge: string;
  iconTone: string;
}

const AGENT_META: Record<ResearchAgent, AgentMeta> = {
  system: {
    label: 'System',
    description: 'Pipeline orchestration',
    icon: Layers3,
    badge: 'border-slate-200 bg-slate-100 text-slate-600',
    iconTone: 'bg-slate-100 text-slate-500',
  },
  planner: {
    label: 'PlannerAgent',
    description: 'Research planning',
    icon: Sparkles,
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    iconTone: 'bg-blue-100 text-blue-700',
  },
  clarifier: {
    label: 'ClarifierAgent',
    description: 'Question clarification',
    icon: PenLine,
    badge: 'border-slate-300 bg-white text-slate-700',
    iconTone: 'bg-slate-100 text-slate-600',
  },
  researcher: {
    label: 'ResearcherAgent',
    description: 'Source discovery and synthesis',
    icon: Search,
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    iconTone: 'bg-sky-100 text-sky-700',
  },
  reader: {
    label: 'ReaderAgent',
    description: 'Internal document retrieval',
    icon: FileText,
    badge: 'border-slate-200 bg-slate-50 text-slate-600',
    iconTone: 'bg-slate-100 text-slate-600',
  },
  writer: {
    label: 'WriterAgent',
    description: 'Report drafting',
    icon: Bot,
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    iconTone: 'bg-indigo-100 text-indigo-700',
  },
  reviewer: {
    label: 'ReviewerAgent',
    description: 'Quality review',
    icon: ShieldCheck,
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    iconTone: 'bg-amber-100 text-amber-700',
  },
  fast_chat: {
    label: 'FastChatAgent',
    description: 'Follow-up response',
    icon: Bot,
    badge: 'border-slate-300 bg-slate-50 text-slate-700',
    iconTone: 'bg-slate-100 text-slate-700',
  },
};

const AGENT_KEYS = Object.keys(AGENT_META) as ResearchAgent[];

const STAGES: StageDefinition[] = [
  { key: 'planning', label: 'Plan', phases: ['planning'] },
  { key: 'clarifying', label: 'Clarify', phases: ['clarifying'] },
  { key: 'searching', label: 'Search', phases: ['searching'] },
  { key: 'synthesizing', label: 'Synthesize', phases: ['synthesizing'] },
  { key: 'drafting', label: 'Draft', phases: ['drafting', 'rewriting'] },
  { key: 'reviewing', label: 'Review', phases: ['reviewing'] },
  { key: 'finalizing', label: 'Finalize', phases: ['finalizing', 'completed'] },
];

const PHASE_LABELS: Record<ResearchPhase, string> = {
  queued: 'Queued',
  planning: 'Planning research',
  clarifying: 'Clarifying the question',
  searching: 'Searching sources',
  synthesizing: 'Synthesizing evidence',
  drafting: 'Drafting the report',
  reviewing: 'Reviewing quality',
  rewriting: 'Preparing a rewrite',
  finalizing: 'Finalizing the report',
  completed: 'Research complete',
  failed: 'Research stopped',
};

const PHASE_RANK: Record<ResearchPhase, number> = {
  queued: 0,
  planning: 1,
  clarifying: 2,
  searching: 3,
  synthesizing: 4,
  drafting: 5,
  rewriting: 5,
  reviewing: 6,
  finalizing: 7,
  completed: 8,
  failed: 8,
};

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatActivityTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function isResearchAgent(value: unknown): value is ResearchAgent {
  return typeof value === 'string' && AGENT_KEYS.includes(value as ResearchAgent);
}

function getAgent(activity: ResearchActivity): ResearchAgent {
  if (isResearchAgent(activity.agent)) return activity.agent;
  if (activity.phase === 'planning') return 'planner';
  if (activity.phase === 'clarifying') return 'clarifier';
  if (activity.phase === 'searching' || activity.phase === 'synthesizing') return 'researcher';
  if (activity.phase === 'drafting' || activity.phase === 'rewriting') return 'writer';
  if (activity.phase === 'reviewing') return 'reviewer';
  return 'system';
}

function getStringMetadata(activity: ResearchActivity, key: string): string | null {
  const value = activity.metadata?.[key];
  return typeof value === 'string' ? value : null;
}

function getNumberMetadata(activity: ResearchActivity, key: string): number | null {
  const value = activity.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getListMetadata(activity: ResearchActivity, key: string): string[] {
  const value = activity.metadata?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').slice(0, 8)
    : [];
}

function getQueryMetadata(activity: ResearchActivity): string[] {
  const value = activity.metadata?.search_queries;
  return Array.isArray(value)
    ? value.filter((query): query is string => typeof query === 'string').slice(0, 5)
    : [];
}

function getFailedPhase(activities: ResearchActivity[]): ResearchPhase | null {
  const failedActivity = [...activities]
    .reverse()
    .find((activity) => activity.state === 'failed');
  const phase = failedActivity?.metadata?.failed_phase;
  return typeof phase === 'string' && phase in PHASE_LABELS
    ? phase as ResearchPhase
    : null;
}

function stageState(
  stage: StageDefinition,
  currentPhase: ResearchPhase,
  failedPhase: ResearchPhase | null,
): 'upcoming' | 'active' | 'completed' | 'failed' {
  if (currentPhase === 'completed') return 'completed';

  if (currentPhase === 'failed') {
    if (failedPhase && stage.phases.includes(failedPhase)) return 'failed';
    if (!failedPhase) return 'upcoming';
    const failedRank = PHASE_RANK[failedPhase];
    const stageRank = Math.min(...stage.phases.map((phase) => PHASE_RANK[phase]));
    return stageRank < failedRank ? 'completed' : 'upcoming';
  }

  if (stage.phases.includes(currentPhase)) return 'active';
  const stageRank = Math.max(...stage.phases.map((phase) => PHASE_RANK[phase]));
  return stageRank < PHASE_RANK[currentPhase] ? 'completed' : 'upcoming';
}

function sourceCategory(sourceType: string): 'Academic' | 'Web' {
  const normalized = sourceType.toLowerCase().replace(/[-\s]/g, '_');
  return ['openalex', 'arxiv', 'semantic_scholar', 'crossref', 'doi'].includes(normalized)
    ? 'Academic'
    : 'Web';
}

function displayDomain(domain: string): string {
  return /openalex/i.test(domain) ? 'Academic index' : domain;
}

function sourceLabel(source: ResearchSourcePreview): string {
  return [sourceCategory(source.source_type), source.year].filter(Boolean).join(' · ');
}

function stateLabel(state: ResearchActivity['state']): string {
  if (state === 'active') return 'Processing';
  if (state === 'completed') return 'Completed';
  if (state === 'skipped') return 'Skipped';
  return 'Failed';
}

function stateTone(state: ResearchActivity['state']): string {
  if (state === 'active') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (state === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (state === 'skipped') return 'border-slate-200 bg-slate-100 text-slate-500';
  return 'border-red-200 bg-red-50 text-red-700';
}

function activityGroupKey(activity: ResearchActivity): string {
  return `${getAgent(activity)}:${activity.phase}`;
}

function ActivityMetadata({ activity }: { activity: ResearchActivity }) {
  const query = getStringMetadata(activity, 'query');
  const completedQueries = getNumberMetadata(activity, 'completed_queries');
  const totalQueries = getNumberMetadata(activity, 'total_queries');
  const foundSources = getNumberMetadata(activity, 'found_sources');
  const totalSources = getNumberMetadata(activity, 'total_sources');
  const academicSources = getNumberMetadata(activity, 'academic_sources');
  const score = getNumberMetadata(activity, 'score');
  const decision = getStringMetadata(activity, 'decision');
  const draftLength = getNumberMetadata(activity, 'draft_length');
  const duration = getNumberMetadata(activity, 'duration_ms');
  const model = getStringMetadata(activity, 'model');
  const provider = getStringMetadata(activity, 'provider');
  const modelStatus = getStringMetadata(activity, 'model_status');
  const availableModels = getListMetadata(activity, 'available_models');
  const modelAttempts = Array.isArray(activity.metadata?.model_attempts)
    ? activity.metadata.model_attempts.length
    : 0;
  const sourceTypes = activity.metadata?.source_types;
  const focusSections = getListMetadata(activity, 'focus_sections');

  const chips: string[] = [];
  if (query) chips.push(`Query: ${query}`);
  if (completedQueries !== null && totalQueries !== null) {
    chips.push(`${completedQueries}/${totalQueries} queries`);
  }
  if (foundSources !== null) chips.push(`${foundSources} results`);
  if (totalSources !== null) chips.push(`${totalSources} sources`);
  if (academicSources !== null) chips.push(`${academicSources} academic`);
  if (score !== null) chips.push(`Score ${Math.round(score * 100)}%`);
  if (decision) chips.push(decision === 'accept' ? 'Accepted' : decision === 'rewrite' ? 'Rewrite requested' : 'Rejected');
  if (draftLength !== null) chips.push(`${draftLength.toLocaleString('en-US')} chars`);
  if (duration !== null) chips.push(`${duration.toLocaleString('en-US')} ms`);
  if (model) chips.push(`Model: ${model}`);
  if (provider) chips.push(provider);
  if (modelStatus === 'selecting') chips.push('Selecting model');
  if (availableModels.length > 0) chips.push(`${availableModels.length} model candidates`);
  if (modelAttempts > 0) chips.push(`${modelAttempts} model attempts`);
  if (sourceTypes && typeof sourceTypes === 'object' && !Array.isArray(sourceTypes)) {
    const categoryCounts = Object.entries(sourceTypes).reduce<Record<string, number>>((counts, [type, count]) => {
      if (typeof count === 'number' && count > 0) {
        const category = sourceCategory(type);
        counts[category] = (counts[category] || 0) + count;
      }
      return counts;
    }, {});
    const breakdown = Object.entries(categoryCounts)
      .map(([type, count]) => `${type}: ${count}`)
      .join(' · ');
    if (breakdown) chips.push(breakdown);
  }

  if (chips.length === 0 && focusSections.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
      <span key={chip} className="max-w-full truncate rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200/80">
          {chip}
        </span>
      ))}
      {focusSections.map((section) => (
        <span key={section} className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
          {section}
        </span>
      ))}
    </div>
  );
}

interface AgentSupplementProps {
  activity: ResearchActivity;
  sourcePreviews: ResearchSourcePreview[];
  sourcePreviewSample: ResearchSourcePreview[];
  filteredSourcePreviews: ResearchSourcePreview[];
  sourceFilter: 'all' | 'academic' | 'web';
  onSourceFilterChange: (filter: 'all' | 'academic' | 'web') => void;
  showResearcherSources: boolean;
}

function AgentSupplement({
  activity,
  sourcePreviews,
  sourcePreviewSample,
  filteredSourcePreviews,
  sourceFilter,
  onSourceFilterChange,
  showResearcherSources,
}: AgentSupplementProps) {
  const agent = getAgent(activity);
  const queries = getQueryMetadata(activity);

  if (agent === 'planner' && queries.length > 0) {
    return (
      <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700"><PenLine size={13} /> Search plan</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {queries.map((query) => <span key={query} className="max-w-full truncate rounded-md bg-white px-2 py-1 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-100" title={query}>{query}</span>)}
        </div>
        {getListMetadata(activity, 'focus_sections').length > 0 && <p className="mt-2 text-[10px] leading-relaxed text-blue-900/60">Focus: {getListMetadata(activity, 'focus_sections').join(' · ')}</p>}
      </div>
    );
  }

  if (agent === 'researcher' && showResearcherSources) {
    const sourceList = sourceFilter === 'all' ? sourcePreviewSample : filteredSourcePreviews.slice(0, 6);
    return (
      <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-sky-700"><FileSearch size={13} /> Sources discovered</div>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-sky-700 ring-1 ring-inset ring-sky-100">{sourcePreviews.length}</span>
        </div>
        <div className="mt-2 flex items-center gap-1 rounded-md bg-white/70 p-1">
          {(['all', 'academic', 'web'] as const).map((filter) => (
            <button key={filter} type="button" onClick={() => onSourceFilterChange(filter)} aria-pressed={sourceFilter === filter} className={`flex-1 rounded px-2 py-1 text-[10px] font-bold transition-colors ${sourceFilter === filter ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              {filter === 'all' ? 'All' : filter === 'academic' ? 'Academic' : 'Web'}
            </button>
          ))}
        </div>
        {sourceList.length > 0 ? (
          <div className="mt-2 max-h-64 divide-y divide-sky-100 overflow-y-auto pr-1">
            {sourceList.map((source, index) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 items-start gap-2 py-2 first:pt-1 hover:bg-white/70">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[9px] font-black text-sky-700">{index + 1}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-slate-700" title={source.title}>{source.title}</span><span className="mt-0.5 block truncate text-[9px] font-medium text-slate-400">{displayDomain(source.domain)} · {sourceLabel(source)}</span></span>
                <ExternalLink size={12} className="mt-0.5 shrink-0 text-slate-300 group-hover:text-sky-700" />
              </a>
            ))}
          </div>
        ) : <p className="mt-2 text-[10px] text-slate-400">No sources recorded for this filter.</p>}
        {filteredSourcePreviews.length > sourceList.length && <p className="mt-2 text-center text-[10px] font-semibold text-slate-400">Showing {sourceList.length} of {filteredSourcePreviews.length} sources</p>}
      </div>
    );
  }

  if (agent === 'reviewer' && activity.state === 'completed') {
    const score = getNumberMetadata(activity, 'score');
    const decision = getStringMetadata(activity, 'decision');
    if (score !== null || decision) {
      return (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/70 px-2.5 py-2 text-[10px] font-bold text-amber-800">
          <ShieldCheck size={13} className="text-amber-700" />
          {score !== null && <span>Review score: {Math.round(score * 100)}%</span>}
          {decision && <span className="rounded bg-white/80 px-1.5 py-0.5 text-amber-700">{decision}</span>}
        </div>
      );
    }
  }

  return null;
}

export default function ResearchProgress({
  progress,
  activities = [],
  sourcePreviews = [],
  terminalLayout = 'default',
  traceOpen,
  onTraceToggle,
}: ResearchProgressProps) {
  const currentPhase = progress?.phase ?? 'queued';
  const [now, setNow] = useState(() => Date.now());
  const [selectedStage, setSelectedStage] = useState<StageKey | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'academic' | 'web'>('all');
  const [showCompletedTrace, setShowCompletedTrace] = useState(false);
  const activityLogRef = useRef<HTMLDivElement>(null);
  const startedAt = progress?.started_at ? Date.parse(progress.started_at) : NaN;
  const isRunning = !['completed', 'failed'].includes(currentPhase);
  const isTerminal = currentPhase === 'completed' || currentPhase === 'failed';
  const isDetailView = isTerminal && terminalLayout === 'details';
  const isSummaryView = isTerminal && terminalLayout === 'summary';
  const isTraceOpen = traceOpen ?? showCompletedTrace;

  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (isTerminal && onTraceToggle === undefined) setShowCompletedTrace(false);
  }, [isTerminal, onTraceToggle]);

  const elapsedSeconds = Number.isFinite(startedAt)
    ? Math.max(0, Math.floor((now - startedAt) / 1000))
    : 0;
  const visibleActivities = useMemo(
    () => [...activities].sort((a, b) => a.sequence - b.sequence),
    [activities],
  );
  const failedPhase = getFailedPhase(visibleActivities);
  const activityGroupCounts = useMemo(() => visibleActivities.reduce<Record<string, number>>((counts, activity) => {
    const key = activityGroupKey(activity);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {}), [visibleActivities]);
  const filteredSourcePreviews = sourcePreviews.filter((source) => (
    sourceFilter === 'all' || sourceCategory(source.source_type).toLowerCase() === sourceFilter
  ));
  const sourcePreviewSample = sourcePreviews.slice(0, 6);
  const selectedStageDefinition = !isTerminal
    ? STAGES.find((stage) => stage.key === selectedStage) || null
    : null;
  const filteredActivities = visibleActivities;
  const displayedActivities = visibleActivities;
  const latestResearcherSequence = [...visibleActivities]
    .reverse()
    .find((activity) => getAgent(activity) === 'researcher')?.sequence;
  const activeAgent = [...visibleActivities]
    .reverse()
    .find((activity) => activity.state === 'active');
  const activeAgentMeta = activeAgent ? AGENT_META[getAgent(activeAgent)] : null;
  const toggleTrace = () => {
    if (onTraceToggle) {
      onTraceToggle();
      return;
    }
    setShowCompletedTrace((value) => !value);
  };

  return (
    <section
      className={`mx-auto w-full border border-slate-200/80 bg-white ${isDetailView ? 'rounded-2xl p-3.5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-5' : isTerminal ? 'max-w-5xl rounded-xl p-2.5 shadow-sm sm:p-3' : 'rounded-[24px] p-3.5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-5'}`}
      aria-label="Deep Research progress"
    >
      {!isDetailView && <div className={`flex flex-col border-b border-slate-100 sm:flex-row sm:justify-between ${isTerminal ? 'items-center gap-2 pb-2' : 'items-start gap-4 pb-5'}`}>
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex shrink-0 items-center justify-center ${isTerminal ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl'} ${isRunning ? 'bg-blue-50 text-[#135bec]' : 'bg-emerald-50 text-emerald-600'}`}>
            {isRunning ? <Loader2 size={isTerminal ? 17 : 20} className="motion-safe:animate-spin motion-reduce:animate-none" /> : <ShieldCheck size={isTerminal ? 17 : 20} />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`${isTerminal ? 'text-[9px]' : 'text-[10px]'} font-black uppercase tracking-[0.18em] text-[#135bec]`}>
                {isRunning ? 'Live research pipeline' : 'Research pipeline'}
              </p>
              {activeAgentMeta && isRunning && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${activeAgentMeta.badge}`}>
                  {activeAgentMeta.label}
                </span>
              )}
            </div>
            <h2 className={`mt-1 truncate font-black tracking-tight text-slate-900 ${isTerminal ? 'text-sm' : 'text-xl'}`}>
              {progress ? PHASE_LABELS[currentPhase] : 'Starting research'}
            </h2>
            <p className={`${isTerminal ? 'mt-0.5 max-w-xl truncate text-[11px]' : 'mt-1 max-w-2xl text-sm leading-relaxed'} text-slate-600`} role="status" aria-live="polite">
              {progress?.message ?? 'Connecting to the research pipeline...'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-left sm:text-right">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Elapsed</p>
            <p className={`${isTerminal ? 'mt-0.5 text-xs' : 'mt-1 text-sm'} font-black text-slate-800`}>{formatElapsed(elapsedSeconds)}</p>
          </div>
          {progress && progress.iteration > 0 && (
             <div className="border-l border-slate-200 pl-4">
               <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Iteration</p>
                <p className={`${isTerminal ? 'mt-0.5 text-xs' : 'mt-1 text-sm'} font-black text-slate-800`}>{progress.iteration}/{progress.max_iterations}</p>
            </div>
          )}
        </div>
      </div>}

      {!isTerminal && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 sm:p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Research stages</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">Jump to its events in the activity log</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{visibleActivities.length} total events</span>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <ol className="flex min-w-[760px] items-start px-2 py-1" aria-label="Research stages">
              {STAGES.map((stage, index) => {
                const status = stageState(stage, currentPhase, failedPhase);
                const isActive = status === 'active';
                const isSelected = selectedStage === stage.key;
                const eventCount = visibleActivities.filter((activity) => stage.phases.includes(activity.phase)).length;
                const connectorTone = status === 'completed'
                  ? 'bg-emerald-100'
                  : status === 'failed'
                    ? 'bg-red-100'
                    : 'bg-slate-200';
                return (
                  <React.Fragment key={stage.key}>
                    <li className="flex min-w-0 flex-1 flex-col items-center">
                      <button
                        type="button"
                        aria-current={isActive ? 'step' : undefined}
                        aria-controls="activity-log"
                        aria-label={`Jump to ${stage.label} events`}
                        onClick={() => {
                          setSelectedStage(stage.key);
                          window.requestAnimationFrame(() => {
                            const target = document.getElementById(`stage-${stage.key}`);
                            (target || activityLogRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          });
                        }}
                        className="group flex w-full min-w-0 flex-col items-center rounded-xl px-1 py-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#135bec]/40"
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[10px] font-black transition-all ${status === 'active' ? 'border-blue-200 bg-blue-50 text-[#135bec] shadow-[0_0_0_5px_rgba(19,91,236,0.08)]' : status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'failed' ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-400 group-hover:border-slate-300'} ${isSelected ? 'ring-2 ring-blue-100 ring-offset-2' : ''}`}>
                          {status === 'active' ? <Loader2 size={14} className="motion-safe:animate-spin motion-reduce:animate-none" /> : status === 'completed' ? <Check size={15} /> : status === 'failed' ? '!' : index + 1}
                        </span>
                        <span className={`mt-2 text-[10px] font-black ${isSelected || isActive ? 'text-[#135bec]' : status === 'upcoming' ? 'text-slate-400' : 'text-slate-700'}`}>{stage.label}</span>
                        <span className="mt-0.5 text-[9px] font-medium text-slate-400">{eventCount} {eventCount === 1 ? 'event' : 'events'}</span>
                      </button>
                    </li>
                    {index < STAGES.length - 1 && <li aria-hidden="true" className={`mt-[18px] h-1 flex-1 rounded-full ${connectorTone}`} />}
                  </React.Fragment>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {isTerminal && !isDetailView && (
        <button
          type="button"
          onClick={toggleTrace}
          aria-expanded={isTraceOpen}
          aria-controls="activity-log"
          className="mt-3 flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#135bec]/30"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#135bec]">
            <Clock3 size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Research trace</span>
            <span className="mt-0.5 block text-[11px] text-slate-500">{isTraceOpen ? 'Hide the complete agent execution history' : 'Review how the agents completed this research'}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{visibleActivities.length} events</span>
            <ChevronDown size={15} className={`text-slate-400 transition-transform ${isTraceOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>
      )}

      {(!isTerminal || isDetailView || (isTraceOpen && !isSummaryView)) && (
      <div ref={activityLogRef} id="activity-log" className={`${isDetailView ? 'mt-0' : 'mt-6'} scroll-mt-6`}>
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                <Clock3 size={14} className="text-[#135bec]" />
                Activity log
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Execution steps, in order</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200">
              {filteredActivities.length} {filteredActivities.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {selectedStageDefinition && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-[10px] text-blue-800" role="status">
              <span>Highlighting <strong>{selectedStageDefinition.label}</strong> events. All events remain visible below.</span>
              <button type="button" onClick={() => setSelectedStage(null)} className="font-black text-blue-700 hover:underline">Clear highlight</button>
            </div>
          )}

          {filteredActivities.length > 0 ? (
            <ol className="mt-4 space-y-2" aria-live="polite">
              {displayedActivities.map((activity, index) => {
                const agent = getAgent(activity);
                const meta = AGENT_META[agent];
                const AgentIcon = meta.icon;
                const groupKey = activityGroupKey(activity);
                const previousActivity = displayedActivities[index - 1];
                const isGroupStart = !previousActivity || activityGroupKey(previousActivity) !== groupKey;
                const stageDefinition = STAGES.find((stage) => stage.phases.includes(activity.phase));
                const firstStageActivity = stageDefinition && visibleActivities.find((item) => stageDefinition.phases.includes(item.phase));
                const isStageStart = firstStageActivity?.sequence === activity.sequence;
                const isHighlighted = Boolean(selectedStageDefinition?.phases.includes(activity.phase));
                const isLast = index === displayedActivities.length - 1;
                const displayState = currentPhase === 'completed' && activity.state === 'active'
                  ? 'completed'
                  : activity.state;
                return (
                  <React.Fragment key={activity.sequence}>
                    {isGroupStart && (
                      <li className="flex items-center gap-2 px-1 pb-0.5 pt-3 first:pt-0" aria-label={`${meta.label} group`}>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-md ${meta.iconTone}`} aria-hidden="true"><AgentIcon size={12} /></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{meta.label}</span>
                        <span className="text-[10px] text-slate-400">{PHASE_LABELS[activity.phase]}</span>
                        <span className="ml-auto text-[9px] font-bold text-slate-400">{activityGroupCounts[groupKey]} {activityGroupCounts[groupKey] === 1 ? 'event' : 'events'}</span>
                      </li>
                    )}
                    <li id={isStageStart && stageDefinition ? `stage-${stageDefinition.key}` : undefined} className="relative pl-8">
                      {!isLast && <span aria-hidden="true" className="absolute bottom-[-10px] left-[11px] top-7 w-px bg-slate-200" />}
                      <span className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-lg ${meta.iconTone}`} aria-hidden="true">
                        {displayState === 'active' ? <Loader2 size={14} className="motion-safe:animate-spin motion-reduce:animate-none" /> : displayState === 'completed' ? <Check size={14} /> : displayState === 'failed' ? <span className="text-sm font-black">!</span> : <AgentIcon size={14} />}
                      </span>
                      <div className={`rounded-xl border px-2.5 py-2 transition-colors motion-reduce:transition-none ${displayState === 'active' ? 'border-blue-200 bg-blue-50/70' : isHighlighted ? 'border-blue-200 bg-blue-50/30 ring-1 ring-blue-100' : 'border-slate-200 bg-white'}`}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span title={meta.description} className={`rounded-full border px-1.5 py-0.5 text-[9px] font-black ${meta.badge}`}>{meta.label}</span>
                          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${stateTone(displayState)}`}>{stateLabel(displayState)}</span>
                          {formatActivityTime(activity.timestamp) && <time className="ml-auto text-[10px] font-medium text-slate-400">{formatActivityTime(activity.timestamp)}</time>}
                        </div>
                        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">#{String(activity.sequence).padStart(2, '0')} · {activity.phase}</span>
                          <p className="text-xs font-bold leading-snug text-slate-800">{activity.title}</p>
                        </div>
                        {activity.detail && <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{activity.detail}</p>}
                        <ActivityMetadata activity={activity} />
                        <AgentSupplement
                          activity={activity}
                          sourcePreviews={sourcePreviews}
                          sourcePreviewSample={sourcePreviewSample}
                          filteredSourcePreviews={filteredSourcePreviews}
                          sourceFilter={sourceFilter}
                          onSourceFilterChange={setSourceFilter}
                          showResearcherSources={activity.sequence === latestResearcherSequence}
                        />
                      </div>
                    </li>
                  </React.Fragment>
                );
              })}
            </ol>
          ) : (
            <div className="flex items-center gap-3 py-8 text-sm text-slate-400">
              <Loader2 size={16} className="motion-safe:animate-spin motion-reduce:animate-none" />
              Waiting for the first activity...
            </div>
          )}

        </div>

      </div>
      )}
    </section>
  );
}
