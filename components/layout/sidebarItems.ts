import {
  Bookmark, ChartNoAxesColumn, Library, List, Sparkles, UserRound, Users,
} from 'lucide-react';

export const sidebarItems = [
  { label: 'Feed', href: '/', icon: List },
  { label: 'AI Deep Research', href: '/deep-research', icon: Sparkles, highlight: true },
  { label: 'Library', href: '/library', icon: Library },
  { label: 'Rankings', href: '/rankings', icon: ChartNoAxesColumn },
  { label: 'Bookmarks', href: '/bookmarks', icon: Bookmark, requiresAuth: true, workspace: true },
  { label: 'Collaborations', href: '/collaborations', icon: Users, requiresAuth: true, workspace: true },
  { label: 'Profile Settings', href: '/profile', icon: UserRound, requiresAuth: true, workspace: true },
] as const;
