import { useState, useMemo, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import {
    ShoppingBag,
    Coffee,
    Truck,
    Utensils,
    ChevronLeft,
    MapPin,
    Phone,
    User,
    Receipt,
    FileText,
    Info,
    AlertCircle,
    QrCode,
    Wallet,
    Smartphone,
    Upload,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';

import { useCart } from './use-cart.ts';
import { useCheckoutStore } from '#/store/checkout-store.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { createOrder } from '#/api/orders.api.ts';
import { uploadImageFile } from '#/api/transactions.api.ts';
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
    const { checkoutItemIds, selectedModifiers, clearCheckoutState, isDirectCheckout, directCheckoutItem } = useCheckoutStore();

    // Form states
    const [orderType, setOrderType] = useState<TOrderType>('DINE_IN');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'GCASH' | 'PAYMAYA'>('CASH');
    const [referenceNumber, setReferenceNumber] = useState('');

    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Invalid file type', {
                description: 'Please upload an image file (PNG, JPG, or JPEG).'
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File too large', {
                description: 'Receipt photo must be smaller than 5MB.'
            });
            return;
        }

        setReceiptFile(file);
        const previewUrl = URL.createObjectURL(file);
        setReceiptPreview(previewUrl);
    };

    const handleRemoveReceipt = () => {
        setReceiptFile(null);
        if (receiptPreview) {
            URL.revokeObjectURL(receiptPreview);
            setReceiptPreview('');
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Clean up local preview object URL to avoid leaks
    useEffect(() => {
        return () => {
            if (receiptPreview) {
                URL.revokeObjectURL(receiptPreview);
            }
        };
    }, [receiptPreview]);

    // Reset receipt when payment method changes
    useEffect(() => {
        handleRemoveReceipt();
    }, [paymentMethod]);

    const paymentOptions = useMemo(
        () => [
            {
                value: 'CASH' as const,
                label: orderType === 'DELIVERY' ? 'Cash on Delivery (COD)' : 'Over the Counter (Cash)',
                description: orderType === 'DELIVERY' ? 'Pay cash to our rider' : 'Pay cash or card at the counter',
                icon: Wallet
            },
            {
                value: 'GCASH' as const,
                label: 'GCash',
                description: 'Scan or transfer to 0917-123-4567',
                icon: Smartphone
            },
            {
                value: 'PAYMAYA' as const,
                label: 'Maya',
                description: 'Scan or transfer to 0917-123-4567',
                icon: Smartphone
            }
        ],
        [orderType]
    );

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
        if (isDirectCheckout && directCheckoutItem) {
            return [
                {
                    id: 'direct-checkout-item',
                    quantity: directCheckoutItem.quantity,
                    unitPrice: directCheckoutItem.unitPrice,
                    productVariantId: directCheckoutItem.productVariantId,
                    productVariant: directCheckoutItem.productVariant,
                    cartModifiers: []
                }
            ] as unknown as ICartItemResponse[];
        }
        if (!cart) return [];
        return cart.items.filter((item: ICartItemResponse) => checkoutItemIds.includes(item.id));
    }, [cart, checkoutItemIds, isDirectCheckout, directCheckoutItem]);

    // Compute checkout pricing
    const subtotal = useMemo(() => {
        return checkoutItems.reduce((sum: number, item: ICartItemResponse) => {
            const modifierPrice =
                isDirectCheckout && directCheckoutItem ? directCheckoutItem.selectedModifiersInfo.price : selectedModifiers[item.id]?.price || 0;
            return sum + (item.unitPrice + modifierPrice) * item.quantity;
        }, 0);
    }, [checkoutItems, selectedModifiers, isDirectCheckout, directCheckoutItem]);

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

        if (paymentMethod !== 'CASH') {
            if (!referenceNumber.trim()) {
                toast.error('Payment Reference Number Required', {
                    description: `Please input the ${paymentMethod === 'GCASH' ? 'GCash' : 'Maya'} reference number to verify your transaction.`
                });
                return;
            }
            if (!receiptFile) {
                toast.error('Payment Receipt Required', {
                    description: `Please upload a screenshot receipt of your ${paymentMethod === 'GCASH' ? 'GCash' : 'Maya'} payment.`
                });
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // 1. Upload receipt if digital wallet is chosen
            let uploadedUrl = '';
            if (paymentMethod !== 'CASH' && receiptFile) {
                setIsUploading(true);
                const uploadRes = await uploadImageFile(receiptFile);
                uploadedUrl = uploadRes.url;
                setIsUploading(false);
            }

            // Compile final order instructions notes
            const paymentLabel =
                paymentMethod === 'CASH' ? (orderType === 'DELIVERY' ? 'Cash on Delivery (COD)' : 'Over the Counter (Cash)') : paymentMethod;

            const paymentNotes = `Payment Method: ${paymentLabel}${paymentMethod !== 'CASH' && referenceNumber ? ` (Ref: ${referenceNumber.trim()})` : ''}${uploadedUrl ? `\nPayment Receipt: ${uploadedUrl}` : ''}`;

            const finalNotes = [
                orderType === 'DELIVERY' ? `Delivery Address: ${address.trim()}` : '',
                phoneNumber ? `Contact Phone: ${phoneNumber.trim()}` : '',
                paymentNotes,
                notes.trim() ? `Instructions: ${notes.trim()}` : ''
            ]
                .filter(Boolean)
                .join('\n');

            await createOrder({
                orderType,
                orderSource: 'WEBSITE',
                notes: finalNotes || undefined,
                customerId: customer.id,
                customerName: customerName.trim() || 'Customer',
                paymentMethod: paymentMethod,
                gcashReferenceNumber: paymentMethod !== 'CASH' ? referenceNumber.trim() : null,
                paymentProofPhoto: paymentMethod !== 'CASH' ? uploadedUrl : null,
                items: checkoutItems.map((item) => ({
                    productVariantId: item.productVariantId,
                    quantity: item.quantity,
                    notes: undefined,
                    modifierOptionIds:
                        isDirectCheckout && directCheckoutItem ? directCheckoutItem.modifierOptionIds : selectedModifiers[item.id]?.ids || []
                }))
            });

            // Clear states
            if (!isDirectCheckout) {
                await clearCart(checkoutItemIds);
            }
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
            setIsUploading(false);
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
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
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
                        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
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
                                        <span className="text-xs leading-tight text-muted-foreground/80">{opt.description}</span>
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
                        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
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

                    {/* Card 3: Select Payment Method */}
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Receipt className="size-5 text-primary" />
                            3. Select Payment Method
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {paymentOptions.map((opt) => {
                                const Icon = opt.icon;
                                const isSelected = paymentMethod === opt.value;
                                return (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        onClick={() => {
                                            setPaymentMethod(opt.value);
                                            setReferenceNumber('');
                                        }}
                                        className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all text-xs font-medium cursor-pointer ${
                                            isSelected
                                                ? 'border-primary bg-primary/5 shadow-2xs text-primary'
                                                : 'border-border/60 hover:border-border hover:bg-muted/20 text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className={`size-6 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="font-bold text-foreground mb-1">{opt.label}</span>
                                        <span className="text-xs leading-tight text-muted-foreground/80">{opt.description}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* GCash Details */}
                        {paymentMethod === 'GCASH' && (
                            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                    <div>
                                        <span className="text-xs font-bold uppercase  text-blue-600">GCash Account Details</span>
                                        <p className="text-sm font-bold text-foreground">BASTA KAPE STORE</p>
                                        <p className="text-xs font-mono text-muted-foreground">0917-123-4567</p>
                                    </div>
                                    <div className="flex items-center gap-2 border border-blue-500/10 rounded-lg p-2 bg-background/50 self-start">
                                        <QrCode className="size-8 text-blue-600" />
                                        <div className="text-xs leading-tight font-semibold text-muted-foreground">
                                            <span className="font-bold text-foreground">Scan QR Code</span>
                                            <br /> Send payment before placing order
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                    <label className="font-bold text-foreground/80 block text-xs">
                                        GCash Reference Number <span className="text-rose-500">*</span>
                                    </label>
                                    <Input
                                        placeholder="Enter 13-digit GCash reference number"
                                        value={referenceNumber}
                                        onChange={(e) => setReferenceNumber(e.target.value.replace(/\D/g, ''))}
                                        maxLength={13}
                                        className="h-10 text-xs rounded-xl bg-background/50 border-border/60 font-mono"
                                        required
                                    />
                                </div>

                                {/* Receipt screenshot */}
                                {receiptPreview ? (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="font-bold text-foreground/80 block text-xs">
                                            Payment Receipt Screenshot <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative border border-blue-500/10 rounded-xl overflow-hidden bg-background/50 p-2 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <img
                                                    src={receiptPreview}
                                                    alt="Receipt preview"
                                                    className="size-12 rounded-lg object-cover border border-border/40 shrink-0 cursor-pointer hover:opacity-90"
                                                    onClick={() => window.open(receiptPreview, '_blank')}
                                                />
                                                <div className="min-w-0 text-xs">
                                                    <p className="font-bold text-foreground truncate">{receiptFile?.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {(receiptFile ? receiptFile.size / 1024 / 1024 : 0).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={handleRemoveReceipt}
                                                className="size-8 text-muted-foreground hover:text-rose-500 shrink-0"
                                            >
                                                <Trash2 className="size-4" />
                                                <span className="sr-only">Remove screenshot</span>
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="font-bold text-foreground/80 block text-xs">
                                            Payment Receipt Screenshot <span className="text-rose-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-4 border border-dashed border-blue-500/20 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground bg-background/30 hover:bg-blue-500/5 transition-all cursor-pointer group"
                                        >
                                            <Upload className="size-5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                                            <span className="font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                                                Upload GCash receipt photo
                                            </span>
                                            <span className="text-xs text-muted-foreground/80">PNG, JPG, or JPEG up to 5MB</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Maya Details */}
                        {paymentMethod === 'PAYMAYA' && (
                            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                    <div>
                                        <span className="text-xs font-bold uppercase  text-emerald-600">Maya Account Details</span>
                                        <p className="text-sm font-bold text-foreground">BASTA KAPE STORE</p>
                                        <p className="text-xs font-mono text-muted-foreground">0917-123-4567</p>
                                    </div>
                                    <div className="flex items-center gap-2 border border-emerald-500/10 rounded-lg p-2 bg-background/50 self-start">
                                        <QrCode className="size-8 text-emerald-600" />
                                        <div className="text-xs leading-tight font-semibold text-muted-foreground">
                                            <span className="font-bold text-foreground">Scan QR Code</span>
                                            <br /> Send payment before placing order
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                    <label className="font-bold text-foreground/80 block text-xs">
                                        Maya Reference Number <span className="text-rose-500">*</span>
                                    </label>
                                    <Input
                                        placeholder="Enter Maya reference number"
                                        value={referenceNumber}
                                        onChange={(e) => setReferenceNumber(e.target.value.replace(/\D/g, ''))}
                                        className="h-10 text-xs rounded-xl bg-background/50 border-border/60 font-mono"
                                        required
                                    />
                                </div>

                                {/* Receipt screenshot */}
                                {receiptPreview ? (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="font-bold text-foreground/80 block text-xs">
                                            Payment Receipt Screenshot <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative border border-emerald-500/10 rounded-xl overflow-hidden bg-background/50 p-2 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <img
                                                    src={receiptPreview}
                                                    alt="Receipt preview"
                                                    className="size-12 rounded-lg object-cover border border-border/40 shrink-0 cursor-pointer hover:opacity-90"
                                                    onClick={() => window.open(receiptPreview, '_blank')}
                                                />
                                                <div className="min-w-0 text-xs">
                                                    <p className="font-bold text-foreground truncate">{receiptFile?.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {(receiptFile ? receiptFile.size / 1024 / 1024 : 0).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={handleRemoveReceipt}
                                                className="size-8 text-muted-foreground hover:text-rose-500 shrink-0"
                                            >
                                                <Trash2 className="size-4" />
                                                <span className="sr-only">Remove screenshot</span>
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="font-bold text-foreground/80 block text-xs">
                                            Payment Receipt Screenshot <span className="text-rose-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-4 border border-dashed border-emerald-500/20 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground bg-background/30 hover:bg-emerald-500/5 transition-all cursor-pointer group"
                                        >
                                            <Upload className="size-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                                            <span className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                                                Upload Maya receipt photo
                                            </span>
                                            <span className="text-xs text-muted-foreground/80">PNG, JPG, or JPEG up to 5MB</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Cash Details */}
                        {paymentMethod === 'CASH' && (
                            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-200">
                                {orderType === 'DELIVERY' ? (
                                    <span>
                                        Please prepare the exact amount of <strong>₱{subtotal.toFixed(2)}</strong> for Cash on Delivery (COD).
                                    </span>
                                ) : (
                                    <span>
                                        Please settle the payment of <strong>₱{subtotal.toFixed(2)}</strong> at the cashier counter upon pick-up.
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Hidden file input */}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    </div>

                    {/* Card 4: Payment & Order Guidelines */}
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Info className="size-5 text-primary" />
                            4. Payment & Order Guidelines
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-2.5 p-4 rounded-xl bg-muted/25 border border-border/40">
                                <h3 className="font-bold text-foreground flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-primary" />
                                    Payment Methods
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    We support <strong>Cash on Delivery (COD)</strong>, <strong>GCash</strong>, and <strong>Over-the-Counter</strong>{' '}
                                    payments. Cash/GCash details are verified by baristas before preparation.
                                </p>
                            </div>

                            <div className="space-y-2.5 p-4 rounded-xl bg-muted/25 border border-border/40">
                                <h3 className="font-bold text-foreground flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-primary" />
                                    Preparation & Tracking
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Your order goes directly to our Kitchen Display queue. You can track real-time prep progress on your personal{' '}
                                    <strong>Orders</strong> tracking dashboard.
                                </p>
                            </div>
                        </div>

                        <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-muted-foreground leading-relaxed flex gap-2">
                            <AlertCircle className="size-5 text-primary shrink-0 mt-0.5" />
                            <span>
                                <strong>Need to make changes?</strong> If you need to cancel or modify items, contact the branch immediately using
                                your order queue ticket number before preparation starts.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Order Summary */}
                <div className="space-y-6">
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-6">
                        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Receipt className="size-5 text-primary" />
                            Order Summary
                        </h2>

                        {/* List of checked out items */}
                        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                            {checkoutItems.map((item) => {
                                const modifierPrice =
                                    isDirectCheckout && directCheckoutItem
                                        ? directCheckoutItem.selectedModifiersInfo.price
                                        : selectedModifiers[item.id]?.price || 0;
                                const modifierNames =
                                    isDirectCheckout && directCheckoutItem
                                        ? directCheckoutItem.selectedModifiersInfo.names
                                        : selectedModifiers[item.id]?.names || [];
                                const itemTotal = (item.unitPrice + modifierPrice) * item.quantity;

                                return (
                                    <div key={item.id} className="flex gap-3 py-2 border-b border-border/30 last:border-0 last:pb-0">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className="text-xs font-bold text-foreground truncate max-w-[150px]">
                                                    {item.productVariant.product.name}
                                                </h4>
                                                <span className="text-xs font-bold text-foreground shrink-0">₱{itemTotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground font-semibold">
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
                            <div className="border-t border-dashed border-border/40 pt-3 flex justify-between text-sm font-bold">
                                <span className="text-foreground">Total Amount Due</span>
                                <span className="text-primary font-bold">₱{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-muted-foreground pt-1">
                                <span>Selected Payment</span>
                                <span className="text-foreground font-bold">
                                    {paymentMethod === 'CASH' ? (orderType === 'DELIVERY' ? 'Cash on Delivery' : 'Cash at Counter') : paymentMethod}
                                </span>
                            </div>
                        </div>

                        {/* Checkout Actions */}
                        <div className="pt-2 space-y-2">
                            <Button
                                type="submit"
                                disabled={isSubmitting || isUploading || checkoutItems.length === 0}
                                className="w-full h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all"
                            >
                                {isUploading ? (
                                    <>
                                        <Spinner className="size-4 animate-spin mr-1.5" />
                                        Uploading Receipt...
                                    </>
                                ) : isSubmitting ? (
                                    <>
                                        <Spinner className="size-4 animate-spin mr-1.5" />
                                        Placing Your Order...
                                    </>
                                ) : (
                                    'Confirm & Place Order'
                                )}
                            </Button>
                            <Link to="/cart" className="block text-center text-xs font-bold text-muted-foreground hover:text-foreground py-1">
                                Cancel & Back to Cart
                            </Link>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
