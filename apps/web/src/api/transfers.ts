import { api } from './client';
import type { ApiResponse } from './client';
import type { Sample } from './samples';

// ─── Request Types ─────────────────────────────────────────────────────────

export interface TransferInitiateRequest {
    to_user_id: string;
    rfid_epc?: string;
    reason: string;
}

// ─── Response Types ────────────────────────────────────────────────────────

/** A pending incoming transfer — shown to the RECIPIENT (to_user) */
export interface Transfer {
    id: string;
    sample_id: string;
    status: string;
    reason: string;
    created_at: string;
    from_user: { name: string; email: string };
    sample: { sample_id: string; sample_type: string; description: string };
}

/** A pending outgoing pull request — shown to the OWNER (from_user) */
export interface OutgoingTransfer {
    id: string;
    sample_id: string;
    status: string;
    reason: string;
    created_at: string;
    to_user: { name: string; email: string; role: string };
    sample: {
        id: string;
        sample_id: string;
        sample_type: string;
        description: string;
        current_status: string;
        rfid_epc?: string;
    };
}

// ─── API Methods ───────────────────────────────────────────────────────────

export const transfersApi = {
    /**
     * Initiate a PUSH transfer — current user sends a sample to another user.
     * The recipient must accept/reject.
     */
    initiate: async (id: string, data: TransferInitiateRequest): Promise<ApiResponse<any>> => {
        const response = await api.post(`/api/v1/transfers/initiate/${id}`, data);
        return response.data;
    },

    /**
     * Accept an INCOMING transfer — recipient confirms they want the sample.
     */
    accept: async (transferId: string): Promise<ApiResponse<Sample>> => {
        const response = await api.post(`/api/v1/transfers/accept/${transferId}`);
        return response.data;
    },

    /**
     * Reject an INCOMING transfer — recipient declines.
     */
    reject: async (transferId: string): Promise<ApiResponse<Sample>> => {
        const response = await api.post(`/api/v1/transfers/reject/${transferId}`);
        return response.data;
    },

    /**
     * List INCOMING pending transfers — transfers directed TO the current user.
     * Used in the Merchandiser journey to show the Accept/Reject popup.
     */
    getPending: async (): Promise<ApiResponse<Transfer[]>> => {
        const response = await api.get('/api/v1/transfers/pending');
        return response.data;
    },

    /**
     * Pull Request Transfer — Locator/Requester wants a sample from its current owner.
     * Creates a pending transfer FROM owner TO requester that the owner must confirm.
     * Triggers the "Received — Yes or No?" popup for the owner.
     */
    pullRequest: async (sampleId: string, reason: string): Promise<ApiResponse<any>> => {
        const response = await api.post(`/api/v1/transfers/pull-request/${sampleId}`, { reason });
        return response.data;
    },

    /**
     * Get OUTGOING pending pull requests — transfers created by others FROM the current user.
     * The Merchandiser uses this to see who is requesting their samples.
     */
    getOutgoingPending: async (): Promise<ApiResponse<OutgoingTransfer[]>> => {
        const response = await api.get('/api/v1/transfers/outgoing-pending');
        return response.data;
    },

    /**
     * Confirm Handover — The owner responds to a pull request.
     * confirmed=true  → "Received Yes" — sample ownership moves to requester.
     * confirmed=false → "Received No"  — request declined, sample stays.
     */
    confirmHandover: async (transferId: string, confirmed: boolean): Promise<ApiResponse<any>> => {
        const response = await api.post(`/api/v1/transfers/confirm-handover/${transferId}`, { confirmed });
        return response.data;
    }
};

export default transfersApi;
