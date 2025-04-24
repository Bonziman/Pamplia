// src/utils/formatDate.ts
import { format, parseISO } from 'date-fns';

/**
 * Formats an ISO date string into a more readable format.
 * Handles potential invalid date strings.
 * Example output: "Apr 21, 2025, 11:59 PM" or "Invalid Date"
 */
export const formatReadableDateTime = (isoDateString: string | undefined | null): string => {
  if (!isoDateString) {
    return 'N/A'; // Or empty string, or 'Unknown Date'
  }
  try {
    // parseISO handles the incoming ISO string (like "2025-04-21T23:59:00Z")
    const date = parseISO(isoDateString);
    // Format specification: https://date-fns.org/v2.30.0/docs/format
    // Example: 'MMM d, yyyy, h:mm a' => Apr 21, 2025, 11:59 PM
    return format(date, 'MMM d, yyyy, h:mm a');
  } catch (error) {
    console.error("Error formatting date:", isoDateString, error);
    return 'Invalid Date'; // Return fallback on error
  }
};

/**
 * Formats an ISO date string for the datetime-local input (YYYY-MM-DDTHH:mm)
 * Handles potential invalid date strings.
 */
 export const formatForDateTimeLocalInput = (isoDateString: string | undefined | null): string => {
     if (!isoDateString) {
         return '';
     }
     try {
         const date = parseISO(isoDateString);
         // Format needed by datetime-local input: YYYY-MM-DDTHH:mm
         // Note: This uses the *local* time zone representation for the input.
         // The backend should ideally handle conversion back to UTC if needed.
         return format(date, "yyyy-MM-dd'T'HH:mm");
     } catch (error) {
         console.error("Error formatting date for input:", isoDateString, error);
         return ''; // Return empty string on error
     }
 };
