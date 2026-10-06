import { api } from '../lib/api';
import type { BecomeAuthorPayload, BecomeAuthorResponse } from '../types/auth';

const storeSession = (response: { user?: unknown }) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    if (response.user) localStorage.setItem('user', JSON.stringify(response.user));
};

export const authService = {
    login: async (credentials: any) => {
        const response = await api.post('/auth/login', credentials);
        storeSession(response);
        return response;
    },

    register: async (userData: any) => {
        const response = await api.post('/auth/register', userData);
        return response;
    },

    googleLogin: async (id_token: string) => {
        const response = await api.post('/auth/google', { id_token });
        storeSession(response);
        return response;
    },

    facebookLogin: async (access_token: string) => {
        const response = await api.post('/auth/facebook', { access_token });
        storeSession(response);
        return response;
    },

    forgotPassword: async (email: string) => {
        const response = await api.post('/auth/password-reset', { email });
        return response;
    },

    resetPassword: async (data: any) => {
        const response = await api.post('/auth/password-reset-confirm', data);
        return response;
    },

    becomeAuthor: async (payload: BecomeAuthorPayload): Promise<BecomeAuthorResponse> => {
        const response = await api.post('/auth/become-author', payload) as BecomeAuthorResponse;
        storeSession(response);
        return response;
    },

    logout: async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'same-origin',
            });
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
        }
    }
};
