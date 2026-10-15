'use client';

import { api } from '@/lib/api';
import type { AuthUser } from '@/types/auth';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthorGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    const checkAccess = async () => {
      const destination = `${pathname}${window.location.search}`;
      try {
        const user = await api.get('/auth/me') as AuthUser;
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(user));
        }
        const isAuthor = user.role === 'author'
          && Boolean(user.author_profile)
          && user.author_profile?.is_active !== false;
        if (!isAuthor) {
          router.replace(`/profile/become-author?next=${encodeURIComponent(destination)}`);
          return;
        }
        if (active) setAllowed(true);
      } catch {
        if (active) router.replace(`/login?next=${encodeURIComponent(destination)}`);
      }
    };
    checkAccess();
    return () => { active = false; };
  }, [pathname, router]);

  if (!allowed) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-[#135bec]" /></div>;
  return <>{children}</>;
}
