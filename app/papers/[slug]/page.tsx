'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
  Library,
  List,
  Search,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { api } from '@/lib/api';

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
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Khong the tai chi tiet bai bao.');
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [slug]);

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
                    <div className="mb-4 flex items-center justify-between">
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
