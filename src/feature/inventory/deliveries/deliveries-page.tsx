import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Truck, Plus, Calendar as CalendarIcon, Pencil, Eye, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { Route } from '#/routes/admin/inventory/deliveries.tsx';
import { getDeliveries } from '#/api/inventory.api.ts';
import { getSuppliersList } from '#/api/suppliers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IDelivery, IIngredient } from '../inventory.types';
import type { ISupplierListItem } from '#/feature/suppliers/suppliers.types';

import DataTable from '#/components/data-table/data-table.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Calendar } from '#/components/ui/calendar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';

import DeliveryDialog from '../components/inventory-delivery-dialog.tsx';
import DeliveryViewDialog from '../components/inventory-delivery-view-dialog.tsx';
import UnifiedStockDialog from '../components/unified-stock-dialog.tsx';

export default function DeliveriesPage() {
    const navigate = useNavigate({ from: '/admin/inventory/deliveries' });
    const { page, pageSize, search, supplierId, startDate, endDate } = Route.useSearch();

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
    const [unifiedOpen, setUnifiedOpen] = React.useState(false);
    const [selectedIngredient, setSelectedIngredient] = React.useState<IIngredient | null>(null);
    const [deliveryToEdit, setDeliveryToEdit] = React.useState<IDelivery | null>(null);
    const [deliveryToView, setDeliveryToView] = React.useState<IDelivery | null>(null);
    const [viewOpen, setViewOpen] = React.useState(false);

    // Date range state for UI Popover Calendar
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
        const from = startDate ? new Date(startDate) : undefined;
        const to = endDate ? new Date(endDate) : undefined;
        return from || to ? { from, to } : undefined;
    });

    React.useEffect(() => {
        const from = startDate ? new Date(startDate) : undefined;
        const to = endDate ? new Date(endDate) : undefined;
        setDateRange(from || to ? { from, to } : undefined);
    }, [startDate, endDate]);

    const dateRangeText = React.useMemo(() => {
        if (startDate && endDate) {
            return `${format(new Date(startDate), 'MMM d, yyyy')} – ${format(new Date(endDate), 'MMM d, yyyy')}`;
        }
        if (startDate) {
            return `From ${format(new Date(startDate), 'MMM d, yyyy')}`;
        }
        if (endDate) {
            return `Until ${format(new Date(endDate), 'MMM d, yyyy')}`;
        }
        return 'Filter by date range';
    }, [startDate, endDate]);

    const handleRangeSelect = (range: DateRange | undefined) => {
        setDateRange(range);
        if (range?.from) {
            setSearch({
                startDate: format(range.from, 'yyyy-MM-dd'),
                endDate: range.to ? format(range.to, 'yyyy-MM-dd') : '',
                page: 1
            });
        } else {
            setSearch({ startDate: '', endDate: '', page: 1 });
        }
    };

    // Query: Deliveries with filters
    const { data: deliveriesData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.DELIVERIES_LIST, { page, pageSize, search, supplierId, startDate, endDate }],
        queryFn: () =>
            getDeliveries({
                page,
                limit: pageSize,
                search,
                supplierId: supplierId || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            })
    });

    const hasActiveFilters = Boolean(supplierId || startDate || endDate || localSearch);

    const handleResetFilters = () => {
        setLocalSearch('');
        setDateRange(undefined);
        setSearch({
            search: '',
            supplierId: '',
            startDate: '',
            endDate: '',
            page: 1
        });
    };

    // Streamlined Essential Columns
    const columns = React.useMemo<ColumnDef<IDelivery>[]>(
        () => [
            {
                accessorKey: 'ingredient.name',
                header: 'Ingredient',
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-semibold text-foreground/90 text-sm">{row.original.ingredient?.name || '—'}</span>
                        {row.original.ingredient?.defaultUnit && (
                            <span className="text-[10px] text-muted-foreground">
                                Unit: {row.original.ingredient.defaultUnit.abbreviation || row.original.ingredient.defaultUnit.name}
                            </span>
                        )}
                    </div>
                )
            },
            {
                accessorKey: 'supplier.name',
                header: 'Supplier',
                cell: ({ row }) => <span className="text-xs text-muted-foreground font-medium">{row.original.supplier?.name || '—'}</span>
            },
            {
                accessorKey: 'batchNumber',
                header: 'Batch / Lot',
                cell: ({ row }) => <span className="text-xs font-mono font-medium text-foreground/80">{row.original.batchNumber || '—'}</span>
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
                cell: ({ row }) => {
                    const unitStr = row.original.ingredient?.defaultUnit
                        ? ` ${row.original.ingredient.defaultUnit.abbreviation || row.original.ingredient.defaultUnit.name}`
                        : '';
                    return (
                        <span className="text-sm font-bold text-emerald-600">
                            +{row.original.quantityReceived.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground">{unitStr}</span>
                        </span>
                    );
                }
            },
            {
                accessorKey: 'totalCost',
                header: 'Total Cost',
                cell: ({ row }) => <span className="text-sm font-bold text-foreground/90">₱{row.original.totalCost.toFixed(2)}</span>
            },
            {
                accessorKey: 'receivedAt',
                header: 'Received At',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="size-3" />
                        {format(new Date(row.original.receivedAt), 'MMM d, yyyy HH:mm')}
                    </span>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setDeliveryToView(row.original);
                                setViewOpen(true);
                            }}
                            className="size-8 text-muted-foreground hover:text-primary"
                            title="View Delivery Details"
                        >
                            <Eye className="size-4" />
                        </Button>

                        <RequirePermission module="Inventory Management" action="update">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setDeliveryToEdit(row.original);
                                    setSelectedIngredient(null);
                                    setDeliveryOpen(true);
                                }}
                                className="size-8 text-muted-foreground hover:text-foreground"
                                title="Edit Delivery Log"
                            >
                                <Pencil className="size-4" />
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
                                setUnifiedOpen(true);
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
                        <div className="flex flex-wrap items-center gap-2.5 w-full">
                            {/* Search Input */}
                            <Input
                                placeholder="Search ingredient, batch #, supplier..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="h-9 w-full sm:w-[220px] bg-background/50 text-xs"
                            />

                            {/* Supplier Filter */}
                            <div className="w-full sm:w-[200px]">
                                <InfiniteSelect<ISupplierListItem>
                                    queryKey={[QUERY_KEY.SUPPLIERS.SUPPLIERS_LIST]}
                                    fetchFn={async ({ pageParam, query }) => {
                                        return getSuppliersList({
                                            page: pageParam || 1,
                                            limit: 20,
                                            search: query,
                                            status: 'active'
                                        });
                                    }}
                                    getItems={(resPage) => resPage.data}
                                    getNextPageParam={(lastPage) => {
                                        return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                    }}
                                    value={supplierId || ''}
                                    onChange={(val) => setSearch({ supplierId: val || '', page: 1 })}
                                    getOptionValue={(item) => item.id}
                                    getOptionLabel={(item) => item.name}
                                    placeholder="Filter by Supplier..."
                                    searchPlaceholder="Search suppliers..."
                                />
                            </div>

                            {/* Date Range Picker Popover using UI Calendar */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-9 justify-start text-xs font-normal bg-background/50 border-border/60 gap-2 ${
                                            startDate || endDate ? 'border-primary/40 text-primary font-semibold' : 'text-muted-foreground'
                                        }`}
                                    >
                                        <CalendarIcon className="size-3.5 shrink-0" />
                                        <span>{dateRangeText}</span>
                                        {(startDate || endDate) && (
                                            <span
                                                role="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRangeSelect(undefined);
                                                }}
                                                className="ml-1 hover:text-foreground p-0.5 rounded-full"
                                            >
                                                <X className="size-3" />
                                            </span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="range"
                                        defaultMonth={dateRange?.from || new Date()}
                                        selected={dateRange}
                                        onSelect={handleRangeSelect}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Reset Filters Button */}
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetFilters}
                                    className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5"
                                >
                                    <RotateCcw className="size-3.5" /> Reset
                                </Button>
                            )}
                        </div>
                    }
                />
            </div>

            {/* Unified Stock Action Dialog */}
            <UnifiedStockDialog open={unifiedOpen} onOpenChange={setUnifiedOpen} initialMode="ADD_STOCK" preselectedIngredient={selectedIngredient} />

            {/* View Details Dialog */}
            <DeliveryViewDialog
                open={viewOpen}
                onOpenChange={setViewOpen}
                delivery={deliveryToView}
                onEdit={() => {
                    if (deliveryToView) {
                        setDeliveryToEdit(deliveryToView);
                        setDeliveryOpen(true);
                    }
                }}
            />

            {/* Edit Delivery Dialog */}
            <DeliveryDialog
                open={deliveryOpen}
                onOpenChange={(open) => {
                    setDeliveryOpen(open);
                    if (!open) {
                        setDeliveryToEdit(null);
                        setSelectedIngredient(null);
                    }
                }}
                preselectedIngredient={selectedIngredient}
                deliveryToEdit={deliveryToEdit}
            />
        </div>
    );
}
