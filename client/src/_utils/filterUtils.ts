import { getStatusColor } from '@/_utils';
import { FilterOption } from '@/components/_MultiSelectFilter';

/**
 * Creates status filter options with appropriate styling from basic status array
 * @param statuses Array of status values
 * @returns Array of FilterOption objects with values, labels, and colors
 */
export const createStatusFilterOptions = (statuses: string[]): FilterOption[] => {
    return statuses.map(status => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
        color: getStatusColor(status)
    }));
};

/**
 * Predefined date filter options
 */
export const DATE_FILTER_OPTIONS: FilterOption[] = [
    { value: 'today', label: 'Today' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' }
];

/**
 * Apply date filtering to a collection of items with booking_date
 * @param items Array of items with booking_date property
 * @param selectedDateFilters Array of selected date filter values
 * @returns Filtered array of items
 */
export const applyDateFilters = <T extends { booking_date: string | Date }>(
    items: T[],
    selectedDateFilters: string[]
): T[] => {
    // If no filters selected, return all items
    if (selectedDateFilters.length === 0) {
        return items;
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    return items.filter(item => {
        const bookingDate = new Date(item.booking_date);

        // Check if the item matches any of the selected filters
        return selectedDateFilters.some(filter => {
            switch (filter) {
                case 'today':
                    return bookingDate.toISOString().split('T')[0] === now.toISOString().split('T')[0];
                case 'upcoming':
                    return bookingDate >= startOfToday;
                case 'past':
                    return bookingDate < startOfToday;
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