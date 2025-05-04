// src/types/Template.ts
// --- NEW FILE or Add to existing types ---

// Corresponds to the TemplateEventTrigger Enum in the backend
export enum TemplateEventTrigger {
  APPOINTMENT_BOOKED_CLIENT = "APPOINTMENT_BOOKED_CLIENT",
    APPOINTMENT_BOOKED_ADMIN = "APPOINTMENT_BOOKED_ADMIN",
    APPOINTMENT_REMINDER_CLIENT = "APPOINTMENT_REMINDER_CLIENT",
    APPOINTMENT_CANCELLED_CLIENT = "APPOINTMENT_CANCELLED_CLIENT",
    APPOINTMENT_CANCELLED_ADMIN = "APPOINTMENT_CANCELLED_ADMIN",
    APPOINTMENT_UPDATED_CLIENT = "APPOINTMENT_UPDATED_CLIENT",
    APPOINTMENT_UPDATED_ADMIN = "APPOINTMENT_UPDATED_ADMIN",
    CLIENT_CONFIRMATION = "CLIENT_CONFIRMATION"
}


// Corresponds to the TemplateType Enum
export enum TemplateType {
  EMAIL = "EMAIL",
  // SMS = "sms", // Add when needed
}

// Corresponds to TemplateOut schema
export interface TemplateOut {
  id: number;
  tenant_id: number;
  name: string;
  type: TemplateType;
  event_trigger: TemplateEventTrigger;
  email_subject: string | null;
  email_body: string;
  is_default_template: boolean;
  is_active: boolean;
  created_at: string; // Dates usually come as ISO strings
  updated_at: string;
}

// Corresponds to TemplateCreate schema
export interface TemplateCreatePayload {
  name: string;
  type?: TemplateType; // Optional if backend defaults
  event_trigger: TemplateEventTrigger;
  email_subject?: string | null;
  email_body: string;
  is_active?: boolean; // Optional if backend defaults
}

// Corresponds to TemplateUpdate schema
export interface TemplateUpdatePayload {
  name?: string;
  email_subject?: string | null;
  email_body?: string;
  is_active?: boolean;
}


// Helper for display names
export const TEMPLATE_TRIGGER_LABELS: Record<TemplateEventTrigger, string> = {
  [TemplateEventTrigger.APPOINTMENT_BOOKED_CLIENT]: "Appointment Booked (Client)",
  [TemplateEventTrigger.APPOINTMENT_BOOKED_ADMIN]: "Appointment Booked (Admin)",
  [TemplateEventTrigger.APPOINTMENT_REMINDER_CLIENT]: "Appointment Reminder (Client)",
  [TemplateEventTrigger.APPOINTMENT_CANCELLED_CLIENT]: "Appointment Cancelled (Client)",
  [TemplateEventTrigger.APPOINTMENT_CANCELLED_ADMIN]: "Appointment Cancelled (Admin)",
  [TemplateEventTrigger.APPOINTMENT_UPDATED_CLIENT]: "Appointment Updated (Client)",
  [TemplateEventTrigger.APPOINTMENT_UPDATED_ADMIN]: "Appointment Updated (Admin)",
  [TemplateEventTrigger.CLIENT_CONFIRMATION]: "Client Email Confirmation",
};

// Placeholders (customize these based on available context data in backend)
export const EMAIL_PLACEHOLDERS: { placeholder: string; description: string }[] = [
  { placeholder: "{{client_name}}", description: "Client's full name" },
  { placeholder: "{{client_first_name}}", description: "Client's first name" },
  { placeholder: "{{client_email}}", description: "Client's email address" },
  { placeholder: "{{appointment_time}}", description: "Formatted appointment date and time" },
  { placeholder: "{{appointment_date}}", description: "Formatted appointment date" },
  { placeholder: "{{appointment_start_time}}", description: "Formatted appointment start time" },
  { placeholder: "{{service_names}}", description: "Comma-separated list of service names" },
  { placeholder: "{{business_name}}", description: "Your business name" },
  { placeholder: "{{business_contact_email}}", description: "Your business contact email" },
  { placeholder: "{{business_contact_phone}}", description: "Your business contact phone" },
  { placeholder: "{{confirmation_link}}", description: "Link for client to confirm account (specific templates)" },
  { placeholder: "{{cancellation_link}}", description: "Link for client to cancel appointment (specific templates)" },
  // Add more as needed
];
