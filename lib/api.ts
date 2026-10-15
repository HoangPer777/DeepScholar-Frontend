// In browser: use proxy route to avoid mixed-content (http backend behind https Vercel)
// On server: call backend directly
const BASE_URL = typeof window === 'undefined'
  ? (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1')
  : '/api/proxy';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    // Remove legacy bearer tokens; authorization now comes from the HttpOnly cookie.
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        const current = `${window.location.pathname}${window.location.search}`;
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign(`/login?next=${encodeURIComponent(current)}`);
        }
      }
    }
    
    throw new ApiError(
      errorData.detail || 'API request failed',
      response.status,
      errorData.error_code || errorData.code,
    );
  }

  return response;
};

export const api = {
  get: (endpoint: string, options?: RequestInit) => 
    fetchWithAuth(endpoint, { ...options, method: 'GET' }).then(res => res.json()),
    
  post: (endpoint: string, data: any, options?: RequestInit) => 
    fetchWithAuth(endpoint, { 
      ...options, 
      method: 'POST', 
      body: JSON.stringify(data)
    }).then(res => res.json()),
    
  put: (endpoint: string, data: any, options?: RequestInit) => 
    fetchWithAuth(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: JSON.stringify(data)
    }).then(res => res.json()),
    
  patch: (endpoint: string, data: any, options?: RequestInit) => 
    fetchWithAuth(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: JSON.stringify(data)
    }).then(res => res.json()),
    
  delete: (endpoint: string, options?: RequestInit) => 
    fetchWithAuth(endpoint, { ...options, method: 'DELETE' }).then(res => res.json()),
};
