'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { interactionsService, isLoggedIn } from '@/services/interactions';
import NotificationDropdown from '@/components/NotificationDropdown';
import {
  Atom,
  BadgeCheck,
  Bookmark,
  Bot,
  Brain,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileUp,
  Filter,
  Heart,
  Library,
  List,
  Loader2,
  MessageSquare,
  Search,
  Share2,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react';

const navItems = [
  { label: 'Feed', active: true, icon: List, href: '/' },
  { label: 'AI Deep Research', active: false, icon: Sparkles, highlight: true, href: '/deep-research' },
  { label: 'Library', active: false, icon: Library, href: '/library' },
  { label: 'Rankings', active: false, icon: ChartNoAxesColumn, href: '/rankings' },
  { label: 'Bookmarks', active: false, icon: Bookmark, href: '/bookmarks' },
  { label: 'Collaborations', active: false, icon: UserRound, href: '/collaborations' },
];

const researchers = [
  { rank: 1, name: 'Dr. Julian Voss', institution: 'Stanford University', impact: '2.4k' },
  { rank: 2, name: 'Sarah Chen, PhD', institution: 'MIT Media Lab', impact: '2.1k' },
  { rank: 3, name: 'Prof. Marcus Thorne', institution: 'Oxford Physics', impact: '1.9k' },
];

export default function HomePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Per-article interaction state: { [articleId]: { liked, like_count, bookmarked, bookmark_count, share_count, likeLoading, bookmarkLoading, shareLoading } }
  const [interactions, setInteractions] = useState<Record<number, {
    liked: boolean;
    like_count: number;
    bookmarked: boolean;
    bookmark_count: number;
    share_count: number;
    likeLoading: boolean;
    bookmarkLoading: boolean;
    shareLoading: boolean;
  }>>({});

  useEffect(() => {
    async function fetchArticles() {
      try {
        const data = await api.get('/articles/');
        const list = data.results ?? (Array.isArray(data) ? data : []);
        setPapers(list);
        // Initialise interaction state from API counts
        const init: typeof interactions = {};
        list.forEach((p: any) => {
          init[p.id] = {
            liked: false,
            like_count: p.like_count || 0,
            bookmarked: false,
            bookmark_count: p.bookmark_count || 0,
            share_count: p.share_count || 0,
            likeLoading: false,
            bookmarkLoading: false,
            shareLoading: false,
          };
        });
        setInteractions(init);
      } catch (error: any) {
        console.error('Failed to fetch articles:', error);
        setErrorMsg(error.message || String(error));
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, []);

  const handleLike = useCallback(async (articleId: number) => {
    if (!isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    setInteractions((prev) => ({
      ...prev,
      [articleId]: { ...prev[articleId], likeLoading: true },
    }));
    try {
      const res = await interactionsService.toggleLike(articleId);
      setInteractions((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          liked: res.liked,
          like_count: res.like_count,
          likeLoading: false,
        },
      }));
    } catch {
      setInteractions((prev) => ({
        ...prev,
        [articleId]: { ...prev[articleId], likeLoading: false },
      }));
    }
  }, []);

  const handleBookmark = useCallback(async (articleId: number) => {
    if (!isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    setInteractions((prev) => ({
      ...prev,
      [articleId]: { ...prev[articleId], bookmarkLoading: true },
    }));
    try {
      const res = await interactionsService.toggleBookmark(articleId);
      setInteractions((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          bookmarked: res.bookmarked,
          bookmark_count: res.bookmark_count,
          bookmarkLoading: false,
        },
      }));
    } catch {
      setInteractions((prev) => ({
        ...prev,
        [articleId]: { ...prev[articleId], bookmarkLoading: false },
      }));
    }
  }, []);

  const handleShare = useCallback(async (articleId: number, slug: string) => {
    // Copy link to clipboard
    const url = `${window.location.origin}/papers/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback: open share dialog
    }
    if (!isLoggedIn()) return;
    setInteractions((prev) => ({
      ...prev,
      [articleId]: { ...prev[articleId], shareLoading: true },
    }));
    try {
      const res = await interactionsService.shareArticle(articleId, 'clipboard');
      setInteractions((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          share_count: res.share_count,
          shareLoading: false,
        },
      }));
    } catch {
      setInteractions((prev) => ({
        ...prev,
        [articleId]: { ...prev[articleId], shareLoading: false },
      }));
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f6f8] text-slate-900">
      <div className="mx-auto flex w-full max-w-[1700px]">
        <aside
          className={`sticky top-0 z-20 hidden h-screen shrink-0 border-r border-slate-200 bg-white transition-all duration-300 lg:flex lg:flex-col ${sidebarCollapsed ? 'w-20' : 'w-64'
            }`}
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="absolute -right-3 top-6 z-20 rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 shadow-sm hover:bg-slate-50"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <div className="p-6">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="rounded-lg bg-[#135bec] p-2 text-white">
                <Atom size={20} />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-lg font-bold leading-none">Deep Scholar</h1>
                  <p className="text-xs font-medium text-slate-500">Research Portal</p>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4">
            {navItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              if (item.highlight) {
                return (
                  <Link
                    key={item.label}
                    href={item.href as Route}
                    className={`flex w-full rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-left text-indigo-700 shadow-[0_0_15px_rgba(19,91,236,0.2)] ${sidebarCollapsed ? 'items-center justify-center' : 'items-center justify-between'
                      }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className={`flex items-center ${sidebarCollapsed ? '' : 'gap-3'}`}>
                      <Icon size={18} />
                      {!sidebarCollapsed && <span className="text-sm font-bold">{item.label}</span>}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="rounded bg-[#135bec] px-1.5 py-0.5 text-[9px] font-black uppercase text-white">AI</span>
                    )}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href as Route}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${item.active ? 'bg-blue-50 text-[#135bec]' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && item.label}
                </Link>
              );
            })}

            {!sidebarCollapsed && (
              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace</p>
              </div>
            )}

            {navItems.slice(4).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href as Route}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <button
              className={`flex w-full items-center justify-center rounded-lg bg-[#135bec] py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 ${sidebarCollapsed ? 'gap-0 px-0' : 'gap-2'
                }`}
              title={sidebarCollapsed ? 'AI Assistant' : undefined}
            >
              <Bot size={18} />
              {!sidebarCollapsed && 'AI Assistant'}
            </button>
          </div>
        </aside>

        <section className="flex-1">
          <header className="sticky top-0 z-10 border-b border-[#d9deea] bg-[#f7f8fc] px-4 py-3 md:px-7">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="relative w-full max-w-[430px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  className="h-10 w-full rounded-[10px] border border-[#dfe4ef] bg-[#f0f3f8] py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#cfd7e5] focus:outline-none"
                />
              </div>

              <NotificationDropdown />

              <a href="/upload" className="flex h-10 items-center gap-2 rounded-[10px] bg-[#1f5fe4] px-4 text-sm font-bold text-white transition hover:bg-[#1a53c8]">
                <FileUp size={16} />
                Upload Paper
              </a>

              <Link href={'/profile' as Route} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ecd6c3] text-sm font-bold text-white">
                T
              </Link>
            </div>
          </header>

          <div className="flex flex-col gap-6 p-4 md:p-8 2xl:flex-row 2xl:items-start">
            <div className="flex-1 space-y-6">
              <div className="group relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#135bec]/20 via-indigo-500/20 to-[#135bec]/20 opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200 group-focus-within:opacity-100 group-focus-within:duration-200"></div>
                <div className="relative flex items-center overflow-hidden rounded-xl border-2 border-[#135bec]/10 bg-white shadow-xl shadow-[#135bec]/5 transition-all focus-within:border-[#135bec]/30 focus-within:shadow-2xl focus-within:shadow-[#135bec]/10">
                  <div className="pl-5 pr-3 text-[#135bec]">
                    <Sparkles size={28} />
                  </div>
                  <input
                    type="text"
                    placeholder="Ask AI for Deep Research..."
                    className="w-full border-0 bg-transparent py-5 pr-32 text-lg font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  />
                  <div className="absolute right-3 flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-400">⌘ + K</span>
                    <Link href={'/deep-research' as Route} className="rounded-lg bg-[#135bec] px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700">
                      Research
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Research Discovery</h2>
                  <p className="text-sm text-slate-500">Personalized feed based on your interests in Machine Learning</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-200">
                    <Filter size={18} />
                  </button>
                  <button className="rounded-lg bg-slate-100 p-2 text-[#135bec]">
                    <List size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center p-8"><span className="text-slate-400">Loading articles...</span></div>
                ) : errorMsg ? (
                  <div className="flex justify-center p-8"><span className="text-red-500 font-bold">{errorMsg}</span></div>
                ) : papers.length === 0 ? (
                  <div className="flex justify-center p-8"><span className="text-slate-400">No articles available.</span></div>
                ) : papers.map((paper) => {
                  const ix = interactions[paper.id] ?? {
                    liked: false, like_count: paper.like_count || 0,
                    bookmarked: false, bookmark_count: paper.bookmark_count || 0,
                    share_count: paper.share_count || 0,
                    likeLoading: false, bookmarkLoading: false, shareLoading: false,
                  };
                  return (
                  <article
                    key={paper.id || paper.slug}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-xl hover:shadow-blue-500/5"
                  >
                    <div className="p-6">
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="mb-2 flex items-center gap-3">
                            <span className="rounded border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#135bec]">
                              {paper.source || 'DeepScholar'}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">Published {new Date(paper.created_at).toLocaleDateString()}</span>
                          </div>
                          <h3 className="text-xl font-bold leading-tight text-slate-900">{paper.title}</h3>
                          <p className="mt-1.5 text-sm font-medium text-blue-700/80">
                            {paper.authors && paper.authors.length > 0 
                              ? paper.authors.map((a: any) => a.full_name || a.author_code).join(', ') 
                              : 'Unknown Author'}
                          </p>
                        </div>
                        {/* Bookmark button — top right */}
                        <button
                          type="button"
                          onClick={() => handleBookmark(paper.id)}
                          disabled={ix.bookmarkLoading}
                          title={ix.bookmarked ? 'Bỏ lưu' : 'Lưu bài viết'}
                          className="shrink-0 transition-colors disabled:opacity-50"
                          aria-label="Bookmark"
                        >
                          {ix.bookmarkLoading
                            ? <Loader2 size={20} className="animate-spin text-slate-400" />
                            : <Bookmark
                                size={20}
                                className={ix.bookmarked ? 'fill-[#135bec] text-[#135bec]' : 'text-slate-300 hover:text-[#135bec]'}
                              />
                          }
                        </button>
                      </div>

                      <div className="mt-4">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Abstract</p>
                        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{paper.abstract}</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-4 text-slate-500">
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          <Eye size={14} className="text-slate-400" />
                          {paper.view_count || 0} Lượt xem
                        </span>
                        {/* Like button */}
                        <button
                          type="button"
                          onClick={() => handleLike(paper.id)}
                          disabled={ix.likeLoading}
                          title={ix.liked ? 'Bỏ thích' : 'Thích'}
                          className="flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50 hover:text-red-500"
                          aria-label="Like"
                        >
                          {ix.likeLoading
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Heart
                                size={14}
                                className={ix.liked ? 'fill-red-500 text-red-500' : 'text-slate-400'}
                              />
                          }
                          {ix.like_count} Thích
                        </button>
                        {/* Share button */}
                        <button
                          type="button"
                          onClick={() => handleShare(paper.id, paper.slug)}
                          disabled={ix.shareLoading}
                          title="Chia sẻ (copy link)"
                          className="flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50 hover:text-[#135bec]"
                          aria-label="Share"
                        >
                          {ix.shareLoading
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Share2 size={14} className="text-slate-400" />
                          }
                          {ix.share_count} Chia sẻ
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 px-6 py-2.5">
                      <button className="flex items-center gap-1.5 rounded px-3 py-1 text-xs font-bold text-[#135bec] hover:bg-blue-50">
                        <Sparkles size={15} />
                        AI Summary
                      </button>
                      <button className="flex items-center gap-1.5 rounded px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200">
                        <MessageSquare size={15} />
                        Agent Q&A
                      </button>
                      <Link
                        href={`/papers/${paper.slug}` as Route}
                        className="ml-auto text-xs font-bold text-slate-500 hover:text-slate-800"
                      >
                        Read Full Paper
                      </Link>
                    </div>
                  </article>
                  );
                })}
              </div>
            </div>

            <aside className="w-full shrink-0 2xl:w-80">
              <div className="sticky top-24 space-y-6">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h3 className="font-bold">Top Researchers</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Global Ranking</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {researchers.map((item) => (
                      <div key={item.name} className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-slate-50">
                        <div className="relative">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500">
                            <UserRound size={17} />
                          </div>
                          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-[10px] font-bold text-white">
                            {item.rank}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-bold">{item.name}</h4>
                          <p className="truncate text-[11px] text-slate-500">{item.institution}</p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-[#135bec]">{item.impact}</p>
                          <p className="text-[10px] font-medium uppercase text-slate-400">Impact</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 p-4">
                    <button className="w-full text-center text-xs font-bold text-[#135bec] hover:underline">View Full Leaderboard</button>
                  </div>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-[#135bec] to-indigo-700 p-6 text-white shadow-lg shadow-blue-500/25">
                  <div className="mb-4 flex items-center gap-3">
                    <Brain size={18} />
                    <h4 className="font-bold">Agent Insight</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-blue-100">
                    Based on your recent interest in NRF, I found 3 new preprints with similar methodologies published this morning.
                  </p>
                  <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2 text-sm font-bold text-[#135bec] transition hover:bg-blue-50">
                    <BadgeCheck size={16} />
                    Review Suggested Papers
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Trophy size={16} className="text-amber-500" />
                      Weekly Performance
                    </div>
                    <button className="text-xs font-semibold text-[#135bec]">Open</button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Your collaboration score increased by 14% this week.</p>
                  <button className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-[#135bec]">
                    See details
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}