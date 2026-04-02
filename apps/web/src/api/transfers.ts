import { api } from './client';
import type { ApiResponse } from './client';
import type { Sample } from './samples';

export interface TransferInitiateRequest {
    to_user_id: string;
    rfid_epc?: string;
    reason: string;
}

export interface Transfer {
    id: string;
    sample_id: string;
    status: string;
    reason: string;
    created_at: string;
    from_user: { name: string; email: string };
    sample: { sample_id: string; sample_type: string; description: string };
}

export const transfersApi = {
    initiate: async (id: string, data: TransferInitiateRequest): Promise<ApiResponse<any>> => {
        const response = await api.post(`/api/v1/transfers/initiate/${id}`, data);
        return response.data;
    },

    accept: async (transferId: string): Promise<ApiResponse<Sample>> => {
        const response = await api.post(`/api/v1/transfers/accept/${transferId}`);
        return response.data;
    },

    reject: async (transferId: string): Promise<ApiResponse<Sample>> => {
        const response = await api.post(`/api/v1/transfers/reject/${transferId}`);
        return response.data;
    },

    getPending: async (): Promise<ApiResponse<Transfer[]>> => {
        const response = await api.get('/api/v1/transfers/pending');
        return response.data;
    }
};

export default transfersApi;
