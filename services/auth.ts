import { api } from '../lib/api';
import type { BecomeAuthorPayload, BecomeAuthorResponse } from '../types/auth';

const storeSession = (response: { access?: string; refresh?: string; user?: unknown }) => {
    if (!response.access) return;
    localStorage.setItem('access_token', response.access);
    if (response.refresh) localStorage.setItem('refresh_token', response.refresh);
    if (response.user) localStorage.setItem('user', JSON.stringify(response.user));
};

export const authService = {
    login: async (credentials: any) => {
        const response = await api.post('/auth/login/', credentials);
        if (response.access) {
            storeSession(response);
        }
        return response;
    },

    register: async (userData: any) => {
        const response = await api.post('/auth/register/', userData);
        return response;
    },

    googleLogin: async (id_token: string) => {
        const response = await api.post('/auth/google/', { id_token });
        if (response.access) {
            storeSession(response);
        }
        return response;
    },

    facebookLogin: async (access_token: string) => {
        const response = await api.post('/auth/facebook/', { access_token });
        if (response.access) {
            storeSession(response);
        }
        return response;
    },

    forgotPassword: async (email: string) => {
        const response = await api.post('/auth/password-reset/', { email });
        return response;
    },

    resetPassword: async (data: any) => {
        const response = await api.post('/auth/password-reset-confirm/', data);
        return response;
    },

    becomeAuthor: async (payload: BecomeAuthorPayload): Promise<BecomeAuthorResponse> => {
        const response = await api.post('/auth/become-author/', payload) as BecomeAuthorResponse;
        storeSession(response);
        return response;
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    }
};
