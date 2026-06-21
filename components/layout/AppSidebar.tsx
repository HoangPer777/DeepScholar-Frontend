'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Atom, Bot, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { sidebarItems } from './sidebarItems';

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar_collapsed') === 'true');
  }, []);

  const toggle = () => {
    setCollapsed((current) => {
      localStorage.setItem('sidebar_collapsed', String(!current));
      return !current;
    });
  };

  const navigate = (event: React.MouseEvent, href: string, requiresAuth?: boolean) => {
    if (requiresAuth && !localStorage.getItem('access_token')) {
      event.preventDefault();
      router.push(`/login?next=${encodeURIComponent(href)}`);
    }
    setMobileOpen(false);
  };

  const content = (
    <>
      <div className="flex items-center gap-3 p-5">
        <div className="rounded-lg bg-[#135bec] p-2 text-white"><Atom size={20} /></div>
        {!collapsed && <div><p className="font-bold">Deep Scholar</p><p className="text-xs text-slate-500">Research Portal</p></div>}
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
        {sidebarItems.map((item, index) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <div key={item.href}>
              {index === 4 && !collapsed && <p className="px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace</p>}
              <Link
                href={item.href}
                onClick={(event) => navigate(event, item.href, 'requiresAuth' in item && item.requiresAuth)}
                title={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold ${collapsed ? 'justify-center' : 'gap-3'} ${active ? 'bg-blue-50 text-[#135bec]' : ('highlight' in item && item.highlight) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Icon size={18} />{!collapsed && <span>{item.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>
      <Link href="/deep-research" className="m-4 flex items-center justify-center gap-2 rounded-lg bg-[#135bec] py-2.5 text-sm font-bold text-white">
        <Bot size={18} />{!collapsed && 'AI Assistant'}
      </Link>
    </>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className="fixed left-3 top-3 z-40 rounded-lg bg-white p-2 shadow lg:hidden" aria-label="Open navigation"><Menu /></button>
      {mobileOpen && <button className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-white transition-all lg:flex ${collapsed ? 'w-20' : 'w-64'}`}>
        <button onClick={toggle} className="absolute -right-3 top-6 rounded-full border bg-white p-1" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
        {content}
      </aside>
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white transition-transform lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 p-2" aria-label="Close navigation"><X /></button>
        {content}
      </aside>
    </>
  );
}
