// src/types/Invitation.ts
// This file contains TypeScript interfaces and types related to invitations.

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface InvitationBase {
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    role_to_assign: string; // e.g., "staff", "admin"
}

export interface InvitationCreatePayload extends InvitationBase {
    // tenant_id is handled by backend context
}


export interface InvitationAcceptPayload {
    token: string;
    first_name: string;
    last_name: string;
    password: string;
}

export interface InvitationOut extends InvitationBase {
    id: number;
    tenant_id: number;
    status: InvitationStatus;
    token_expiry: string; // ISO date string
    invited_by_user_id: number;
    accepted_by_user_id?: number | null;
    created_at: string; // ISO date string
    updated_at: string; // ISO date string
}

// For the GET /staff/invitations/validate-token endpoint
export interface ValidateTokenResponse {
    valid: boolean;
    email?: string;
    first_name?: string | null;
    last_name?: string | null;
    role?: string; // Role assigned in the invitation
    error_code?: 'EXPIRED' | 'NOT_FOUND' | 'ALREADY_ACCEPTED' | 'CANCELLED' | 'INVALID_STATUS';
    message?: string;
}
