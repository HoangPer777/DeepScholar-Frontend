export interface AuthorProfile {
  id: number;
  author_code: string;
  full_name: string;
  affiliation?: string | null;
  bio?: string | null;
  total_score?: number;
  follower_count?: number;
  is_active: boolean;
}

export interface AuthUser {
  id: number;
  user_code: string;
  email: string;
  full_name: string;
  role: 'user' | 'author';
  provider?: 'local' | 'google' | 'facebook' | string;
  avatar_url?: string | null;
  author_profile?: AuthorProfile | null;
}

export interface BecomeAuthorPayload {
  author_name?: string;
  affiliation?: string;
  bio?: string;
  accepted_author_terms: boolean;
}

export interface BecomeAuthorResponse {
  detail: string;
  created: boolean;
  access: string;
  refresh: string;
  user: AuthUser;
}
