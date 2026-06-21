'use client';

import { api } from '@/lib/api';
import AppSidebar from '@/components/layout/AppSidebar';
import AuthorGuard from '@/components/auth/AuthorGuard';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
    Atom,
    Bot,
    ChevronLeft,
    ChevronRight,
    Library,
    List,
    Settings,
    UserRound,
    AlertCircle,
    FileText,
    AlignLeft,
    BookOpen,
    Edit3,
    Save,
    X,
    Bookmark,
    Sparkles,
    ChartNoAxesColumn,
    FileUp,
    UploadCloud,
    Loader2,
    CheckCircle2,
    Search,
    Users,
} from 'lucide-react';

const navItems = [
  { label: 'Feed', active: false, icon: List },
  { label: 'AI Deep Research', active: false, icon: Sparkles, highlight: true },
  { label: 'Library', active: false, icon: Library },
  { label: 'Rankings', active: false, icon: ChartNoAxesColumn },
  { label: 'Bookmarks', active: false, icon: Bookmark },
  { label: 'Collaborations', active: false, icon: UserRound },
];

type UploadStep = 'idle' | 'uploading' | 'processing' | 'polling' | 'done' | 'error';

interface ArticleData {
    id: number;
    slug: string;
    title: string;
    abstract?: string;
    content?: string;
    pdf_url?: string;
    authors?: any[];
}

const POLLING_INTERVAL_MS = 5000;  // Poll every 5 seconds
const POLLING_MAX_ATTEMPTS = 24;   // Max 2 minutes of polling

function UploadPageContent() {
    const router = useRouter();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<UploadStep>('idle');
    const [progress, setProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState('');
    const [article, setArticle] = useState<ArticleData | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedArticle, setEditedArticle] = useState<Partial<ArticleData>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Co-authors
    const [coAuthors, setCoAuthors] = useState<any[]>([]);
    const [authorSearchQuery, setAuthorSearchQuery] = useState('');
    const [authorSearchResults, setAuthorSearchResults] = useState<any[]>([]);
    const [isSearchingAuthors, setIsSearchingAuthors] = useState(false);

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollingAttemptsRef = useRef(0);

    // Clean up polling interval on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    /**
     * Poll the Backend every 5s to check if the AI service has finished
     * updating title / abstract / content.
     * 
     * We consider extraction done when `title` no longer contains "Pending"
     * and `content` is non-empty.
     */
    const startPolling = (slug: string) => {
        pollingAttemptsRef.current = 0;
        setStep('polling');
        setStatusMsg('Waiting for AI extraction to complete…');

        pollingRef.current = setInterval(async () => {
            pollingAttemptsRef.current += 1;

            try {
                const data: ArticleData = await api.get(`/articles/${slug}/`);

                const extractionDone =
                    data.content && data.content.length > 100 &&
                    !data.title.startsWith('Pending');

                if (extractionDone) {
                    stopPolling();
                    setArticle(data);
                    setProgress(100);
                    setStep('done');
                    setStatusMsg('Extraction complete!');
                    return;
                }
            } catch {
                // silently ignore response errors during polling
            }

            // Timeout after max attempts
            if (pollingAttemptsRef.current >= POLLING_MAX_ATTEMPTS) {
                stopPolling();
                setStep('done');
                setStatusMsg('AI processing may still be running in the background.');
                setProgress(100);
            }
        }, POLLING_INTERVAL_MS);
    };

    const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile?.type === 'application/pdf') {
            setFile(droppedFile);
        } else {
            alert('Please upload a PDF file.');
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected?.type === 'application/pdf') {
            setFile(selected);
        } else if (selected) {
            alert('Please upload a PDF file.');
        }
    };

    useEffect(() => {
        if (!authorSearchQuery.trim()) {
            setAuthorSearchResults([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            setIsSearchingAuthors(true);
            try {
                const res = await api.get(`/authors/ranking/?search=${encodeURIComponent(authorSearchQuery)}`);
                setAuthorSearchResults(res.results || []);
            } catch (e) {
                console.error('Failed to search authors:', e);
            } finally {
                setIsSearchingAuthors(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [authorSearchQuery]);

    const resetUpload = () => {
        stopPolling();
        setFile(null);
        setStep('idle');
        setProgress(0);
        setArticle(null);
        setErrorMsg('');
        setStatusMsg('');
        setIsEditing(false);
        setCoAuthors([]);
        setAuthorSearchQuery('');
        setAuthorSearchResults([]);
    };

    const handleEditClick = () => {
        if (!article) return;
        setEditedArticle({
            title: article.title,
            abstract: article.abstract,
            content: article.content,
        });
        setCoAuthors(article.authors ? article.authors.slice(1) : []);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleSaveEdit = async () => {
        if (!article) return;
        setIsSaving(true);
        try {
            const payload = {
                ...editedArticle,
                co_authors: coAuthors.map(a => a.id)
            };
            const updated = await api.patch(`/articles/${article.slug}/`, payload);
            setArticle(updated);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const processUpload = async () => {
        if (!file) return;
        setStep('uploading');
        setProgress(10);
        setStatusMsg('Requesting upload URL from server…');

        try {
            // ── 1. Get Presigned URL ────────────────────────────────────────
            const presignData = await api.post('/articles/upload_url/', { file_name: file.name });
            const { presigned_url, public_url } = presignData;
            setProgress(25);
            setStatusMsg('Uploading PDF to Cloudflare R2…');

            // ── 2. Upload to R2 directly via presigned URL ──────────────────
            const uploadRes = await fetch(presigned_url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/pdf' },
                body: file,
            });
            if (!uploadRes.ok) throw new Error(`R2 upload failed: HTTP ${uploadRes.status}`);
            setProgress(50);
            setStatusMsg('Creating article record…');

            // ── 3. Create a placeholder Article in the DB ───────────────────
            const slug = `paper-${Date.now()}`;
            const articleData: ArticleData = await api.post('/articles/', {
                title: 'Pending AI Extraction',
                abstract: 'AI is analysing your paper…',
                pdf_url: public_url,
                slug,
            });
            setArticle(articleData);
            setProgress(65);
            setStep('processing');
            setStatusMsg('Triggering AI extraction pipeline…');

            // ── 4. Trigger AI Service pipeline via Backend proxy ───────────
            // NOTE: We call the Backend's proxy endpoint instead of localhost:8001
            // directly. This avoids Docker network issues where localhost in the
            // browser may not resolve to the AI service container.
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('Your login session has expired. Please login again and retry upload.');
            }
            const aiRes = await fetch('/api/ai-proxy/pdf/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    pdf_url: public_url,
                    slug: articleData.slug,
                    article_id: articleData.id ?? 1,
                }),
            });
            if (!aiRes.ok) throw new Error(`AI trigger failed: HTTP ${aiRes.status}`);

            setProgress(75);

            // ── 5. Poll the Backend until extracted data is available ───────
            startPolling(articleData.slug);

        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error occurred.';
            setErrorMsg(msg);
            setStep('error');
            stopPolling();
        }
    };

    // ── Helpers for step label & bar colour ──────────────────────────────────
    const stepLabel = {
        idle: '',
        uploading: 'Uploading to Cloudflare R2…',
        processing: 'Triggering AI pipeline…',
        polling: `AI extracting content… (checking every 5s)`,
        done: 'Extraction complete ✓',
        error: 'An error occurred.',
    }[step];

    const isActive = (s: UploadStep) =>
        ['processing', 'polling', 'done'].includes(step) && s !== 'uploading'
            ? true : false;

    return (
        <main className="min-h-screen bg-[#f6f6f8] text-slate-900 flex overflow-hidden">
            <AppSidebar />
            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <aside
                style={{ display: 'none' }}
                className={`sticky top-0 z-20 h-screen shrink-0 border-r border-slate-200 bg-white transition-all duration-300 flex flex-col ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
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

                <nav className="flex-1 space-y-2 px-4 overflow-y-auto">
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

                        return (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => { if (item.label === 'Feed') router.push('/'); }}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${item.active ? 'bg-blue-50 text-[#135bec]' : 'text-slate-600 hover:bg-slate-50'}`}
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

            {/* ── Main Content ─────────────────────────────────────────── */}
            <section className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto py-12 px-8">

                    {/* Header */}
                    <header className="mb-10">
                        <h2 className="text-4xl font-bold tracking-tight mb-2">Upload Research Paper</h2>
                        <p className="text-slate-600 text-lg">
                            AI will automatically extract title, abstract and full content from your IEEE PDF.
                        </p>
                    </header>

                    {/* ── Progress bar ──────────────────────────────────── */}
                    {step !== 'idle' && step !== 'error' && (
                        <div className="mb-10 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                            {/* Steps */}
                            <div className="flex items-center justify-between mb-6">
                                {/* Step 1 — Uploading */}
                                <div className="flex flex-col items-center gap-2 text-[#2513ec]">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2513ec] text-white">
                                        <UploadCloud size={20} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Uploading</span>
                                </div>

                                <div className={`flex-1 h-[2px] mx-4 mb-6 transition-colors ${['processing', 'polling', 'done'].includes(step) ? 'bg-[#2513ec]' : 'bg-slate-200'}`} />

                                {/* Step 2 — AI Extraction */}
                                <div className={`flex flex-col items-center gap-2 ${['processing', 'polling', 'done'].includes(step) ? 'text-[#2513ec]' : 'opacity-40 text-slate-400'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${['processing', 'polling', 'done'].includes(step) ? 'border-[#2513ec] bg-[#2513ec]/10' : 'border-slate-300'}`}>
                                        {step === 'polling'
                                            ? <Loader2 size={18} className="animate-spin" />
                                            : <Bot size={20} />}
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">AI Extraction</span>
                                </div>

                                <div className={`flex-1 h-[2px] mx-4 mb-6 transition-colors ${step === 'done' ? 'bg-[#2513ec]' : 'bg-slate-200'}`} />

                                {/* Step 3 — Done */}
                                <div className={`flex flex-col items-center gap-2 ${step === 'done' ? 'text-green-600' : 'opacity-40 text-slate-400'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step === 'done' ? 'bg-green-100 border-green-500' : 'border-slate-300'}`}>
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500 font-medium">{stepLabel}</span>
                                    <span className="text-sm font-bold text-[#2513ec]">{progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${step === 'polling' ? 'animate-pulse' : ''} bg-[#2513ec]`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                {statusMsg && (
                                    <p className="text-xs text-slate-400 mt-1">{statusMsg}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Error State ────────────────────────────────────── */}
                    {step === 'error' && (
                        <div className="mb-10 bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
                            <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={22} />
                            <div>
                                <h3 className="font-bold text-red-700 mb-1">Upload Failed</h3>
                                <p className="text-sm text-red-600">{errorMsg}</p>
                                <button
                                    onClick={resetUpload}
                                    className="mt-3 text-sm font-bold text-red-700 underline hover:no-underline"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Drop Zone (idle only) ─────────────────────────── */}
                    {step === 'idle' && (
                        <div className="mb-10">
                            <label
                                onDragOver={e => e.preventDefault()}
                                onDrop={onDrop}
                                className="relative group cursor-pointer border-2 border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 bg-white/50 hover:bg-white hover:border-[#2513ec] transition-all duration-300"
                            >
                                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                                <div className="w-16 h-16 rounded-full bg-[#2513ec]/10 flex items-center justify-center text-[#2513ec] mb-2">
                                    <UploadCloud size={32} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold">
                                        {file ? file.name : 'Drag & drop your IEEE PDF here'}
                                    </h3>
                                    <p className="text-slate-500 mt-1">
                                        {file
                                            ? `${(file.size / 1024 / 1024).toFixed(2)} MB — Click below to start`
                                            : 'Supports IEEE format. AI will auto-extract title, abstract and content.'}
                                    </p>
                                </div>
                                {file ? (
                                    <button
                                        onClick={e => { e.preventDefault(); processUpload(); }}
                                        className="mt-4 px-8 py-3 bg-[#2513ec] text-white rounded-xl font-bold hover:bg-[#2513ec]/90 transition-colors shadow-lg shadow-[#2513ec]/20"
                                    >
                                        Upload & Extract
                                    </button>
                                ) : (
                                    <div className="mt-4 px-8 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold pointer-events-none">
                                        Select a PDF file
                                    </div>
                                )}
                            </label>
                        </div>
                    )}

                    {/* ── Extraction Result Preview ─────────────────────── */}
                    {(step === 'processing' || step === 'polling' || step === 'done') && (
                        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            {/* Header row */}
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold text-xl">Extraction Preview</h3>
                                {step === 'done' ? (
                                    <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-bold rounded-full uppercase tracking-wider">
                                        Validated by AI
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-amber-100 text-amber-600 flex items-center gap-2 text-xs font-bold rounded-full uppercase tracking-wider">
                                        <Loader2 size={12} className="animate-spin" />
                                        Processing…
                                    </span>
                                )}
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Title */}
                                <div className={step !== 'done' ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        <FileText size={14} /> Title
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editedArticle.title || ''}
                                            onChange={(e) => setEditedArticle({ ...editedArticle, title: e.target.value })}
                                            className="w-full text-xl font-bold leading-snug p-3 border border-[#2513ec]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2513ec]/50"
                                        />
                                    ) : (
                                        step === 'done' && article?.title && !article.title.startsWith('Pending') ? (
                                            <p className="text-xl font-bold leading-snug">{article.title}</p>
                                        ) : (
                                            <div className="h-7 w-3/4 bg-slate-100 rounded animate-pulse" />
                                        )
                                    )}
                                </div>

                                {/* Abstract */}
                                <div className={step !== 'done' ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        <AlignLeft size={14} /> Abstract
                                    </label>
                                    {isEditing ? (
                                        <textarea
                                            value={editedArticle.abstract || ''}
                                            onChange={(e) => setEditedArticle({ ...editedArticle, abstract: e.target.value })}
                                            rows={4}
                                            className="w-full text-sm text-slate-700 leading-relaxed p-3 border border-[#2513ec]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2513ec]/50 resize-y"
                                        />
                                    ) : (
                                        step === 'done' && article?.abstract ? (
                                            <p className="text-slate-700 leading-relaxed text-sm">{article.abstract}</p>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                                                <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
                                                <div className="h-4 w-4/6 bg-slate-100 rounded animate-pulse" />
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Content preview */}
                                <div className={step !== 'done' ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        <Users size={14} /> Co-Authors
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {(isEditing ? coAuthors : article?.authors?.slice(1) || []).map((author: any) => (
                                            <span key={author.id} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
                                                {author.user?.full_name || author.full_name || author.author_code || 'Author'}
                                                {isEditing && (
                                                    <button onClick={() => setCoAuthors(prev => prev.filter(a => a.id !== author.id))} className="hover:text-red-500 ml-1 hover:bg-red-50 rounded-full p-0.5 transition-colors">
                                                        <X size={13} />
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                        {!isEditing && article?.authors && article.authors.length <= 1 && (
                                            <span className="text-sm text-slate-400 italic">No co-authors added.</span>
                                        )}
                                    </div>
                                    {isEditing && (
                                        <div className="relative">
                                            <div className="relative">
                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search to add co-authors..."
                                                    value={authorSearchQuery}
                                                    onChange={(e) => setAuthorSearchQuery(e.target.value)}
                                                    className="w-full pl-9 p-3 border border-[#2513ec]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2513ec]/50 text-sm"
                                                />
                                            </div>
                                            {authorSearchQuery && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                    {isSearchingAuthors ? (
                                                        <div className="p-3 text-sm text-slate-500 text-center">Searching...</div>
                                                    ) : (
                                                        <>
                                                            {authorSearchResults.length > 0 ? (
                                                                authorSearchResults.map((author: any) => (
                                                                    <div
                                                                        key={author.id}
                                                                        onClick={() => {
                                                                            if (!coAuthors.find(a => a.id === author.id)) {
                                                                                setCoAuthors([...coAuthors, author]);
                                                                            }
                                                                            setAuthorSearchQuery('');
                                                                            setAuthorSearchResults([]);
                                                                        }}
                                                                        className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between"
                                                                    >
                                                                        <div>
                                                                            <div className="font-bold text-sm text-slate-800">{author.user?.full_name || author.full_name || 'Unknown User'}</div>
                                                                            <div className="text-xs text-slate-500">ID Code: {author.author_code}</div>
                                                                        </div>
                                                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition-colors">Select</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="p-3 text-sm text-slate-500 text-center">No existing authors found</div>
                                                            )}
                                                            <div
                                                                onClick={() => {
                                                                    if (authorSearchQuery.trim() && !coAuthors.find(a => a.id === authorSearchQuery.trim())) {
                                                                        setCoAuthors([...coAuthors, { id: authorSearchQuery.trim(), full_name: authorSearchQuery.trim(), author_code: 'Unregistered' }]);
                                                                    }
                                                                    setAuthorSearchQuery('');
                                                                    setAuthorSearchResults([]);
                                                                }}
                                                                className="p-3 hover:bg-indigo-50 cursor-pointer border-t border-slate-100 flex items-center justify-between"
                                                            >
                                                                <div>
                                                                    <div className="font-bold text-sm text-slate-800">Add "{authorSearchQuery}"</div>
                                                                    <div className="text-xs text-slate-500">as an unregistered co-author</div>
                                                                </div>
                                                                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-md transition-colors">+ Add</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className={step !== 'done' ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        <BookOpen size={14} /> Content {isEditing ? '' : 'Preview'}
                                    </label>
                                    {isEditing ? (
                                        <textarea
                                            value={editedArticle.content || ''}
                                            onChange={(e) => setEditedArticle({ ...editedArticle, content: e.target.value })}
                                            rows={12}
                                            className="w-full text-sm text-slate-600 leading-relaxed p-3 border border-[#2513ec]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2513ec]/50 resize-y font-mono"
                                        />
                                    ) : (
                                        step === 'done' && article?.content ? (
                                            <div className="relative">
                                                <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap line-clamp-6">
                                                    {article.content.slice(0, 600)}
                                                </p>
                                                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                                                <p className="text-xs text-slate-400 mt-3">
                                                    {(article.content.length / 1000).toFixed(1)}k characters extracted
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                                                <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                                                <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* PDF URL */}
                                {step === 'done' && article?.pdf_url && (
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                            PDF URL
                                        </label>
                                        <a
                                            href={article.pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-[#2513ec] underline break-all hover:opacity-75"
                                        >
                                            {article.pdf_url}
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Footer actions (done state) */}
                            {step === 'done' && (
                                <div className="px-8 pb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {!isEditing ? (
                                            <button
                                                onClick={handleEditClick}
                                                className="px-5 py-2.5 bg-indigo-50 text-[#2513ec] rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors flex items-center gap-2"
                                            >
                                                <Edit3 size={16} />
                                                Edit Extraction
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={isSaving}
                                                    className="px-5 py-2.5 bg-[#2513ec] text-white rounded-xl font-bold text-sm hover:bg-[#2513ec]/90 transition-colors flex items-center gap-2 disabled:opacity-75"
                                                >
                                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    disabled={isSaving}
                                                    className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-75"
                                                >
                                                    <X size={16} />
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    
                                    {!isEditing && (
                                        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-slate-100">
                                            <button
                                                onClick={resetUpload}
                                                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                                            >
                                                Upload Another
                                            </button>
                                            <button
                                                onClick={() => router.push('/')}
                                                className="px-5 py-2.5 bg-[#2513ec] text-white rounded-xl font-bold text-sm hover:bg-[#2513ec]/90 transition-colors"
                                            >
                                                Go to Dashboard →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Footer */}
                    <footer className="mt-12 flex justify-center text-slate-400">
                        <div className="flex items-center gap-8 text-xs font-medium uppercase tracking-widest">
                            <a className="hover:text-[#2513ec] transition-colors" href="#">API Documentation</a>
                            <a className="hover:text-[#2513ec] transition-colors" href="#">Privacy Protocol</a>
                            <a className="hover:text-[#2513ec] transition-colors" href="#">Support Center</a>
                        </div>
                    </footer>
                </div>
            </section>
        </main>
    );
}

export default function UploadPage() {
    return <AuthorGuard><UploadPageContent /></AuthorGuard>;
}
