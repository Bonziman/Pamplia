// src/types/Auth.ts
import { UserOut } from './User'; // Assuming UserOut is defined in src/types/User.ts

// This interface should match the response from your backend's
// login endpoint and the POST /staff/invitations/accept endpoint.
export interface TokenUserResponse {
    access_token: string;
    token_type: string; // Typically "bearer"
    user: UserOut;       // The authenticated user's profile details
}

// You might also have a simpler Token response if some endpoints only return a token
export interface TokenResponse {
    access_token: string;
    token_type: string;
}

// If you decode the JWT on the frontend (less common with HttpOnly cookies, but possible)
// This would be the structure of the decoded payload.
export interface DecodedToken {
    sub: string; // Subject (usually email or user ID)
    user_id: number;
    tenant_id: number | null;
    role: string;
    exp: number; // Expiration timestamp
    iat?: number; // Issued at timestamp
}
