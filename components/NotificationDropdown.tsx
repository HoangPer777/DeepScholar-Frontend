'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type Notification = {
  id: number;
  verb: string;
  is_read: boolean;
  created_at: string;
  actor?: { full_name?: string; email?: string } | null;
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    // Only fetch if logged in
    if (typeof window === 'undefined' || !localStorage.getItem('access_token')) return;
    setLoading(true);
    try {
      const data = await api.get('/notifications/');
      setNotifications(data.results ?? (Array.isArray(data) ? data : []));
    } catch {
      // silently fail — user may not be logged in
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount + every 60s polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Fetch when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markRead = async (id: number) => {
    setMarkingId(id);
    try {
      await api.post(`/notifications/${id}/read/`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } finally {
      setMarkingId(null);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.allSettled(unread.map((n) => api.post(`/notifications/${n.id}/read/`, {})));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#dfe4ef] bg-[#f7f8fc] text-slate-500 transition hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900">
              Thông báo
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-black text-red-600">
                  {unreadCount} mới
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] font-bold text-[#135bec] hover:underline"
              >
                <CheckCheck size={13} />
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                Chưa có thông báo nào
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b border-slate-50 px-4 py-3 transition-colors last:border-0 ${
                    n.is_read ? 'bg-white' : 'bg-blue-50/40'
                  }`}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {n.is_read
                      ? <div className="h-2 w-2 rounded-full bg-slate-200" />
                      : <div className="h-2 w-2 rounded-full bg-[#135bec]" />
                    }
                  </div>

                  <div className="min-w-0 flex-1">
                    {n.actor && (
                      <p className="text-[11px] font-bold text-[#135bec]">
                        {n.actor.full_name || n.actor.email}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-slate-800">{n.verb}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {new Date(n.created_at).toLocaleString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Mark read button */}
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      disabled={markingId === n.id}
                      title="Đánh dấu đã đọc"
                      className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[#135bec] disabled:opacity-50"
                    >
                      {markingId === n.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Check size={13} />
                      }
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <a
              href="/profile?tab=notifications"
              className="block text-center text-xs font-bold text-[#135bec] hover:underline"
            >
              Xem tất cả thông báo
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
