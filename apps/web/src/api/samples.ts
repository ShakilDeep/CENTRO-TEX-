import { api } from './client';
import type { ApiResponse } from './client';

export interface Sample {
  id: string;
  sample_id: string;
  buyer_id: string;
  sample_type: string;
  description: string;
  current_status: string;
  rfid_epc?: string;
  sender_origin?: string;
  receiver_name?: string;
  purpose?: string;
  assigned_merchandiser_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  current_owner_id?: string;
  buyer?: { name: string };
  current_owner?: { id?: string; name: string; email: string };
  storage_location?: { id: string; rack: string; shelf: string; bin_id: string };
  movements?: any[];
}

export interface CreateSampleRequest {
  buyer_id: string;
  sample_type: string;
  description: string;
  photo_url?: string;
}

export interface DisposeSampleRequest {
  rfid_epc: string;
  reason: string;
  comment?: string;
}

export const samplesApi = {
  list: async (filters: any = {}): Promise<ApiResponse<Sample[]>> => {
    const response = await api.get('/api/v1/samples', { params: filters });
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<Sample>> => {
    const response = await api.get(`/api/v1/samples/${id}`);
    return response.data;
  },

  create: async (data: CreateSampleRequest): Promise<ApiResponse<Sample>> => {
    const response = await api.post('/api/v1/samples', data);
    return response.data;
  },

  merchandiserReceive: async (id: string, rfid_epc: string): Promise<ApiResponse<Sample>> => {
    const response = await api.post(`/api/v1/samples/${id}/receive`, { rfid_epc });
    return response.data;
  },

  dispose: async (id: string, data: DisposeSampleRequest): Promise<ApiResponse<Sample>> => {
    const response = await api.post(`/api/v1/samples/${id}/dispose`, data);
    return response.data;
  },

  getMovements: async (id: string): Promise<ApiResponse<any[]>> => {
    const response = await api.get(`/api/v1/samples/${id}/movements`);
    return response.data;
  },

  encode: async (id: string, rfid_epc: string): Promise<ApiResponse<Sample>> => {
    const response = await api.post(`/api/v1/samples/${id}/encode`, { rfid_epc });
    return response.data;
  }
};

export default samplesApi;