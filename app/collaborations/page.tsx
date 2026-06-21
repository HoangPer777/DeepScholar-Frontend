import { Users } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';
import AppShell from '@/components/layout/AppShell';

export default function CollaborationsPage() {
  return <AuthGuard><AppShell><div className="mx-auto max-w-3xl"><h1 className="text-3xl font-black">Collaborations</h1><div className="mt-6 rounded-2xl border bg-white p-12 text-center"><Users className="mx-auto mb-3 text-slate-300" /><p className="font-semibold">No invitations or collaborations yet.</p><p className="mt-1 text-sm text-slate-500">New collaboration activity will appear here.</p></div></div></AppShell></AuthGuard>;
}
