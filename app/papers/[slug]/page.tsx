'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Route } from 'next';
import {
  AlertCircle,
  Atom,
  Bell,
  BookOpen,
  Bookmark,
  Bot,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Heart,
  Library,
  List,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Share2,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { api } from '@/lib/api';
import { interactionsService, isLoggedIn } from '@/services/interactions';

const navItems = [
  { label: 'Feed', href: '/' as Route, active: false, icon: List },
  { label: 'AI Deep Research', active: false, icon: Sparkles, highlight: true },
  { label: 'Library', active: false, icon: Library },
  { label: 'Rankings', active: false, icon: ChartNoAxesColumn },
  { label: 'Bookmarks', active: false, icon: Bookmark },
  { label: 'Collaborations', active: false, icon: UserRound },
];

type ArticleAuthor = {
  id: number;
  full_name?: string;
  author_code?: string;
};

type ArticleDetail = {
  id: number;
  slug: string;
  title: string;
  abstract?: string;
  content?: string;
  pdf_url?: string;
  created_at: string;
  like_count?: number;
  bookmark_count?: number;
  share_count?: number;
  authors?: ArticleAuthor[];
};

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  text: string;
};

const quickPrompts = [
  'Tom tat bai bao trong 5 y chinh',
  'Noi dung dong gop moi la gi?',
  'Neu han che cua bai bao',
];

export default function PaperDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Xin chao, toi la AI Paper Assistant. Ban co the hoi ve tom tat, dong gop, han che hoac phuong phap trong bai bao nay.',
    },
  ]);

  useEffect(() => {
    if (!slug) return;
    async function fetchArticle() {
      try {
        setLoading(true);
        const data = await api.get(`/articles/${slug}/`);
        setArticle(data);
        setLikeCount(data.like_count || 0);
        setBookmarkCount(data.bookmark_count || 0);
        setShareCount(data.share_count || 0);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Khong the tai chi tiet bai bao.');
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [slug]);

  const handleLike = useCallback(async () => {
    if (!article) return;
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    setLikeLoading(true);
    try {
      const res = await interactionsService.toggleLike(article.id);
      setLiked(res.liked);
      setLikeCount(res.like_count);
    } finally {
      setLikeLoading(false);
    }
  }, [article]);

  const handleBookmark = useCallback(async () => {
    if (!article) return;
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    setBookmarkLoading(true);
    try {
      const res = await interactionsService.toggleBookmark(article.id);
      setBookmarked(res.bookmarked);
      setBookmarkCount(res.bookmark_count);
    } finally {
      setBookmarkLoading(false);
    }
  }, [article]);

  const handleShare = useCallback(async () => {
    if (!article) return;
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); } catch {}
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
    if (!isLoggedIn()) return;
    setShareLoading(true);
    try {
      const res = await interactionsService.shareArticle(article.id, 'clipboard');
      setShareCount(res.share_count);
    } finally {
      setShareLoading(false);
    }
  }, [article]);

  const loadComments = useCallback(async () => {
    if (!article) return;
    try {
      const data = await interactionsService.getComments(article.id);
      setComments(data.results ?? data);
    } catch {}
  }, [article]);

  const handleToggleComments = useCallback(async () => {
    if (!showComments && comments.length === 0) await loadComments();
    setShowComments((v) => !v);
  }, [showComments, comments.length, loadComments]);

  const handlePostComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article || !commentText.trim()) return;
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    setCommentLoading(true);
    try {
      await interactionsService.postComment(article.id, commentText.trim());
      setCommentText('');
      await loadComments();
    } finally {
      setCommentLoading(false);
    }
  }, [article, commentText, loadComments]);

  const authorText = useMemo(() => {
    if (!article?.authors || article.authors.length === 0) return 'Unknown Author';
    return article.authors.map((a) => a.full_name || a.author_code || `Author #${a.id}`).join(', ');
  }, [article]);

  const createAssistantReply = (question: string) => {
    const lowerQuestion = question.toLowerCase();
    if (!article) {
      return 'Toi chua co du lieu bai bao de tra loi. Ban thu tai lai trang nhe.';
    }

    if (lowerQuestion.includes('tom tat')) {
      return article.abstract?.trim()
        ? `Tom tat nhanh: ${article.abstract.trim()}`
        : 'Bai bao nay chua co abstract trich xuat. Ban co the doc truc tiep PDF o ben trai.';
    }

    if (lowerQuestion.includes('dong gop') || lowerQuestion.includes('novel')) {
      return 'Ban co the tap trung vao phan mo dau, related work va ket luan trong PDF de xac dinh dong gop moi. Toi co the tiep tuc tom tat theo tung muc neu ban muon.';
    }

    if (lowerQuestion.includes('han che') || lowerQuestion.includes('limitation')) {
      return 'Goi y: tim cac cum tu limitation, future work, discussion trong phan cuoi bai bao. Neu ban muon, toi se giup liet ke checklist danh gia han che theo tung nhom.';
    }

    return 'Muc chat AI realtime se duoc noi voi backend chatbot sau. Tam thoi, ban co the hoi cac cau nhu: tom tat, dong gop, han che, hoac phuong phap de toi huong dan nhanh cach doc bai bao.';
  };

  const sendMessage = (messageText: string) => {
    const cleanText = messageText.trim();
    if (!cleanText) return;

    setChatMessages((prev) => [...prev, { role: 'user', text: cleanText }]);

    const assistantReply = createAssistantReply(cleanText);
    setChatMessages((prev) => [...prev, { role: 'assistant', text: assistantReply }]);
    setPrompt('');
  };

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

              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${item.active ? 'bg-blue-50 text-[#135bec]' : 'text-slate-600 hover:bg-slate-50'}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={18} />
                    {!sidebarCollapsed && item.label}
                  </Link>
                );
              }

              return (
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
              return (
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
            {loading ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-14 text-slate-500">
                Loading paper details...
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle size={18} />
                {error}
              </div>
            ) : !article ? (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                <AlertCircle size={18} />
                Paper not found.
              </div>
            ) : (
              <>
                <div className="hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="rounded border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#135bec]">
                      DeepScholar
                    </span>
                    <span>Published {new Date(article.created_at).toLocaleDateString()}</span>
                  </div>

                  <h1 className="text-2xl font-bold leading-tight text-slate-900 md:text-3xl">{article.title}</h1>
                  <p className="mt-2 text-sm font-medium text-blue-700/80">{authorText}</p>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Abstract</p>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {article.abstract?.trim() || 'No abstract available for this paper yet.'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    {/* Article header + interaction bar */}
                    <div className="mb-4">
                      <h1 className="text-xl font-bold leading-tight text-slate-900">{article.title}</h1>
                      <p className="mt-1 text-sm font-medium text-blue-700/80">{authorText}</p>
                      <p className="mt-1 text-xs text-slate-400">Published {new Date(article.created_at).toLocaleDateString()}</p>

                      {/* Interaction bar */}
                      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                        {/* Like */}
                        <button
                          type="button"
                          onClick={handleLike}
                          disabled={likeLoading}
                          title={liked ? 'Bỏ thích' : 'Thích bài báo'}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {likeLoading
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Heart size={16} className={liked ? 'fill-red-500 text-red-500' : 'text-slate-400'} />
                          }
                          <span className={liked ? 'text-red-600' : 'text-slate-600'}>{likeCount}</span>
                        </button>

                        {/* Bookmark */}
                        <button
                          type="button"
                          onClick={handleBookmark}
                          disabled={bookmarkLoading}
                          title={bookmarked ? 'Bỏ lưu' : 'Lưu bài báo'}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-[#135bec] disabled:opacity-50"
                        >
                          {bookmarkLoading
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Bookmark size={16} className={bookmarked ? 'fill-[#135bec] text-[#135bec]' : 'text-slate-400'} />
                          }
                          <span className={bookmarked ? 'text-[#135bec]' : 'text-slate-600'}>{bookmarkCount}</span>
                        </button>

                        {/* Share */}
                        <button
                          type="button"
                          onClick={handleShare}
                          disabled={shareLoading}
                          title="Copy link bài báo"
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold transition-colors hover:border-green-200 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
                        >
                          {shareLoading
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Share2 size={16} className="text-slate-400" />
                          }
                          <span className="text-slate-600">{shareCopied ? 'Đã copy!' : shareCount}</span>
                        </button>

                        {/* Comments toggle */}
                        <button
                          type="button"
                          onClick={handleToggleComments}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                          <MessageSquare size={16} className="text-slate-400" />
                          {showComments ? 'Ẩn bình luận' : `Bình luận (${comments.length})`}
                        </button>
                      </div>

                      {/* Comments section */}
                      {showComments && (
                        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                          {/* Post comment form */}
                          <form onSubmit={handlePostComment} className="flex gap-2">
                            <input
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder={isLoggedIn() ? 'Viết bình luận...' : 'Đăng nhập để bình luận'}
                              disabled={!isLoggedIn() || commentLoading}
                              className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm placeholder:text-slate-400 focus:border-[#135bec] focus:outline-none disabled:bg-slate-50"
                            />
                            <button
                              type="submit"
                              disabled={!commentText.trim() || commentLoading || !isLoggedIn()}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#135bec] text-white transition hover:bg-blue-700 disabled:opacity-40"
                            >
                              {commentLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                            </button>
                          </form>

                          {/* Comment list */}
                          {comments.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-4">Chưa có bình luận nào.</p>
                          ) : (
                            comments.map((c: any) => (
                              <div key={c.id} className="rounded-lg bg-slate-50 p-3">
                                <p className="text-xs font-bold text-slate-700">
                                  {c.user?.full_name || c.user?.email || 'Người dùng'}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">{c.content}</p>
                                {c.replies?.length > 0 && (
                                  <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                                    {c.replies.map((r: any) => (
                                      <div key={r.id}>
                                        <p className="text-xs font-bold text-slate-600">{r.user?.full_name || 'Người dùng'}</p>
                                        <p className="text-xs text-slate-500">{r.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-[#135bec]" />
                        <h2 className="text-base font-bold text-slate-900">PDF Reader</h2>
                      </div>
                      {article.pdf_url && (
                        <a
                          href={article.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Open in new tab
                        </a>
                      )}
                    </div>

                    {article.pdf_url ? (
                      <iframe
                        src={article.pdf_url}
                        title={`PDF Viewer - ${article.title}`}
                        className="h-[75vh] w-full rounded-xl border border-slate-200"
                      />
                    ) : (
                      <div className="flex h-[48vh] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                        PDF URL is not available for this paper.
                      </div>
                    )}
                  </div>

                  <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)]">
                    <div className="flex h-full flex-col">
                      <div className="border-b border-slate-200 p-4">
                        <div className="flex items-center gap-2">
                          <Bot size={17} className="text-[#135bec]" />
                          <h3 className="text-sm font-bold text-slate-900">AI Chatbot</h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Hoi nhanh ve bai bao ngay trong luc doc PDF.</p>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto p-4">
                        {chatMessages.map((msg, idx) => (
                          <div
                            key={`${msg.role}-${idx}`}
                            className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                              msg.role === 'user'
                                ? 'ml-auto bg-[#135bec] text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {msg.text}
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-200 p-4">
                        <div className="mb-3 flex flex-wrap gap-2">
                          {quickPrompts.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => sendMessage(item)}
                              className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              {item}
                            </button>
                          ))}
                        </div>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            sendMessage(prompt);
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Nhap cau hoi ve paper..."
                            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#b9c7ef] focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#135bec] text-white transition hover:bg-blue-700"
                            aria-label="Send message"
                          >
                            <Send size={16} />
                          </button>
                        </form>
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
