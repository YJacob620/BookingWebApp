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
} from "lucide-react";
import { SortConfig } from '@/_utils';

export interface PaginatedTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: ReactNode;
    cell: (item: T) => ReactNode;
    className?: string;
    sortable?: boolean;
  }[];
  initialRowsPerPage?: number;
  rowsPerPageOptions?: number[];
  emptyMessage?: string;
  tableClassName?: string;
  noResults?: ReactNode;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onSortChange?: (sortConfig: SortConfig<T>) => void;
  sortConfig?: SortConfig<any>; // Allow passing in external sort configuration
  totalItems?: number; // For server-side pagination (optional)
  totalPages?: number; // For server-side pagination (optional)
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
  const handleSort = (key: string) => {
    const newSortConfig: SortConfig<T> = {
      key: key as keyof T,
      direction: sortConfig?.key === key && sortConfig?.direction === 'asc' ? 'desc' : 'asc'
    };

    // If external sort handler is provided, call it
    if (onSortChange) {
      onSortChange(newSortConfig);
    } else {
      // Otherwise use internal state
      setInternalSortConfig(newSortConfig);
    }
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
                // Determine if this column is sortable
                const isSortable = column.sortable === true;

                // Create the header content
                let headerContent = column.header;

                // If the header is a simple string and the column is sortable,
                // wrap it in a button with the sort indicator
                if (isSortable && typeof column.header === 'string') {
                  headerContent = (
                    <Button
                      variant="ghost"
                      onClick={() => handleSort(column.key)}
                      className="font-semibold h-8 px-2 py-1"
                    >
                      {column.header}
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </Button>
                  );
                }

                return (
                  <TableHead
                    key={`${column.key}-${index}`}
                    className={column.className}
                    onClick={isSortable && typeof column.header !== 'string' ? () => handleSort(column.key) : undefined}
                    style={isSortable ? { cursor: 'pointer' } : undefined}
                  >
                    {headerContent}
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
                    <div className="text-gray-400">
                      {data.length > 0
                        ? 'No items match your current filters.'
                        : emptyMessage}
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
          <div className="flex items-center space-x-2">
            <Label>Rows per page:</Label>
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(value) => handleRowsPerPageChange(Number(value))}
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
              {`${startItem}-${endItem} of ${dataCount}`}
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
              Page {currentPage} of {totalPages}
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