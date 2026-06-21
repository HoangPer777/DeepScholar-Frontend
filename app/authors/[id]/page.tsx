'use client';

import { useEffect, useState } from 'react';
import { Loader2, UserRound } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { api } from '@/lib/api';

export default function AuthorPage({ params }: { params: { id: string } }) {
  const [author, setAuthor] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { Promise.all([api.get(`/authors/${params.id}/`), api.get(`/articles/?authors=${params.id}`)]).then(([profile, papers]) => { setAuthor(profile); setArticles(papers.results || papers); }).catch((e) => setError(e.message)); }, [params.id]);
  return <AppShell><div className="mx-auto max-w-4xl">{error ? <div className="rounded-xl bg-red-50 p-5 text-red-700">{error}</div> : !author ? <Loader2 className="animate-spin" /> : <><section className="rounded-2xl border bg-white p-7"><div className="flex items-center gap-4"><div className="rounded-full bg-blue-50 p-5 text-blue-600"><UserRound /></div><div><h1 className="text-3xl font-black">{author.full_name}</h1><p className="text-slate-500">{author.affiliation || author.author_code}</p></div></div>{author.bio && <p className="mt-5 text-slate-600">{author.bio}</p>}<div className="mt-5 flex gap-6 text-sm"><span><b>{author.total_score}</b> points</span><span><b>{author.follower_count}</b> followers</span></div></section><h2 className="mb-3 mt-8 text-xl font-bold">Articles</h2><div className="space-y-3">{articles.length ? articles.map((article) => <a href={`/papers/${article.slug}`} key={article.id} className="block rounded-xl border bg-white p-5 font-bold hover:text-blue-600">{article.title}</a>) : <p className="text-slate-500">No public articles.</p>}</div></>}</div></AppShell>;
}
