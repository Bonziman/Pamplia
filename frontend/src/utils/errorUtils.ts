import axios, { AxiosError } from 'axios';

/**
 * Extracts a user-friendly error message from any error type.
 * Handles Axios errors, standard Errors, and unknown types.
 */
export function getErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred.'): string {
  if (axios.isAxiosError(error)) {
    const detail = (error as AxiosError<any>).response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((err: any) => {
          const field = err.loc?.slice(-1)[0] || 'Input';
          return `${field}: ${err.msg}`;
        })
        .join('. ');
    }
    // Fallback to status text
    const statusText = (error as AxiosError).response?.statusText;
    if (statusText) return statusText;
  }

  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  return fallback;
}

export { isAxiosError } from 'axios';
