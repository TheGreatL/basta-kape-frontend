import { Link } from '@tanstack/react-router';
import { ShoppingCart, Trash2, Plus, Minus, Coffee, CreditCard } from 'lucide-react';
import { useCart } from './use-cart.ts';
import { useAuthStore } from '#/store/auth-store.ts';
import { Button } from '#/components/ui/button.tsx';
import { toast } from 'sonner';
import type { ICartItemResponse } from './customer.types.ts';

export default function CartPage() {
    const user = useAuthStore((state) => state.user);
    const { cart, isLoading, updateItem, removeItem, clearCart, isClearing } = useCart();

    const items = cart?.items || [];
    const totalAmount = cart?.totalAmount || 0;

    const handleQuantityChange = async (item: ICartItemResponse, newQuantity: number) => {
        if (newQuantity <= 0) {
            await removeItem(item.id);
        } else {
            await updateItem({ cartItemId: item.id, quantity: newQuantity });
        }
    };

    const handleCheckout = () => {
        toast.info('Checkout functionality is coming soon!', {
            description: 'Orders and payments module will be integrated in the next phase.',
            duration: 5000
        });
    };

    // Helper: format variant attribute values (e.g. Size: Large)
    const getVariantLabel = (item: ICartItemResponse) => {
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
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Shopping Cart</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        You have {items.reduce((acc, item) => acc + item.quantity, 0)} items in your cart.
                    </p>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearCart()}
                    disabled={isClearing}
                    className="text-muted-foreground hover:text-destructive gap-1.5 text-xs h-9"
                >
                    <Trash2 className="size-4" />
                    Clear Cart
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items List */}
                <div className="lg:col-span-2 space-y-4">
                    {items.map((item: ICartItemResponse) => {
                        const product = item.productVariant.product;
                        return (
                            <div
                                key={item.id}
                                className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-card hover:shadow-xs transition-shadow"
                            >
                                {/* Photo */}
                                <div className="size-16 sm:size-20 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                                    {product.photo ? (
                                        <img src={product.photo} alt={product.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <Coffee className="size-8 text-muted-foreground/40" />
                                    )}
                                </div>

                                {/* Product details */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                        {product.category?.name || 'Beverage'}
                                    </div>
                                    <h3 className="text-sm sm:text-base font-bold text-foreground truncate mt-0.5">
                                        {product.name || 'Unknown Item'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">{getVariantLabel(item)}</p>
                                    <div className="text-xs font-semibold text-foreground mt-1 sm:hidden">₱{item.unitPrice.toFixed(2)}</div>
                                </div>

                                {/* Right action area / Prices */}
                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 shrink-0">
                                    {/* Price per unit (desktop only) */}
                                    <div className="hidden sm:block text-sm font-medium text-muted-foreground">₱{item.unitPrice.toFixed(2)}</div>

                                    {/* Quantity controls */}
                                    <div className="flex items-center gap-1 border border-border/60 rounded-lg p-0.5 bg-card">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                            className="h-7 w-7 rounded-md p-0"
                                        >
                                            <Minus className="size-3" />
                                        </Button>
                                        <span className="w-6 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                            className="h-7 w-7 rounded-md p-0"
                                        >
                                            <Plus className="size-3" />
                                        </Button>
                                    </div>

                                    {/* Total item price */}
                                    <div className="text-sm sm:text-base font-extrabold text-foreground w-16 text-right">
                                        ₱{(item.unitPrice * item.quantity).toFixed(2)}
                                    </div>

                                    {/* Delete item button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeItem(item.id)}
                                        className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Summary Panel */}
                <div className="h-fit rounded-2xl border border-border/40 bg-card p-6 shadow-xs space-y-6">
                    <h2 className="text-lg font-bold text-foreground">Order Summary</h2>

                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Subtotal</span>
                            <span className="font-semibold text-foreground">₱{totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Shipping / Delivery</span>
                            <span className="font-semibold text-foreground">Free</span>
                        </div>
                        <div className="border-t border-border/40 pt-3 flex justify-between">
                            <span className="text-base font-bold text-foreground">Total</span>
                            <span className="text-lg font-black text-foreground">₱{totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        onClick={handleCheckout}
                        className="w-full h-12 rounded-xl gap-2 font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                    >
                        <CreditCard className="size-4.5" />
                        Proceed to Checkout
                    </Button>
                </div>
            </div>
        </div>
    );
}
