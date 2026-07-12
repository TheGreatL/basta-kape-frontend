import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { getPurchaseOrderById, updatePurchaseOrder } from '#/api/purchase-orders.api.ts';
import { getSuppliersList } from '#/api/suppliers.api.ts';
import { getIngredients } from '#/api/inventory.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import type { ISupplierListItem } from '#/feature/suppliers/suppliers.types';
import type { IIngredient } from '#/feature/inventory/inventory.types';

interface ICreateItemInput {
    ingredientId: string;
    quantity: number;
    unitCost: number;
}

interface UpdatePurchaseOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    poId: string | null;
}

export default function UpdatePurchaseOrderDialog({ open, onOpenChange, poId }: UpdatePurchaseOrderDialogProps) {
    const queryClient = useQueryClient();

    // Form states
    const [supplierId, setSupplierId] = React.useState<string>('');
    const [notes, setNotes] = React.useState<string>('');
    const [items, setItems] = React.useState<ICreateItemInput[]>([{ ingredientId: '', quantity: 1, unitCost: 0 }]);

    // Query: PO Details
    const { data: poDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDER_DETAILS, 'edit-dialog', poId],
        queryFn: () => getPurchaseOrderById(poId!),
        enabled: open && !!poId
    });

    // Queries: Ingredients list for unit abbreviations lookup
    const { data: ingredientsData } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.ACTIVE_INGREDIENTS_LIST],
        queryFn: () => getIngredients({ page: 1, limit: 50, status: 'active' })
    });
    const ingredients = ingredientsData?.data || [];

    // Initialize/sync form with PO Details
    React.useEffect(() => {
        if (poDetails) {
            setSupplierId(poDetails.supplierId);
            setNotes(poDetails.notes || '');
            if (poDetails.items) {
                setItems(
                    poDetails.items.map((item) => ({
                        ingredientId: item.ingredientId,
                        quantity: item.quantity,
                        unitCost: item.unitCost
                    }))
                );
            }
        }
    }, [poDetails]);

    // Reset form states on close
    React.useEffect(() => {
        if (!open) {
            setSupplierId('');
            setNotes('');
            setItems([{ ingredientId: '', quantity: 1, unitCost: 0 }]);
        }
    }, [open]);

    // Mutation: Update PO
    const updatePOMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updatePurchaseOrder(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDER_DETAILS, poId] });
            toast.success('Purchase order updated successfully');
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to update purchase order', {
                description: getErrorMessage(err)
            });
        }
    });

    const handleAddItem = () => {
        setItems((prev) => [...prev, { ingredientId: '', quantity: 1, unitCost: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length === 1) {
            toast.warning('Purchase orders must contain at least one line item');
            return;
        }
        setItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleItemChange = (index: number, field: keyof ICreateItemInput, value: any) => {
        setItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== index) return item;
                return { ...item, [field]: value };
            })
        );
    };

    const calculatePOTotal = () => {
        return items.reduce((acc, item) => {
            const qty = Number(item.quantity) || 0;
            const cost = Number(item.unitCost) || 0;
            return acc + qty * cost;
        }, 0);
    };

    const handleSavePO = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId) {
            toast.error('Please select a supplier');
            return;
        }

        const validItems = items.filter((item) => item.ingredientId && item.quantity > 0 && item.unitCost >= 0);
        if (validItems.length === 0) {
            toast.error('Please add at least one valid line item with quantity > 0');
            return;
        }

        updatePOMutation.mutate({
            id: poId!,
            data: {
                supplierId,
                notes: notes.trim() || null,
                items: validItems.map((item) => ({
                    ingredientId: item.ingredientId,
                    quantity: Number(item.quantity),
                    unitCost: Number(item.unitCost)
                }))
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl w-full rounded-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="font-bold text-foreground flex items-center gap-2">
                        <ShoppingCart className="size-5 text-primary" />
                        Update Purchase Order
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Update procurement draft specifications, supplier details, and item quantities.
                    </DialogDescription>
                </DialogHeader>

                {isDetailsLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 gap-2">
                        <span className="animate-spin text-primary size-5 border-2 border-primary border-t-transparent rounded-full" />
                        <span className="text-xs text-muted-foreground font-semibold">Loading purchase order details...</span>
                    </div>
                ) : (
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
                                value={supplierId}
                                onChange={(val) => setSupplierId(val || '')}
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
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
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
                                {items.map((item, index) => {
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
                                                    queryKey={[QUERY_KEY.INVENTORY.INGREDIENTS_LIST, 'po-update-item', index]}
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
                )}

                <DialogFooter className="shrink-0 pt-4 border-t border-border/40 gap-2 sm:gap-0">
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="h-9 w-24 rounded-lg text-xs font-bold">
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSavePO}
                        disabled={updatePOMutation.isPending}
                        className="h-9 w-32 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95"
                    >
                        {updatePOMutation.isPending ? 'Updating...' : 'Update PO'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
