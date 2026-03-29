'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Route } from 'next';
import { api } from '@/lib/api';
import {
  Atom,
  Bell,
  Bookmark,
  Bot,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Info,
  Library,
  List,
  MoreVertical,
  Search,
  Share2,
  Sparkles,
  UserRound,
  Users,
  Eye,
  Heart,
  AlertCircle,
} from 'lucide-react';

const navItems = [
  { label: 'Feed', href: '/' as Route, icon: List },
  { label: 'AI Deep Research', icon: Sparkles, highlight: true },
  { label: 'Library', icon: Library },
  { label: 'Rankings', icon: ChartNoAxesColumn },
  { label: 'Bookmarks', icon: Bookmark },
  { label: 'Collaborations', icon: Users },
  { label: 'Profile Settings', href: '/profile' as Route, icon: UserRound, active: true },
];

export default function ProfilePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-articles' | 'saved-papers' | 'notifications'>('my-articles');

  // User & Author data
  const [user, setUser] = useState<any>(null);
  const [authorId, setAuthorId] = useState<number | null>(null);

  // Tab data
  const [myArticles, setMyArticles] = useState<any[]>([]);
  const [savedPapers, setSavedPapers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user data and articles on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user info
        const userData = await api.get('/auth/me/');
        setUser(userData);
        
        // Get author ID from user profile
        const authId = userData.author_profile?.id;
        if (authId) {
          setAuthorId(authId);
        }

        // Fetch my articles (by author)
        if (authId) {
          const articlesRes = await api.get(`/articles/?authors=${authId}`);
          const articles = articlesRes.results || articlesRes;
          setMyArticles(Array.isArray(articles) ? articles : []);
        }

        // Fetch saved/bookmarked papers
        const bookmarksRes = await api.get('/bookmarks/');
        const bookmarks = bookmarksRes.results || bookmarksRes;
        setSavedPapers(Array.isArray(bookmarks) ? bookmarks : []);

        // Fetch notifications
        const notificationsRes = await api.get('/notifications/');
        const notifs = notificationsRes.results || notificationsRes;
        setNotifications(Array.isArray(notifs) ? notifs : []);

        setError(null);
      } catch (err: any) {
        console.error('Error fetching profile data:', err);
        setError(err.message || 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f6f8] text-slate-900">
      <div className="mx-auto flex w-full max-w-[1700px]">
        <aside
          className={`sticky top-0 z-20 hidden h-screen shrink-0 border-r border-slate-200 bg-white transition-all duration-300 lg:flex lg:flex-col ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
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
                  <button
                    key={item.label}
                    type="button"
                    className={`flex w-full rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-left text-indigo-700 shadow-[0_0_15px_rgba(19,91,236,0.2)] ${sidebarCollapsed ? 'items-center justify-center' : 'items-center justify-between'}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className={`flex items-center ${sidebarCollapsed ? '' : 'gap-3'}`}>
                      <Icon size={18} />
                      {!sidebarCollapsed && <span className="text-sm font-bold">{item.label}</span>}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="rounded bg-[#135bec] px-1.5 py-0.5 text-[9px] font-black uppercase text-white">AI</span>
                    )}
                  </button>
                );
              }

              return item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${item.active ? 'bg-blue-50 text-[#135bec]' : 'text-slate-600 hover:bg-slate-50'}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && item.label}
                </button>
              );
            })}

            {!sidebarCollapsed && (
              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace</p>
              </div>
            )}

            {navItems.slice(4).map((item) => {
              const Icon = item.icon;
              return item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${item.active ? 'bg-blue-50 text-[#135bec]' : 'text-slate-600 hover:bg-slate-50'}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && item.label}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <button
              className={`flex w-full items-center justify-center rounded-lg bg-[#135bec] py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 ${sidebarCollapsed ? 'gap-0 px-0' : 'gap-2'}`}
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

              <button className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#dfe4ef] bg-[#f7f8fc] text-slate-500 transition hover:bg-slate-100">
                <Bell size={17} />
              </button>

              <Link href={'/upload' as Route} className="flex h-10 items-center gap-2 rounded-[10px] bg-[#1f5fe4] px-4 text-sm font-bold text-white transition hover:bg-[#1a53c8]">
                <FileUp size={16} />
                Upload Paper
              </Link>

              <Link href={'/profile' as Route} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ecd6c3] text-sm font-bold text-white">
                T
              </Link>
            </div>
          </header>

          <div className="space-y-6 p-4 md:p-8">
            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center p-12">
                <span className="text-slate-400">Loading profile...</span>
              </div>
            ) : !user ? (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-white p-8 text-center">
                <AlertCircle size={32} className="text-slate-400" />
                <p className="text-slate-600">Unable to load profile. Please try logging in again.</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-gradient-to-br from-blue-100 to-indigo-100 text-2xl font-bold text-[#135bec]">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-2xl font-bold text-slate-900">{user.full_name || 'Unknown User'}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        User Code: {user.user_code || 'N/A'} • {user.email || 'N/A'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={'/profile/edit' as Route} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Edit Profile</Link>
                      <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Share Portfolio</button>
                    </div>
                  </div>

                  <div className="mt-6 border-b border-slate-200">
                    <div className="flex flex-wrap items-center gap-6">
                      <button
                        type="button"
                        onClick={() => setActiveTab('my-articles')}
                        className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'my-articles' ? 'border-b-2 border-[#135bec] text-[#135bec]' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        My Articles
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('saved-papers')}
                        className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'saved-papers' ? 'border-b-2 border-[#135bec] text-[#135bec]' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Saved Papers
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('notifications')}
                        className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'notifications' ? 'border-b-2 border-[#135bec] text-[#135bec]' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Notifications
                      </button>
                    </div>
                  </div>
                </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                {activeTab === 'my-articles' && (
                  <>
                    {myArticles.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                        <p className="text-slate-500">No articles published yet</p>
                      </div>
                    ) : (
                      myArticles.map((paper: any) => (
                        <article key={paper.id || paper.slug} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="text-lg font-bold text-slate-900">{paper.title}</h3>
                            <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                              <MoreVertical size={18} />
                            </button>
                          </div>

                          <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-600">{paper.abstract}</p>

                          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <Eye size={14} className="text-slate-400" />
                              {paper.view_count || 0}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Heart size={14} className="text-slate-400" />
                              {paper.like_count || 0}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Share2 size={14} className="text-slate-400" />
                              {paper.share_count || 0}
                            </span>
                            <span className="font-semibold text-slate-400">Published {new Date(paper.created_at).toLocaleDateString()}</span>
                            <Link href={`/papers/${paper.slug}` as Route} className="font-bold text-[#135bec] hover:underline">
                              Read Full Paper
                            </Link>
                          </div>
                        </article>
                      ))
                    )}
                  </>
                )}

                {activeTab === 'saved-papers' && (
                  <>
                    {savedPapers.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                        <p className="text-slate-500">No saved papers yet</p>
                      </div>
                    ) : (
                      savedPapers.map((paper: any) => (
                        <article key={paper.id || paper.slug} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg font-bold text-slate-900">{paper.title}</h3>
                              {paper.abstract && <p className="mt-2 line-clamp-4 text-sm text-slate-600">{paper.abstract}</p>}
                              <p className="mt-2 text-xs text-slate-500">Saved on {new Date(paper.created_at).toLocaleDateString()}</p>
                            </div>
                            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                              Remove
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                  </>
                )}

                {activeTab === 'notifications' && (
                  <>
                    {notifications.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                        <p className="text-slate-500">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif: any) => (
                        <article key={notif.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <p className="text-sm font-semibold text-slate-800">{notif.message || notif.content}</p>
                          <p className="mt-1 text-xs text-slate-500">{new Date(notif.created_at).toLocaleDateString()}</p>
                        </article>
                      ))
                    )}
                  </>
                )}
              </div>

              <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-24">
                <div className="mb-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700">
                  <Info size={14} className="text-[#135bec]" />
                  Author Details
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Affiliation</p>
                    <p className="mt-2 text-lg font-bold leading-6 text-slate-900">
                      {user?.author_profile?.affiliation || 'No affiliation provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Bio</p>
                    <p className="mt-2 text-[15px] leading-7 text-slate-600">
                      {user?.author_profile?.bio || 'No bio provided'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-4 text-center">
                    <p className="text-3xl font-black text-[#135bec]">{user?.author_profile?.total_score || 0}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Scholar Points</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center">
                    <p className="text-3xl font-black text-slate-900">{user?.author_profile?.follower_count || 0}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Followers</p>
                  </div>
                </div>
              </aside>
            </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
