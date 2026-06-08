import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Calendar, Trash2, ShoppingCart, Minus, Plus, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { getCart, updateCartItem, removeCartItem, clearCart } from '#/api/customer.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { getFileUrl } from '#/utils/helper.ts';
import type { ICustomerResponse, ICartItemResponse } from '#/feature/customer/customer.types.ts';

import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';

interface CustomerViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: ICustomerResponse | null;
}

export default function CustomerViewDialog({ open, onOpenChange, customer }: CustomerViewDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open]);

    // Query: Shopping Cart
    const { data: cartData, isLoading: isCartLoading } = useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.CART, customer?.id],
        queryFn: () => getCart(customer!.id),
        enabled: open && !!customer?.id
    });

    // Mutation: Update Quantity
    const updateQuantityMutation = useMutation({
        mutationFn: ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) => updateCartItem(customer!.id, cartItemId, { quantity }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CART, customer?.id] });
            toast.success('Cart Item Updated');
        },
        onError: (err) => {
            toast.error('Failed to update cart item quantity', { description: getErrorMessage(err) });
        }
    });

    // Mutation: Remove Item
    const removeItemMutation = useMutation({
        mutationFn: (cartItemId: string) => removeCartItem(customer!.id, cartItemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CART, customer?.id] });
            toast.success('Item Removed from Cart');
        },
        onError: (err) => {
            toast.error('Failed to remove item', { description: getErrorMessage(err) });
        }
    });

    // Mutation: Clear Cart
    const clearCartMutation = useMutation({
        mutationFn: () => clearCart(customer!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CART, customer?.id] });
            toast.success('Cart Cleared Successfully');
        },
        onError: (err) => {
            toast.error('Failed to clear cart', { description: getErrorMessage(err) });
        }
    });

    const isDataLoading = !isRendering || !customer;

    const handleQuantityChange = (item: ICartItemResponse, diff: number) => {
        const newQty = item.quantity + diff;
        if (newQty < 1) {
            removeItemMutation.mutate(item.id);
        } else {
            updateQuantityMutation.mutate({ cartItemId: item.id, quantity: newQty });
        }
    };

    const renderAttributeBadges = (item: ICartItemResponse) => {
        const attributes = item.productVariant.attributes;
        if (attributes.length === 0) {
            return <span className="text-xs text-muted-foreground italic font-normal">Standard config</span>;
        }
        return (
            <div className="flex flex-wrap gap-1 mt-0.5">
                {attributes.map((attr) => (
                    <Badge
                        key={attr.id}
                        variant="secondary"
                        className="text-[10px] leading-none font-semibold capitalize py-0.5 px-1 bg-primary/5 text-primary border border-primary/10 shadow-3xs"
                    >
                        {attr.attributeValue.attribute.name}: {attr.attributeValue.value}
                    </Badge>
                ))}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                        <User className="size-5 text-primary" />
                        Customer Account Details
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Overview of customer registration credentials and active ordering shopping cart.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 min-h-0">
                    {isDataLoading ? (
                        <div className="flex flex-col items-center justify-center py-28 gap-3">
                            <Spinner className="h-6 w-6 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-medium">Loading customer data...</span>
                        </div>
                    ) : (
                        <>
                            {/* Profile Details Summary */}
                            <div className="flex flex-col sm:flex-row gap-5 items-start bg-muted/20 p-4 rounded-xl border border-border/40 shadow-3xs">
                                <div className="size-16 rounded-full overflow-hidden border border-border/60 shrink-0 bg-background/50 flex items-center justify-center shadow-3xs">
                                    <span className="font-bold text-xl text-primary/80 uppercase">
                                        {customer.user.firstName[0]}
                                        {customer.user.lastName[0]}
                                    </span>
                                </div>
                                <div className="space-y-1 flex-1 min-w-0 w-full">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <h3 className="text-base font-bold text-foreground/90 truncate leading-tight">
                                            {customer.user.firstName} {customer.user.lastName}
                                        </h3>
                                        <Badge variant="outline" className="text-[10px] py-0 px-2 font-semibold bg-background uppercase">
                                            {customer.deletedAt ? 'Archived' : 'Active'}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium space-x-2">
                                        <span>@{customer.user.username}</span>
                                        <span>•</span>
                                        <span>{customer.user.email}</span>
                                        {customer.user.phoneNumber && (
                                            <>
                                                <span>•</span>
                                                <span>{customer.user.phoneNumber}</span>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5 font-normal">
                                        <Calendar className="size-3.5 text-muted-foreground" />
                                        Joined: {format(new Date(customer.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                    </p>
                                </div>
                            </div>

                            {/* Shopping Cart Section */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h3 className="text-sm font-bold text-foreground/85 flex items-center gap-1.5">
                                        <ShoppingCart className="size-4 text-primary" />
                                        Active Shopping Cart Items
                                    </h3>
                                    {cartData && cartData.items.length > 0 && (
                                        <RequirePermission module="Customers Management" action="update">
                                            <Button
                                                onClick={() => clearCartMutation.mutate()}
                                                disabled={clearCartMutation.isPending}
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs gap-1 border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive transition-colors shadow-3xs"
                                            >
                                                <X className="size-3.5" /> Clear Cart
                                            </Button>
                                        </RequirePermission>
                                    )}
                                </div>

                                {isCartLoading ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-2 border border-dashed border-border/40 rounded-xl bg-background/50">
                                        <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                                        <span className="text-xs text-muted-foreground font-medium">Syncing shopping cart...</span>
                                    </div>
                                ) : !cartData || cartData.items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-1.5 border border-dashed border-border/50 rounded-xl bg-muted/5">
                                        <ShieldAlert className="size-5 text-muted-foreground/80 stroke-[1.5]" />
                                        <span className="text-xs text-muted-foreground font-medium">Customer's cart is empty</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Cart Items List */}
                                        <div className="border border-border/40 rounded-xl overflow-hidden bg-background/30 shadow-3xs divide-y divide-border/20">
                                            {cartData.items.map((item: ICartItemResponse) => {
                                                const subtotal = item.quantity * item.unitPrice;
                                                const productPhoto = item.productVariant.product.photo;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 hover:bg-muted/5 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="size-12 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0 shadow-3xs">
                                                                {productPhoto ? (
                                                                    <img
                                                                        src={
                                                                            productPhoto.startsWith('http') ? productPhoto : getFileUrl(productPhoto)
                                                                        }
                                                                        alt={item.productVariant.product.name}
                                                                        className="size-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <ShoppingCart className="size-5 text-muted-foreground/60 stroke-[1.5]" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-semibold text-xs text-foreground/90 truncate leading-tight">
                                                                    {item.productVariant.product.name}
                                                                </span>
                                                                {renderAttributeBadges(item)}
                                                                {item.productVariant.sku && (
                                                                    <span className="text-[10px] font-mono text-muted-foreground uppercase pt-0.5">
                                                                        SKU: {item.productVariant.sku}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Controls and pricing */}
                                                        <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 self-stretch sm:self-center">
                                                            {/* Quantity selector */}
                                                            <div className="flex items-center border border-border/60 bg-background rounded-lg p-0.5 shadow-3xs">
                                                                <RequirePermission module="Customers Management" action="update">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-7 rounded-md hover:bg-muted hover:text-foreground text-muted-foreground"
                                                                        disabled={updateQuantityMutation.isPending || removeItemMutation.isPending}
                                                                        onClick={() => handleQuantityChange(item, -1)}
                                                                    >
                                                                        <Minus className="size-3" />
                                                                    </Button>
                                                                </RequirePermission>
                                                                <span className="w-8 text-center text-xs font-semibold text-foreground/80">
                                                                    {item.quantity}
                                                                </span>
                                                                <RequirePermission module="Customers Management" action="update">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-7 rounded-md hover:bg-muted hover:text-foreground text-muted-foreground"
                                                                        disabled={updateQuantityMutation.isPending || removeItemMutation.isPending}
                                                                        onClick={() => handleQuantityChange(item, 1)}
                                                                    >
                                                                        <Plus className="size-3" />
                                                                    </Button>
                                                                </RequirePermission>
                                                            </div>

                                                            {/* Price Breakdown */}
                                                            <div className="text-right flex flex-col justify-center min-w-[80px]">
                                                                <span className="text-xs font-bold text-foreground/80">₱{subtotal.toFixed(2)}</span>
                                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                                    ₱{item.unitPrice.toFixed(2)} each
                                                                </span>
                                                            </div>

                                                            {/* Delete Single Item */}
                                                            <RequirePermission module="Customers Management" action="update">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors rounded-lg shadow-3xs border border-transparent hover:border-destructive/10"
                                                                    disabled={removeItemMutation.isPending}
                                                                    onClick={() => removeItemMutation.mutate(item.id)}
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                    <span className="sr-only">Remove Item</span>
                                                                </Button>
                                                            </RequirePermission>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Total Summary Amount Card */}
                                        <div className="flex justify-between items-center bg-muted/20 p-4 rounded-xl border border-border/40 shadow-3xs">
                                            <span className="text-xs font-bold text-foreground/70 uppercase tracking-wide">
                                                Computed Cart Subtotal
                                            </span>
                                            <span className="text-lg font-black text-primary">₱{cartData.totalAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <Button type="button" onClick={() => onOpenChange(false)} className="h-9 shadow-3xs">
                        Close Details
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
