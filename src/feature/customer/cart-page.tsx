import { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from './use-cart.ts';
import { useAuthStore } from '#/store/auth-store.ts';
import { useCheckoutStore } from '#/store/checkout-store.ts';
import { Button } from '#/components/ui/button.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { toast } from 'sonner';
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
    const user = useAuthStore((state) => state.user);
    const { cart, isLoading, updateItem, removeItem, clearCart, isClearing, isUpdating, isRemoving } = useCart();
    const [itemToDelete, setItemToDelete] = useState<ICartItemResponse | null>(null);
    const [selectedIds, setSelectedIds] = useState<Record<string, boolean | undefined>>({});
    const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);

    const navigate = useNavigate();

    // Modifiers selections state: key is cartItemId, value is object containing array of ids, names, and computed modifiers price
    const [selectedModifiers, setSelectedModifiers] = useState<Record<string, { ids: string[]; price: number; names: string[] } | undefined>>({});

    const handleModifiersChange = (itemId: string, ids: string[], modifierGroups: any[]) => {
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
    };

    const items = cart?.items || [];

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
                const next = { ...prev };
                let changed = false;
                for (const item of cart.items) {
                    if (prev[item.id] === undefined && item.cartModifiers) {
                        const ids = item.cartModifiers.map((cm: ICartModifierResponse) => cm.modifierOptionId);
                        const names = item.cartModifiers.map((cm: ICartModifierResponse) => cm.modifierOption.name);
                        const price = item.cartModifiers.reduce((sum: number, cm: ICartModifierResponse) => sum + cm.modifierOption.price, 0);
                        next[item.id] = { ids, price, names };
                        changed = true;
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

    const handleQuantityChange = async (item: ICartItemResponse, newQuantity: number) => {
        if (newQuantity <= 0) {
            setItemToDelete(item);
        } else {
            await updateItem({ cartItemId: item.id, quantity: newQuantity });
        }
    };

    const handleCheckout = () => {
        if (selectedItems.length === 0) {
            toast.error('Please select at least one item to checkout.');
            return;
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

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-16 max-w-md text-center min-h-screen flex flex-col justify-center items-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground/60 mb-6">
                    <ShoppingCart className="size-8" />
                </div>
                <h2 className="text-xl font-extrabold text-foreground">Sign in to view your cart</h2>
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
                <h2 className="text-xl font-extrabold text-foreground">Your cart is empty</h2>
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
                <h1 className="text-3xl font-extrabold text-foreground">Shopping Cart</h1>
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
                        />
                    ))}
                </div>

                {/* Summary Panel */}
                <CartSummary totalAmount={selectedTotalAmount} onCheckout={handleCheckout} disabled={isUpdating || isRemoving || isClearing} />
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
