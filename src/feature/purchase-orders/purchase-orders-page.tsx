import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Eye, Search, X, Calendar, User, Truck, Trash2, ShoppingCart, Send, XCircle, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Route } from '#/routes/admin/purchase-orders.tsx';
import { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus } from '#/api/purchase-orders.api.ts';
import { getSuppliersList } from '#/api/suppliers.api.ts';
import { getIngredients } from '#/api/inventory.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog.tsx';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '#/components/ui/alert-dialog.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '#/components/ui/tooltip.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import type { IPurchaseOrder } from '#/api/purchase-orders.api.ts';
import type { ISupplierListItem } from '../suppliers/suppliers.types';
import type { IIngredient } from '../inventory/inventory.types';
import PurchaseOrderDetailDialog from './components/purchase-order-detail-dialog';
import UpdatePurchaseOrderDialog from './components/update-purchase-order-dialog';

interface ICreateItemInput {
    ingredientId: string;
    quantity: number;
    unitCost: number;
}

export default function PurchaseOrdersPage() {
    const navigate = useNavigate({ from: '/admin/purchase-orders' });
    const queryClient = useQueryClient();
    const { page, pageSize, search, status, supplierId } = Route.useSearch();

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    const [selectedPO, setSelectedPO] = React.useState<IPurchaseOrder | null>(null);
    const [isCreateOpen, setIsCreateOpen] = React.useState(false);

    // Form states for PO creation
    const [newPOSupplierId, setNewPOSupplierId] = React.useState<string>('');
    const [newPONotes, setNewPONotes] = React.useState<string>('');
    const [newPOItems, setNewPOItems] = React.useState<ICreateItemInput[]>([{ ingredientId: '', quantity: 1, unitCost: 0 }]);
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

    // Queries: Suppliers (for filters & create picker)
    const { data: suppliersData } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.ACTIVE_SUPPLIERS_LIST],
        queryFn: () => getSuppliersList({ page: 1, limit: 50, status: 'active' })
    });
    const suppliers = suppliersData?.data || [];

    // Queries: Ingredients (for create picker)
    const { data: ingredientsData } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.ACTIVE_INGREDIENTS_LIST],
        queryFn: () => getIngredients({ page: 1, limit: 50, status: 'active' })
    });
    const ingredients = ingredientsData?.data || [];

    // Mutation: Create PO
    const createPOMutation = useMutation({
        mutationFn: createPurchaseOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDERS_LIST] });
            toast.success('Purchase order draft created successfully');
            setIsCreateOpen(false);
            resetCreateForm();
        },
        onError: (err) => {
            toast.error('Failed to create purchase order', {
                description: getErrorMessage(err)
            });
        }
    });

    // Mutation: Update PO Status
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status: poStatus }: { id: string; status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED' }) =>
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

    const resetCreateForm = () => {
        setNewPOSupplierId('');
        setNewPONotes('');
        setNewPOItems([{ ingredientId: '', quantity: 1, unitCost: 0 }]);
    };

    const handleClearFilters = () => {
        setLocalSearch('');
        setSearchParams({
            page: 1,
            search: '',
            status: '',
            supplierId: ''
        });
    };

    const handleAddItem = () => {
        setNewPOItems((prev) => [...prev, { ingredientId: '', quantity: 1, unitCost: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        if (newPOItems.length === 1) {
            toast.warning('Purchase orders must contain at least one line item');
            return;
        }
        setNewPOItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleItemChange = (index: number, field: keyof ICreateItemInput, value: any) => {
        setNewPOItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== index) return item;
                const updated = { ...item, [field]: value };
                // If ingredient is changed, fill in unit cost from previous purchases or default if desired, otherwise leave empty
                return updated;
            })
        );
    };

    const calculatePOTotal = () => {
        return newPOItems.reduce((acc, item) => {
            const qty = Number(item.quantity) || 0;
            const cost = Number(item.unitCost) || 0;
            return acc + qty * cost;
        }, 0);
    };

    const handleSavePO = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPOSupplierId) {
            toast.error('Please select a supplier');
            return;
        }

        const validItems = newPOItems.filter((item) => item.ingredientId && item.quantity > 0 && item.unitCost >= 0);
        if (validItems.length === 0) {
            toast.error('Please add at least one valid line item with quantity > 0');
            return;
        }

        const payload = {
            supplierId: newPOSupplierId,
            notes: newPONotes.trim() || undefined,
            items: validItems.map((item) => ({
                ingredientId: item.ingredientId,
                quantity: Number(item.quantity),
                unitCost: Number(item.unitCost)
            }))
        };

        createPOMutation.mutate(payload);
    };

    const getStatusBadgeClass = (poStatus: string) => {
        switch (poStatus) {
            case 'DRAFT':
                return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800';
            case 'SENT':
                return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40';
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
                cell: ({ row }) => (
                    <Badge variant="outline" className={`text-xs font-semibold py-0.5 px-2 capitalize ${getStatusBadgeClass(row.original.status)}`}>
                        {row.original.status.toLowerCase()}
                    </Badge>
                )
            },
            {
                accessorKey: 'totalAmount',
                header: 'Total Amount',
                cell: ({ row }) => (
                    <span className="font-bold text-foreground">
                        ₱{row.original.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                )
            },
            {
                accessorKey: 'createdAt',
                header: 'Date Created',
                cell: ({ row }) => (
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        {format(new Date(row.original.createdAt), 'MMM dd, yyyy')}
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
                cell: ({ row }) => {
                    const po = row.original;
                    return (
                        <TooltipProvider>
                            <div className="flex items-center gap-1">
                                {/* Inspect Details Button */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                            onClick={() => setSelectedPO(po)}
                                        >
                                            <Eye className="size-4" />
                                            <span className="sr-only">Inspect Details</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Inspect Details</TooltipContent>
                                </Tooltip>

                                {/* Edit PO (DRAFT only) */}
                                {po.status === 'DRAFT' && (
                                    <RequirePermission module="Purchase Orders Management" action="update">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                                    onClick={() => setEditingPOId(po.id)}
                                                >
                                                    <Pencil className="size-4 animate-in duration-100" />
                                                    <span className="sr-only">Edit PO</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Edit Draft PO</TooltipContent>
                                        </Tooltip>
                                    </RequirePermission>
                                )}

                                {/* Mark as Sent (DRAFT only) */}
                                {po.status === 'DRAFT' && (
                                    <RequirePermission module="Purchase Orders Management" action="update">
                                        <AlertDialog>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                                            disabled={updateStatusMutation.isPending}
                                                        >
                                                            <Send className="size-4" />
                                                            <span className="sr-only">Mark as Sent</span>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Mark as Sent</TooltipContent>
                                            </Tooltip>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="font-bold text-foreground">
                                                        Mark Purchase Order as Sent
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to mark purchase order{' '}
                                                        <strong className="font-mono text-foreground">{po.poNumber}</strong> as sent? This will change
                                                        its status to SENT.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="h-9 bg-primary text-primary-foreground hover:bg-primary/95"
                                                        onClick={() => updateStatusMutation.mutate({ id: po.id, status: 'SENT' })}
                                                    >
                                                        Mark as Sent
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </RequirePermission>
                                )}

                                {/* Cancel PO (DRAFT or SENT) */}
                                {(po.status === 'DRAFT' || po.status === 'SENT') && (
                                    <RequirePermission module="Purchase Orders Management" action="update">
                                        <AlertDialog>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                                            disabled={updateStatusMutation.isPending}
                                                        >
                                                            <XCircle className="size-4" />
                                                            <span className="sr-only">Cancel PO</span>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Cancel PO</TooltipContent>
                                            </Tooltip>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="font-bold text-foreground">Cancel Purchase Order</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to cancel purchase order{' '}
                                                        <strong className="font-mono text-foreground">{po.poNumber}</strong>? This action is permanent
                                                        and cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="h-9 bg-destructive text-destructive-foreground hover:bg-destructive/95"
                                                        onClick={() => updateStatusMutation.mutate({ id: po.id, status: 'CANCELLED' })}
                                                    >
                                                        Cancel PO
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </RequirePermission>
                                )}
                            </div>
                        </TooltipProvider>
                    );
                }
            }
        ],
        []
    );

    return (
        <div className="flex flex-col gap-6 min-h-screen">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Purchase Orders Management</h1>
                        <p className="text-xs text-muted-foreground">
                            Manage procurement lists, track order status from suppliers, and reconcile ingredient delivery records.
                        </p>
                    </div>
                </div>

                <RequirePermission module="Purchase Orders Management" action="create">
                    <Button onClick={() => setIsCreateOpen(true)} className="h-9 gap-1.5 shadow-sm font-bold">
                        <Plus className="size-4" />
                        Create Purchase Order
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
                                <SelectTrigger className="h-9 min-w-[130px] bg-background/50 text-xs capitalize">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">
                                        All Statuses
                                    </SelectItem>
                                    <SelectItem value="DRAFT" className="text-xs">
                                        Draft
                                    </SelectItem>
                                    <SelectItem value="SENT" className="text-xs">
                                        Sent
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
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-5xl w-full rounded-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="font-bold text-foreground flex items-center gap-2">
                            <ShoppingCart className="size-5 text-primary" />
                            Create Purchase Order
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Create a procurement request sheet. The order will start in the DRAFT state.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSavePO} className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 my-2 min-h-0">
                        {/* Supplier */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Supplier</label>
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
                                getItems={(pageItem) => pageItem.data}
                                getNextPageParam={(lastPage) => {
                                    return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                }}
                                value={newPOSupplierId}
                                onChange={(val) => setNewPOSupplierId(val || '')}
                                getOptionValue={(item) => item.id}
                                getOptionLabel={(item) => `${item.name}`}
                                placeholder="Select Supplier"
                                searchPlaceholder="Search suppliers..."
                                className="h-9 text-xs bg-background/50"
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Internal Notes (Optional)</label>
                            <Textarea
                                placeholder="Add notes for this purchase (e.g. urgent order, delivery instructions)..."
                                value={newPONotes}
                                onChange={(e) => setNewPONotes(e.target.value)}
                                className="text-xs bg-background/50 min-h-[60px]"
                            />
                        </div>

                        {/* Line Items */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-foreground">Ingredient Line Items</label>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="h-8 text-xs font-bold gap-1">
                                    <Plus className="size-3" /> Add Item
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {newPOItems.map((item, index) => {
                                    const selectedIng = ingredients.find((i: IIngredient) => i.id === item.ingredientId);
                                    const unitAbbrev = selectedIng?.defaultUnit?.abbreviation || '';

                                    return (
                                        <div key={index} className="flex items-end gap-3 p-3 border border-border/40 rounded-xl bg-muted/20 relative">
                                            {/* Ingredient Picker */}
                                            <div className="flex-1 space-y-1">
                                                <span className="text-xs uppercase font-bold text-muted-foreground whitespace-nowrap">
                                                    Ingredient
                                                </span>
                                                <InfiniteSelect<IIngredient>
                                                    queryKey={[QUERY_KEY.INVENTORY.INGREDIENTS_LIST, 'po-item', index]}
                                                    fetchFn={async ({ pageParam, query }) => {
                                                        return getIngredients({
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
                                                    value={item.ingredientId}
                                                    onChange={(val) => handleItemChange(index, 'ingredientId', val || '')}
                                                    getOptionValue={(i) => i.id}
                                                    getOptionLabel={(i) => `${i.name}`}
                                                    selectedItem={ingredients.find((i) => i.id === item.ingredientId)}
                                                    placeholder="Select Ingredient"
                                                    searchPlaceholder="Search ingredients..."
                                                    className="h-8.5 text-xs bg-background/50"
                                                />
                                            </div>

                                            {/* Quantity */}
                                            <div className="w-[110px] space-y-1">
                                                <span className="text-xs uppercase font-bold text-muted-foreground whitespace-nowrap flex justify-between">
                                                    Qty{' '}
                                                    {unitAbbrev && (
                                                        <span className="text-xs text-muted-foreground/80 font-normal">({unitAbbrev})</span>
                                                    )}
                                                </span>
                                                <Input
                                                    type="number"
                                                    min="0.01"
                                                    step="any"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className="h-8.5 text-xs bg-background/50 font-bold"
                                                />
                                            </div>

                                            {/* Unit Cost */}
                                            <div className="w-[120px] space-y-1">
                                                <span className="text-xs uppercase font-bold text-muted-foreground whitespace-nowrap">
                                                    Unit Cost (₱)
                                                </span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={item.unitCost}
                                                    onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
                                                    className="h-8.5 text-xs bg-background/50 font-bold"
                                                />
                                            </div>

                                            {/* Total */}
                                            <div className="w-[100px] text-right pb-2 space-y-0.5 shrink-0">
                                                <span className="text-xs uppercase font-bold text-muted-foreground whitespace-nowrap block">
                                                    Subtotal
                                                </span>
                                                <span className="text-xs font-bold text-foreground block">
                                                    ₱
                                                    {((item.quantity || 0) * (item.unitCost || 0)).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2
                                                    })}
                                                </span>
                                            </div>

                                            {/* Trash button */}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-8.5 text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={() => handleRemoveItem(index)}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Grand Total */}
                        <div className="p-3.5 bg-primary/5 border border-primary/15 rounded-2xl flex justify-between items-center mt-2 shrink-0">
                            <span className="text-xs font-bold text-primary">Estimated Purchase Order Total</span>
                            <span className="text-lg font-bold text-primary font-mono">
                                ₱{calculatePOTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </form>

                    <DialogFooter className="shrink-0 pt-4 border-t border-border/40 gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsCreateOpen(false);
                                resetCreateForm();
                            }}
                            className="h-9 w-24 rounded-lg text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSavePO}
                            disabled={createPOMutation.isPending}
                            className="h-9 w-32 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95"
                        >
                            {createPOMutation.isPending ? 'Saving...' : 'Save Draft'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Inspect Detail Dialog */}
            <PurchaseOrderDetailDialog open={!!selectedPO} onOpenChange={(open) => !open && setSelectedPO(null)} poId={selectedPO?.id || null} />

            {/* Update Purchase Order Dialog */}
            <UpdatePurchaseOrderDialog open={!!editingPOId} onOpenChange={(open) => !open && setEditingPOId(null)} poId={editingPOId} />
        </div>
    );
}
