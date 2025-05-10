// src/types/Communication.ts
// --- NEW FILE ---

// Corresponds to backend Enums (ensure values match backend - likely uppercase)
export enum CommunicationType {
  // System Types
  CONFIRMATION = "CONFIRMATION",
  REMINDER = "REMINDER",
  CANCELLATION = "CANCELLATION",
  UPDATE = "UPDATE",
  CLIENT_CONFIRMATION = "CLIENT_CONFIRMATION",
  SYSTEM_ALERT = "SYSTEM_ALERT",
  // Manual Types
  MANUAL_EMAIL = "MANUAL_EMAIL",
  MANUAL_SMS = "MANUAL_SMS",
  MANUAL_PHONE = "MANUAL_PHONE",
  MANUAL_IN_PERSON = "MANUAL_IN_PERSON",
  MANUAL_VIRTUAL_MEETING = "MANUAL_VIRTUAL_MEETING",
  MANUAL_OTHER = "MANUAL_OTHER",
}

export enum CommunicationChannel {
  EMAIL = "EMAIL",
  SMS = "SMS",
  SYSTEM = "SYSTEM",
  PHONE = "PHONE",
  IN_PERSON = "IN_PERSON",
  VIRTUAL_MEETING = "VIRTUAL_MEETING",
  OTHER = "OTHER",
}

export enum CommunicationStatus {
  SIMULATED = "SIMULATED",
  SENT = "SENT",
  FAILED = "FAILED",
  DELIVERED = "DELIVERED",
  OPENED = "OPENED",
  CLICKED = "CLICKED",
  LOGGED = "LOGGED", // For manual logs
}

export enum CommunicationDirection {
  OUTBOUND = "OUTBOUND", // To Client
  INBOUND = "INBOUND",   // From Client
  SYSTEM = "SYSTEM",     // Internal/Admin
}

// Map channels relevant for MANUAL logging to labels
export const MANUAL_CHANNELS = [
  { value: CommunicationChannel.PHONE, label: "Phone Call" },
  { value: CommunicationChannel.EMAIL, label: "Email" },
  { value: CommunicationChannel.SMS, label: "SMS" },
  { value: CommunicationChannel.IN_PERSON, label: "In-Person" },
  { value: CommunicationChannel.VIRTUAL_MEETING, label: "Virtual Meeting" },
  { value: CommunicationChannel.OTHER, label: "Other" },
];

// Map directions relevant for MANUAL logging
export const MANUAL_DIRECTIONS = [
   { value: CommunicationDirection.OUTBOUND, label: "Outgoing (To Client)" },
   { value: CommunicationDirection.INBOUND, label: "Incoming (From Client)" },
];


// Corresponds to CommunicationsLogOut schema
export interface CommunicationLogOut {
  id: number;
  tenant_id: number;
  client_id: number | null;
  appointment_id: number | null;
  user_id: number | null; // User who logged/triggered
  type: CommunicationType;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  status: CommunicationStatus;
  timestamp: string; // ISO date string
  subject: string | null;
  notes: string | null;
  // Add user details if backend joins and includes them in response
  // user?: { id: number; name: string | null; email: string; };
}

// Corresponds to ManualLogCreate schema (Payload for POST /communications/manual)
export interface ManualLogCreatePayload {
  client_id: number;
  channel: CommunicationChannel; // Use enum values directly if possible, or strings matching backend
  direction: CommunicationDirection; // Use enum values directly if possible, or strings matching backend
  notes: string; // Required notes
  subject?: string | null;
  appointment_id?: number | null;
  timestamp?: string | null; // Optional ISO date string for backdating
}

// For paginated response from GET /clients/{client_id}/communications/
export interface PaginatedCommunicationsLogResponse {
  items: CommunicationLogOut[];
  total: number;
  page: number;
  limit: number;
}
