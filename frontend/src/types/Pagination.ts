// src/types/Pagination.ts

// This is a generic interface for paginated responses from your API.
// T represents the type of the items in the list (e.g., UserOut, InvitationOut, ClientOut).
export interface PaginatedResponse<T> {
    total: number;       // Total number of items available across all pages
    page: number;        // The current page number (usually 1-indexed)
    limit: number;       // The number of items per page
    items: T[];          // An array of items for the current page

    // Optional: If your backend provides these
    // total_pages?: number;
    // has_next?: boolean;
    // has_prev?: boolean;
}
