import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Search, X, Calendar, User, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Route } from '#/routes/admin/purchase-orders.tsx';
import { getPurchaseOrders, updatePurchaseOrderStatus } from '#/api/purchase-orders.api.ts';
import { getSuppliersList } from '#/api/suppliers.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import type { IPurchaseOrder } from '#/api/purchase-orders.api.ts';
import type { ISupplierListItem } from '../suppliers/suppliers.types';
import PurchaseOrderDetailDialog from './components/purchase-order-detail-dialog';
import UpdatePurchaseOrderDialog from './components/update-purchase-order-dialog';
import CreatePurchaseOrderDialog from './components/create-purchase-order-dialog';
import PurchaseOrderRowActions from './components/purchase-order-row-actions';

export default function PurchaseOrdersPage() {
    const navigate = useNavigate({ from: '/admin/purchase-orders' });
    const queryClient = useQueryClient();
    const { page, pageSize, search, status, supplierId } = Route.useSearch();

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    const [selectedPO, setSelectedPO] = React.useState<IPurchaseOrder | null>(null);
    const [openReceiveOnDetails, setOpenReceiveOnDetails] = React.useState(false);
    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [editingPOId, setEditingPOId] = React.useState<string | null>(null);

    const setSearchParams = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        if (debouncedSearch !== (search || '')) {
            setSearchParams({ search: debouncedSearch, page: 1 });
        }
    }, [debouncedSearch]);

    // Queries: Purchase Orders List
    const { data: poData, isLoading: isPoLoading } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDERS_LIST, { page, pageSize, search, status, supplierId }],
        queryFn: () =>
            getPurchaseOrders({
                page,
                limit: pageSize,
                search,
                status: status || undefined,
                supplierId: supplierId || undefined
            })
    });

    // Queries: Suppliers (for filter picker)
    const { data: suppliersData } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.ACTIVE_SUPPLIERS_LIST],
        queryFn: () => getSuppliersList({ page: 1, limit: 50, status: 'active' })
    });
    const suppliers = suppliersData?.data || [];

    // Mutation: Update PO Status
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status: poStatus }: { id: string; status: 'DRAFT' | 'FINAL_DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED' }) =>
            updatePurchaseOrderStatus(id, poStatus),
        onSuccess: (updatedPO) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] }); // Invalidate inventory stock levels
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDER_DETAILS, updatedPO.id] });
            toast.success(`Purchase order status updated to ${updatedPO.status}`);
        },
        onError: (err) => {
            toast.error('Failed to update status', {
                description: getErrorMessage(err)
            });
        }
    });

    const handleClearFilters = () => {
        setLocalSearch('');
        setSearchParams({
            page: 1,
            search: '',
            status: '',
            supplierId: ''
        });
    };

    const getStatusBadgeClass = (poStatus: string) => {
        switch (poStatus) {
            case 'DRAFT':
                return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800';
            case 'FINAL_DRAFT':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40';
            case 'SENT':
                return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40';
            case 'PARTIALLY_RECEIVED':
                return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40';
            case 'RECEIVED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40';
            case 'CANCELLED':
                return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const columns = React.useMemo<ColumnDef<IPurchaseOrder>[]>(
        () => [
            {
                accessorKey: 'poNumber',
                header: 'PO Number',
                cell: ({ row }) => <span className="font-mono text-sm font-bold text-foreground">{row.original.poNumber}</span>
            },
            {
                accessorKey: 'supplier.name',
                header: 'Supplier',
                cell: ({ row }) => <span className="text-xs font-bold text-foreground/85">{row.original.supplier.name}</span>
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const st = row.original.status;
                    const label = st === 'FINAL_DRAFT' ? 'Final Draft' : st === 'PARTIALLY_RECEIVED' ? 'Partially Received' : st.toLowerCase();
                    return (
                        <Badge variant="outline" className={`text-xs font-semibold py-0.5 px-2 capitalize ${getStatusBadgeClass(st)}`}>
                            {label}
                        </Badge>
                    );
                }
            },
            {
                accessorKey: 'totalAmount',
                header: 'Total Amount',
                cell: ({ row }) => {
                    const po = row.original;
                    if (po.status === 'DRAFT' || po.status === 'FINAL_DRAFT' || po.status === 'SENT' || po.totalAmount === 0) {
                        return (
                            <Badge variant="outline" className="text-xs font-semibold text-muted-foreground border-dashed bg-muted/20">
                                Calculated upon delivery
                            </Badge>
                        );
                    }
                    return (
                        <span className="text-xs font-bold text-foreground font-mono">
                            ₱{po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    );
                }
            },
            {
                accessorKey: 'createdAt',
                header: 'Date Created',
                cell: ({ row }) => (
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="size-3.5" />
                        {format(new Date(row.original.createdAt), 'MMM dd, yyyy • hh:mm a')}
                    </span>
                )
            },
            {
                accessorKey: 'createdBy',
                header: 'Created By',
                cell: ({ row }) => (
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <User className="size-3 text-muted-foreground" />
                        {`${row.original.createdBy.firstName} ${row.original.createdBy.lastName}`}
                    </span>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <PurchaseOrderRowActions
                        po={row.original}
                        onInspect={(po) => {
                            setSelectedPO(po);
                            setOpenReceiveOnDetails(false);
                        }}
                        onReceive={(po) => {
                            setSelectedPO(po);
                            setOpenReceiveOnDetails(true);
                        }}
                        onEdit={(id) => setEditingPOId(id)}
                        onUpdateStatus={updateStatusMutation.mutate}
                        isUpdatingStatus={updateStatusMutation.isPending}
                    />
                )
            }
        ],
        [updateStatusMutation.isPending]
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                        <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Purchase Orders</h1>
                        <p className="text-xs text-muted-foreground">
                            Order ingredients from suppliers, track order status, and check received stocks.
                        </p>
                    </div>
                </div>

                <RequirePermission module="Purchase Orders Management" action="create">
                    <Button onClick={() => setIsCreateOpen(true)} className="h-9 gap-1.5 shadow-sm font-bold">
                        <Plus className="size-4" />
                        New Purchase Order
                    </Button>
                </RequirePermission>
            </div>

            {/* Datatable */}
            <div className="space-y-4">
                <DataTable
                    columns={columns}
                    data={poData?.data || []}
                    pageCount={poData?.meta.pageCount || 1}
                    pageIndex={page - 1}
                    pageSize={pageSize}
                    onPaginationChange={(idx, size) => setSearchParams({ page: idx + 1, pageSize: size })}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={isPoLoading}
                    showColumnVisibilityToggle={true}
                    filterContent={
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-[220px]">
                                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search PO number or notes..."
                                    value={localSearch}
                                    onChange={(e) => setLocalSearch(e.target.value)}
                                    className="h-9 pl-8.5 bg-background/50 text-xs"
                                />
                            </div>

                            <Select value={status || 'all'} onValueChange={(val) => setSearchParams({ status: val === 'all' ? '' : val, page: 1 })}>
                                <SelectTrigger className="h-9 min-w-[155px] bg-background/50 text-xs">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">
                                        All Statuses
                                    </SelectItem>
                                    <SelectItem value="DRAFT" className="text-xs">
                                        Draft
                                    </SelectItem>
                                    <SelectItem value="FINAL_DRAFT" className="text-xs">
                                        Final Draft
                                    </SelectItem>
                                    <SelectItem value="SENT" className="text-xs">
                                        Sent
                                    </SelectItem>
                                    <SelectItem value="PARTIALLY_RECEIVED" className="text-xs">
                                        Partially Received
                                    </SelectItem>
                                    <SelectItem value="RECEIVED" className="text-xs">
                                        Received
                                    </SelectItem>
                                    <SelectItem value="CANCELLED" className="text-xs">
                                        Cancelled
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <InfiniteSelect<ISupplierListItem>
                                queryKey={[QUERY_KEY.SUPPLIERS.SUPPLIERS_LIST, 'filter']}
                                fetchFn={async ({ pageParam, query }) => {
                                    return getSuppliersList({
                                        page: pageParam || 1,
                                        limit: 20,
                                        search: query,
                                        status: 'active'
                                    });
                                }}
                                getItems={(pageItem) => pageItem.data}
                                getNextPageParam={(lastPage) => {
                                    return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                }}
                                value={supplierId || undefined}
                                onChange={(val) => setSearchParams({ supplierId: val || '', page: 1 })}
                                getOptionValue={(item) => item.id}
                                getOptionLabel={(item) => `${item.name}`}
                                selectedItem={suppliers.find((s) => s.id === supplierId)}
                                placeholder="All Suppliers"
                                searchPlaceholder="Search suppliers..."
                                className="h-9 min-w-[170px] bg-background/50 text-xs md:w-[180px]"
                            />

                            {(search || status || supplierId) && (
                                <Button variant="ghost" onClick={handleClearFilters} className="h-9 text-xs px-2.5 gap-1.5">
                                    <X className="size-3.5" /> Clear Filters
                                </Button>
                            )}
                        </div>
                    }
                />
            </div>

            {/* Create Purchase Order Dialog */}
            <CreatePurchaseOrderDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

            {/* Inspect Detail Dialog */}
            <PurchaseOrderDetailDialog
                open={!!selectedPO}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedPO(null);
                        setOpenReceiveOnDetails(false);
                    }
                }}
                poId={selectedPO?.id || null}
                initialOpenReceive={openReceiveOnDetails}
            />

            {/* Update Purchase Order Dialog */}
            <UpdatePurchaseOrderDialog open={!!editingPOId} onOpenChange={(open) => !open && setEditingPOId(null)} poId={editingPOId} />
        </div>
    );
}
