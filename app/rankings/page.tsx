'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Medal, Search, UserRound } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { rankingService } from '@/services/ranking';
import type { RankedAuthor } from '@/types/ranking';

function RankingsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const page = Math.max(Number(params.get('page')) || 1, 1);
  const initialSearch = params.get('search') || '';
  const [search, setSearch] = useState(initialSearch);
  const [authors, setAuthors] = useState<RankedAuthor[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      rankingService.list(page, 20, initialSearch)
        .then((data) => { setAuthors(data.results); setCount(data.count); })
        .catch((reason) => setError(reason.message || 'Failed to load rankings.'))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [page, initialSearch]);

  useEffect(() => setSearch(initialSearch), [initialSearch]);

  const applySearch = (value: string) => {
    setSearch(value);
    const next = new URLSearchParams(params.toString());
    next.set('page', '1');
    value.trim() ? next.set('search', value.trim()) : next.delete('search');
    router.replace(`/rankings?${next.toString()}`);
  };
  const totalPages = Math.max(Math.ceil(count / 20), 1);

  return <AppShell>
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-3xl font-black">Researcher Rankings</h1><p className="mt-1 text-slate-500">10 points per article, 3 per valid like, and 5 per unique commenter.</p></div>
      <div className="relative max-w-xl"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={search} onChange={(e) => applySearch(e.target.value)} placeholder="Search name, author code, or affiliation" className="w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 outline-none focus:border-blue-400" /></div>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div> : error ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div> : authors.length === 0 ? <div className="rounded-xl border bg-white p-12 text-center text-slate-500">No researchers found.</div> :
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {authors.map((author) => <Link href={`/authors/${author.id}`} key={author.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 border-b p-4 last:border-0 hover:bg-slate-50 md:grid-cols-[64px_1fr_repeat(4,100px)]">
            <div className="flex items-center justify-center font-black text-slate-500">{author.rank <= 3 ? <Medal className={author.rank === 1 ? 'text-amber-500' : author.rank === 2 ? 'text-slate-400' : 'text-orange-600'} /> : `#${author.rank}`}</div>
            <div className="flex min-w-0 items-center gap-3">{author.avatar_url ? <img src={author.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="rounded-full bg-slate-100 p-3"><UserRound size={20} /></div>}<div className="min-w-0"><p className="truncate font-bold">{author.full_name}</p><p className="truncate text-xs text-slate-500">{author.affiliation || author.author_code}</p></div></div>
            <p className="text-right text-lg font-black text-blue-600">{author.total_score}</p>
            <p className="hidden text-center text-sm md:block">{author.article_count}<span className="block text-xs text-slate-400">Articles</span></p>
            <p className="hidden text-center text-sm md:block">{author.like_count}<span className="block text-xs text-slate-400">Likes</span></p>
            <p className="hidden text-center text-sm md:block">{author.commenter_count}<span className="block text-xs text-slate-400">Commenters</span></p>
          </Link>)}
        </div>}
      <div className="flex items-center justify-center gap-4"><button disabled={page <= 1} onClick={() => router.push(`/rankings?page=${page - 1}${initialSearch ? `&search=${encodeURIComponent(initialSearch)}` : ''}`)} className="rounded-lg border bg-white px-4 py-2 disabled:opacity-40">Previous</button><span className="text-sm">Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => router.push(`/rankings?page=${page + 1}${initialSearch ? `&search=${encodeURIComponent(initialSearch)}` : ''}`)} className="rounded-lg border bg-white px-4 py-2 disabled:opacity-40">Next</button></div>
    </div>
  </AppShell>;
}

export default function RankingsPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}><RankingsContent /></Suspense>;
}
