// src/types/User.ts
//import { Tenant } from './tenants';  Assuming you have a Tenant type

export interface UserProfile { // This is what useAuth might provide
    id: number;
    name: string;
    email: string;
    role: string; // 'staff', 'admin', 'super_admin'
    tenant_id: number | null; // Null if platform super_admin not tied to a tenant
    is_active: boolean;
    // Add other relevant fields from your backend UserOut if needed by frontend logic
    //tenant?: Partial<Tenant>;  Optional, if backend sometimes includes it
}

// Matches backend schemas.user.UserOut
export interface UserOut {
    id: number;
    name: string;
    email: string;
    role: string;
    tenant_id: number;
    is_active: boolean;
    activated_at?: string | null; // ISO date string
    created_at: string; // ISO date string
    updated_at: string; // ISO date string
    // created_by_user_id?: number | null; // If you send this from backend
}

// For PATCH /staff/{staff_user_id}/status
export interface UserStatusUpdatePayload {
    is_active: boolean;
}

// You likely have UserCreatePayload, UserUpdatePayload here too for userApi.ts
// export interface UserUpdatePayload {
// name?: string;
// email?: string;
// role?: string; // Be careful with allowing role changes
// is_active?: boolean; // Can also be part of general update
// }
export interface UserUpdatePayload {
    name?: string;
    email?: string;
    role?: string; // Be careful with allowing role changes
    is_active?: boolean; // Can also be part of general update
    // Add other fields as needed
}
