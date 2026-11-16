import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ShoppingCart, Trash2, AlertTriangle } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { useCart } from './use-cart.ts';
import { useAuth } from '#/context/AuthContext.tsx';
import { useCheckoutStore } from '#/store/checkout-store.ts';
import { Button } from '#/components/ui/button.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { toast } from 'sonner';
import { getMenuProductById } from '#/api/menu.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { ICartItemResponse, ICartModifierResponse } from './customer.types.ts';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '#/components/ui/alert-dialog.tsx';
import CartItemRow from './components/cart-item-row.tsx';
import CartSummary from './components/cart-summary.tsx';

export default function CartPage() {
    const { user } = useAuth();
    const { cart, isLoading, updateItem, removeItem, clearCart, isClearing, isUpdating, isRemoving } = useCart();
    const [itemToDelete, setItemToDelete] = useState<ICartItemResponse | null>(null);
    const [selectedIds, setSelectedIds] = useState<Record<string, boolean | undefined>>({});
    const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);

    const navigate = useNavigate();

    // Modifiers selections state: key is cartItemId, value is object containing array of ids, names, and computed modifiers price
    const [selectedModifiers, setSelectedModifiers] = useState<Record<string, { ids: string[]; price: number; names: string[] } | undefined>>({});

    const handleModifiersChange = async (itemId: string, ids: string[], modifierGroups: any[]) => {
        let price = 0;
        const names: string[] = [];
        modifierGroups.forEach((group) => {
            group.options.forEach((opt: any) => {
                if (ids.includes(opt.id)) {
                    price += opt.price;
                    names.push(opt.name);
                }
            });
        });
        setSelectedModifiers((prev) => ({
            ...prev,
            [itemId]: { ids, price, names }
        }));
        try {
            await updateItem({ cartItemId: itemId, modifierOptionIds: ids });
        } catch {
            // Error toast is handled by useMutation
        }
    };

    const items = cart?.items || [];

    const [isCheckingStock, setIsCheckingStock] = useState(false);

    // Collect unique product IDs from cart items to fetch live stock
    const uniqueProductIds = useMemo(() => {
        return Array.from(new Set(items.map((item: ICartItemResponse) => item.productVariant.product.id).filter(Boolean)));
    }, [items]);

    // Live queries for all products in cart to get real-time stock
    const productStockQueries = useQueries({
        queries: uniqueProductIds.map((productId) => ({
            queryKey: [QUERY_KEY.MENU.PRODUCT_DETAILS, productId],
            queryFn: () => getMenuProductById(productId),
            staleTime: 15 * 1000,
            refetchOnWindowFocus: true
        }))
    });

    // Map of variantId -> maxProduceable
    const liveStockMap = useMemo(() => {
        const map = new Map<string, number | 'Unlimited' | null>();
        productStockQueries.forEach((q) => {
            if (q.data?.variants) {
                q.data.variants.forEach((v) => {
                    map.set(v.id, v.maxProduceable ?? null);
                });
            }
        });
        return map;
    }, [productStockQueries]);

    // Helper: get stock for a given cart item
    const getItemStock = (item: ICartItemResponse): number | 'Unlimited' | null => {
        return liveStockMap.get(item.productVariantId) ?? item.productVariant.maxProduceable ?? null;
    };

    // Sync selection state when items change
    useEffect(() => {
        if (cart?.items) {
            setSelectedIds((prev) => {
                const currentItemIds = new Set(cart.items.map((item: ICartItemResponse) => item.id));
                const prevKeys = Object.keys(prev);

                // Check if any new items need to be added or stale keys removed
                const hasNewItems = cart.items.some((item: ICartItemResponse) => prev[item.id] === undefined);
                const hasStaleKeys = prevKeys.some((id) => !currentItemIds.has(id));

                if (!hasNewItems && !hasStaleKeys) return prev;

                const next: Record<string, boolean | undefined> = {};
                cart.items.forEach((item: ICartItemResponse) => {
                    next[item.id] = prev[item.id] === undefined ? true : prev[item.id];
                });
                return next;
            });

            setSelectedModifiers((prev) => {
                const currentItemIds = new Set(cart.items.map((item: ICartItemResponse) => item.id));
                const next: Record<string, { ids: string[]; price: number; names: string[] } | undefined> = {};
                let changed = false;

                for (const key of Object.keys(prev)) {
                    if (!currentItemIds.has(key)) {
                        changed = true;
                    } else {
                        next[key] = prev[key];
                    }
                }

                for (const item of cart.items) {
                    if (item.cartModifiers) {
                        const ids = item.cartModifiers.map((cm: ICartModifierResponse) => cm.modifierOptionId);
                        const names = item.cartModifiers.map((cm: ICartModifierResponse) => cm.modifierOption.name);
                        const price = item.cartModifiers.reduce((sum: number, cm: ICartModifierResponse) => sum + cm.modifierOption.price, 0);

                        const prevItemMods = next[item.id];
                        if (!prevItemMods || prevItemMods.ids.length !== ids.length || !ids.every((id) => prevItemMods.ids.includes(id))) {
                            next[item.id] = { ids, price, names };
                            changed = true;
                        }
                    }
                }
                return changed ? next : prev;
            });
        }
    }, [cart?.items]);

    const isSelected = (id: string) => selectedIds[id] !== false;

    const handleToggleSelect = (id: string) => {
        setSelectedIds((prev) => ({
            ...prev,
            [id]: !isSelected(id)
        }));
    };

    const handleToggleSelectAll = () => {
        const allSelected = items.length > 0 && items.every((item: ICartItemResponse) => isSelected(item.id));
        setSelectedIds((prev) => {
            const next = { ...prev };
            items.forEach((item: ICartItemResponse) => {
                next[item.id] = !allSelected;
            });
            return next;
        });
    };

    const selectedItems = items.filter((item: ICartItemResponse) => isSelected(item.id));
    const selectedTotalAmount = selectedItems.reduce((sum: number, item: ICartItemResponse) => {
        const modifierPrice = selectedModifiers[item.id]?.price || 0;
        return sum + (item.unitPrice + modifierPrice) * item.quantity;
    }, 0);

    // Sum total selected quantities per variant
    const selectedQtyByVariant = useMemo(() => {
        const map = new Map<string, number>();
        selectedItems.forEach((item: ICartItemResponse) => {
            map.set(item.productVariantId, (map.get(item.productVariantId) || 0) + item.quantity);
        });
        return map;
    }, [selectedItems]);

    // Check if an item exceeds available stock
    const isItemStockExceeded = (item: ICartItemResponse): boolean => {
        const stock = getItemStock(item);
        if (stock === null || stock === 'Unlimited') return false;
        const totalVariantQty = selectedQtyByVariant.get(item.productVariantId) || item.quantity;
        return item.quantity > stock || totalVariantQty > stock;
    };

    // Calculate all stock issues among selected items
    const stockIssues = useMemo(() => {
        const issues: Array<{ item: ICartItemResponse; reason: 'OUT_OF_STOCK' | 'EXCEEDS_STOCK'; available: number }> = [];

        selectedItems.forEach((item: ICartItemResponse) => {
            const stock = getItemStock(item);
            if (stock === 0) {
                issues.push({ item, reason: 'OUT_OF_STOCK', available: 0 });
            } else if (typeof stock === 'number') {
                const totalVariantQty = selectedQtyByVariant.get(item.productVariantId) || item.quantity;
                if (item.quantity > stock || totalVariantQty > stock) {
                    issues.push({ item, reason: 'EXCEEDS_STOCK', available: stock });
                }
            }
        });

        return issues;
    }, [selectedItems, liveStockMap, selectedQtyByVariant]);

    const hasStockIssues = stockIssues.length > 0;

    const handleQuantityChange = async (item: ICartItemResponse, newQuantity: number) => {
        if (newQuantity <= 0) {
            setItemToDelete(item);
            return;
        }
        const stock = getItemStock(item);
        if (typeof stock === 'number' && newQuantity > stock) {
            toast.warning('Maximum Stock Reached', {
                description: `Only ${stock} unit(s) of ${item.productVariant.product.name} are available.`
            });
            return;
        }
        await updateItem({ cartItemId: item.id, quantity: newQuantity });
    };

    // Helper: format variant attribute values (e.g. Size: Large)
    const getVariantLabel = (item: ICartItemResponse | null | undefined) => {
        if (!item) return '';
        const attributes = item.productVariant.attributes;
        if (attributes.length === 0) {
            return 'Regular';
        }
        return attributes.map((attr) => attr.attributeValue.value).join(' / ');
    };

    const handleCheckout = async () => {
        if (selectedItems.length === 0) {
            toast.error('Selection Required', { description: 'Please select at least one item to checkout.' });
            return;
        }

        setIsCheckingStock(true);
        try {
            // Fetch freshest live stock for all selected products before navigating
            const selectedProductIds = Array.from(new Set(selectedItems.map((item: ICartItemResponse) => item.productVariant.product.id)));
            const freshProducts = await Promise.all(selectedProductIds.map((id) => getMenuProductById(id).catch(() => null)));

            const freshStockMap = new Map<string, number | 'Unlimited' | null>();
            freshProducts.forEach((p) => {
                if (p?.variants) {
                    p.variants.forEach((v) => {
                        freshStockMap.set(v.id, v.maxProduceable ?? null);
                    });
                }
            });

            // Group total requested quantities by variant
            const selectedByVariant = new Map<string, { totalQty: number; name: string; variantLabel: string; stock: number | 'Unlimited' | null }>();
            for (const item of selectedItems) {
                const vId = item.productVariantId;
                const stock = freshStockMap.get(vId) ?? getItemStock(item);
                const current = selectedByVariant.get(vId) || {
                    totalQty: 0,
                    name: item.productVariant.product.name,
                    variantLabel: getVariantLabel(item),
                    stock
                };
                current.totalQty += item.quantity;
                selectedByVariant.set(vId, current);
            }

            // Verify variant stock availability
            for (const [, info] of selectedByVariant.entries()) {
                if (info.stock === 0) {
                    toast.error('Item Out of Stock', {
                        description: `"${info.name} (${info.variantLabel})" is currently out of stock. Please remove it from your selection to proceed.`
                    });
                    return;
                }

                if (typeof info.stock === 'number' && info.totalQty > info.stock) {
                    toast.error('Insufficient Stock', {
                        description: `Only ${info.stock} unit(s) available for "${info.name} (${info.variantLabel})", but you have selected ${info.totalQty}. Please reduce the quantity.`
                    });
                    return;
                }
            }

            const checkoutModifiers: Record<string, { ids: string[]; price: number; names: string[] } | undefined> = {};
            selectedItems.forEach((item: ICartItemResponse) => {
                const mods = selectedModifiers[item.id];
                if (mods) {
                    checkoutModifiers[item.id] = mods;
                }
            });

            useCheckoutStore.getState().setCheckoutState(
                selectedItems.map((item: ICartItemResponse) => item.id),
                true,
                checkoutModifiers
            );

            navigate({ to: '/checkout' });
        } catch {
            toast.error('Verification Error', {
                description: 'Could not verify live stock levels. Please check your connection and try again.'
            });
        } finally {
            setIsCheckingStock(false);
        }
    };

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-16 max-w-md text-center min-h-screen flex flex-col justify-center items-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground/60 mb-6">
                    <ShoppingCart className="size-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Sign in to view your cart</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">You need to be logged in to manage your shopping cart and view items.</p>
                <Link to="/login" className="mt-8">
                    <Button className="rounded-xl px-6">Sign In Now</Button>
                </Link>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-5xl animate-pulse space-y-6">
                <div className="h-8 w-48 bg-muted rounded" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="h-24 bg-muted rounded-xl" />
                        ))}
                    </div>
                    <div className="h-48 bg-muted rounded-xl" />
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 max-w-md text-center min-h-screen flex flex-col justify-center items-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground/60 mb-6">
                    <ShoppingCart className="size-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Your cart is empty</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">Looks like you haven't added any coffees or snacks to your cart yet.</p>
                <Link to="/products" className="mt-8">
                    <Button className="rounded-xl px-6">Explore Our Menu</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Shopping Cart</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    You have {items.reduce((acc: number, item: ICartItemResponse) => acc + item.quantity, 0)} items in your cart.
                </p>
            </div>

            {/* Selection actions bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-muted/20 mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <Checkbox
                        checked={items.length > 0 && selectedItems.length === items.length}
                        onCheckedChange={handleToggleSelectAll}
                        aria-label="Select all items"
                    />
                    <span className="text-sm font-semibold text-foreground select-none">
                        Select All ({selectedItems.length} of {items.length} items)
                    </span>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsClearCartDialogOpen(true)}
                    disabled={isClearing || isUpdating || isRemoving}
                    className="text-muted-foreground hover:text-destructive gap-1.5 text-xs h-9 disabled:opacity-50 disabled:pointer-events-none shrink-0"
                >
                    <Trash2 className="size-4" />
                    Clear Cart
                </Button>
            </div>

            {/* Live Inventory Warning Banner */}
            {hasStockIssues && (
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive mb-6 shadow-2xs">
                    <AlertTriangle className="size-5 shrink-0" />
                    <div className="text-xs sm:text-sm font-semibold">
                        <span>Some selected items exceed our current inventory or are out of stock.</span>
                        <span className="block font-normal text-xs text-destructive/80 mt-0.5">
                            Please adjust item quantities or unselect unavailable items before proceeding to checkout.
                        </span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items List */}
                <div
                    className={`lg:col-span-2 space-y-4 transition-opacity duration-200 ${isUpdating || isRemoving || isClearing ? 'opacity-60 pointer-events-none' : ''}`}
                >
                    {items.map((item: ICartItemResponse) => (
                        <CartItemRow
                            key={item.id}
                            item={item}
                            isSelected={isSelected(item.id)}
                            onToggleSelect={() => handleToggleSelect(item.id)}
                            onQuantityChange={handleQuantityChange}
                            onRemoveClick={setItemToDelete}
                            selectedModifierIds={selectedModifiers[item.id]?.ids || []}
                            onModifiersChange={(ids, groups) => handleModifiersChange(item.id, ids, groups)}
                            stock={getItemStock(item)}
                            isStockExceeded={isItemStockExceeded(item)}
                        />
                    ))}
                </div>

                {/* Summary Panel */}
                <CartSummary
                    totalAmount={selectedTotalAmount}
                    onCheckout={handleCheckout}
                    disabled={isUpdating || isRemoving || isClearing || isCheckingStock}
                    hasStockIssues={hasStockIssues}
                />
            </div>

            {/* Premium Confirm Deletion Dialog */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent size="sm" className="border-border/60">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground font-bold">Remove Item?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed mt-1">
                            Are you sure you want to remove <strong>{itemToDelete?.productVariant.product.name}</strong>{' '}
                            {itemToDelete && `(${getVariantLabel(itemToDelete)})`} from your shopping cart?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="rounded-xl font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={async () => {
                                if (itemToDelete) {
                                    await removeItem(itemToDelete.id);
                                    setItemToDelete(null);
                                }
                            }}
                            className="rounded-xl font-bold"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Premium Confirm Clear Cart Dialog */}
            <AlertDialog open={isClearCartDialogOpen} onOpenChange={setIsClearCartDialogOpen}>
                <AlertDialogContent size="sm" className="border-border/60">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground font-bold">Clear Shopping Cart?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed mt-1">
                            Are you sure you want to remove all items from your shopping cart? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="rounded-xl font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={async () => {
                                await clearCart();
                                setIsClearCartDialogOpen(false);
                            }}
                            className="rounded-xl font-bold"
                        >
                            Clear Cart
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
