'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Circle,
  ExternalLink,
  FileSearch,
  Loader2,
  PenLine,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type {
  ResearchActivity,
  ResearchPhase,
  ResearchProgress as ResearchProgressData,
  ResearchSourcePreview,
} from '@/services/research';

interface ResearchProgressProps {
  progress?: ResearchProgressData | null;
  activities?: ResearchActivity[];
  sourcePreviews?: ResearchSourcePreview[];
}

type StageKey = 'planning' | 'searching' | 'synthesizing' | 'drafting' | 'reviewing' | 'finalizing';

interface StageDefinition {
  key: StageKey;
  label: string;
  phases: ResearchPhase[];
}

const STAGES: StageDefinition[] = [
  { key: 'planning', label: 'Lập kế hoạch', phases: ['planning', 'clarifying'] },
  { key: 'searching', label: 'Tìm kiếm nguồn', phases: ['searching'] },
  { key: 'synthesizing', label: 'Tổng hợp thông tin', phases: ['synthesizing'] },
  { key: 'drafting', label: 'Viết báo cáo', phases: ['drafting', 'rewriting'] },
  { key: 'reviewing', label: 'Kiểm tra chất lượng', phases: ['reviewing'] },
  { key: 'finalizing', label: 'Hoàn thiện', phases: ['finalizing', 'completed'] },
];

const PHASE_LABELS: Record<ResearchPhase, string> = {
  queued: 'Đang xếp hàng',
  planning: 'Đang lập kế hoạch',
  clarifying: 'Đang làm rõ câu hỏi',
  searching: 'Đang tìm kiếm nguồn',
  synthesizing: 'Đang tổng hợp thông tin',
  drafting: 'Đang viết báo cáo',
  reviewing: 'Đang kiểm tra chất lượng',
  rewriting: 'Đang chuẩn bị viết lại',
  finalizing: 'Đang hoàn thiện báo cáo',
  completed: 'Đã hoàn thành',
  failed: 'Nghiên cứu đã dừng',
};

const PHASE_RANK: Record<ResearchPhase, number> = {
  queued: 0,
  planning: 1,
  clarifying: 1,
  searching: 2,
  synthesizing: 3,
  drafting: 4,
  rewriting: 4,
  reviewing: 5,
  finalizing: 6,
  completed: 7,
  failed: 7,
};

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} phút ${seconds} giây` : `${seconds} giây`;
}

function getStringMetadata(activity: ResearchActivity, key: string): string | null {
  const value = activity.metadata?.[key];
  return typeof value === 'string' ? value : null;
}

function getNumberMetadata(activity: ResearchActivity, key: string): number | null {
  const value = activity.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
  if (currentPhase === 'failed') {
    if (failedPhase && stage.phases.includes(failedPhase)) return 'failed';
    if (!failedPhase) return 'upcoming';
    const failedRank = PHASE_RANK[failedPhase];
    const stageRank = Math.max(...stage.phases.map((phase) => PHASE_RANK[phase]));
    return stageRank < failedRank ? 'completed' : 'upcoming';
  }
  if (stage.phases.includes(currentPhase)) return 'active';
  const stageRank = Math.max(...stage.phases.map((phase) => PHASE_RANK[phase]));
  return stageRank < PHASE_RANK[currentPhase] ? 'completed' : 'upcoming';
}

function sourceLabel(source: ResearchSourcePreview): string {
  return [source.source_type, source.year].filter(Boolean).join(' · ');
}

export default function ResearchProgress({
  progress,
  activities = [],
  sourcePreviews = [],
}: ResearchProgressProps) {
  const currentPhase = progress?.phase ?? 'queued';
  const [now, setNow] = useState(() => Date.now());
  const startedAt = progress?.started_at ? Date.parse(progress.started_at) : NaN;
  const isRunning = !['completed', 'failed'].includes(currentPhase);

  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const elapsedSeconds = Number.isFinite(startedAt)
    ? Math.max(0, Math.floor((now - startedAt) / 1000))
    : 0;
  const visibleActivities = useMemo(
    () => [...activities].sort((a, b) => a.sequence - b.sequence),
    [activities],
  );
  const failedPhase = getFailedPhase(visibleActivities);
  const latestPlanningActivity = [...visibleActivities]
    .reverse()
    .find((activity) => activity.phase === 'planning' && getQueryMetadata(activity).length > 0);
  const latestReviewActivity = [...visibleActivities]
    .reverse()
    .find((activity) => activity.phase === 'reviewing' && activity.state === 'completed');

  return (
    <section
      className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-slate-50 p-5 shadow-sm sm:p-7"
      aria-label="Tiến trình Deep Research"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-[#135bec]">
            {isRunning ? <Loader2 size={20} className="motion-safe:animate-spin" /> : <ShieldCheck size={20} />}
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#135bec]">
              Deep Research đang hoạt động
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              {progress ? PHASE_LABELS[currentPhase] : 'Đang khởi động nghiên cứu'}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600" role="status" aria-live="polite">
              {progress?.message ?? 'Đang kết nối với pipeline nghiên cứu...'}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left text-xs font-semibold text-slate-400 sm:text-right">
          <p>Thời gian đã chạy</p>
          <p className="mt-1 text-sm font-black text-slate-700">{formatElapsed(elapsedSeconds)}</p>
          {progress && progress.iteration > 0 && (
            <p className="mt-1">Lần {progress.iteration}/{progress.max_iterations}</p>
          )}
        </div>
      </div>

      <ol className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-6" aria-label="Các giai đoạn nghiên cứu">
        {STAGES.map((stage) => {
          const state = stageState(stage, currentPhase, failedPhase);
          const isActive = state === 'active';
          const isCompleted = state === 'completed';
          return (
            <li
              key={stage.key}
              aria-current={isActive ? 'step' : undefined}
              className={`rounded-2xl border px-3 py-3 transition-colors motion-reduce:transition-none ${
                isActive
                  ? 'border-blue-200 bg-blue-100/80 text-blue-800'
                  : isCompleted
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                    : state === 'failed'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : 'border-slate-200 bg-white/70 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {isActive ? (
                  <Loader2 size={15} className="shrink-0 motion-safe:animate-spin" />
                ) : isCompleted ? (
                  <Check size={15} className="shrink-0" />
                ) : state === 'failed' ? (
                  <Circle size={15} className="shrink-0" />
                ) : (
                  <Circle size={15} className="shrink-0" />
                )}
                <span className="text-xs font-bold">{stage.label}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {latestPlanningActivity && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <PenLine size={14} className="text-[#135bec]" />
            Kế hoạch tìm kiếm
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {getQueryMetadata(latestPlanningActivity).map((query) => (
              <span key={query} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
                {query}
              </span>
            ))}
          </div>
        </div>
      )}

      {sourcePreviews.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <FileSearch size={14} className="text-[#135bec]" />
              Nguồn đã tìm thấy
            </div>
            <span className="text-xs font-bold text-slate-400">{sourcePreviews.length} nguồn</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {sourcePreviews.slice(0, 6).map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-0 items-start gap-2 rounded-xl border border-slate-100 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
              >
                <Search size={13} className="mt-0.5 shrink-0 text-slate-400 group-hover:text-[#135bec]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-700" title={source.title}>
                    {source.title}
                  </span>
                  <span className="mt-1 block truncate text-[10px] font-medium text-slate-400">
                    {source.domain}{sourceLabel(source) ? ` · ${sourceLabel(source)}` : ''}
                  </span>
                </span>
                <ExternalLink size={12} className="mt-0.5 shrink-0 text-slate-300 group-hover:text-[#135bec]" />
              </a>
            ))}
          </div>
        </div>
      )}

      {latestReviewActivity && (
        <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
            <ShieldCheck size={14} />
            Phản hồi đánh giá gần nhất
          </div>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">{latestReviewActivity.detail}</p>
          {getNumberMetadata(latestReviewActivity, 'score') !== null && (
            <p className="mt-2 text-xs font-bold text-amber-700">
              Điểm đánh giá: {Math.round((getNumberMetadata(latestReviewActivity, 'score') || 0) * 100)}%
              {getStringMetadata(latestReviewActivity, 'decision')
                ? ` · ${getStringMetadata(latestReviewActivity, 'decision')}`
                : ''}
            </p>
          )}
        </div>
      )}

      {visibleActivities.length > 0 && (
        <div className="mt-6 border-t border-slate-200/80 pt-5">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Hoạt động gần đây</h3>
          <ol className="mt-3 space-y-3" aria-live="polite">
            {visibleActivities.slice(-8).map((activity) => (
              <li key={activity.sequence} className="flex items-start gap-3">
                <span
                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    activity.state === 'failed'
                      ? 'bg-red-100 text-red-600'
                      : activity.state === 'active'
                        ? 'bg-blue-100 text-[#135bec]'
                        : activity.state === 'skipped'
                          ? 'bg-slate-100 text-slate-400'
                          : 'bg-emerald-100 text-emerald-600'
                  }`}
                  aria-hidden="true"
                >
                  {activity.state === 'active' ? (
                    <Loader2 size={11} className="motion-safe:animate-spin" />
                  ) : activity.state === 'completed' ? (
                    <Check size={11} />
                  ) : (
                    <Circle size={8} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700">{activity.title}</p>
                  {activity.detail && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{activity.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
