import { useState, useMemo, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { ShoppingBag, Coffee, Truck, Utensils, ChevronLeft, MapPin, Phone, User, Receipt, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { useCart } from './use-cart.ts';
import { useCheckoutStore } from '#/store/checkout-store.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { createOrder } from '#/api/orders.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { TOrderType } from '#/feature/order/order.types.ts';
import type { ICartItemResponse } from '#/feature/customer/customer.types.ts';

const diningOptions = [
    {
        value: 'DINE_IN' as TOrderType,
        label: 'Dine In',
        icon: Utensils,
        description: 'Enjoy fresh brews at our cozy tables'
    },
    {
        value: 'TAKE_OUT' as TOrderType,
        label: 'Take Out',
        icon: Coffee,
        description: 'Grab and go from the barista counter'
    },
    {
        value: 'DELIVERY' as TOrderType,
        label: 'Delivery',
        icon: Truck,
        description: 'Delivered fresh to your doorstep'
    }
];

export default function CheckoutPage() {
    const navigate = useNavigate();
    const { customer, cart, isLoading, clearCart } = useCart();
    const { checkoutItemIds, selectedModifiers, clearCheckoutState } = useCheckoutStore();

    // Form states
    const [orderType, setOrderType] = useState<TOrderType>('DINE_IN');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    // Pre-populate customer details once loaded
    useEffect(() => {
        if (customer) {
            setCustomerName(`${customer.user.firstName || ''} ${customer.user.lastName || ''}`.trim() || customer.user.username);
            setPhoneNumber(customer.user.phoneNumber || '');
        }
    }, [customer]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Compute checkout items
    const checkoutItems = useMemo<ICartItemResponse[]>(() => {
        if (!cart) return [];
        return cart.items.filter((item: ICartItemResponse) => checkoutItemIds.includes(item.id));
    }, [cart, checkoutItemIds]);

    // Compute checkout pricing
    const subtotal = useMemo(() => {
        return checkoutItems.reduce((sum: number, item: ICartItemResponse) => {
            const modifierPrice = selectedModifiers[item.id]?.price || 0;
            return sum + (item.unitPrice + modifierPrice) * item.quantity;
        }, 0);
    }, [checkoutItems, selectedModifiers]);

    // Format attributes label (e.g. Size: Large)
    const getVariantLabel = (item: ICartItemResponse) => {
        const attributes = item.productVariant.attributes;
        if (attributes.length === 0) return 'Regular';
        return attributes.map((attr) => attr.attributeValue.value).join(' / ');
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!customer) return;

        if (orderType === 'DELIVERY' && !address.trim()) {
            toast.error('Delivery Address Required', {
                description: 'Please input a delivery address to complete your order.'
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Compile final order instructions notes
            const finalNotes =
                orderType === 'DELIVERY'
                    ? `Delivery Address: ${address.trim()}${notes ? `\nInstructions: ${notes.trim()}` : ''}${phoneNumber ? `\nContact Phone: ${phoneNumber.trim()}` : ''}`
                    : notes.trim();

            await createOrder({
                orderType,
                orderSource: 'WEBSITE',
                notes: finalNotes || undefined,
                customerId: customer.id,
                customerName: customerName.trim() || 'Customer',
                items: checkoutItems.map((item) => ({
                    productVariantId: item.productVariantId,
                    quantity: item.quantity,
                    notes: undefined,
                    modifierOptionIds: selectedModifiers[item.id]?.ids || []
                }))
            });

            // Clear states
            await clearCart();
            clearCheckoutState();

            toast.success('Order Placed Successfully!', {
                description: 'Your order has been queued for barista preparation.'
            });

            navigate({ to: '/orders' });
        } catch (err) {
            toast.error('Failed to place order', {
                description: getErrorMessage(err)
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-5xl animate-pulse space-y-6">
                <div className="h-6 w-36 bg-muted rounded" />
                <div className="h-10 w-64 bg-muted rounded" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="h-40 bg-muted rounded-2xl" />
                        <div className="h-48 bg-muted rounded-2xl" />
                    </div>
                    <div className="h-60 bg-muted rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl min-h-screen">
            {/* Back to Cart navigation */}
            <div className="mb-4">
                <Link
                    to="/cart"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="size-4" />
                    Back to Shopping Cart
                </Link>
            </div>

            {/* Title Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-2">
                    <ShoppingBag className="size-8 text-primary" />
                    Checkout Order
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Select your dining method, fill in details, and finalize your coffee order.</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Checkout Fields */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Card 1: Dining Option Selection */}
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                        <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                            <Coffee className="size-5 text-primary" />
                            1. Select Dining Method
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {diningOptions.map((opt) => {
                                const Icon = opt.icon;
                                const isSelected = orderType === opt.value;
                                return (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        onClick={() => setOrderType(opt.value)}
                                        className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all text-xs font-medium cursor-pointer ${
                                            isSelected
                                                ? 'border-primary bg-primary/5 shadow-2xs text-primary'
                                                : 'border-border/60 hover:border-border hover:bg-muted/20 text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className={`size-6 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="font-bold text-foreground mb-1">{opt.label}</span>
                                        <span className="text-[10px] leading-tight text-muted-foreground/80">{opt.description}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Delivery Address Field (shown conditionally) */}
                        {orderType === 'DELIVERY' && (
                            <div className="pt-2 space-y-1.5 animate-in fade-in slide-in-from-top-3 duration-200">
                                <label className="font-bold text-foreground/80 flex items-center gap-1.5 text-xs">
                                    <MapPin className="size-4 text-primary" />
                                    Delivery Address <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    placeholder="House/Unit #, Street name, Barangay, City, Landmark..."
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="h-10 text-xs rounded-xl bg-background/50 border-border/60"
                                    required
                                />
                            </div>
                        )}
                    </div>

                    {/* Card 2: Contact & Instructions */}
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                        <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                            <User className="size-5 text-primary" />
                            2. Customer Details & Instructions
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground/80 block text-xs">Customer Name</label>
                                <Input
                                    placeholder="Enter recipient's name"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="h-10 text-xs rounded-xl bg-background/50 border-border/60"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground/80 block text-xs">
                                    Contact Phone {orderType === 'DELIVERY' && <span className="text-rose-500">*</span>}
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="e.g. 0917XXXXXXX"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="pl-9 h-10 text-xs rounded-xl bg-background/50 border-border/60"
                                        required={orderType === 'DELIVERY'}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-foreground/80 flex items-center gap-1.5 text-xs">
                                <FileText className="size-4 text-muted-foreground" />
                                Special Preparation Notes (Optional)
                            </label>
                            <Textarea
                                placeholder="E.g., Extra hot, half-sweet, milk alternative requests, or delivery instructions..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="bg-background/50 text-xs resize-none rounded-xl h-24"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Side: Order Summary */}
                <div className="space-y-6">
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-6">
                        <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                            <Receipt className="size-5 text-primary" />
                            Order Summary
                        </h2>

                        {/* List of checked out items */}
                        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                            {checkoutItems.map((item) => {
                                const modifierPrice = selectedModifiers[item.id]?.price || 0;
                                const modifierNames = selectedModifiers[item.id]?.names || [];
                                const itemTotal = (item.unitPrice + modifierPrice) * item.quantity;

                                return (
                                    <div key={item.id} className="flex gap-3 py-2 border-b border-border/30 last:border-0 last:pb-0">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className="text-xs font-bold text-foreground truncate max-w-[150px]">
                                                    {item.productVariant.product.name}
                                                </h4>
                                                <span className="text-xs font-extrabold text-foreground shrink-0">₱{itemTotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground font-semibold">
                                                <span>
                                                    Qty: {item.quantity} × ₱{(item.unitPrice + modifierPrice).toFixed(2)}
                                                </span>
                                                <span>Size: {getVariantLabel(item)}</span>
                                                {modifierNames.length > 0 && (
                                                    <span className="text-primary/80 italic">Add-ons: {modifierNames.join(', ')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pricing Breakdown */}
                        <div className="border-t border-border/50 pt-4 space-y-2.5 text-xs font-medium">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span className="font-bold text-foreground">₱{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Shipping & Handling</span>
                                <span className="font-bold text-emerald-600">Free</span>
                            </div>
                            <div className="border-t border-dashed border-border/40 pt-3 flex justify-between text-sm font-black">
                                <span className="text-foreground">Total Amount Due</span>
                                <span className="text-primary font-black">₱{subtotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Checkout Actions */}
                        <div className="pt-2 space-y-2">
                            <Button
                                type="submit"
                                disabled={isSubmitting || checkoutItems.length === 0}
                                className="w-full h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Spinner className="size-4 animate-spin mr-1.5" />
                                        Placing Your Order...
                                    </>
                                ) : (
                                    'Confirm & Place Order'
                                )}
                            </Button>
                            <Link to="/cart" className="block text-center text-[11px] font-bold text-muted-foreground hover:text-foreground py-1">
                                Cancel & Back to Cart
                            </Link>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
