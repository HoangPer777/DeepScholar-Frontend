'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Loader2 } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';
import AppShell from '@/components/layout/AppShell';
import { api } from '@/lib/api';

export default function BookmarksPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); api.get('/bookmarks/').then((data) => setArticles(data.results || data)).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);
  const remove = async (id: number) => { await api.post(`/articles/${id}/bookmark/`, {}); setArticles((current) => current.filter((item) => item.id !== id)); };
  return <AuthGuard><AppShell><div className="mx-auto max-w-4xl space-y-6"><h1 className="text-3xl font-black">Bookmarks</h1>{loading ? <Loader2 className="animate-spin" /> : error ? <div className="rounded-xl bg-red-50 p-5 text-red-700">{error} <button onClick={load} className="underline">Retry</button></div> : articles.length === 0 ? <div className="rounded-2xl border bg-white p-12 text-center"><Bookmark className="mx-auto mb-3 text-slate-300" /><p className="text-slate-500">You have no saved articles yet.</p></div> : <div className="space-y-3">{articles.map((article) => <article key={article.id} className="rounded-xl border bg-white p-5"><Link href={`/papers/${article.slug}`} className="text-lg font-bold hover:text-blue-600">{article.title}</Link><p className="mt-2 line-clamp-2 text-sm text-slate-500">{article.abstract}</p><button onClick={() => remove(article.id)} className="mt-4 text-sm font-bold text-red-600">Remove bookmark</button></article>)}</div>}</div></AppShell></AuthGuard>;
}
