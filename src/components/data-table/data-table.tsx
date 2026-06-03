'use client';

import * as React from 'react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal, Inbox } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table.tsx';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '#/components/ui/dropdown-menu.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty.tsx';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];

    // Server-side Pagination
    pageCount: number;
    pageIndex: number;
    pageSize: number;
    onPaginationChange: (pageIndex: number, pageSize: number) => void;

    // Server-side Sorting
    sorting: SortingState;
    onSortingChange: (sorting: SortingState) => void;

    // Custom toolbar content (search, custom filters, select filters)
    filterContent?: React.ReactNode;

    // Visual features
    isLoading?: boolean;
    showColumnVisibilityToggle?: boolean;

    // Optional Row selection
    rowSelection?: Record<string, boolean>;
    onRowSelectionChange?: (rowSelection: Record<string, boolean>) => void;
}

export default function DataTable<TData, TValue>({
    columns,
    data,
    pageCount,
    pageIndex,
    pageSize,
    onPaginationChange,
    sorting,
    onSortingChange,
    filterContent,
    isLoading = false,
    showColumnVisibilityToggle = true,
    rowSelection = {},
    onRowSelectionChange
}: DataTableProps<TData, TValue>) {
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

    const table = useReactTable({
        data,
        columns,
        pageCount,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            pagination: {
                pageIndex,
                pageSize
            }
        },
        // Handlers are passed down from parent to maintain fully server-side state
        onSortingChange: (updater) => {
            if (typeof updater === 'function') {
                onSortingChange(updater(sorting));
            } else {
                onSortingChange(updater);
            }
        },
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: (updater) => {
            if (onRowSelectionChange) {
                if (typeof updater === 'function') {
                    onRowSelectionChange(updater(rowSelection));
                } else {
                    onRowSelectionChange(updater);
                }
            }
        },
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true
    });

    return (
        <div className="space-y-4 w-full">
            {/* Table Action Controls / Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                    {/* Custom filter content */}
                    {filterContent}
                </div>

                {/* Column Visibility Toggle */}
                {showColumnVisibilityToggle && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 ml-auto bg-background/50 hover:bg-background/80 border-dashed">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {table
                                .getAllColumns()
                                .filter((col) => typeof col.accessorFn !== 'undefined' && col.getCanHide())
                                .map((col) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={col.id}
                                            className="capitalize"
                                            checked={col.getIsVisible()}
                                            onCheckedChange={(value) => col.toggleVisibility(!!value)}
                                        >
                                            {col.id.replace(/_/g, ' ')}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Table Container Card */}
            <div className="relative rounded-xl border border-border/60 bg-card/30 backdrop-blur-xs shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                {/* Loader Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/45 backdrop-blur-xs transition-opacity duration-300">
                        <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/80 border shadow-lg border-border/50">
                            <Spinner className="h-6 w-6 text-primary" />
                            <span className="text-xs font-medium text-muted-foreground animate-pulse">Syncing table...</span>
                        </div>
                    </div>
                )}

                <Table>
                    <TableHeader className="bg-muted/40 dark:bg-muted/10">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map((header) => {
                                    const canSort = header.column.getCanSort();
                                    const sortedState = header.column.getIsSorted();

                                    return (
                                        <TableHead key={header.id} className="font-semibold text-foreground/80 py-3">
                                            {header.isPlaceholder ? null : (
                                                <div className="flex items-center gap-2">
                                                    {canSort ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="-ml-2 h-8 px-2 hover:bg-muted font-semibold text-foreground/80 hover:text-foreground transition-colors duration-200"
                                                            onClick={header.column.getToggleSortingHandler()}
                                                        >
                                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                                            {sortedState === 'asc' ? (
                                                                <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                                                            ) : sortedState === 'desc' ? (
                                                                <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                                                            ) : (
                                                                <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        flexRender(header.column.columnDef.header, header.getContext())
                                                    )}
                                                </div>
                                            )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className="hover:bg-muted/30 transition-all duration-150 border-b border-border/40"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2.5 px-4 font-medium text-foreground/90">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-56">
                                    <Empty className="h-full border-0">
                                        <EmptyHeader>
                                            <EmptyMedia variant="icon">
                                                <Inbox className="h-5 w-5 text-muted-foreground" />
                                            </EmptyMedia>
                                            <EmptyTitle>No records found</EmptyTitle>
                                            <EmptyDescription>
                                                Try adjusting your search criteria, removing active filters, or check back later.
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {data.length > 0 && (
                <div className="flex flex-col gap-4 items-center justify-between sm:flex-row px-1">
                    {/* Rows Selection Details & Counters */}
                    <div className="flex-1 text-xs text-muted-foreground font-medium">
                        {table.getFilteredSelectedRowModel().rows.length > 0 ? (
                            <span>
                                {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected
                            </span>
                        ) : (
                            <span>
                                Page {pageIndex + 1} of {pageCount || 1}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                        {/* Page Size Select */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Rows per page</span>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(val) => {
                                    onPaginationChange(0, Number(val));
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px] bg-background/50 hover:bg-background/80">
                                    <SelectValue placeholder={pageSize} />
                                </SelectTrigger>
                                <SelectContent position="popper" align="end" className="min-w-[70px]">
                                    {[5, 10, 20, 30, 40, 50].map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Interactive Page Navigation Buttons */}
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex bg-background/50 hover:bg-background/80"
                                onClick={() => onPaginationChange(0, pageSize)}
                                disabled={pageIndex === 0}
                            >
                                <span className="sr-only">Go to first page</span>
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0 bg-background/50 hover:bg-background/80"
                                onClick={() => onPaginationChange(pageIndex - 1, pageSize)}
                                disabled={pageIndex === 0}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <span className="text-xs font-semibold text-foreground px-2">{pageIndex + 1}</span>

                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0 bg-background/50 hover:bg-background/80"
                                onClick={() => onPaginationChange(pageIndex + 1, pageSize)}
                                disabled={pageIndex >= pageCount - 1}
                            >
                                <span className="sr-only">Go to next page</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex bg-background/50 hover:bg-background/80"
                                onClick={() => onPaginationChange(pageCount - 1, pageSize)}
                                disabled={pageIndex >= pageCount - 1}
                            >
                                <span className="sr-only">Go to last page</span>
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
