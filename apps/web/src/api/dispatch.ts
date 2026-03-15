import { api } from './client';
import type { ApiResponse } from './client';
import type { Sample } from './samples';

export interface DispatchReceiveRequest {
    sender: string;
    rfid_epc: string;
}

export const dispatchApi = {
    getPending: async (): Promise<ApiResponse<Sample[]>> => {
        const response = await api.get('/api/v1/dispatch/pending');
        return response.data;
    },

    receive: async (id: string, data: DispatchReceiveRequest): Promise<ApiResponse<Sample>> => {
        const response = await api.post(`/api/v1/dispatch/receive/${id}`, data);
        return response.data;
    }
};

export default dispatchApi;
