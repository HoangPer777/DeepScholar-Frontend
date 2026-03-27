'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  Eye,
  EyeOff,
  FileUp,
  KeyRound,
  Library,
  List,
  Loader2,
  LogOut,
  Search,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';

const navItems = [
  { label: 'Feed', href: '/' as Route, icon: List },
  { label: 'AI Deep Research', icon: Sparkles, highlight: true },
  { label: 'Library', icon: Library },
  { label: 'Rankings', icon: ChartNoAxesColumn },
  { label: 'Bookmarks', icon: Bookmark },
  { label: 'Collaborations', icon: Users },
  { label: 'Profile Settings', href: '/profile/edit' as Route, icon: UserRound, active: true },
];

export default function ChangePasswordPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [provider, setProvider] = useState<string>('local');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        setLoadingProfile(true);
        const me = await api.get('/auth/me/');
        setProvider((me?.provider || 'local').toLowerCase());
      } catch {
        setProvider('local');
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchMe();
  }, []);

  const isSocialAccount = provider !== 'local';
  const socialProviderName = provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : 'social provider';

  const getStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { label: 'Weak', width: '25%', color: 'bg-red-500', textColor: 'text-red-600' };
    if (score === 2) return { label: 'Medium', width: '50%', color: 'bg-amber-500', textColor: 'text-amber-600' };
    if (score === 3) return { label: 'Good', width: '75%', color: 'bg-blue-600', textColor: 'text-blue-600' };
    return { label: 'Strong', width: '100%', color: 'bg-[#2d2fe3]', textColor: 'text-[#2d2fe3]' };
  };

  const passwordStrength = getStrength(newPassword);

  const onSubmitChangePassword = async () => {
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccess(res?.detail || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
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
                T
              </Link>
            </div>
          </header>

          <div className="p-4 md:p-8">
            <div className="mx-auto max-w-3xl space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Security Settings</h2>
                <p className="mt-2 text-slate-500">
                  Manage your authentication credentials and account protection protocols to ensure the integrity of your research data.
                </p>
              </div>

              {loadingProfile && (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <Loader2 size={16} className="animate-spin" />
                  Checking account type...
                </div>
              )}

              {!loadingProfile && isSocialAccount && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  This account uses {socialProviderName} sign-in. You cannot change password here.
                  Please update your password directly in your {socialProviderName} account settings.
                </div>
              )}

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

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
                <div className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <KeyRound size={18} className="text-[#2d2fe3]" />
                  Change Password
                </div>

                <div className={`space-y-5 ${isSocialAccount ? 'pointer-events-none opacity-50' : ''}`}>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Current Password</span>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        placeholder="............."
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-10 text-sm text-slate-800 focus:border-[#2d2fe3] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                      >
                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">New Password</span>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        placeholder="............."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-10 text-sm text-slate-800 focus:border-[#2d2fe3] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showNew ? 'Hide new password' : 'Show new password'}
                      >
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-[4px] flex-1 overflow-hidden rounded bg-slate-200">
                        <div className={`h-full rounded ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.08em] ${passwordStrength.textColor}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Confirm New Password</span>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="............."
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-10 text-sm text-slate-800 focus:border-[#2d2fe3] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                </div>

                <div className="mt-7 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={onSubmitChangePassword}
                    disabled={submitting || isSocialAccount || loadingProfile}
                    className="rounded-lg bg-[#2d2fe3] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(45,47,227,0.35)] transition hover:bg-[#2325c9] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Updating...' : 'Update Password'}
                  </button>
                  <Link
                    href={'/profile/edit' as Route}
                    className="px-2 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                  >
                    {isSocialAccount ? 'Back to Edit Profile' : 'Cancel'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
