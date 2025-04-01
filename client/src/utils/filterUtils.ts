import { BookingEntry } from "./types";

export const DATE_FILTER_OPTIONS = [
    'today',
    'upcoming',
    'past',
] as const;
// type DateFilterOption = (typeof DATE_FILTER_OPTIONS)[number];

export interface FilterOption<T> {
    value: T;
    label: string;
    color?: string; // Optional color for badge display
}

/**
 * Creates filter options for a given set of statuses.
 *
 * This function generates a list of `FilterOption` objects, each containing a `value`,
 * a `label` (capitalized version of the status), and an optional `color`.
 * It can handle any set of statuses and allows you to pass a custom function for color assignment.
 *
 * @param statuses - An array of status values (e.g., `BookingStatus[]`, `TimeslotStatus[]`).
 * @param getColor - An optional function to determine the color for each status.
 *                   If provided, it will be called with each status value to return the color.
 *                   If not provided, the `color` field will be omitted from the `FilterOption`.
 * 
 * @returns An array of `FilterOption<T>`, each containing:
 * - `value`: The status value.
 * - `label`: A capitalized version of the status value.
 * - `color`: (Optional) The color associated with the status, determined by `getColor` function.
 */
export const createFilterOptions = <T>(
    statuses: readonly T[],
    getColor?: (status: T) => string
): FilterOption<T>[] => {
    return statuses.map(status => ({
        value: status,
        label: String(status).charAt(0).toUpperCase() + String(status).slice(1),
        color: getColor ? getColor(status) : undefined,
    }));
};


/**
 * Apply date filtering to a collection of items with booking_date
 * @param items Array of items with booking_date property
 * @param selectedDateFilters Array of selected date filter values
 * @returns Filtered array of items
 */
export const applyDateFilters = (items: BookingEntry[], selectedDateFilters: string[]): BookingEntry[] => {
    // If no filters selected, return all items
    if (selectedDateFilters.length === 0) {
        return items;
    }

    const now = new Date();
    return items.filter(item => {
        const bookingDate = new Date(item.booking_date);
        const [hours, minutes, seconds] = item.start_time.split(":").map(Number);
        bookingDate.setHours(hours, minutes, seconds, 0);

        // Check if the item matches any of the selected filters
        return selectedDateFilters.some(filter => {
            switch (filter) {
                case 'today':
                    return bookingDate.getDate() === now.getDate();
                case 'upcoming':
                    return bookingDate >= now;
                case 'past':
                    return bookingDate < now;
                default:
                    return false;
            }
        });
    });
};

/**
 * Apply status filtering to a collection of items
 * @param items Array of items with status property
 * @param selectedStatuses Array of selected status values
 * @returns Filtered array of items
 */
export const applyStatusFilters = <T extends { status: string }>(
    items: T[],
    selectedStatuses: string[]
): T[] => {
    // If no filters selected, return all items
    if (selectedStatuses.length === 0) {
        return items;
    }

    return items.filter(item => selectedStatuses.includes(item.status));
};