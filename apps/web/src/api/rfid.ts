import { api } from './client';
import type { ApiResponse } from './client';

export interface RfidValidationResult {
    valid: boolean;
    status: string;
    current_sample: string | null;
    message: string;
}

export const rfidApi = {
    validate: async (epc: string): Promise<ApiResponse<RfidValidationResult>> => {
        const response = await api.post('/api/v1/rfid/validate', { epc });
        return response.data;
    },

    getTags: async (): Promise<ApiResponse<any[]>> => {
        const response = await api.get('/api/v1/rfid/tags');
        return response.data;
    },

    createTag: async (epc: string, status?: string): Promise<ApiResponse<any>> => {
        const response = await api.post('/api/v1/rfid/tags', { epc, status });
        return response.data;
    },

    updateTagStatus: async (epc: string, status: string): Promise<ApiResponse<any>> => {
        const response = await api.patch(`/api/v1/rfid/tags/${epc}`, { status });
        return response.data;
    }
};

export default rfidApi;
