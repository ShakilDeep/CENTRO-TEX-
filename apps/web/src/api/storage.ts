import { api } from './client';
import type { ApiResponse } from './client';
import type { Sample } from './samples';

export interface StorageLocation {
    id: string;
    rack: string;
    shelf: string;
    bin_id: string;
    max_capacity: number;
    current_count: number;
    sample_type_affinity?: string | null;
    is_active?: boolean;
    samples?: Sample[];
}

export interface StoreSampleRequest {
    rfid_epc?: string;
    location_id: string;
}

export const storageApi = {
    store: async (id: string, data: StoreSampleRequest): Promise<ApiResponse<Sample>> => {
        const response = await api.post(`/api/v1/storage/store/${id}`, data);
        return response.data;
    },

    suggestLocation: async (sampleType?: string): Promise<ApiResponse<StorageLocation | null>> => {
        const response = await api.get('/api/v1/storage/suggest', { params: { sampleType } });
        return response.data;
    },

    getLocations: async (): Promise<ApiResponse<StorageLocation[]>> => {
        const response = await api.get('/api/v1/storage/locations');
        return response.data;
    }
};

export default storageApi;
