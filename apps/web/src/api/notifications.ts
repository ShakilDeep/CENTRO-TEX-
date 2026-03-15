import { api } from './client';
import type { ApiResponse } from './client';

export interface Notification {
    id: string;
    user_id: string;
    sample_id?: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    read_at?: string;
    created_at: string;
}

export const notificationsApi = {
    list: async (): Promise<ApiResponse<Notification[]>> => {
        const response = await api.get('/api/v1/notifications');
        return response.data;
    },

    getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
        const response = await api.get('/api/v1/notifications/unread-count');
        return response.data;
    },

    markAsRead: async (id: string): Promise<ApiResponse<Notification>> => {
        const response = await api.put(`/api/v1/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async (): Promise<ApiResponse<void>> => {
        const response = await api.put('/api/v1/notifications/read-all');
        return response.data;
    }
};

export default notificationsApi;
