export interface RankedAuthor {
  rank: number;
  id: number;
  author_code: string;
  full_name: string;
  affiliation: string | null;
  avatar_url: string | null;
  article_count: number;
  like_count: number;
  commenter_count: number;
  total_score: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
