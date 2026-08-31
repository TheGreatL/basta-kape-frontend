import * as React from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Search, Trash2, Clock, RotateCcw } from 'lucide-react';
import { format, isValid } from 'date-fns';

import DataTable from '#/components/data-table/data-table.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import ExpiryStatusBadge from './expiry-status-badge.tsx';
import type { IPreparedItemBatch, PreparedBatchStatus } from '../food-prep.types';
import type { IPaginatedResult } from '#/types/base.types';

interface PreparedBatchesTableProps {
    batchesData: IPaginatedResult<IPreparedItemBatch> | undefined;
    isLoading: boolean;
    page: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    limit?: number;
    setLimit?: React.Dispatch<React.SetStateAction<number>>;
    search: string;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    status: PreparedBatchStatus | '';
    setStatus: React.Dispatch<React.SetStateAction<PreparedBatchStatus | ''>>;
    expiringSoonFilter: boolean;
    setExpiringSoonFilter: React.Dispatch<React.SetStateAction<boolean>>;
    onDisposeBatch: (batch: IPreparedItemBatch) => void;
    onRefresh: () => void;
}

export default function PreparedBatchesTable({
    batchesData,
    isLoading,
    page,
    setPage,
    limit = 10,
    setLimit,
    search,
    setSearch,
    status,
    setStatus,
    expiringSoonFilter,
    setExpiringSoonFilter,
    onDisposeBatch,
    onRefresh
}: PreparedBatchesTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const columns = React.useMemo<ColumnDef<IPreparedItemBatch>[]>(
        () => [
            {
                accessorKey: 'batchNumber',
                header: 'Batch Number',
                cell: ({ row }) => {
                    const batch = row.original;
                    return (
                        <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-foreground">{batch.batchNumber}</span>
                            {batch.notes && (
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={batch.notes}>
                                    {batch.notes}
                                </span>
                            )}
                        </div>
                    );
                }
            },
            {
                id: 'product',
                accessorFn: (row) => row.product?.name,
                header: 'Product / Variant',
                cell: ({ row }) => {
                    const batch = row.original;
                    const variantLabel = batch.variant?.sku ? `SKU: ${batch.variant.sku}` : 'Standard';
                    return (
                        <div className="space-y-0.5">
                            <div className="text-xs font-bold text-foreground truncate max-w-[220px]">
                                {batch.product?.name || 'Prepared Food Item'}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">{variantLabel}</div>
                        </div>
                    );
                }
            },
            {
                accessorKey: 'currentQuantity',
                header: () => <div className="text-center">Remaining Stock</div>,
                cell: ({ row }) => {
                    const batch = row.original;
                    const isDepleted = batch.currentQuantity === 0 || batch.status === 'DEPLETED';
                    return (
                        <div className="flex flex-col items-center">
                            <Badge
                                variant={isDepleted ? 'outline' : 'secondary'}
                                className={`text-xs font-bold ${isDepleted ? 'text-muted-foreground' : 'text-foreground'}`}
                            >
                                {batch.currentQuantity} / {batch.quantityPrepared}
                            </Badge>
                            <span className="text-xs text-muted-foreground mt-0.5">units</span>
                        </div>
                    );
                }
            },
            {
                accessorKey: 'status',
                header: 'Shelf-Life Status',
                cell: ({ row }) => {
                    const batch = row.original;
                    return <ExpiryStatusBadge status={batch.status} expiresAt={batch.expiresAt} currentQuantity={batch.currentQuantity} />;
                }
            },
            {
                accessorKey: 'preparedAt',
                header: 'Prepared At',
                cell: ({ row }) => {
                    const date = new Date(row.original.preparedAt);
                    const formatted = isValid(date) ? format(date, 'MMM d, yyyy h:mm a') : '—';
                    return <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{formatted}</span>;
                }
            },
            {
                accessorKey: 'expiresAt',
                header: 'Expires At',
                cell: ({ row }) => {
                    const date = new Date(row.original.expiresAt);
                    const formatted = isValid(date) ? format(date, 'MMM d, yyyy h:mm a') : '—';
                    return <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{formatted}</span>;
                }
            },
            {
                id: 'actions',
                header: () => <div className="text-right">Actions</div>,
                cell: ({ row }) => {
                    const batch = row.original;
                    const isDisposed = batch.status === 'DISPOSED';
                    const isDepleted = batch.currentQuantity === 0 || batch.status === 'DEPLETED';
                    const canDispose = !isDisposed && !isDepleted;

                    return (
                        <div className="flex justify-end">
                            {canDispose ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onDisposeBatch(batch)}
                                    className="h-7 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30 gap-1"
                                >
                                    <Trash2 className="size-3" />
                                    Dispose
                                </Button>
                            ) : (
                                <span className="text-xs text-muted-foreground/60">—</span>
                            )}
                        </div>
                    );
                }
            }
        ],
        [onDisposeBatch]
    );

    const filterContent = (
        <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* Search by Batch Number or Product */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                    placeholder="Search batch # or product name..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="pl-8 h-9 bg-background/50 rounded-xl text-xs"
                />
            </div>

            {/* Status Filter */}
            <Select
                value={status || 'all'}
                onValueChange={(val) => {
                    setStatus(val === 'all' ? '' : (val as PreparedBatchStatus));
                    setPage(1);
                }}
            >
                <SelectTrigger className="h-9 w-[160px] bg-background/50 rounded-xl text-xs font-semibold">
                    <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">
                        All Statuses
                    </SelectItem>
                    <SelectItem value="FRESH" className="text-xs">
                        Fresh
                    </SelectItem>
                    <SelectItem value="NEAR_EXPIRY" className="text-xs">
                        Near Expiry
                    </SelectItem>
                    <SelectItem value="EXPIRED" className="text-xs">
                        Expired
                    </SelectItem>
                    <SelectItem value="DEPLETED" className="text-xs">
                        Depleted
                    </SelectItem>
                    <SelectItem value="DISPOSED" className="text-xs">
                        Disposed
                    </SelectItem>
                </SelectContent>
            </Select>

            {/* Expiring Soon Toggle Pill */}
            <Button
                type="button"
                size="sm"
                variant={expiringSoonFilter ? 'default' : 'outline'}
                onClick={() => {
                    setExpiringSoonFilter((prev) => !prev);
                    setPage(1);
                }}
                className="h-9 px-3 text-xs font-semibold gap-1.5 rounded-xl"
            >
                <Clock className="size-3.5" />
                &le; 2h Near Expiry
            </Button>

            {/* Refresh Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="h-9 px-2.5 text-xs font-semibold gap-1 rounded-xl text-muted-foreground hover:text-foreground"
            >
                <RotateCcw className="size-3.5" />
                Refresh
            </Button>
        </div>
    );

    return (
        <DataTable<IPreparedItemBatch, unknown>
            columns={columns}
            data={batchesData?.data || []}
            pageCount={batchesData?.meta.pageCount || 1}
            pageIndex={page - 1}
            pageSize={limit}
            onPaginationChange={(newPageIndex, newPageSize) => {
                setPage(newPageIndex + 1);
                if (setLimit && newPageSize !== limit) {
                    setLimit(newPageSize);
                }
            }}
            sorting={sorting}
            onSortingChange={setSorting}
            filterContent={filterContent}
            isLoading={isLoading}
            showColumnVisibilityToggle={true}
        />
    );
}
