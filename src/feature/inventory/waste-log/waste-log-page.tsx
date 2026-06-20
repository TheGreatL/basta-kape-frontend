import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Trash2, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';

import { Route } from '#/routes/admin/inventory/waste-log.tsx';
import { getAdjustments } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IAdjustment, IIngredient, TAdjustmentType } from '../inventory.types';

import DataTable from '#/components/data-table/data-table.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Badge } from '#/components/ui/badge.tsx';

import AdjustmentDialog from '../components/inventory-adjustment-dialog.tsx';

const ADJUSTMENT_LABEL: Record<TAdjustmentType, string> = {
    WASTE: 'Waste',
    SPOILED: 'Spoiled',
    EXPIRED: 'Expired',
    THEFT: 'Theft',
    PROMOTIONAL_USE: 'Promotional Use',
    PHYSICAL_COUNT_DISCREPANCY: 'Count Discrepancy'
};

export default function WasteLogPage() {
    const navigate = useNavigate({ from: '/admin/inventory/waste-log' });
    const { page, pageSize, search } = Route.useSearch();

    const setSearch = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        setSearch({ search: debouncedSearch, page: 1 });
    }, [debouncedSearch]);

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [adjustmentOpen, setAdjustmentOpen] = React.useState(false);
    const [selectedIngredient, setSelectedIngredient] = React.useState<IIngredient | null>(null);

    // Query: Adjustments
    const { data: adjustmentsData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.ADJUSTMENTS_LIST, { page, pageSize, search }],
        queryFn: () => getAdjustments({ page, limit: pageSize, search })
    });

    const columns = React.useMemo<ColumnDef<IAdjustment>[]>(
        () => [
            {
                accessorKey: 'ingredient.name',
                header: 'Ingredient',
                cell: ({ row }) => <span className="font-semibold text-foreground/90 text-sm">{row.original.ingredient?.name || '—'}</span>
            },
            {
                accessorKey: 'type',
                header: 'Type',
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-xs font-semibold bg-muted/20">
                        {ADJUSTMENT_LABEL[row.original.type]}
                    </Badge>
                )
            },
            {
                accessorKey: 'quantity',
                header: 'Quantity',
                cell: ({ row }) => (
                    <span className={`text-sm font-bold ${row.original.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {row.original.quantity > 0 ? '+' : ''}
                        {row.original.quantity.toLocaleString()}
                    </span>
                )
            },
            {
                accessorKey: 'reason',
                header: 'Reason',
                cell: ({ row }) => <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{row.original.reason || '—'}</span>
            },
            {
                accessorKey: 'createdAt',
                header: 'Logged At',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" />
                        {format(new Date(row.original.createdAt), 'MMM d, yyyy HH:mm')}
                    </span>
                )
            }
        ],
        []
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Trash2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Waste Log</h1>
                        <p className="text-xs text-muted-foreground">Track waste, spoilage, theft, and manual stock correction events.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-muted-foreground font-medium">Log and track adjustments, waste and spoilage incidents.</p>
                    <RequirePermission module="Inventory Management" action="create">
                        <Button
                            onClick={() => {
                                setSelectedIngredient(null);
                                setAdjustmentOpen(true);
                            }}
                            className="h-9 gap-1.5 shadow-sm"
                            size="sm"
                        >
                            <Plus className="size-4" /> Log Adjustment
                        </Button>
                    </RequirePermission>
                </div>
                <DataTable
                    columns={columns}
                    data={adjustmentsData?.data || []}
                    pageCount={adjustmentsData?.meta.pageCount || 1}
                    pageIndex={page - 1}
                    pageSize={pageSize}
                    onPaginationChange={(idx, size) => setSearch({ page: idx + 1, pageSize: size })}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={isLoading}
                    showColumnVisibilityToggle={true}
                    filterContent={
                        <Input
                            placeholder="Search adjustments..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="h-9 w-full sm:w-[250px] bg-background/50"
                        />
                    }
                />
            </div>

            <AdjustmentDialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen} preselectedIngredient={selectedIngredient} />
        </div>
    );
}
