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
} from 'lucide-react';
import NotificationDropdown from '@/components/NotificationDropdown';
import ResearchResults from '@/components/deep-research/ResearchResults';
import { runDeepResearch, type DeepResearchResponse, ResearchError, type ResearchErrorType } from '@/services/research';

interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
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

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const saveToHistory = (q: string) => {
    const newItem: HistoryItem = { id: Date.now().toString(), query: q, timestamp: Date.now() };
    setHistory((prev) => {
      const updated = [newItem, ...prev.filter((h) => h.query !== q)].slice(0, 50);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
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
    if (!q) return;

    setCurrentQuery(q);
    setState('results');
    setLoading(true);
    setError(null);
    setData(null);
    saveToHistory(q);

    try {
      const result = await runDeepResearch(q);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setErrorType(err instanceof ResearchError ? err.type : 'server');
      setRetryAfter(err instanceof ResearchError ? err.retryAfter ?? null : null);
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setQuery(item.query);
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleStartResearch(fakeEvent, item.query);
  };

  const resetResearch = () => {
    setState('idle');
    setQuery('');
    setData(null);
    setError(null);
    setErrorType(null);
    setRetryAfter(null);
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
          <div className={state === 'results' ? '' : 'flex items-center justify-center min-h-[calc(100vh-57px)]'}>
            {state === 'idle' && (
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
                        disabled={!query.trim()}
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

            {state === 'results' && (
              <ResearchResults
                query={currentQuery}
                data={data}
                loading={loading}
                error={error}
                errorType={errorType}
                retryAfter={retryAfter}
              />
            )}
          </div>
        </section>
      </div>

      {state === 'results' && (
        <button
          onClick={resetResearch}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <Search size={16} />
          New Research
        </button>
      )}
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
