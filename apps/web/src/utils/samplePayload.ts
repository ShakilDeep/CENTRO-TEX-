export interface CreateSampleFormData {
  buyer_id: string;
  sample_type: string;
  description: string;
  photo_url?: string;
  factory_id?: string;
  assigned_merchandiser_id?: string;
  purpose?: string;
  sender_origin?: string;
  receiver_name?: string;
}

/** Strip empty optional fields so the API validator does not reject them. */
export function buildCreateSamplePayload(form: CreateSampleFormData): Record<string, string> {
  const payload: Record<string, string> = {
    buyer_id: form.buyer_id,
    sample_type: form.sample_type,
    description: form.description,
  };

  if (form.assigned_merchandiser_id) payload.assigned_merchandiser_id = form.assigned_merchandiser_id;
  if (form.purpose) payload.purpose = form.purpose;
  if (form.factory_id) payload.factory_id = form.factory_id;
  if (form.photo_url) payload.photo_url = form.photo_url;
  if (form.sender_origin) payload.sender_origin = form.sender_origin;
  if (form.receiver_name) payload.receiver_name = form.receiver_name;

  return payload;
}
