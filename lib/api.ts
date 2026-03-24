const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'API request failed');
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
