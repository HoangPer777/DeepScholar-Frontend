import { api } from '@/lib/api';
import type { PaginatedResponse, RankedAuthor } from '@/types/ranking';

export const rankingService = {
  list: (page = 1, pageSize = 20, search = ''): Promise<PaginatedResponse<RankedAuthor>> => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (search.trim()) params.set('search', search.trim());
    return api.get(`/authors/ranking/?${params.toString()}`);
  },
  top: (): Promise<PaginatedResponse<RankedAuthor>> =>
    api.get('/authors/ranking/?page=1&page_size=3'),
};
