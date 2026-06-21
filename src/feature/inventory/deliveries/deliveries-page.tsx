import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Truck, Plus, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

import { Route } from '#/routes/admin/inventory/deliveries.tsx';
import { getDeliveries } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IDelivery, IIngredient } from '../inventory.types';

import DataTable from '#/components/data-table/data-table.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';

import DeliveryDialog from '../components/inventory-delivery-dialog.tsx';

export default function DeliveriesPage() {
    const navigate = useNavigate({ from: '/admin/inventory/deliveries' });
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
    const [deliveryOpen, setDeliveryOpen] = React.useState(false);
    const [selectedIngredient, setSelectedIngredient] = React.useState<IIngredient | null>(null);

    // Query: Deliveries
    const { data: deliveriesData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.DELIVERIES_LIST, { page, pageSize, search }],
        queryFn: () => getDeliveries({ page, limit: pageSize, search })
    });

    const columns = React.useMemo<ColumnDef<IDelivery>[]>(
        () => [
            {
                accessorKey: 'ingredient.name',
                header: 'Ingredient',
                cell: ({ row }) => <span className="font-semibold text-foreground/90 text-sm">{row.original.ingredient?.name || '—'}</span>
            },
            {
                accessorKey: 'supplier.name',
                header: 'Supplier',
                cell: ({ row }) => <span className="text-xs text-muted-foreground font-medium">{row.original.supplier?.name || '—'}</span>
            },
            {
                accessorKey: 'batchNumber',
                header: 'Batch / Lot',
                cell: ({ row }) => <span className="text-xs font-mono font-medium text-foreground/75">{row.original.batchNumber || '—'}</span>
            },
            {
                accessorKey: 'expiryDate',
                header: 'Expiration Date',
                cell: ({ row }) => {
                    const expiryDate = row.original.expiryDate;
                    if (!expiryDate) return <span className="text-xs text-muted-foreground">—</span>;

                    const expiry = new Date(expiryDate);
                    const now = new Date();
                    const isExpired = expiry < now;
                    const isExpiringSoon = expiry.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 && !isExpired;

                    if (isExpired) {
                        return (
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="size-3.5 shrink-0" />
                                {format(expiry, 'MMM d, yyyy')} (Expired)
                            </span>
                        );
                    }
                    if (isExpiringSoon) {
                        return (
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="size-3.5 shrink-0" />
                                {format(expiry, 'MMM d, yyyy')} (Soon)
                            </span>
                        );
                    }
                    return <span className="text-xs text-foreground/80 font-medium">{format(expiry, 'MMM d, yyyy')}</span>;
                }
            },
            {
                accessorKey: 'quantityReceived',
                header: 'Qty Received',
                cell: ({ row }) => <span className="text-sm font-bold text-emerald-600">+{row.original.quantityReceived.toLocaleString()}</span>
            },
            {
                accessorKey: 'currentQuantity',
                header: 'Remaining Qty',
                cell: ({ row }) => {
                    const current = row.original.currentQuantity;
                    const total = row.original.quantityReceived;
                    const unit = row.original.ingredient?.defaultUnit?.abbreviation || '';
                    const percent = total > 0 ? (current / total) * 100 : 0;

                    let textColor = 'text-foreground/80';
                    if (current === 0) {
                        textColor = 'text-muted-foreground/60 line-through font-normal';
                    } else if (percent <= 25) {
                        textColor = 'text-rose-600 dark:text-rose-400 font-bold';
                    } else if (percent <= 50) {
                        textColor = 'text-amber-600 dark:text-amber-400 font-semibold';
                    } else {
                        textColor = 'text-foreground/90 font-semibold';
                    }

                    return (
                        <span className={`text-sm ${textColor}`}>
                            {current.toLocaleString()} {unit}
                        </span>
                    );
                }
            },
            {
                accessorKey: 'unitCost',
                header: 'Unit Cost',
                cell: ({ row }) => <span className="text-xs font-medium text-foreground/80">₱{row.original.unitCost.toFixed(2)}</span>
            },
            {
                accessorKey: 'totalCost',
                header: 'Total Cost',
                cell: ({ row }) => <span className="text-sm font-bold text-foreground/90">₱{row.original.totalCost.toFixed(2)}</span>
            },
            {
                id: 'createdBy',
                header: 'Logged By',
                cell: ({ row }) => {
                    const user = row.original.createdBy;
                    if (!user) return <span className="text-xs text-muted-foreground">—</span>;
                    return (
                        <span className="text-xs font-semibold text-foreground/85" title={user.email}>
                            {user.firstName} {user.lastName}
                        </span>
                    );
                }
            },
            {
                accessorKey: 'receivedAt',
                header: 'Received At',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" />
                        {format(new Date(row.original.receivedAt), 'MMM d, yyyy HH:mm')}
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
                        <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Deliveries</h1>
                        <p className="text-xs text-muted-foreground">All logged supplier replenishment receipts and material intake records.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-muted-foreground font-medium">Log and track raw ingredient deliveries from suppliers.</p>
                    <RequirePermission module="Inventory Management" action="create">
                        <Button
                            onClick={() => {
                                setSelectedIngredient(null);
                                setDeliveryOpen(true);
                            }}
                            className="h-9 gap-1.5 shadow-sm"
                            size="sm"
                        >
                            <Plus className="size-4" /> Log Delivery
                        </Button>
                    </RequirePermission>
                </div>
                <DataTable
                    columns={columns}
                    data={deliveriesData?.data || []}
                    pageCount={deliveriesData?.meta.pageCount || 1}
                    pageIndex={page - 1}
                    pageSize={pageSize}
                    onPaginationChange={(idx, size) => setSearch({ page: idx + 1, pageSize: size })}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={isLoading}
                    showColumnVisibilityToggle={true}
                    filterContent={
                        <Input
                            placeholder="Search deliveries..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="h-9 w-full sm:w-[250px] bg-background/50"
                        />
                    }
                />
            </div>

            <DeliveryDialog open={deliveryOpen} onOpenChange={setDeliveryOpen} preselectedIngredient={selectedIngredient} />
        </div>
    );
}
