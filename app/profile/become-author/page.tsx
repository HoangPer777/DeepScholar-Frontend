'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import AppSidebar from '@/components/layout/AppSidebar';
import { api } from '@/lib/api';
import { authService } from '@/services/auth';
import type { AuthUser } from '@/types/auth';
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

const safeDestination = (value: string | null) => value?.startsWith('/') && !value.startsWith('//') ? value : '/upload';

export default function BecomeAuthorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyAuthor, setAlreadyAuthor] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ author_name: '', affiliation: '', bio: '', accepted_author_terms: false });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await api.get('/auth/me/') as AuthUser;
        setAlreadyAuthor(user.role === 'author' && Boolean(user.author_profile));
        setForm((current) => ({
          ...current,
          author_name: user.author_profile?.full_name || user.full_name || '',
          affiliation: user.author_profile?.affiliation || '',
          bio: user.author_profile?.bio || '',
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load your account.');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const destination = () => safeDestination(new URLSearchParams(window.location.search).get('next'));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.accepted_author_terms) {
      setError('Please accept the author publishing terms.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await authService.becomeAuthor(form);
      setSuccess('Author profile created. Redirecting to upload...');
      window.setTimeout(() => router.replace(destination()), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your author profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#f6f6f8] text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-[1700px]">
          <AppSidebar />
          <section className="flex flex-1 items-center justify-center p-5 md:p-10">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#135bec]" /></div>
              ) : alreadyAuthor ? (
                <div className="space-y-5 text-center">
                  <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
                  <h1 className="text-2xl font-black">Your author profile is active</h1>
                  <p className="text-slate-600">You can publish and manage research papers now.</p>
                  <button onClick={() => router.replace(destination())} className="rounded-xl bg-[#135bec] px-5 py-3 font-bold text-white">Continue to upload</button>
                </div>
              ) : (
                <>
                  <div className="mb-8 flex gap-4">
                    <div className="h-fit rounded-2xl bg-blue-50 p-3 text-[#135bec]"><ShieldCheck size={28} /></div>
                    <div>
                      <h1 className="text-3xl font-black">Become an author</h1>
                      <p className="mt-2 leading-6 text-slate-600">Create your academic profile to upload papers and manage publications. Google and Facebook accounts do not need a local password.</p>
                    </div>
                  </div>
                  {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                  {success && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}
                  <form onSubmit={submit} className="space-y-5">
                    <label className="block text-sm font-bold text-slate-700">Author name
                      <input required maxLength={255} value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
                    </label>
                    <label className="block text-sm font-bold text-slate-700">Affiliation
                      <input maxLength={255} value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} placeholder="University, institute, or organization" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
                    </label>
                    <label className="block text-sm font-bold text-slate-700">Short bio
                      <textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Your research interests and background" className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                      <input type="checkbox" checked={form.accepted_author_terms} onChange={(e) => setForm({ ...form, accepted_author_terms: e.target.checked })} className="mt-1" />
                      <span>I confirm that I have the right to publish uploaded materials and agree to the <Link href="/terms" className="font-bold text-[#135bec]">publishing terms</Link>.</span>
                    </label>
                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                      <Link href="/profile" className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-600">Cancel</Link>
                      <button disabled={submitting} className="flex items-center gap-2 rounded-xl bg-[#135bec] px-5 py-3 font-bold text-white disabled:opacity-60">
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} Create author profile
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}
