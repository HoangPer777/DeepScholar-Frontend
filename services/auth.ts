import { api } from '../lib/api';

export const authService = {
    login: async (credentials: any) => {
        const response = await api.post('/auth/login/', credentials);
        if (response.access) {
            localStorage.setItem('access_token', response.access);
            localStorage.setItem('refresh_token', response.refresh);
            localStorage.setItem('user', JSON.stringify(response.user));
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
            localStorage.setItem('access_token', response.access);
            localStorage.setItem('refresh_token', response.refresh);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
        return response;
    },

    facebookLogin: async (access_token: string) => {
        const response = await api.post('/auth/facebook/', { access_token });
        if (response.access) {
            localStorage.setItem('access_token', response.access);
            localStorage.setItem('refresh_token', response.refresh);
            localStorage.setItem('user', JSON.stringify(response.user));
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

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    }
};
