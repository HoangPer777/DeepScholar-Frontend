import { api } from '@/lib/api';

export const interactionsService = {
  // Like toggle — POST /articles/<id>/like/
  toggleLike: async (articleId: number): Promise<{ liked: boolean; like_count: number }> => {
    return api.post(`/articles/${articleId}/like/`, {});
  },

  // Bookmark toggle — POST /articles/<id>/bookmark/
  toggleBookmark: async (articleId: number): Promise<{ bookmarked: boolean; bookmark_count: number }> => {
    return api.post(`/articles/${articleId}/bookmark/`, {});
  },

  // Share — POST /articles/<id>/share/
  shareArticle: async (articleId: number, platform = ''): Promise<{ shared: boolean; share_count: number }> => {
    return api.post(`/articles/${articleId}/share/`, { platform });
  },

  // Follow author toggle — POST /authors/<id>/follow/
  toggleFollow: async (authorId: number): Promise<{ following: boolean; follower_count: number }> => {
    return api.post(`/authors/${authorId}/follow/`, {});
  },

  // Get comments — GET /articles/<id>/comments/
  getComments: async (articleId: number) => {
    return api.get(`/articles/${articleId}/comments/`);
  },

  // Post comment — POST /articles/<id>/comments/
  postComment: async (articleId: number, content: string, parentId?: number) => {
    return api.post(`/articles/${articleId}/comments/`, {
      content,
      ...(parentId ? { parent: parentId } : {}),
    });
  },

  // Notifications
  getNotifications: async () => {
    return api.get('/notifications/');
  },

  markNotificationRead: async (notificationId: number) => {
    return api.post(`/notifications/${notificationId}/read/`, {});
  },
};

/** Returns true if a JWT access token is stored (user is logged in) */
export const isLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
};
