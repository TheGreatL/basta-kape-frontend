import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Plus, Trash2, Package, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';

import { getPurchaseOrderById, updatePurchaseOrder } from '#/api/purchase-orders.api.ts';
import { getSuppliersList, getSupplierIngredients } from '#/api/suppliers.api.ts';
import { getIngredients } from '#/api/inventory.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import type { ISupplierListItem, ISupplierIngredient } from '#/feature/suppliers/suppliers.types';
import type { IIngredient } from '#/feature/inventory/inventory.types';

interface ICreateItemInput {
    ingredientId: string;
    quantity: number;
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
    const [supplierItems, setSupplierItems] = React.useState<ICreateItemInput[]>([]);
    const [extraItems, setExtraItems] = React.useState<ICreateItemInput[]>([]);
    const [isInitialized, setIsInitialized] = React.useState(false);

    // Query: PO Details
    const { data: poDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDER_DETAILS, 'edit-dialog', poId],
        queryFn: () => getPurchaseOrderById(poId!),
        enabled: open && !!poId
    });

    // Query: Supplier Ingredients for selected supplier
    const { data: supplierIngredients, isLoading: isSupplierIngredientsLoading } = useQuery({
        queryKey: [QUERY_KEY.SUPPLIERS.SUPPLIER_INGREDIENTS, supplierId],
        queryFn: () => getSupplierIngredients(supplierId),
        enabled: !!supplierId
    });

    // Queries: Active ingredients list for general lookup and fallback
    const { data: ingredientsData } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.ACTIVE_INGREDIENTS_LIST],
        queryFn: () => getIngredients({ page: 1, limit: 100, status: 'active' })
    });
    const ingredients = ingredientsData?.data || [];

    // Initialize/sync form with PO Details and supplier ingredients
    React.useEffect(() => {
        if (poDetails && supplierIngredients !== undefined && !isInitialized) {
            setSupplierId(poDetails.supplierId);
            setNotes(poDetails.notes || '');

            const supplierIngIdSet = new Set(supplierIngredients.map((si) => si.ingredientId));
            const initialSupplierItems: ICreateItemInput[] = [];
            const initialExtraItems: ICreateItemInput[] = [];

            (poDetails.items || []).forEach((item) => {
                const entry: ICreateItemInput = {
                    ingredientId: item.ingredientId,
                    quantity: item.quantity
                };
                if (supplierIngIdSet.has(item.ingredientId)) {
                    initialSupplierItems.push(entry);
                } else {
                    initialExtraItems.push(entry);
                }
            });

            setSupplierItems(initialSupplierItems);
            setExtraItems(initialExtraItems);
            setIsInitialized(true);
        }
    }, [poDetails, supplierIngredients, isInitialized]);

    // Reset form states on close
    React.useEffect(() => {
        if (!open) {
            setSupplierId('');
            setNotes('');
            setSupplierItems([]);
            setExtraItems([]);
            setIsInitialized(false);
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

    const handleSupplierChange = (newId: string) => {
        setSupplierId(newId);
        setSupplierItems([]);
        setExtraItems([]);
    };

    const handleToggleSupplierIngredient = (ing: ISupplierIngredient) => {
        setSupplierItems((prev) => {
            const exists = prev.some((item) => item.ingredientId === ing.ingredientId);
            if (exists) {
                return prev.filter((item) => item.ingredientId !== ing.ingredientId);
            } else {
                return [
                    ...prev,
                    {
                        ingredientId: ing.ingredientId,
                        quantity: 1
                    }
                ];
            }
        });
    };

    const handleToggleAllSupplierIngredients = () => {
        if (!supplierIngredients || supplierIngredients.length === 0) return;
        const allSelected = supplierIngredients.every((si) => supplierItems.some((item) => item.ingredientId === si.ingredientId));

        if (allSelected) {
            const supplierIngIds = new Set(supplierIngredients.map((si) => si.ingredientId));
            setSupplierItems((prev) => prev.filter((item) => !supplierIngIds.has(item.ingredientId)));
        } else {
            setSupplierItems((prev) => {
                const existingMap = new Map(prev.map((item) => [item.ingredientId, item]));
                const updated = [...prev];
                for (const si of supplierIngredients) {
                    if (!existingMap.has(si.ingredientId)) {
                        updated.push({
                            ingredientId: si.ingredientId,
                            quantity: 1
                        });
                    }
                }
                return updated;
            });
        }
    };

    const handleUpdateSupplierItem = (ingredientId: string, quantity: number) => {
        setSupplierItems((prev) => prev.map((item) => (item.ingredientId === ingredientId ? { ...item, quantity } : item)));
    };

    const handleAddExtraItem = () => {
        setExtraItems((prev) => [...prev, { ingredientId: '', quantity: 1 }]);
    };

    const handleRemoveExtraItem = (index: number) => {
        setExtraItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleExtraItemChange = (index: number, field: keyof ICreateItemInput, value: any) => {
        setExtraItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== index) return item;
                return { ...item, [field]: value };
            })
        );
    };

    const allActiveItems = React.useMemo(() => {
        return [...supplierItems, ...extraItems.filter((i) => i.ingredientId)];
    }, [supplierItems, extraItems]);

    const handleSavePO = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId) {
            toast.error('Please select a supplier');
            return;
        }

        const validItems = allActiveItems.filter((item) => item.ingredientId && item.quantity > 0);
        if (validItems.length === 0) {
            toast.error('Please select or add at least one line item with quantity > 0');
            return;
        }

        updatePOMutation.mutate({
            id: poId!,
            data: {
                supplierId,
                notes: notes.trim() || null,
                items: validItems.map((item) => ({
                    ingredientId: item.ingredientId,
                    quantity: Number(item.quantity)
                }))
            }
        });
    };

    const isFormLoading = isDetailsLoading || (!isInitialized && !!poDetails?.supplierId && isSupplierIngredientsLoading);

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

                {isFormLoading ? (
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
                                onChange={(val) => handleSupplierChange(val || '')}
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

                        {/* Supplier Orderable Ingredients */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Package className="size-3.5 text-primary" />
                                        Supplier Ingredients
                                    </label>
                                    <p className="text-xs text-muted-foreground">Toggle the ingredients you want to order from this supplier.</p>
                                </div>
                                {supplierIngredients && supplierIngredients.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleToggleAllSupplierIngredients}
                                        className="h-7 text-xs font-semibold gap-1"
                                    >
                                        {supplierIngredients.every((si) => supplierItems.some((item) => item.ingredientId === si.ingredientId)) ? (
                                            <>
                                                <Square className="size-3" /> Deselect All
                                            </>
                                        ) : (
                                            <>
                                                <CheckSquare className="size-3" /> Select All
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>

                            {!supplierId ? (
                                <div className="p-4 rounded-xl border border-dashed border-border/60 text-center bg-muted/10">
                                    <span className="text-xs text-muted-foreground">Select a supplier above to view orderable ingredients.</span>
                                </div>
                            ) : isSupplierIngredientsLoading ? (
                                <div className="p-4 rounded-xl border border-border/40 text-center bg-muted/10 flex items-center justify-center gap-2">
                                    <span className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full" />
                                    <span className="text-xs text-muted-foreground">Loading supplier ingredients...</span>
                                </div>
                            ) : supplierIngredients && supplierIngredients.length > 0 ? (
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {supplierIngredients.map((si) => {
                                        const isSelected = supplierItems.some((item) => item.ingredientId === si.ingredientId);
                                        const poItem = supplierItems.find((item) => item.ingredientId === si.ingredientId);
                                        const unitAbbrev = si.ingredient?.defaultUnit?.abbreviation || '';

                                        return (
                                            <div
                                                key={si.ingredientId}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                                    isSelected
                                                        ? 'bg-primary/5 border-primary/30'
                                                        : 'bg-muted/10 border-border/40 opacity-80 hover:opacity-100'
                                                }`}
                                            >
                                                {/* Checkbox Toggle */}
                                                <div className="flex items-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => handleToggleSupplierIngredient(si)}
                                                        className="size-4.5"
                                                    />
                                                </div>

                                                {/* Ingredient info */}
                                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleToggleSupplierIngredient(si)}>
                                                    <span className="text-xs font-bold text-foreground block truncate">
                                                        {si.ingredient?.name || 'Unknown Ingredient'}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                                        <span>Unit: {si.ingredient?.defaultUnit?.name || 'N/A'}</span>
                                                        {si.unitCost ? <span>• Catalog Price: ₱{si.unitCost.toFixed(2)}</span> : null}
                                                    </div>
                                                </div>

                                                {isSelected && (
                                                    <div className="w-[120px] space-y-0.5 shrink-0">
                                                        <span className="text-xs uppercase font-bold text-muted-foreground block">
                                                            Qty {unitAbbrev && `(${unitAbbrev})`}
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            min="0.01"
                                                            step="any"
                                                            value={poItem?.quantity ?? 1}
                                                            onChange={(e) =>
                                                                handleUpdateSupplierItem(si.ingredientId, parseFloat(e.target.value) || 0)
                                                            }
                                                            className="h-8 text-xs bg-background/80 font-bold"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-dashed border-border/60 text-center bg-muted/10">
                                    <span className="text-xs text-muted-foreground">
                                        No linked ingredients found for this supplier. You can link ingredients in Supplier Management or add custom
                                        items below.
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Extra / Unlisted Items */}
                        <div className="space-y-2 pt-2 border-t border-border/40">
                            <div className="flex justify-between items-center">
                                <div>
                                    <label className="text-xs font-bold text-foreground">Other / Unlisted Items</label>
                                    <p className="text-xs text-muted-foreground">
                                        Add emergency or extra items that are not normally linked to this supplier.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddExtraItem}
                                    className="h-7 text-xs font-semibold gap-1"
                                >
                                    <Plus className="size-3" /> Add Custom Item
                                </Button>
                            </div>

                            {extraItems.length > 0 && (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {extraItems.map((item, index) => {
                                        const selectedIng = ingredients.find((i: IIngredient) => i.id === item.ingredientId);
                                        const unitAbbrev = selectedIng?.defaultUnit?.abbreviation || '';

                                        return (
                                            <div key={index} className="flex items-end gap-2.5 p-2.5 border border-border/40 rounded-xl bg-muted/20">
                                                <div className="flex-1 space-y-1">
                                                    <span className="text-xs uppercase font-bold text-muted-foreground">Ingredient</span>
                                                    <InfiniteSelect<IIngredient>
                                                        queryKey={[QUERY_KEY.INVENTORY.INGREDIENTS_LIST, 'po-update-extra', index]}
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
                                                        onChange={(val) => handleExtraItemChange(index, 'ingredientId', val || '')}
                                                        getOptionValue={(i) => i.id}
                                                        getOptionLabel={(i) => `${i.name}`}
                                                        selectedItem={ingredients.find((i) => i.id === item.ingredientId)}
                                                        placeholder="Select Ingredient"
                                                        searchPlaceholder="Search ingredients..."
                                                        className="h-8 text-xs bg-background/50"
                                                    />
                                                </div>

                                                <div className="w-[120px] space-y-1">
                                                    <span className="text-xs uppercase font-bold text-muted-foreground flex justify-between">
                                                        Qty {unitAbbrev && `(${unitAbbrev})`}
                                                    </span>
                                                    <Input
                                                        type="number"
                                                        min="0.01"
                                                        step="any"
                                                        value={item.quantity}
                                                        onChange={(e) => handleExtraItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className="h-8 text-xs bg-background/50 font-bold"
                                                    />
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                                                    onClick={() => handleRemoveExtraItem(index)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Grand Total */}
                        <div className="p-3.5 bg-primary/5 border border-primary/15 rounded-2xl flex justify-between items-center mt-2 shrink-0">
                            <div>
                                <span className="text-xs font-bold text-primary block">Purchase Order Summary</span>
                                <span className="text-xs text-muted-foreground">
                                    {allActiveItems.filter((i) => i.quantity > 0).length} items included • Pricing automatically calculated upon
                                    delivery
                                </span>
                            </div>
                            <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30 bg-primary/10 px-3 py-1">
                                Calculated upon delivery
                            </Badge>
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
