import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link  } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Package, Truck, Trash2, ClipboardList, Eye } from 'lucide-react';
import { format } from 'date-fns';

import { Route } from '#/routes/admin/inventory/stock-levels.tsx';
import { getInventoryLevels } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IIngredientInventory, IIngredient, TInventoryStatus } from '../inventory.types';

import DataTable from '#/components/data-table/data-table.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button, buttonVariants } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';

import PhysicalCountDialog from '../components/inventory-physical-count-dialog.tsx';
import DeliveryDialog from '../components/inventory-delivery-dialog.tsx';
import AdjustmentDialog from '../components/inventory-adjustment-dialog.tsx';

const STATUS_BADGE_MAP: Record<TInventoryStatus, { label: string; className: string }> = {
    SAFE: { label: 'Safe', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
    CRITICAL: { label: 'Critical', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
    OUT_OF_STOCK: { label: 'Out of Stock', className: 'bg-red-500/10 text-red-600 border-red-500/30' }
};

export default function StockLevelsPage() {
    const navigate = useNavigate({ from: '/admin/inventory/stock-levels' });
    const { page, pageSize, search, status } = Route.useSearch();

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

    // Dialog States
    const [selectedInventory, setSelectedInventory] = React.useState<IIngredientInventory | null>(null);
    const [selectedIngredient, setSelectedIngredient] = React.useState<IIngredient | null>(null);
    const [physicalCountOpen, setPhysicalCountOpen] = React.useState(false);
    const [deliveryOpen, setDeliveryOpen] = React.useState(false);
    const [adjustmentOpen, setAdjustmentOpen] = React.useState(false);

    // Query: Stock Levels
    const { data: levelsData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST, { page, pageSize, search, status, recordStatus: 'active' }],
        queryFn: () => getInventoryLevels({ page, limit: pageSize, search, status, recordStatus: 'active' })
    });

    const columns = React.useMemo<ColumnDef<IIngredientInventory>[]>(
        () => [
            {
                accessorKey: 'ingredient.name',
                header: 'Ingredient',
                cell: ({ row }) => (
                    <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground/90 leading-tight">{row.original.ingredient.name}</span>
                        <span className="text-xs text-muted-foreground">
                            Unit: {row.original.ingredient.defaultUnit.name} ({row.original.ingredient.defaultUnit.abbreviation})
                        </span>
                    </div>
                )
            },
            {
                accessorKey: 'currentQuantity',
                header: 'Current Stock',
                cell: ({ row }) => (
                    <span className="text-sm font-bold text-foreground/90">
                        {row.original.currentQuantity} {row.original.ingredient.defaultUnit.abbreviation}
                    </span>
                )
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const badge = STATUS_BADGE_MAP[row.original.status];
                    return (
                        <Badge variant="outline" className={`text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                        </Badge>
                    );
                }
            },
            {
                accessorKey: 'ingredient.reorderPoint',
                header: 'Reorder Point',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground font-medium">
                        {row.original.ingredient.reorderPoint} {row.original.ingredient.defaultUnit.abbreviation}
                    </span>
                )
            },
            {
                id: 'updatedBy',
                header: 'Last Updated By',
                cell: ({ row }) => {
                    const user = row.original.updatedBy;
                    if (!user) return <span className="text-xs text-muted-foreground">—</span>;
                    return (
                        <span className="text-xs font-semibold text-foreground/85" title={user.email}>
                            {user.firstName} {user.lastName}
                        </span>
                    );
                }
            },
            {
                accessorKey: 'lastPhysicalCount',
                header: 'Last Counted',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground">
                        {row.original.lastPhysicalCount ? format(new Date(row.original.lastPhysicalCount), 'MMM d, yyyy HH:mm') : '—'}
                    </span>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        <RequirePermission module="Inventory Management" action="read">
                            <Link
                                to="/admin/inventory/deliveries"
                                title="Physical Count"
                                className={buttonVariants({
                                    variant: 'ghost',
                                    size: 'icon',
                                    className: 'size-8 text-muted-foreground hover:text-primary transition-colors'
                                })}
                                search={{ page: 1, pageSize: 10, search: row.original.ingredient.name }}
                            >
                                <Eye />
                            </Link>
                        </RequirePermission>

                        <RequirePermission module="Inventory Management" action="update">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                title="Physical Count"
                                onClick={() => {
                                    setSelectedInventory(row.original);
                                    setPhysicalCountOpen(true);
                                }}
                            >
                                <ClipboardList className="size-4" />
                            </Button>
                        </RequirePermission>
                        <RequirePermission module="Inventory Management" action="create">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                title="Log Delivery"
                                onClick={() => {
                                    setSelectedIngredient(row.original.ingredient);
                                    setDeliveryOpen(true);
                                }}
                            >
                                <Truck className="size-4" />
                            </Button>
                        </RequirePermission>
                        <RequirePermission module="Inventory Management" action="create">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                title="Log Waste"
                                onClick={() => {
                                    setSelectedIngredient(row.original.ingredient);
                                    setAdjustmentOpen(true);
                                }}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </RequirePermission>
                    </div>
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
                        <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Stock Levels</h1>
                        <p className="text-xs text-muted-foreground">Live inventory stock readings with alert statuses ranked by criticality.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-muted-foreground font-medium">Live stock levels across all registered raw ingredients.</p>
                    <div className="flex items-center gap-2">
                        <RequirePermission module="Inventory Management" action="create">
                            <Button
                                onClick={() => {
                                    setSelectedIngredient(null);
                                    setDeliveryOpen(true);
                                }}
                                className="h-9 gap-1.5 shadow-sm"
                                size="sm"
                            >
                                <Truck className="size-4" /> Log Delivery
                            </Button>
                        </RequirePermission>
                        <RequirePermission module="Inventory Management" action="create">
                            <Button
                                onClick={() => {
                                    setSelectedIngredient(null);
                                    setAdjustmentOpen(true);
                                }}
                                variant="outline"
                                className="h-9 gap-1.5"
                                size="sm"
                            >
                                <Trash2 className="size-4" /> Log Waste
                            </Button>
                        </RequirePermission>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={levelsData?.data || []}
                    pageCount={levelsData?.meta.pageCount || 1}
                    pageIndex={page - 1}
                    pageSize={pageSize}
                    onPaginationChange={(idx, size) => setSearch({ page: idx + 1, pageSize: size })}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={isLoading}
                    showColumnVisibilityToggle={true}
                    filterContent={
                        <>
                            <Input
                                placeholder="Search ingredients..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="h-9 w-full sm:w-[250px] bg-background/50"
                            />
                            <Select value={status || 'all'} onValueChange={(val) => setSearch({ status: val === 'all' ? '' : val, page: 1 })}>
                                <SelectTrigger className="h-9 min-w-[160px] bg-background/50 capitalize">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="SAFE">Safe</SelectItem>
                                    <SelectItem value="CRITICAL">Critical</SelectItem>
                                    <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                                </SelectContent>
                            </Select>
                        </>
                    }
                />
            </div>

            <PhysicalCountDialog open={physicalCountOpen} onOpenChange={setPhysicalCountOpen} inventory={selectedInventory} />
            <DeliveryDialog open={deliveryOpen} onOpenChange={setDeliveryOpen} preselectedIngredient={selectedIngredient} />
            <AdjustmentDialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen} preselectedIngredient={selectedIngredient} />
        </div>
    );
}
