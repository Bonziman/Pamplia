// src/api/staffApi.ts
import axiosInstance from './axiosInstance';
import { buildApiUrl } from './apiBase';
import {
    InvitationCreatePayload,
    InvitationAcceptPayload,
    InvitationOut,
    ValidateTokenResponse, // From our previous definition
} from '../types/Invitation'; // Assuming types are in src/types/
import { PaginatedResponse } from '../types/Pagination'; // Assuming general pagination type
import { UserOut, UserStatusUpdatePayload } from '../types/User'; // Assuming types
import { TokenUserResponse } from '../types/Auth'; // Assuming types

/**
 * Invites a new staff member.
 * POST /staff/invitations
 */
export const inviteStaff = async (payload: InvitationCreatePayload): Promise<InvitationOut> => {
    const apiUrl = buildApiUrl("/staff/invitations"); // Use backend port 8000
  // Ensure payload object sent to backend doesn't have tenant_id
  // This is handled by backend context
  const response = await axiosInstance.post<InvitationOut>(apiUrl, payload);
    return response.data;
};

/**
 * Validates an invitation token before showing the accept form.
 * GET /staff/invitations/validate-token
 */
export const validateInvitationToken = async (token: string): Promise<ValidateTokenResponse> => {
    const apiUrl = buildApiUrl("/staff/invitations/validate-token"); // Use backend port 8000
    const response = await axiosInstance.get<ValidateTokenResponse>(apiUrl, {
        params: { token }
    });
    return response.data;
};

/**
 * Accepts a staff invitation and creates the user account.
 * POST /staff/invitations/accept
 */
export const acceptInvitation = async (payload: InvitationAcceptPayload): Promise<TokenUserResponse> => {
    const apiUrl = buildApiUrl("/staff/invitations/accept"); // Use backend port 8000
    const response = await axiosInstance.post<TokenUserResponse>(apiUrl, payload);
    return response.data;
};

/**
 * Lists invitations for the current tenant.
 * GET /staff/invitations
 */
export interface ListInvitationsParams {
    page?: number;
    limit?: number;
    status?: 'pending' | 'accepted' | 'expired' | 'cancelled'; // Matches InvitationStatusEnum values
}
export const listInvitations = async (
    params: ListInvitationsParams = {}
): Promise<PaginatedResponse<InvitationOut>> => {
    const apiUrl = buildApiUrl("/staff/invitations");
    const response = await axiosInstance.get<PaginatedResponse<InvitationOut>>(apiUrl, { params });
    return response.data;
};

/**
 * Resends a pending staff invitation.
 * POST /staff/invitations/{invitationId}/resend
 */
export const resendStaffInvitation = async (invitationId: number): Promise<InvitationOut> => {
    const apiUrl = buildApiUrl(`/staff/invitations/${invitationId}/resend`); // Use backend port 8000
    const response = await axiosInstance.post<InvitationOut>(apiUrl);
    return response.data;
};

/**
 * Cancels a pending staff invitation.
 * DELETE /staff/invitations/{invitationId}
 */
export const cancelStaffInvitation = async (invitationId: number): Promise<void> => {
    const apiUrl = buildApiUrl(`/staff/invitations/${invitationId}`); // Use backend port 8000
    await axiosInstance.delete(apiUrl);
};


/**
 * Updates the active status of a staff member.
 * PATCH /staff/{staffUserId}/status
 * This assumes UserStatusUpdatePayload is { is_active: boolean }
 */
export const updateStaffStatus = async (staffUserId: number, payload: UserStatusUpdatePayload): Promise<UserOut> => {
    const apiUrl = buildApiUrl(`/staff/${staffUserId}/status`); // Use backend port 8000
    const response = await axiosInstance.patch<UserOut>(apiUrl, payload);
    return response.data;
};

// Note: General staff detail updates (like name) would still go through userApi.ts's updateUser function
// if PATCH /users/update/{user_id} handles those.
