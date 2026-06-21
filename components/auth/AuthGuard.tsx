'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      setAllowed(true);
      return;
    }
    const destination = `${pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(destination)}`);
  }, [pathname, router]);

  if (!allowed) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-[#135bec]" /></div>;
  return <>{children}</>;
}
