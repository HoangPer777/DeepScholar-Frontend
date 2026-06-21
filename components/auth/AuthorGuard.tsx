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
      if (!localStorage.getItem('access_token')) {
        router.replace(`/login?next=${encodeURIComponent(destination)}`);
        return;
      }
      try {
        const user = await api.get('/auth/me/') as AuthUser;
        localStorage.setItem('user', JSON.stringify(user));
        const isAuthor = user.role === 'author'
          && Boolean(user.author_profile)
          && user.author_profile?.is_active !== false;
        if (!isAuthor) {
          router.replace(`/profile/become-author?next=${encodeURIComponent(destination)}`);
          return;
        }
        if (active) setAllowed(true);
      } catch {
        // Expired-token redirects are handled by the shared API helper.
      }
    };
    checkAccess();
    return () => { active = false; };
  }, [pathname, router]);

  if (!allowed) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-[#135bec]" /></div>;
  return <>{children}</>;
}
