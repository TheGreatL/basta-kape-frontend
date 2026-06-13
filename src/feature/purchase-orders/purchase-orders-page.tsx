import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Eye, Search, X, Calendar, FileText, User, Truck, Trash2, CheckCircle, Send, XCircle, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Route } from '#/routes/admin/purchase-orders.tsx';
import { getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updatePurchaseOrderStatus } from '#/api/purchase-orders.api.ts';
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
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import type { IPurchaseOrder, IPurchaseOrderItem } from '#/api/purchase-orders.api.ts';
import type { ISupplierListItem } from '../suppliers/suppliers.types';
import type { IIngredient } from '../inventory/inventory.types';

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

    // Fetch details for selected PO
    const { data: selectedPODetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDER_DETAILS, selectedPO?.id],
        queryFn: () => getPurchaseOrderById(selectedPO!.id),
        enabled: !!selectedPO?.id
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
            setSelectedPO(updatedPO);
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

        createPOMutation.mutate({
            supplierId: newPOSupplierId,
            notes: newPONotes.trim() || undefined,
            items: validItems.map((item) => ({
                ingredientId: item.ingredientId,
                quantity: Number(item.quantity),
                unitCost: Number(item.unitCost)
            }))
        });
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
                cell: ({ row }) => (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setSelectedPO(row.original)}
                    >
                        <Eye className="size-4" />
                        <span className="sr-only">Inspect Details</span>
                    </Button>
                )
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

                            <Select
                                value={supplierId || 'all'}
                                onValueChange={(val) => setSearchParams({ supplierId: val === 'all' ? '' : val, page: 1 })}
                            >
                                <SelectTrigger className="h-9 min-w-[170px] bg-background/50 text-xs">
                                    <SelectValue placeholder="All Suppliers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">
                                        All Suppliers
                                    </SelectItem>
                                    {suppliers.map((s: ISupplierListItem) => (
                                        <SelectItem key={s.id} value={s.id} className="text-xs">
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

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
                <DialogContent className="max-w-2xl w-full rounded-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="font-extrabold text-foreground flex items-center gap-2">
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
                            <Select value={newPOSupplierId} onValueChange={setNewPOSupplierId}>
                                <SelectTrigger className="h-9 text-xs bg-background/50">
                                    <SelectValue placeholder="Select Supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map((s: ISupplierListItem) => (
                                        <SelectItem key={s.id} value={s.id} className="text-xs">
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                        <div key={index} className="flex items-end gap-2 p-3 border border-border/40 rounded-xl bg-muted/20 relative">
                                            {/* Ingredient Picker */}
                                            <div className="flex-1 space-y-1">
                                                <span className="text-xs uppercase font-bold text-muted-foreground">Ingredient</span>
                                                <Select
                                                    value={item.ingredientId}
                                                    onValueChange={(val) => handleItemChange(index, 'ingredientId', val)}
                                                >
                                                    <SelectTrigger className="h-8.5 text-xs bg-background/50">
                                                        <SelectValue placeholder="Select Ingredient" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ingredients.map((ing: IIngredient) => (
                                                            <SelectItem key={ing.id} value={ing.id} className="text-xs">
                                                                {ing.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Quantity */}
                                            <div className="w-[110px] space-y-1">
                                                <span className="text-xs uppercase font-bold text-muted-foreground flex justify-between">
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
                                                <span className="text-xs uppercase font-bold text-muted-foreground">Unit Cost (₱)</span>
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
                                                <span className="text-xs uppercase font-bold text-muted-foreground block">Subtotal</span>
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
                            <span className="text-xs font-extrabold text-primary">Estimated Purchase Order Total</span>
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
            <Dialog open={!!selectedPO} onOpenChange={(open) => !open && setSelectedPO(null)}>
                <DialogContent className="max-w-xl w-full rounded-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="font-extrabold text-foreground flex items-center gap-2">
                            <FileText className="size-5 text-primary" />
                            Purchase Order Details
                        </DialogTitle>
                        <DialogDescription className="text-xs">Review procurement items list and coordinate status updates.</DialogDescription>
                    </DialogHeader>

                    {isDetailsLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 gap-2">
                            <span className="animate-spin text-primary size-5 border-2 border-primary border-t-transparent rounded-full" />
                            <span className="text-xs text-muted-foreground font-semibold">Loading details...</span>
                        </div>
                    ) : selectedPODetails ? (
                        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 my-2 min-h-0">
                            {/* Summary Card */}
                            <div className="p-4 bg-muted/30 border border-border/40 rounded-2xl grid grid-cols-2 gap-4">
                                <div className="space-y-0.5">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">PO Number</span>
                                    <h4 className="font-mono font-bold text-sm text-foreground">{selectedPODetails.poNumber}</h4>
                                </div>
                                <div className="space-y-0.5 flex flex-col items-end">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Status</span>
                                    <Badge
                                        variant="outline"
                                        className={`text-xs font-bold py-0.5 px-2 capitalize ${getStatusBadgeClass(selectedPODetails.status)}`}
                                    >
                                        {selectedPODetails.status.toLowerCase()}
                                    </Badge>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Supplier</span>
                                    <p className="text-xs font-bold text-foreground">{selectedPODetails.supplier.name}</p>
                                </div>
                                <div className="space-y-0.5 flex flex-col items-end">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Total Amount</span>
                                    <p className="text-sm font-bold text-foreground">
                                        ₱{selectedPODetails.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Additional Metadata */}
                            <div className="space-y-2 text-xs border-b border-border/30 pb-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground font-medium">Created By</span>
                                    <span className="font-bold text-foreground">
                                        {`${selectedPODetails.createdBy.firstName} ${selectedPODetails.createdBy.lastName} (@${selectedPODetails.createdBy.username})`}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground font-medium">Date Created</span>
                                    <span className="font-bold text-foreground">
                                        {format(new Date(selectedPODetails.createdAt), 'MMM dd, yyyy hh:mm a')}
                                    </span>
                                </div>
                                {selectedPODetails.orderedAt && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Date Sent/Ordered</span>
                                        <span className="font-bold text-foreground">
                                            {format(new Date(selectedPODetails.orderedAt), 'MMM dd, yyyy hh:mm a')}
                                        </span>
                                    </div>
                                )}
                                {selectedPODetails.receivedAt && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Date Received</span>
                                        <span className="font-bold text-emerald-600">
                                            {format(new Date(selectedPODetails.receivedAt), 'MMM dd, yyyy hh:mm a')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {selectedPODetails.notes && (
                                <div className="space-y-1">
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Notes</span>
                                    <p className="text-xs p-3 bg-muted/40 border border-border/20 rounded-xl text-foreground/90 italic">
                                        "{selectedPODetails.notes}"
                                    </p>
                                </div>
                            )}

                            {/* Items List */}
                            <div className="space-y-2">
                                <span className="text-xs uppercase font-bold text-muted-foreground">Procurement Line Items</span>
                                <div className="border border-border/40 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-muted/40 border-b border-border/40 font-extrabold text-muted-foreground">
                                                <th className="p-3">Ingredient</th>
                                                <th className="p-3 text-right">Quantity</th>
                                                <th className="p-3 text-right">Unit Cost</th>
                                                <th className="p-3 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPODetails.items?.map((item: IPurchaseOrderItem) => {
                                                const abbrev = item.ingredient.defaultUnit?.abbreviation || '';
                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className="border-b border-border/30 last:border-0 hover:bg-muted/10 font-medium"
                                                    >
                                                        <td className="p-3 font-bold text-foreground">{item.ingredient.name}</td>
                                                        <td className="p-3 text-right font-mono font-bold text-foreground">
                                                            {item.quantity} {abbrev}
                                                        </td>
                                                        <td className="p-3 text-right font-mono text-muted-foreground">
                                                            ₱{item.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold text-foreground">
                                                            ₱{item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {selectedPODetails && (
                        <DialogFooter className="shrink-0 pt-4 border-t border-border/40 flex flex-wrap gap-2 justify-between items-center">
                            {/* Status transitions guard (DRAFT -> SENT -> RECEIVED) */}
                            <div className="flex gap-1.5 w-full sm:w-auto">
                                {selectedPODetails.status === 'DRAFT' && (
                                    <>
                                        <RequirePermission module="Purchase Orders Management" action="update">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => updateStatusMutation.mutate({ id: selectedPODetails.id, status: 'SENT' })}
                                                disabled={updateStatusMutation.isPending}
                                                className="h-9 text-xs border-blue-200 hover:bg-blue-50 hover:text-blue-700 font-bold gap-1 text-blue-600 dark:border-blue-900/40 dark:hover:bg-blue-950/20"
                                            >
                                                <Send className="size-3.5" /> Mark as Sent
                                            </Button>
                                        </RequirePermission>
                                        <RequirePermission module="Purchase Orders Management" action="update">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => updateStatusMutation.mutate({ id: selectedPODetails.id, status: 'CANCELLED' })}
                                                disabled={updateStatusMutation.isPending}
                                                className="h-9 text-xs border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-bold gap-1 text-rose-600 dark:border-rose-900/40 dark:hover:bg-rose-950/20"
                                            >
                                                <XCircle className="size-3.5" /> Cancel PO
                                            </Button>
                                        </RequirePermission>
                                    </>
                                )}

                                {selectedPODetails.status === 'SENT' && (
                                    <>
                                        <RequirePermission module="Purchase Orders Management" action="update">
                                            <Button
                                                size="sm"
                                                onClick={() => updateStatusMutation.mutate({ id: selectedPODetails.id, status: 'RECEIVED' })}
                                                disabled={updateStatusMutation.isPending}
                                                className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-sm"
                                            >
                                                <CheckCircle className="size-3.5" /> Mark as Received
                                            </Button>
                                        </RequirePermission>
                                        <RequirePermission module="Purchase Orders Management" action="update">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => updateStatusMutation.mutate({ id: selectedPODetails.id, status: 'CANCELLED' })}
                                                disabled={updateStatusMutation.isPending}
                                                className="h-9 text-xs border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-bold gap-1 text-rose-600 dark:border-rose-900/40 dark:hover:bg-rose-950/20"
                                            >
                                                <XCircle className="size-3.5" /> Cancel PO
                                            </Button>
                                        </RequirePermission>
                                    </>
                                )}
                            </div>

                            <Button variant="secondary" onClick={() => setSelectedPO(null)} className="h-9 w-24 rounded-lg text-xs font-bold ml-auto">
                                Close
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
