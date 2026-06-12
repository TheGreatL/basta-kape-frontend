import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ShoppingCart, Trash2, ShoppingBag } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useCart } from './use-cart.ts';
import { useAuthStore } from '#/store/auth-store.ts';
import { Button } from '#/components/ui/button.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { toast } from 'sonner';
import type { ICartItemResponse } from './customer.types.ts';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { createOrder } from '#/api/orders.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { TOrderType } from '#/feature/order/order.types';
import CartItemRow from './components/cart-item-row.tsx';
import CartSummary from './components/cart-summary.tsx';

export default function CartPage() {
    const user = useAuthStore((state) => state.user);
    const { customer, cart, isLoading, updateItem, removeItem, clearCart, isClearing, isUpdating, isRemoving } = useCart();
    const [itemToDelete, setItemToDelete] = useState<ICartItemResponse | null>(null);
    const [selectedIds, setSelectedIds] = useState<Record<string, boolean | undefined>>({});
    const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);

    // Checkout states
    const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
    const [orderType, setOrderType] = useState<TOrderType>('DINE_IN');
    const [notes, setNotes] = useState('');

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

    const createOrderMutation = useMutation({
        mutationFn: createOrder,
        onSuccess: async () => {
            await clearCart();
            setIsCheckoutDialogOpen(false);
            setNotes('');
            toast.success('Order placed successfully!', {
                description: 'Your order is now in the queue.'
            });
        },
        onError: (err) => {
            toast.error('Failed to place order', {
                description: getErrorMessage(err)
            });
        }
    });

    const handleCheckout = () => {
        if (selectedItems.length === 0) {
            toast.error('Please select at least one item to checkout.');
            return;
        }
        setIsCheckoutDialogOpen(true);
    };

    const handleCheckoutSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer) return;
        createOrderMutation.mutate({
            orderType,
            orderSource: 'WEBSITE',
            notes: notes || undefined,
            customerId: customer.id,
            customerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Customer',
            items: selectedItems.map((item: ICartItemResponse) => ({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                notes: undefined,
                modifierOptionIds: selectedModifiers[item.id]?.ids || []
            }))
        });
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
                        <AlertDialogTitle className="text-foreground font-black">Remove Item?</AlertDialogTitle>
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
                        <AlertDialogTitle className="text-foreground font-black">Clear Shopping Cart?</AlertDialogTitle>
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

            {/* Premium Checkout Dialog */}
            <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
                <DialogContent className="max-w-md bg-background border-border/60 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black text-xl text-foreground">
                            <ShoppingBag className="size-5 text-primary" />
                            Finalize Your Order
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1">
                            Choose your dining method and add any special preparation requests.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCheckoutSubmit} className="space-y-4 pt-2 text-xs">
                        <div className="space-y-2">
                            <label className="font-bold text-foreground/80 block">Dining Option</label>
                            <Select value={orderType} onValueChange={(val: TOrderType) => setOrderType(val)}>
                                <SelectTrigger className="h-10 text-xs bg-background/50 rounded-xl">
                                    <SelectValue placeholder="Select dining option" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="DINE_IN" className="text-xs">
                                        Dine In
                                    </SelectItem>
                                    <SelectItem value="TAKE_OUT" className="text-xs">
                                        Take Out
                                    </SelectItem>
                                    <SelectItem value="DELIVERY" className="text-xs">
                                        Delivery
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="font-bold text-foreground/80 block">Special Instructions / Notes (Optional)</label>
                            <Textarea
                                placeholder="e.g. Extra sugar, no ice, milk alternative requests..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="bg-background/50 text-xs resize-none rounded-xl h-20"
                            />
                        </div>

                        <div className="border border-border/50 p-4 rounded-2xl bg-muted/10 space-y-3 font-medium">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider pb-1 border-b border-border/30">
                                Order Breakdown ({selectedItems.length} items Selected)
                            </div>
                            <div className="max-h-[150px] overflow-y-auto space-y-3 pr-1">
                                {selectedItems.map((item: ICartItemResponse) => {
                                    const modifierPrice = selectedModifiers[item.id]?.price || 0;
                                    const modifierNames = selectedModifiers[item.id]?.names || [];
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex flex-col gap-0.5 text-muted-foreground text-[11px] border-b border-border/10 pb-1.5 last:border-0 last:pb-0"
                                        >
                                            <div className="flex justify-between">
                                                <span className="truncate max-w-[200px] font-bold text-foreground/80">
                                                    {item.productVariant.product.name} x{item.quantity}
                                                </span>
                                                <span className="font-bold text-foreground/85">
                                                    ₱{((item.unitPrice + modifierPrice) * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                            {modifierNames.length > 0 && (
                                                <span className="text-[9px] text-muted-foreground italic font-semibold">
                                                    Add-ons: {modifierNames.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between font-bold border-t border-dashed border-border/40 pt-2 text-sm">
                                <span className="text-foreground">Total Due:</span>
                                <span className="text-primary font-black">₱{selectedTotalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCheckoutDialogOpen(false)}
                                className="h-10 text-xs rounded-xl font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createOrderMutation.isPending}
                                className="h-10 text-xs rounded-xl font-bold bg-primary text-primary-foreground shadow-md hover:shadow-lg flex-1"
                            >
                                {createOrderMutation.isPending ? 'Placing Order...' : 'Confirm Order & Pay'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
