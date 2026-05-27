'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import {
  Atom,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileUp,
  PenSquare,
  Search,
  SearchIcon,
  Trash2,
  ArrowUp,
  Loader2,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Zap
} from 'lucide-react';
import NotificationDropdown from '@/components/NotificationDropdown';
import ResearchResults from '@/components/deep-research/ResearchResults';
import { runDeepResearch, sendFollowUp, type DeepResearchResponse, type FollowUpResponse, ResearchError, type ResearchErrorType } from '@/services/research';

type ResearchTurn = {
  kind: 'research';
  query: string;
  data: DeepResearchResponse | null;
  loading: boolean;
  error: string | null;
  errorType: ResearchErrorType | null;
  retryAfter: number | null;
};

type FollowUpTurn = {
  kind: 'followup';
  question: string;
  data: FollowUpResponse | null;
  loading: boolean;
  error: string | null;
};

type ChatTurn = ResearchTurn | FollowUpTurn;

interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
  sessionId?: string | null;
  turns?: ChatTurn[];
}

type ResearchState = 'idle' | 'results';

const HISTORY_KEY = 'deep_research_history';

function groupHistory(items: HistoryItem[]) {
  const now = Date.now();
  const today: HistoryItem[] = [];
  const yesterday: HistoryItem[] = [];
  const older: HistoryItem[] = [];

  items.forEach((item) => {
    const diff = now - item.timestamp;
    if (diff < 86400000) today.push(item);
    else if (diff < 172800000) yesterday.push(item);
    else older.push(item);
  });

  return { today, yesterday, older };
}

export default function DeepResearchPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [state, setState] = useState<ResearchState>('idle');
  const [pageState, setPageState] = useState<'idle' | 'chat'>('idle');
  const [query, setQuery] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [data, setData] = useState<DeepResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ResearchErrorType | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchHistory, setSearchHistory] = useState('');
  
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [followUp, setFollowUp] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  
  const bottomRef = React.useRef<HTMLDivElement>(null);
  // isAnyLoading: true only when a follow-up turn is in-flight.
  // Research turns have their own loading state shown inside TurnBlock.
  // We must NOT disable the follow-up input while research is loading —
  // the user should be able to type their next question while waiting.
  const isFollowUpLoading = turns.some(t => t.kind === 'followup' && t.loading);
  const isAnyLoading = isFollowUpLoading || loading;

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns]);

  // Sync current conversation to localStorage
  useEffect(() => {
    if (!activeHistoryId || turns.length === 0) return;
    setHistory((prev) => {
      const updated = prev.map((h) => 
        h.id === activeHistoryId ? { ...h, turns, sessionId } : h
      );
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [turns, sessionId, activeHistoryId]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const saveToHistory = (q: string) => {
    const id = Date.now().toString();
    const newItem: HistoryItem = { id, query: q, timestamp: Date.now(), turns: [], sessionId: null };
    setHistory((prev) => {
      const updated = [newItem, ...prev.filter((h) => h.query !== q)].slice(0, 50);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    return id;
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  };

  const handleStartResearch = async (e: React.FormEvent, overrideQuery?: string) => {
    e.preventDefault();
    const q = (overrideQuery ?? query).trim();
    if (!q || loading) return; // guard: prevent double submit while research job is running

    setCurrentQuery(q);
    setState('results');
    setPageState('chat');
    setLoading(true);
    setError(null);
    setData(null);
    const newId = saveToHistory(q);
    setActiveHistoryId(newId);
    
    // Create new turn
    const newTurnIndex = turns.length;
    setTurns((prev) => [...prev, { kind: 'research', query: q, data: null, loading: true, error: null, errorType: null, retryAfter: null }]);

    try {
      const result = await runDeepResearch(q);
      setData(result);
      if (result.session_id) setSessionId(result.session_id);
      setTurns((prev) => prev.map((t, i) => i === newTurnIndex ? { ...t, data: result, loading: false } as ResearchTurn : t));
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setErrorType(err instanceof ResearchError ? err.type : 'server');
      setRetryAfter(err instanceof ResearchError ? err.retryAfter ?? null : null);
      
      setTurns((prev) => prev.map((t, i) => i === newTurnIndex ? {
        ...t, loading: false, error: err.message || 'Something went wrong',
        errorType: err instanceof ResearchError ? err.type : 'server',
        retryAfter: err instanceof ResearchError ? err.retryAfter ?? null : null
      } : t));
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = followUp.trim();
    if (!q || isAnyLoading) return;

    setFollowUp('');
    const newTurnIndex = turns.length;
    setTurns((prev) => [...prev, { kind: 'followup', question: q, data: null, loading: true, error: null }]);

    try {
      const res = await sendFollowUp(q, sessionId);
      setTurns((prev) => prev.map((t, i) => i === newTurnIndex ? { ...t, data: res, loading: false } as FollowUpTurn : t));
    } catch (err: any) {
      setTurns((prev) => prev.map((t, i) => i === newTurnIndex ? { ...t, loading: false, error: err.message || 'Something went wrong' } : t));
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setQuery(item.query);
    setCurrentQuery(item.query);
    if (item.turns && item.turns.length > 0) {
      setTurns(item.turns);
      setSessionId(item.sessionId ?? null);
      setActiveHistoryId(item.id);
      setState('results');
      setPageState('chat');
    } else {
      setState('idle');
      setPageState('idle');
      setTurns([]);
      setSessionId(null);
      setActiveHistoryId(item.id);
    }
  };

  const resetResearch = () => {
    setState('idle');
    setPageState('idle');
    setQuery('');
    setData(null);
    setError(null);
    setErrorType(null);
    setRetryAfter(null);
    setTurns([]);
    setSessionId(null);
    setActiveHistoryId(null);
  };

  const filteredHistory = history.filter((h) =>
    h.query.toLowerCase().includes(searchHistory.toLowerCase())
  );
  const grouped = groupHistory(filteredHistory);

  return (
    <main className="min-h-screen bg-[#f6f6f8] text-slate-900">
      <div className="mx-auto flex w-full max-w-[1700px]">

        {/* History Sidebar */}
        <aside
          className={`sticky top-0 z-20 hidden h-screen shrink-0 border-r border-slate-200 bg-white transition-all duration-300 lg:flex lg:flex-col ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          {/* Top bar */}
          <div className={`flex items-center px-3 pt-4 pb-2 ${sidebarCollapsed ? 'flex-col gap-3' : 'justify-between'}`}>
            <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors" title="Deep Scholar Home">
              <div className="rounded-md bg-[#135bec] p-1.5 text-white">
                <Atom size={16} />
              </div>
            </Link>

            {!sidebarCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={resetResearch}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="New Research"
                >
                  <PenSquare size={17} />
                </button>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronLeft size={17} />
                </button>
              </div>
            )}

            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Expand sidebar"
              >
                <ChevronRight size={17} />
              </button>
            )}
          </div>

          {!sidebarCollapsed && (
            <>
              {/* New research button */}
              <div className="px-3 pb-2">
                <button
                  onClick={resetResearch}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <PenSquare size={15} />
                  New Research
                </button>
              </div>

              {/* Search history */}
              <div className="px-3 pb-2">
                <div className="relative">
                  <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    className="w-full rounded-lg bg-slate-100 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#135bec]/30"
                  />
                </div>
              </div>

              {/* History list */}
              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <Clock size={20} className="text-slate-300" />
                    <p className="text-xs text-slate-400">No research history yet</p>
                  </div>
                ) : (
                  <>
                    {grouped.today.length > 0 && (
                      <div className="mb-2">
                        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Today</p>
                        {grouped.today.map((item) => (
                          <HistoryRow key={item.id} item={item} onLoad={loadFromHistory} onDelete={deleteHistoryItem} />
                        ))}
                      </div>
                    )}
                    {grouped.yesterday.length > 0 && (
                      <div className="mb-2">
                        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Yesterday</p>
                        {grouped.yesterday.map((item) => (
                          <HistoryRow key={item.id} item={item} onLoad={loadFromHistory} onDelete={deleteHistoryItem} />
                        ))}
                      </div>
                    )}
                    {grouped.older.length > 0 && (
                      <div className="mb-2">
                        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Previous</p>
                        {grouped.older.map((item) => (
                          <HistoryRow key={item.id} item={item} onLoad={loadFromHistory} onDelete={deleteHistoryItem} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {history.length > 0 && (
                <div className="border-t border-slate-100 px-3 py-3">
                  <button
                    onClick={clearHistory}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <Trash2 size={13} />
                    Clear all history
                  </button>
                </div>
              )}
            </>
          )}

          {/* Collapsed: just icons */}
          {sidebarCollapsed && (
            <div className="flex flex-col items-center gap-2 px-2 pt-2">
              <button
                onClick={resetResearch}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="New Research"
              >
                <PenSquare size={17} />
              </button>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Search history"
              >
                <SearchIcon size={17} />
              </button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <section className="flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b border-[#d9deea] bg-[#f7f8fc] px-4 py-3 md:px-7">
            <div className="flex items-center justify-end gap-3">
              <div className="relative w-[280px] shrink-0">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  className="h-10 w-full rounded-[10px] border border-[#dfe4ef] bg-[#f0f3f8] py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#cfd7e5] focus:outline-none"
                />
              </div>

              <div className="shrink-0">
                <NotificationDropdown />
              </div>

              <a href="/upload" className="shrink-0 flex h-10 items-center gap-2 rounded-[10px] bg-[#1f5fe4] px-4 text-sm font-bold text-white transition hover:bg-[#1a53c8]">
                <FileUp size={16} />
                Upload Paper
              </a>

              <Link href={'/profile' as Route} className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#ecd6c3] text-sm font-bold text-white">
                T
              </Link>
            </div>
          </header>

          {/* Page content */}
          <div className={pageState === 'chat' ? 'flex flex-col flex-1 min-h-[calc(100vh-57px)] relative' : 'flex items-center justify-center min-h-[calc(100vh-57px)]'}>
            {pageState === 'idle' && (
              <div className="w-full max-w-3xl mx-auto px-6 py-16 space-y-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="space-y-4">
                  <h2 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                    The future of <span className="text-[#135bec]">Scientific Discovery</span> starts here.
                  </h2>
                  <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                    Enter a complex research topic to analyze multiple databases and synthesize localized insights instantly.
                  </p>
                </div>

                <form onSubmit={handleStartResearch}>
                  {/* Glow wrapper */}
                  <div className={`relative rounded-[28px] p-[2px] transition-all duration-300 ${
                    inputFocused
                      ? 'bg-gradient-to-r from-[#135bec] via-indigo-400 to-[#135bec] shadow-[0_0_40px_rgba(19,91,236,0.35)]'
                      : 'bg-slate-200 shadow-xl'
                  }`}>
                    <div className="relative flex items-center bg-white rounded-[26px] overflow-hidden">
                      <div className={`pl-6 pr-4 transition-colors duration-200 ${inputFocused ? 'text-[#135bec]' : 'text-slate-400'}`}>
                        <Search size={26} />
                      </div>
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        type="text"
                        placeholder="Enter a complex research topic..."
                        className="w-full py-6 pr-44 text-xl font-semibold bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-300 placeholder:font-normal"
                      />
                      <button
                        type="submit"
                        disabled={!query.trim() || loading}
                        className="absolute right-3 bg-[#135bec] text-white px-7 py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-blue-500/25 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        Start Deep Research
                      </button>
                    </div>
                  </div>
                </form>

                {/* Recent searches quick access */}
                {history.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recent</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {history.slice(0, 4).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => loadFromHistory(item)}
                          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 hover:border-[#135bec]/30 hover:text-[#135bec] transition-colors shadow-sm"
                        >
                          <Clock size={12} className="text-slate-400" />
                          <span className="max-w-[200px] truncate">{item.query}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {pageState === 'chat' && (
              <div className="flex flex-col flex-1 h-full w-full">
                <div className="flex-1 overflow-y-auto pb-36">
                  {turns.map((turn, idx) => (
                    <TurnBlock key={idx} turn={turn} />
                  ))}
                  <div ref={bottomRef} />
                </div>
                
                {/* Sticky input */}
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-md border-t border-slate-100 p-4 pb-8">
                  <form onSubmit={handleFollowUp} className="max-w-3xl mx-auto relative bg-white rounded-[24px] shadow-sm border border-slate-200 flex items-end overflow-hidden p-2 focus-within:border-[#135bec]/50 focus-within:ring-4 focus-within:ring-[#135bec]/10 transition-all">
                    <textarea
                      value={followUp}
                      onChange={(e) => setFollowUp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleFollowUp(e as any);
                        }
                      }}
                      placeholder="Ask a follow-up question… (Enter to send)"
                      className="w-full resize-none bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-400 py-3 px-4 text-sm max-h-[150px]"
                      style={{ fieldSizing: 'content' } as any}
                      rows={1}
                    />
                    <button
                      type="submit"
                      disabled={isAnyLoading || !followUp.trim()}
                      className="shrink-0 w-10 h-10 flex items-center justify-center bg-[#135bec] text-white rounded-[16px] disabled:opacity-50 disabled:bg-slate-300 transition-colors mb-1 mr-1"
                    >
                      {isAnyLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function HistoryRow({
  item,
  onLoad,
  onDelete,
}: {
  item: HistoryItem;
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onLoad(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex w-full items-center rounded-lg px-2 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
    >
      <span className="flex-1 truncate pr-6">{item.query}</span>
      {hovered && (
        <span
          role="button"
          onClick={(e) => onDelete(item.id, e)}
          className="absolute right-2 flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={13} />
        </span>
      )}
    </button>
  );
}

function TurnBlock({ turn }: { turn: ChatTurn }) {
  if (turn.kind === 'research') {
    return (
      <ResearchResults
        query={turn.query}
        data={turn.data}
        loading={turn.loading}
        error={turn.error}
        errorType={turn.errorType}
        retryAfter={turn.retryAfter}
      />
    );
  } else {
    return <FollowUpBlock turn={turn} />;
  }
}

function FollowUpBlock({ turn }: { turn: FollowUpTurn }) {
  // We can reuse parts of ResearchResults styling here
  return (
    <div className="bg-white border-t border-slate-100">
      <div className="max-w-[900px] mx-auto p-12 lg:px-20 lg:py-12 space-y-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <span className="font-bold text-slate-600">You</span>
          </div>
          <div className="pt-2 text-lg font-semibold text-slate-800">
            {turn.question}
          </div>
        </div>
        
        <div className="pl-14 space-y-6">
          {turn.loading && (
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
          
          {turn.error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 text-red-600">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm">{turn.error}</p>
            </div>
          )}
          
          {turn.data && (
            <>
              <div className="prose prose-sm md:prose-base prose-slate max-w-none prose-a:text-[#135bec] hover:prose-a:underline">
                {/* Normally we'd use MarkdownContent, for simplicity we just render strings for now */}
                {turn.data.answer.split('\n').map((line, i) => {
                  if (!line.trim()) return <br key={i} />;
                  return <p key={i} className="mb-2 leading-relaxed text-slate-700">{line}</p>;
                })}
              </div>
              
              {turn.data.citations && turn.data.citations.length > 0 && (
                <div className="border-t border-slate-100 pt-6 mt-6 space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Sources
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {turn.data.citations.map((s) => (
                      <a
                        key={s.index}
                        href={s.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-[#135bec]/20 hover:bg-blue-50/40 transition-all group"
                      >
                        <span className="text-[10px] font-black text-[#135bec]/50 mt-0.5 shrink-0 w-6">[{s.index}]</span>
                        <span className="flex-1 text-[12px] font-medium text-slate-600 group-hover:text-slate-900 leading-snug line-clamp-2">{s.title}</span>
                        {s.url && (
                          <ExternalLink size={12} className="shrink-0 mt-0.5 text-slate-300 group-hover:text-[#135bec] transition-colors" />
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
