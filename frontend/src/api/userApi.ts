// src/api/userApi.ts
import axios from "axios";
import axiosInstance from "./axiosInstance";
import { buildApiUrl } from "./apiBase";
import { PaginatedResponse } from "../types/Pagination";
import { UserOut, UserUpdatePayload } from "../types/User";

export type FetchUsersParams = {
  page?: number;
  limit?: number;
  role?: string;
  is_active?: boolean;
  tenant_id_filter?: number;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: string;
  tenant_id: number;
};

export const fetchUsers = async (params: FetchUsersParams): Promise<PaginatedResponse<UserOut>> => {
  try {
    const apiUrl = buildApiUrl("/users/");
    const response = await axiosInstance.get<PaginatedResponse<UserOut>>(apiUrl, {
      params: {
        page: params.page,
        limit: params.limit,
        role: params.role,
        is_active: params.is_active,
        tenantId: params.tenant_id_filter,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", error.message);
    }
    throw error;
  }
};

export const updateUser = async (id: number, userData: UserUpdatePayload): Promise<UserOut> => {
  try {
    const apiUrl = buildApiUrl(`/users/update/${id}`);
    const response = await axiosInstance.patch<UserOut>(apiUrl, userData);
    return response.data;
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    throw error;
  }
};

export const createUser = async (payload: CreateUserPayload): Promise<UserOut> => {
  try {
    const apiUrl = buildApiUrl("/users/");
    const response = await axiosInstance.post<UserOut>(apiUrl, payload);
    return response.data;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const resetUserPassword = async (id: number, password: string): Promise<void> => {
  try {
    const apiUrl = buildApiUrl(`/users/${id}/reset-password`);
    await axiosInstance.patch(apiUrl, { password });
  } catch (error) {
    console.error(`Error resetting password for user ${id}:`, error);
    throw error;
  }
};
