/**
 * Data Transfer Objects for Sample operations
 * Provides type safety and validation for API inputs/outputs
 */

export interface CreateSampleDto {
  buyer_id: string;
  sample_type: 'Proto' | 'Fit' | 'Size Set' | 'PP' | 'Shipment';
  description: string;
  photo_url?: string;
  created_by: string;
}

export interface UpdateSampleDto {
  description?: string;
  photo_url?: string;
  notes?: string;
}

export interface SampleResponseDto {
  id: string;
  sample_id: string;
  buyer: {
    id: string;
    name: string;
  };
  sample_type: string;
  description: string;
  photo_url?: string;
  current_status: string;
  current_owner: {
    id: string;
    name: string;
    email: string;
  };
  rfid_epc?: string;
  storage_location?: {
    rack: string;
    shelf: string;
    bin_id: string;
  };
  created_at: Date;
  updated_at: Date;
}

export interface CheckInDto {
  sample_id: string;
  user_id: string;
  location_id: string;
  notes?: string;
}

export interface CheckOutDto {
  sample_id: string;
  user_id: string;
  location_id: string;
  notes?: string;
}

export interface ReceiveSampleDto {
  sender: string;
  rfid_epc: string;
}

export interface TransferSampleDto {
  sample_id: string;
  from_user_id: string;
  to_user_id: string;
  reason: string;
}

/**
 * Validation schemas using a simple validator
 */
export class SampleDtoValidator {
  static validateCreateSample(data: any): CreateSampleDto {
    if (!data.buyer_id || typeof data.buyer_id !== 'string') {
      throw new Error('Valid buyer_id is required');
    }
    
    const validTypes = ['Proto', 'Fit', 'Size Set', 'PP', 'Shipment'];
    if (!data.sample_type || !validTypes.includes(data.sample_type)) {
      throw new Error('Valid sample_type is required');
    }
    
    if (!data.description || typeof data.description !== 'string') {
      throw new Error('Description is required');
    }
    
    return data as CreateSampleDto;
  }

  static validateUpdateSample(data: any): UpdateSampleDto {
    const dto: UpdateSampleDto = {};
    
    if (data.description !== undefined) {
      if (typeof data.description !== 'string') {
        throw new Error('Description must be a string');
      }
      dto.description = data.description;
    }
    
    if (data.photo_url !== undefined) {
      if (typeof data.photo_url !== 'string') {
        throw new Error('Photo URL must be a string');
      }
      dto.photo_url = data.photo_url;
    }
    
    if (data.notes !== undefined) {
      if (typeof data.notes !== 'string') {
        throw new Error('Notes must be a string');
      }
      dto.notes = data.notes;
    }
    
    return dto;
  }
}