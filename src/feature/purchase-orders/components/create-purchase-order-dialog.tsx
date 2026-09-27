import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Plus, Trash2, Package, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';

import { createPurchaseOrder } from '#/api/purchase-orders.api.ts';
import { getSuppliersList, getSupplierIngredients } from '#/api/suppliers.api.ts';
import { getIngredients } from '#/api/inventory.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '#/components/ui/dialog.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import { UnitQuantityInput } from '#/components/inventory/unit-quantity-input.tsx';
import type { ISupplierListItem, ISupplierIngredient } from '#/feature/suppliers/suppliers.types';
import type { IIngredient } from '#/feature/inventory/inventory.types';

interface ICreateItemInput {
    ingredientId: string;
    quantity: number;
    inputQuantity?: number | null;
    inputUnitId?: string | null;
    ingredient?: IIngredient | null;
}

interface CreatePurchaseOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CreatePurchaseOrderDialog({ open, onOpenChange }: CreatePurchaseOrderDialogProps) {
    const queryClient = useQueryClient();

    // Form states
    const [supplierId, setSupplierId] = React.useState<string>('');
    const [notes, setNotes] = React.useState<string>('');
    const [supplierItems, setSupplierItems] = React.useState<ICreateItemInput[]>([]);
    const [extraItems, setExtraItems] = React.useState<ICreateItemInput[]>([]);

    // Reset form states when dialog closes
    React.useEffect(() => {
        if (!open) {
            resetCreateForm();
        }
    }, [open]);

    const resetCreateForm = () => {
        setSupplierId('');
        setNotes('');
        setSupplierItems([]);
        setExtraItems([]);
    };

    // Queries: Supplier's linked ingredients for PO creation
    const { data: supplierIngredients, isLoading: isSupplierIngredientsLoading } = useQuery({
        queryKey: [QUERY_KEY.SUPPLIERS.SUPPLIER_INGREDIENTS, supplierId],
        queryFn: () => getSupplierIngredients(supplierId),
        enabled: open && !!supplierId
    });

    // Queries: Ingredients fallback list (for unlisted extra items)
    const { data: ingredientsData } = useQuery({
        queryKey: [QUERY_KEY.PURCHASE_ORDERS.ACTIVE_INGREDIENTS_LIST],
        queryFn: () => getIngredients({ page: 1, limit: 100, status: 'active' }),
        enabled: open
    });
    const ingredients = ingredientsData?.data || [];

    // Mutation: Create PO
    const createPOMutation = useMutation({
        mutationFn: createPurchaseOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PURCHASE_ORDERS.PURCHASE_ORDERS_LIST] });
            toast.success('Purchase order draft created successfully');
            onOpenChange(false);
            resetCreateForm();
        },
        onError: (err) => {
            toast.error('Failed to create purchase order', {
                description: getErrorMessage(err)
            });
        }
    });

    const handleSupplierChange = (id: string) => {
        setSupplierId(id);
        setSupplierItems([]);
        setExtraItems([]);
    };

    const handleToggleSupplierIngredient = (ing: ISupplierIngredient) => {
        setSupplierItems((prev) => {
            const exists = prev.some((item) => item.ingredientId === ing.ingredientId);
            if (exists) {
                return prev.filter((item) => item.ingredientId !== ing.ingredientId);
            } else {
                const baseUnitId = ing.ingredient?.defaultUnit?.id;
                return [
                    ...prev,
                    {
                        ingredientId: ing.ingredientId,
                        quantity: 1,
                        inputQuantity: 1,
                        inputUnitId: baseUnitId
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
                            quantity: 1,
                            inputQuantity: 1,
                            inputUnitId: si.ingredient?.defaultUnit?.id
                        });
                    }
                }
                return updated;
            });
        }
    };

    const handleUpdateSupplierItem = (ingredientId: string, inputQuantity: number, baseQuantity: number, inputUnitId: string) => {
        setSupplierItems((prev) =>
            prev.map((item) => (item.ingredientId === ingredientId ? { ...item, quantity: baseQuantity, inputQuantity, inputUnitId } : item))
        );
    };

    const handleAddExtraItem = () => {
        setExtraItems((prev) => [...prev, { ingredientId: '', quantity: 1, inputQuantity: 1, inputUnitId: '', ingredient: null }]);
    };

    const handleRemoveExtraItem = (index: number) => {
        setExtraItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleExtraItemIngredientChange = (index: number, ing: IIngredient | null) => {
        setExtraItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== index) return item;
                return {
                    ...item,
                    ingredient: ing,
                    ingredientId: ing?.id || '',
                    quantity: 1,
                    inputQuantity: 1,
                    inputUnitId: ing?.defaultUnit?.id || ''
                };
            })
        );
    };

    const handleExtraItemQuantityChange = (index: number, inputQuantity: number, baseQuantity: number, inputUnitId: string) => {
        setExtraItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== index) return item;
                return {
                    ...item,
                    quantity: baseQuantity,
                    inputQuantity,
                    inputUnitId
                };
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

        const payload = {
            supplierId,
            notes: notes.trim() || undefined,
            items: validItems.map((item) => ({
                ingredientId: item.ingredientId,
                quantity: Number(item.quantity),
                inputQuantity: item.inputQuantity !== undefined && item.inputQuantity !== null ? Number(item.inputQuantity) : null,
                inputUnitId: item.inputUnitId || null
            }))
        };

        createPOMutation.mutate(payload);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl w-full rounded-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="font-bold text-foreground flex items-center gap-2">
                        <ShoppingCart className="size-5 text-primary" />
                        New Purchase Order
                    </DialogTitle>
                    <DialogDescription className="text-xs">Create an order request to send to your supplier.</DialogDescription>
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
                                <span className="text-xs text-muted-foreground">Select a supplier above to see available catalog items.</span>
                            </div>
                        ) : isSupplierIngredientsLoading ? (
                            <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                <span className="animate-spin text-primary size-4 border-2 border-primary border-t-transparent rounded-full" />
                                Loading supplier catalog...
                            </div>
                        ) : supplierIngredients && supplierIngredients.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {supplierIngredients.map((si) => {
                                    const poItem = supplierItems.find((item) => item.ingredientId === si.ingredientId);
                                    const isSelected = !!poItem;

                                    return (
                                        <div
                                            key={si.id}
                                            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
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
                                                    {si.unitCost ? <span>• Agreed Price: ₱{si.unitCost.toFixed(2)}</span> : null}
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <div className="w-[180px] shrink-0">
                                                    <UnitQuantityInput
                                                        compact
                                                        min={0.01}
                                                        ingredientId={si.ingredientId}
                                                        baseUnit={si.ingredient?.defaultUnit}
                                                        value={poItem.inputQuantity ?? poItem.quantity}
                                                        selectedUnitId={poItem.inputUnitId || si.ingredient?.defaultUnit?.id}
                                                        onQuantityChange={(inputQty, baseQty, unitId) => {
                                                            handleUpdateSupplierItem(si.ingredientId, inputQty, baseQty, unitId);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-3.5 rounded-xl border border-border/40 bg-muted/15 text-xs text-muted-foreground">
                                No ingredients linked to this supplier yet. You can link ingredients in Supplier Management, or add items manually
                                below.
                            </div>
                        )}
                    </div>

                    {/* Extra / Unlisted Items */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-foreground">Other / Unlisted Items (Optional)</label>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddExtraItem} className="h-7 text-xs font-bold gap-1">
                                <Plus className="size-3" /> Add Item
                            </Button>
                        </div>

                        {extraItems.length > 0 && (
                            <div className="space-y-2">
                                {extraItems.map((item, index) => {
                                    const selectedIng = item.ingredient || ingredients.find((i: IIngredient) => i.id === item.ingredientId);

                                    return (
                                        <div key={index} className="flex items-end gap-3 p-2.5 border border-border/40 rounded-xl bg-muted/20">
                                            <div className="flex-1 space-y-1">
                                                <span className="text-xs uppercase font-bold text-muted-foreground">Ingredient</span>
                                                <InfiniteSelect<IIngredient>
                                                    queryKey={[QUERY_KEY.INVENTORY.INGREDIENTS_LIST, 'po-create-extra', index]}
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
                                                    onChange={(_, ingItem) => handleExtraItemIngredientChange(index, ingItem || null)}
                                                    getOptionValue={(i) => i.id}
                                                    getOptionLabel={(i) => `${i.name}`}
                                                    selectedItem={selectedIng || undefined}
                                                    placeholder="Select Ingredient"
                                                    searchPlaceholder="Search ingredients..."
                                                    className="h-8 text-xs bg-background/50"
                                                />
                                            </div>

                                            <div className="w-[180px] shrink-0">
                                                <UnitQuantityInput
                                                    compact
                                                    min={0.01}
                                                    disabled={!selectedIng}
                                                    ingredientId={selectedIng?.id}
                                                    baseUnit={selectedIng?.defaultUnit}
                                                    value={item.inputQuantity ?? item.quantity}
                                                    selectedUnitId={item.inputUnitId || selectedIng?.defaultUnit?.id}
                                                    onQuantityChange={(inputQty, baseQty, unitId) => {
                                                        handleExtraItemQuantityChange(index, inputQty, baseQty, unitId);
                                                    }}
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

                    {/* Purchase Order Summary */}
                    <div className="p-3.5 bg-primary/5 border border-primary/15 rounded-2xl flex justify-between items-center mt-2 shrink-0">
                        <div>
                            <span className="text-xs font-bold text-primary block">Purchase Order Summary</span>
                            <span className="text-xs text-muted-foreground">
                                {allActiveItems.filter((i) => i.quantity > 0).length} items included • Pricing automatically calculated upon delivery
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-lg">Calculated upon delivery</span>
                        </div>
                    </div>
                </form>

                <DialogFooter className="shrink-0 pt-4 border-t border-border/40 gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                            onOpenChange(false);
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
    );
}
