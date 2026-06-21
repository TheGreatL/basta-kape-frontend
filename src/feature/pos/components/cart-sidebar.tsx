import { ShoppingBagIcon, Trash2, ShoppingBag, Minus, Plus, Tag, ArrowRight, X, Pencil } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { Separator } from '#/components/ui/separator.tsx';
import type { IDiscount } from '../../store-settings/discounts.types';
import type { IMenuProduct, IMenuProductVariant } from '../../menu/menu.types';
import type { IModifierOption } from '../../modifier/modifier.types';

interface CartItem {
    id: string;
    product: IMenuProduct;
    variant: IMenuProductVariant;
    modifierOptions: IModifierOption[];
    quantity: number;
    notes?: string;
}

interface CartSidebarProps {
    cart: CartItem[];
    updateCartQuantity: (rowId: string, delta: number) => void;
    removeCartItem: (rowId: string) => void;
    clearCart: () => void;
    appliedDiscount: IDiscount | null;
    handleRemoveDiscount: () => void;
    cartSubtotal: number;
    discountAmount: number;
    cartVatAmount: number;
    cartNetTotal: number;
    onOpenDiscount: () => void;
    onOpenCheckout: () => void;
    getCartItemPrice: (item: CartItem) => number;
    onEditCartItem: (item: CartItem) => void;
}

export default function CartSidebar({
    cart,
    updateCartQuantity,
    removeCartItem,
    clearCart,
    appliedDiscount,
    handleRemoveDiscount,
    cartSubtotal,
    discountAmount,
    cartVatAmount,
    cartNetTotal,
    onOpenDiscount,
    onOpenCheckout,
    getCartItemPrice,
    onEditCartItem
}: CartSidebarProps) {
    return (
        <div className="w-[340px] border border-border/60 bg-card/45 backdrop-blur-xs rounded-xl flex flex-col overflow-hidden shrink-0 shadow-sm text-left">
            {/* Cart Header */}
            <div className="p-4 border-b border-border/40 flex items-center justify-between shrink-0 bg-muted/10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        <ShoppingBagIcon className="size-4" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-foreground uppercase">Order Cart</h3>
                        <span className="text-xs text-muted-foreground font-semibold">
                            {cart.reduce((sum, i) => sum + i.quantity, 0)} Items Added
                        </span>
                    </div>
                </div>
                {cart.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCart}
                        className="h-7 px-2 hover:bg-destructive/10 hover:text-destructive text-muted-foreground text-2xs"
                    >
                        <Trash2 className="size-3.5" />
                    </Button>
                )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
                        <ShoppingBag className="size-8 stroke-[1.25] text-muted-foreground/60" />
                        <p className="text-xs font-bold text-foreground">Empty Checkout Cart</p>
                        <p className="text-xs leading-relaxed">Select beverages from catalog to build order tickets.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/30 px-3">
                        {cart.map((item) => {
                            const variantLabel = item.variant.attributes.map((a: any) => a.attributeValue.value).join(', ');
                            const modifiersLabel = item.modifierOptions.map((o) => o.name).join(', ');
                            const itemPrice = getCartItemPrice(item);
                            return (
                                <div key={item.id} className="py-3 flex flex-col gap-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-foreground leading-tight block">{item.product.name}</span>
                                            {variantLabel && (
                                                <span className="text-xs font-semibold text-muted-foreground mt-0.5 block leading-none">
                                                    {variantLabel}
                                                </span>
                                            )}
                                            {modifiersLabel && (
                                                <span className="text-xs text-primary mt-0.5 block leading-tight font-medium">
                                                    + {modifiersLabel}
                                                </span>
                                            )}
                                            {item.notes && (
                                                <span className="text-xs italic text-amber-600 bg-amber-500/5 border border-amber-500/10 px-1 py-0.5 rounded mt-1.5 block">
                                                    Note: {item.notes}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEditCartItem(item)}
                                                className="size-6 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 rounded-lg"
                                                title="Edit item options"
                                            >
                                                <Pencil className="size-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeCartItem(item.id)}
                                                className="size-6 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                title="Remove item"
                                            >
                                                <Trash2 className="size-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-1">
                                        {/* Quantity Actions */}
                                        <div className="flex items-center gap-1.5 border rounded-lg p-0.5 bg-background/50">
                                            <button
                                                onClick={() => updateCartQuantity(item.id, -1)}
                                                className="p-1 rounded-md hover:bg-muted text-muted-foreground active:scale-95 transition-transform cursor-pointer"
                                            >
                                                <Minus className="size-2.5" />
                                            </button>
                                            <span className="text-2xs font-bold w-5 text-center text-foreground font-mono">{item.quantity}</span>
                                            <button
                                                onClick={() => updateCartQuantity(item.id, 1)}
                                                className="p-1 rounded-md hover:bg-muted text-muted-foreground active:scale-95 transition-transform cursor-pointer"
                                            >
                                                <Plus className="size-2.5" />
                                            </button>
                                        </div>
                                        {/* Price details */}
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-foreground font-mono">
                                                ₱{(itemPrice * item.quantity).toFixed(2)}
                                            </span>
                                            {item.quantity > 1 && (
                                                <span className="text-xs text-muted-foreground font-mono block mt-0.5">
                                                    ₱{itemPrice.toFixed(2)} ea
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Cart Footer Summary */}
            <div className="p-4 border-t border-border/40 space-y-3 bg-muted/10 shrink-0">
                {/* applied discount badge */}
                {appliedDiscount && (
                    <div className="flex justify-between items-center bg-primary/10 border border-primary/20 text-primary text-xs py-1.5 px-2.5 rounded-lg font-semibold animate-fade-in">
                        <span className="flex items-center gap-1.5">
                            <Tag className="size-3" />
                            {appliedDiscount.name} (
                            {appliedDiscount.type === 'PERCENTAGE' ? `${appliedDiscount.value}%` : `₱${appliedDiscount.value}`})
                        </span>
                        <button
                            onClick={handleRemoveDiscount}
                            className="p-0.5 hover:bg-primary/25 rounded text-primary shrink-0 transition-colors cursor-pointer"
                        >
                            <X className="size-3" />
                        </button>
                    </div>
                )}

                <div className="space-y-1.5 text-2xs font-medium">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Cart Subtotal:</span>
                        <span className="font-mono">₱{cartSubtotal.toFixed(2)}</span>
                    </div>
                    {appliedDiscount && (
                        <div className="flex justify-between text-primary font-semibold">
                            <span>Discount Deductions:</span>
                            <span className="font-mono">-₱{discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                        <span>VAT (12% inclusive):</span>
                        <span className="font-mono">₱{cartVatAmount.toFixed(2)}</span>
                    </div>
                    <Separator className="my-1.5 bg-border/40" />
                    <div className="flex justify-between items-center text-sm font-bold text-foreground">
                        <span>Grand Total:</span>
                        <span className="font-mono text-primary text-base">₱{cartNetTotal.toFixed(2)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={cart.length === 0}
                        onClick={onOpenDiscount}
                        className="h-8.5 text-2xs font-semibold gap-1"
                        title="Apply discount code"
                    >
                        <Tag className="size-3.5" />
                        Disc.
                    </Button>
                    <Button
                        disabled={cart.length === 0}
                        onClick={onOpenCheckout}
                        className="col-span-2 h-8.5 text-2xs font-bold bg-primary text-primary-foreground shadow-xs gap-1"
                    >
                        Process Pay <ArrowRight className="size-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
