import { api, type ApiResponse } from '../api/client';

/**
 * Centralized API service following the Service Layer pattern
 * Eliminates duplicate fetch logic and provides type-safe API methods
 * Uses the existing axios client for consistency
 */

// ============= Types =============
export interface Sample {
  id: string;
  sample_id: string;
  sample_type: string;
  description: string;
  reference?: string;
  created_at: string;
  expected_return_date?: string | null;
  location?: Location;
  checkout_user?: User | null;
  inventory?: Inventory | null;
}

export interface Location {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export interface User {
  id: string;
  name: string;
  office: string;
  email?: string;
}

export interface Inventory {
  id: string;
  status: string;
  quantity: number;
  unit: string;
}

export interface Approval {
  id: string;
  sample_id: string;
  requester_id: string;
  approver_id: string;
  status: string;
  reason: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateSampleRequest {
  sample_type: string;
  description: string;
  reference?: string;
  location_id: string;
  user_id: string;
}

export interface UpdateSampleRequest {
  description?: string;
  reference?: string;
}

export interface CheckoutRequest {
  sampleId: string;
  locationId: string;
  userId: string;
  status: 'AT_STATION' | 'WITH_BUYER';
  notes?: string;
}

export interface CheckinRequest {
  sampleId: string;
  userId: string;
  notes?: string;
}

// ============= Sample Service =============
export class SampleService {
  private readonly basePath = '/api/v1/samples';

  async getAll(params?: {
    limit?: number;
    page?: number;
    type?: string;
    location_id?: string;
    status?: string;
  }): Promise<Sample[]> {
    const response = await api.get<ApiResponse<Sample[]>>(this.basePath, { params });
    return response.data.data;
  }

  async getById(id: string): Promise<Sample> {
    const response = await api.get<ApiResponse<Sample>>(`${this.basePath}/${id}`);
    return response.data.data;
  }

  async create(data: CreateSampleRequest): Promise<Sample> {
    const response = await api.post<ApiResponse<Sample>>(this.basePath, data);
    return response.data.data;
  }

  async update(id: string, data: UpdateSampleRequest): Promise<Sample> {
    const response = await api.patch<ApiResponse<Sample>>(`${this.basePath}/${id}`, data);
    return response.data.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  async printLabel(id: string): Promise<{ zpl: string }> {
    const response = await api.post<ApiResponse<{ zpl: string }>>(`${this.basePath}/${id}/print`);
    return response.data.data;
  }
}

// ============= Location Service =============
export class LocationService {
  private readonly basePath = '/api/v1/locations';

  async getAll(params?: { limit?: number; is_active?: boolean }): Promise<Location[]> {
    const response = await api.get<ApiResponse<{ items: Location[] }>>(this.basePath, { params });
    return response.data.data.items || [];
  }

  async getById(id: string): Promise<Location> {
    const response = await api.get<ApiResponse<Location>>(`${this.basePath}/${id}`);
    return response.data.data;
  }

  async create(data: Partial<Location>): Promise<Location> {
    const response = await api.post<ApiResponse<Location>>(this.basePath, data);
    return response.data.data;
  }

  async update(id: string, data: Partial<Location>): Promise<Location> {
    const response = await api.patch<ApiResponse<Location>>(`${this.basePath}/${id}`, data);
    return response.data.data;
  }
}

// ============= Inventory Service =============
export class InventoryService {
  private readonly basePath = '/api/v1/inventory';

  async checkout(data: CheckoutRequest): Promise<void> {
    await api.patch(`${this.basePath}/checkout`, data);
  }

  async checkin(data: CheckinRequest): Promise<void> {
    await api.patch(`${this.basePath}/checkin`, data);
  }

  async getHistory(sampleId: string): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>(`${this.basePath}/history/${sampleId}`);
    return response.data.data;
  }
}

// ============= Approval Service =============
export class ApprovalService {
  private readonly basePath = '/api/v1/approvals';

  async getAll(sampleId?: string): Promise<Approval[]> {
    const response = await api.get<ApiResponse<Approval[]>>(this.basePath, {
      params: { sample_id: sampleId }
    });
    return response.data.data;
  }

  async create(data: Partial<Approval>): Promise<Approval> {
    const response = await api.post<ApiResponse<Approval>>(this.basePath, data);
    return response.data.data;
  }

  async update(id: string, data: Partial<Approval>): Promise<Approval> {
    const response = await api.patch<ApiResponse<Approval>>(`${this.basePath}/${id}`, data);
    return response.data.data;
  }

  async approve(id: string, notes?: string): Promise<void> {
    await api.post(`${this.basePath}/${id}/approve`, { notes });
  }

  async reject(id: string, notes?: string): Promise<void> {
    await api.post(`${this.basePath}/${id}/reject`, { notes });
  }
}

// ============= Singleton Instances =============
export const sampleService = new SampleService();
export const locationService = new LocationService();
export const inventoryService = new InventoryService();
export const approvalService = new ApprovalService();

/**
 * Helper function to download a file from blob data
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Helper function to handle API errors consistently
 */
export function handleApiError(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
