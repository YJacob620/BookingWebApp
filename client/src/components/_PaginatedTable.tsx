import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { SortConfig } from '@/utils';
import { useTranslation } from 'react-i18next';

/**
 * Defines the structure of a column in the paginated table
 */
export interface PaginatedTableColumn<T> {
  /** Unique identifier for the column, also used for sorting */
  key: string;
  /** The text or component to display in the header */
  header: ReactNode;
  /** Function to render a cell for this column */
  cell: (item: T) => ReactNode;
  /** Optional CSS class name for the column */
  className?: string;
  /** Whether this column can be sorted (default: false) */
  sortable?: boolean;
  /** Which direction will this column be sorted by at first */
  defaultSort?: 'asc' | 'desc';
}

export interface PaginatedTableProps<T> {
  /** Data array to display in the table */
  data: T[];
  /** Column definitions */
  columns: PaginatedTableColumn<T>[];
  /** Initial number of rows to show per page */
  initialRowsPerPage?: number;
  /** Available options for rows per page selector */
  rowsPerPageOptions?: number[];
  /** Message to display when no data is available */
  emptyMessage?: string;
  /** Additional CSS class for the table */
  tableClassName?: string;
  /** Custom component to show when no results match filters */
  noResults?: ReactNode;
  /** Callback when page changes (for external pagination) */
  onPageChange?: (page: number) => void;
  /** Callback when rows per page changes */
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  /** Callback when sort configuration changes */
  onSortChange?: (sortConfig: SortConfig<T>) => void;
  /** External sort configuration (for controlled sorting) */
  sortConfig?: SortConfig<any>;
  /** Total number of items (for server-side pagination) */
  totalItems?: number;
  /** Total number of pages (for server-side pagination) */
  totalPages?: number;
}

/**
 * A reusable paginated table component that handles pagination internally
 * and optionally supports sorting
 */
const PaginatedTable = <T extends object>({
  data,
  columns,
  initialRowsPerPage = 10,
  rowsPerPageOptions = [5, 10, 25, 50],
  // emptyMessage = 'No data available',
  emptyMessage = 'No data available',
  tableClassName = '',
  noResults,
  onPageChange,
  onRowsPerPageChange,
  onSortChange,
  sortConfig: externalSortConfig,
  totalItems,
  totalPages: serverTotalPages
}: PaginatedTableProps<T>) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(initialRowsPerPage);
  const [clientTotalPages, setClientTotalPages] = useState(1);

  // Internal sort state (used if no external sort config is provided)
  const [internalSortConfig, setInternalSortConfig] = useState<SortConfig<T> | undefined>(undefined);

  // Use external sort config if provided, otherwise use internal
  const sortConfig = externalSortConfig || internalSortConfig;

  // Use server-provided total pages if available, otherwise calculate from data
  const totalPages = serverTotalPages || clientTotalPages;
  const dataCount = totalItems || data.length;

  const { t, i18n } = useTranslation()

  // Calculate total pages when data or rows per page changes
  useEffect(() => {
    if (!serverTotalPages) {
      const calculatedPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
      setClientTotalPages(calculatedPages);

      // Ensure current page is valid
      if (currentPage > calculatedPages && data.length > 0) {
        handlePageChange(calculatedPages);
      }
    }
  }, [data, rowsPerPage, serverTotalPages]);

  // Apply sorting to the data if sort config is provided
  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.key) return data;

    return [...data].sort((a: any, b: any) => {
      const key = sortConfig.key as keyof T;
      const aValue = a[key];
      const bValue = b[key];

      // Handle dates specially
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Handle strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      // Fallback
      return 0;
    });
  }, [data, sortConfig]);

  // Get current page data
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  // Handle sorting
  const handleSort = (key: string, defaultSortDirection: 'asc' | 'desc' = 'asc') => {
    let newDirection: 'asc' | 'desc';
    if (sortConfig?.key === key && sortConfig?.direction === 'asc') {
      newDirection = 'desc';
    } else if (sortConfig?.direction === 'desc') {
      newDirection = 'asc';
    } else {
      newDirection = defaultSortDirection;
    }
    const newSortConfig: SortConfig<T> = {
      key: key as keyof T,
      direction: newDirection
    };

    // If external sort handler is provided, call it
    if (onSortChange) {
      onSortChange(newSortConfig);
    } else {
      // Otherwise use internal state
      setInternalSortConfig(newSortConfig);
    }
  };

  // Get the appropriate sort icon based on current sort state
  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-1 h-4 w-4" />;
    }

    return sortConfig.direction === 'asc'
      ? <ArrowUp className="ml-1 h-4 w-4" />
      : <ArrowDown className="ml-1 h-4 w-4" />;
  };

  // Handle page change with optional callback
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (onPageChange) {
      onPageChange(page);
    }
  };

  // Handle rows per page change with optional callback
  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows);
    if (onRowsPerPageChange) {
      onRowsPerPageChange(rows);
    }
    // Reset to first page when changing rows per page
    handlePageChange(1);
  };

  // Pagination navigation handlers
  const goToFirstPage = () => handlePageChange(1);
  const goToPreviousPage = () => handlePageChange(Math.max(1, currentPage - 1));
  const goToNextPage = () => handlePageChange(Math.min(totalPages, currentPage + 1));
  const goToLastPage = () => handlePageChange(totalPages);

  // Calculate range display text for pagination
  const startItem = dataCount === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, dataCount);

  return (
    <div className="space-y-4">
      <div className="table-wrapper">
        <Table className={tableClassName}>
          <TableHeader>
            <TableRow className="border-gray-700">
              {columns.map((column, index) => {
                const isSortable = column.sortable === true;

                return (
                  <TableHead
                    key={`${column.key}-${index}`}
                    className={column.className}
                    onClick={isSortable ? () => handleSort(column.key, column.defaultSort) : undefined}
                    style={isSortable ? { cursor: 'pointer' } : undefined}
                  >
                    <div className="flex items-center justify-center">
                      {column.header}
                      {isSortable && (
                        <span className="inline-flex ml-1">
                          {getSortIcon(column.key)}
                        </span>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length > 0 ? (
              currentData.map((item, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className="border-gray-700 def-hover"
                >
                  {columns.map((column, cellIndex) => (
                    <React.Fragment key={`${column.key}-${rowIndex}-${cellIndex}`}>
                      {column.cell(item)}
                    </React.Fragment>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <td colSpan={columns.length} className="h-24 text-center">
                  {noResults || (
                    <div className="text-gray-400" dir={i18n.dir()}>
                      {data.length > 0 ? t('noItemsMatchFilter') : t(emptyMessage)}
                      {/* // ? 'No items match your current filters.' */}
                    </div>
                  )}
                </td>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
          <div className="flex items-center space-x-2" dir={i18n.dir()}>
            <Label>{t('PaginatedTable.RowsPerPage')}</Label>
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(value) => handleRowsPerPageChange(Number(value))} dir={i18n.dir()}
            >
              <SelectTrigger id="rows-per-page" className="w-[80px]">
                <SelectValue placeholder={rowsPerPage.toString()} />
              </SelectTrigger>
              <SelectContent>
                {rowsPerPageOptions.map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-400">
              {t('PaginatedTable.RowsShown', { startItem: startItem, endItem: endItem, itemAmount: dataCount })}
              {/* {`${startItem}-${endItem} of ${dataCount}`} */}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {t('PaginatedTable.pageOf', { current: currentPage, total: totalPages })}
              {/* Page {currentPage} of {totalPages} */}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaginatedTable;