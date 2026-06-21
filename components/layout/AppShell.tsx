import AppSidebar from './AppSidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#f6f6f8] text-slate-900"><div className="mx-auto flex w-full max-w-[1700px]"><AppSidebar /><section className="min-w-0 flex-1 p-5 md:p-8">{children}</section></div></main>;
}
