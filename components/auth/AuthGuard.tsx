'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then(() => {
        if (active) setAllowed(true);
      })
      .catch(() => {
        const destination = `${pathname}${window.location.search}`;
        if (active) router.replace(`/login?next=${encodeURIComponent(destination)}`);
      });
    return () => { active = false; };
  }, [pathname, router]);

  if (!allowed) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-[#135bec]" /></div>;
  return <>{children}</>;
}
