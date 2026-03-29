'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Route } from 'next';
import { api } from '@/lib/api';
import {
  AlertCircle,
  Atom,
  Bell,
  Bookmark,
  Bot,
  ChartNoAxesColumn,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Info,
  Library,
  List,
  Loader2,
  LogOut,
  Search,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';

type UserMe = {
  id: number;
  provider?: 'local' | 'google' | 'facebook' | string;
  user_code?: string;
  email?: string;
  full_name?: string;
  gender?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  author_profile?: {
    id: number;
    affiliation?: string | null;
    bio?: string | null;
  } | null;
};

type FormState = {
  full_name: string;
  email: string;
  gender: string;
  address: string;
  affiliation: string;
  bio: string;
};

const navItems = [
  { label: 'Feed', href: '/' as Route, icon: List },
  { label: 'AI Deep Research', icon: Sparkles, highlight: true },
  { label: 'Library', icon: Library },
  { label: 'Rankings', icon: ChartNoAxesColumn },
  { label: 'Bookmarks', icon: Bookmark },
  { label: 'Collaborations', icon: Users },
  { label: 'Profile Settings', href: '/profile/edit' as Route, icon: UserRound, active: true },
];

export default function EditProfilePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [user, setUser] = useState<UserMe | null>(null);
  const [form, setForm] = useState<FormState>({
    full_name: '',
    email: '',
    gender: 'other',
    address: '',
    affiliation: '',
    bio: '',
  });
  const isSocialAccount = !!user?.provider && user.provider !== 'local';
  const socialProviderName = user?.provider === 'google' ? 'Google' : user?.provider === 'facebook' ? 'Facebook' : 'social provider';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const me = (await api.get('/auth/me/')) as UserMe;
        setUser(me);
        setForm({
          full_name: me.full_name || '',
          email: me.email || '',
          gender: (me.gender || 'other').toLowerCase(),
          address: me.address || '',
          affiliation: me.author_profile?.affiliation || '',
          bio: me.author_profile?.bio || '',
        });
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const onChangeField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSaveChanges = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await api.patch(`/users/${user.id}/`, {
        full_name: form.full_name,
        email: form.email,
        gender: form.gender,
        address: form.address,
      });

      if (user.author_profile?.id) {
        await api.patch(`/authors/${user.author_profile.id}/`, {
          affiliation: form.affiliation,
          bio: form.bio,
        });
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              full_name: form.full_name,
              email: form.email,
              gender: form.gender,
              address: form.address,
              author_profile: prev.author_profile
                ? {
                    ...prev.author_profile,
                    affiliation: form.affiliation,
                    bio: form.bio,
                  }
                : prev.author_profile,
            }
          : prev
      );

      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
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

          <div className="space-y-2 border-t border-slate-200 p-4">
            <button
              className={`flex w-full items-center justify-center rounded-lg bg-[#135bec] py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 ${sidebarCollapsed ? 'gap-0 px-0' : 'gap-2'}`}
              title={sidebarCollapsed ? 'AI Assistant' : undefined}
            >
              <Bot size={18} />
              {!sidebarCollapsed && 'AI Assistant'}
            </button>

            <button
              type="button"
              className={`flex w-full items-center justify-center rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 ${sidebarCollapsed ? 'gap-0 px-0' : 'gap-2'}`}
              title={sidebarCollapsed ? 'Logout' : undefined}
            >
              <LogOut size={18} />
              {!sidebarCollapsed && 'Logout'}
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
                {form.full_name?.[0]?.toUpperCase() || 'T'}
              </Link>
            </div>
          </header>

          <div className="p-4 md:p-8">
            <div className="mx-auto max-w-5xl space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Edit Profile</h2>
                <p className="mt-2 text-slate-500">Manage your personal details, visibility, and author credentials.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-slate-500">
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Loading profile...
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-xl font-bold text-slate-900">Account Information</h3>
                      <p className="mt-1 text-sm text-slate-500">Update your basic account settings and profile picture.</p>
                      <div className="mt-4 border-b border-slate-200" />

                      <div className="mt-6 grid gap-6 md:grid-cols-[160px_minmax(0,1fr)]">
                        <div className="space-y-3 text-center md:pt-1">
                          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#6f93ce] bg-[#d5deee] text-xl font-bold text-[#135bec]">
                            {form.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <p className="text-sm font-bold text-slate-700">Profile Photo</p>
                          <p className="text-xs text-slate-500">JPG, PNG or GIF. Max 5MB.</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-sm font-semibold text-slate-700">Full Name</span>
                            <input
                              type="text"
                              value={form.full_name}
                              onChange={(e) => onChangeField('full_name', e.target.value)}
                              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 focus:border-[#135bec] focus:outline-none"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-sm font-semibold text-slate-700">Email Address</span>
                            <input
                              type="email"
                              value={form.email}
                              onChange={(e) => onChangeField('email', e.target.value)}
                              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 focus:border-[#135bec] focus:outline-none"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-sm font-semibold text-slate-700">Gender</span>
                            <select
                              value={form.gender}
                              onChange={(e) => onChangeField('gender', e.target.value)}
                              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 focus:border-[#135bec] focus:outline-none"
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </label>

                          <div className="hidden md:block" />

                          <label className="space-y-1.5 md:col-span-2">
                            <span className="text-sm font-semibold text-slate-700">Address</span>
                            <textarea
                              rows={3}
                              value={form.address}
                              onChange={(e) => onChangeField('address', e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#135bec] focus:outline-none"
                            />
                          </label>
                        </div>
                      </div>
                    </section>

                    <section className="border-t border-slate-200 pt-8">
                      <h3 className="text-xl font-bold text-slate-900">Author Profile</h3>
                      <p className="mt-1 text-sm text-slate-500">Information displayed on your public research papers and profile.</p>
                      <div className="mt-4 border-b border-slate-200" />

                      <div className="mt-6 grid gap-6 md:grid-cols-[170px_minmax(0,1fr)]">
                        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                          <div className="flex items-start gap-2.5">
                            <Info size={16} className="mt-0.5 shrink-0 text-[#135bec]" />
                            <div>
                              <p className="text-sm font-bold text-[#2a4fc7]">Visibility Tip</p>
                              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                Your affiliation and bio are used to verify your credentials for peer reviews and journal submissions.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-5">
                          <label className="space-y-1.5">
                            <span className="text-sm font-semibold text-slate-700">Affiliation</span>
                            <input
                              type="text"
                              value={form.affiliation}
                              onChange={(e) => onChangeField('affiliation', e.target.value)}
                              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 focus:border-[#135bec] focus:outline-none"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-sm font-semibold text-slate-700">Bio</span>
                            <textarea
                              rows={5}
                              value={form.bio}
                              onChange={(e) => onChangeField('bio', e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#135bec] focus:outline-none"
                            />
                          </label>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-6">
                    <Link
                      href={'/profile' as Route}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      Cancel
                    </Link>
                    {isSocialAccount ? (
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400"
                        title={`Password is managed by ${socialProviderName}`}
                      >
                        Change Password
                      </button>
                    ) : (
                      <Link
                        href={'/profile/change-password' as Route}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Change Password
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={onSaveChanges}
                      disabled={saving}
                      className="rounded-lg bg-[#135bec] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                  {isSocialAccount && (
                    <p className="mt-3 text-right text-xs text-slate-500">
                      This account uses {socialProviderName} sign-in. Please change your password directly in your {socialProviderName} account settings.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
