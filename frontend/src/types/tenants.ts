// src/types/Tenant.ts

export interface TimeInterval {
  start: string; // Format "HH:MM" (24-hour)
  end: string;   // Format "HH:MM" (24-hour)
}

// Represents the configuration for a single day
export interface DayHours {
  isOpen: boolean;
  // Using an array allows for future features like split shifts/breaks.
  // For this UI, we'll primarily work with the first interval.
  intervals: TimeInterval[];
}

// The overall structure stored in the Tenant model's JSON field
export type BusinessHoursConfig = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

// Corresponds to the TenantOut Pydantic schema (data received from API)
export interface TenantOut {
  id: number;
  name: string; // Required in TenantOut
  subdomain: string; // Required in TenantOut

  logo_url: string | null;
  slogan: string | null;
  website_url: string | null;

  contact_email: string | null;
  contact_phone: string | null;

  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal_code: string | null;
  address_country: string | null;

  timezone: string; // Required (has default)
  default_currency: string; // Required (has default)

  is_active: boolean;

  cancellation_policy_text: string | null;

  // Represent JSON fields as appropriate TypeScript types
  // Using `Record<string, any>` for maximum flexibility initially
  // Alternatively, define more specific types if the structure is known
  business_hours_config: BusinessHoursConfig | null;
  booking_widget_config: Record<string, any> | null;
  reminder_interval_hours: number | null;

  billing_plan: string | null;
  billing_status: string | null;
  last_paid_at: string | null;
  next_due_at: string | null;
  billing_notes: string | null;

  // Note: Relationships like users, services, etc., are usually not included
  // in the basic TenantOut schema unless specifically requested/needed.
}

// Corresponds to the TenantUpdate Pydantic schema (data sent to API for PATCH)
// All fields are optional. Only include fields that ARE updatable.
export interface TenantUpdate {
  name?: string; // Usually updatable, maybe restricted by role
  subdomain?: string;

  logo_url?: string | null;
  slogan?: string | null;
  website_url?: string | null;

  contact_email?: string | null;
  contact_phone?: string | null;

  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;

  timezone?: string;
  default_currency?: string; // Ensure only valid 3-char codes are sent

  is_active?: boolean;

  cancellation_policy_text?: string | null;

  // You might allow updating these JSON fields entirely or partially
  business_hours_config?: BusinessHoursConfig | null;
  booking_widget_config?: Record<string, any> | null;
  reminder_interval_hours?: number | null;

  billing_plan?: string | null;
  billing_status?: string | null;
  last_paid_at?: string | null;
  next_due_at?: string | null;
  billing_notes?: string | null;
}

export interface TenantPaymentRecord {
  id: number;
  tenant_id: number;
  created_by_user_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  paid_at: string;
  period_start: string;
  period_end: string;
  notes: string | null;
}

export interface TenantPaymentRecordCreate {
  amount: number;
  currency?: string;
  payment_method: string;
  paid_at?: string;
  period_start: string;
  period_end: string;
  notes?: string;
  activate_tenant?: boolean;
}
