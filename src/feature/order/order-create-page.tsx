import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Trash2, Coins, Wallet, Landmark, Upload, Clock, ArrowLeft, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

import { createOrder, createOrderPayment } from '#/api/orders.api.ts';
import { getCustomers } from '#/api/customer.api.ts';
import { getProductsList } from '#/api/products.api.ts';
import { getModifierGroups } from '#/api/modifiers.api.ts';
import { getProductionForecast } from '#/api/inventory.api.ts';
import { uploadImageFile } from '#/api/transactions.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { TOrderType } from './order.types';
import type { ICustomerResponse } from '#/feature/customer/customer.types.ts';
import type { IProduct } from '#/feature/products/products.types.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import type { IModifierGroup } from '#/feature/modifier/modifier.types';
import type { IForecast } from '#/feature/inventory/inventory.types';

export default function OrderCreatePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Admin order creation states
    const [customerType, setCustomerType] = React.useState<'GUEST' | 'MEMBER'>('GUEST');
    const [guestName, setGuestName] = React.useState('Walk-in');
    const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
    const [selectedCustomer, setSelectedCustomer] = React.useState<ICustomerResponse | null>(null);
    const [orderTypeVal, setOrderTypeVal] = React.useState<TOrderType>('DINE_IN');
    const [notes, setNotes] = React.useState('');

    // Payment states
    const [paymentMethod, setPaymentMethod] = React.useState<'UNPAID' | 'CASH' | 'GCASH' | 'PAYMAYA' | 'CREDIT_CARD'>('UNPAID');
    const [amountTendered, setAmountTendered] = React.useState<number>(0);
    const [referenceNumber, setReferenceNumber] = React.useState<string>('');
    const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = React.useState<string>('');
    const [isUploading, setIsUploading] = React.useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    // Items list being added
    const [orderItems, setOrderItems] = React.useState<
        Array<{
            productVariantId: string;
            name: string;
            sku: string | null;
            price: number;
            quantity: number;
            notes?: string;
            modifierOptionIds?: string[];
            modifierNames?: string[];
        }>
    >([]);

    // Temporary item state
    const [selectedProductId, setSelectedProductId] = React.useState<string>('');
    const [selectedProduct, setSelectedProduct] = React.useState<IProduct | null>(null);
    const [selectedVariantId, setSelectedVariantId] = React.useState<string>('');
    const [selectedQuantity, setSelectedQuantity] = React.useState<number>(1);
    const [itemNotes, setItemNotes] = React.useState('');
    const [selectedModifierIds, setSelectedModifierIds] = React.useState<string[]>([]);

    // Cleanup object URL previews on unmount
    React.useEffect(() => {
        return () => {
            if (receiptPreview) {
                URL.revokeObjectURL(receiptPreview);
            }
        };
    }, [receiptPreview]);

    const handleBack = () => {
        navigate({
            to: '/admin/orders',
            search: {
                page: 1,
                pageSize: 10,
                search: '',
                status: '',
                orderType: '',
                orderSource: ''
            }
        });
    };

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

    const netTotal = React.useMemo(() => {
        return orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [orderItems]);

    React.useEffect(() => {
        if (paymentMethod === 'CASH') {
            setAmountTendered(netTotal);
        }
    }, [paymentMethod, netTotal]);

    const changeDue = React.useMemo(() => {
        if (paymentMethod !== 'CASH') return 0;
        const diff = amountTendered - netTotal;
        return diff > 0 ? diff : 0;
    }, [paymentMethod, amountTendered, netTotal]);

    // Query: Fetch Modifier Groups for the selected product
    const { data: modifierGroupsResponse } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.MODIFIERS_FOR_ORDER_CREATION, selectedProductId],
        queryFn: () => getModifierGroups({ productId: selectedProductId, limit: 50 }),
        enabled: !!selectedProductId
    });

    // Query: Fetch production forecast to get active stock levels and bottlenecks
    const { data: forecastData } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.FORECAST],
        queryFn: getProductionForecast
    });

    const handleToggleModifierOption = (groupId: string, optionId: string, maxSelect: number, isRequired: boolean, groupName: string) => {
        const group = modifierGroupsResponse?.data.find((g: IModifierGroup) => g.id === groupId);
        if (!group) return;
        const groupOptionIds = group.options.map((opt: any) => opt.id);

        setSelectedModifierIds((prev) => {
            if (maxSelect === 1) {
                const filtered = prev.filter((id) => !groupOptionIds.includes(id));
                if (prev.includes(optionId)) {
                    return isRequired ? prev : filtered;
                } else {
                    return [...filtered, optionId];
                }
            } else {
                if (prev.includes(optionId)) {
                    return prev.filter((id) => id !== optionId);
                } else {
                    const currentSelectedFromGroup = prev.filter((id) => groupOptionIds.includes(id));
                    if (currentSelectedFromGroup.length >= maxSelect) {
                        toast.warning(`You can select at most ${maxSelect} option(s) for ${groupName}.`);
                        return prev;
                    }
                    return [...prev, optionId];
                }
            }
        });
    };

    const handleAddItem = () => {
        if (!selectedProductId || !selectedVariantId) {
            toast.error('Please select product and variant');
            return;
        }

        const variant = selectedProduct?.variants.find((v) => v.id === selectedVariantId);
        if (!selectedProduct || !variant) return;

        // Check if selected variant is out of stock or exceeds stock capacity
        const selectedVForecast = forecastData?.find((f: IForecast) => f.variantId === selectedVariantId);
        if (selectedVForecast) {
            if (selectedVForecast.maxProduceable === 0) {
                toast.error(`${selectedProduct.name} variant is out of stock!`);
                return;
            }
            if (typeof selectedVForecast.maxProduceable === 'number' && selectedQuantity > selectedVForecast.maxProduceable) {
                toast.error(`Only ${selectedVForecast.maxProduceable} units of this variant are available.`);
                return;
            }
        }

        // Validate modifier groups constraints
        let hasValidationError = false;
        if (modifierGroupsResponse?.data) {
            for (const group of modifierGroupsResponse.data) {
                const groupOptionIds = group.options.map((opt: any) => opt.id);
                const selectedFromGroup = selectedModifierIds.filter((id) => groupOptionIds.includes(id));

                if (group.isRequired && selectedFromGroup.length === 0) {
                    toast.error(`Please select at least one option for ${group.name}.`);
                    hasValidationError = true;
                } else if (selectedFromGroup.length < group.minSelect) {
                    toast.error(`Please select at least ${group.minSelect} option(s) for ${group.name}.`);
                    hasValidationError = true;
                } else if (selectedFromGroup.length > group.maxSelect) {
                    toast.error(`You can select at most ${group.maxSelect} option(s) for ${group.name}.`);
                    hasValidationError = true;
                }
            }
        }

        // Check if any selected modifier is out of stock
        for (const modId of selectedModifierIds) {
            const modForecast = forecastData?.find((f: any) => f.variantId === modId);
            if (modForecast && modForecast.maxProduceable === 0) {
                const cleanName = modForecast.name.replace('[Modifier] ', '');
                toast.error(`Add-on "${cleanName}" is out of stock!`);
                hasValidationError = true;
            }
        }

        if (hasValidationError) {
            return;
        }

        // Collect selected modifiers
        const selectedModifiers: any[] = [];
        const modifierNames: string[] = [];
        let modifiersPrice = 0;

        modifierGroupsResponse?.data.forEach((group: IModifierGroup) => {
            group.options.forEach((opt) => {
                if (selectedModifierIds.includes(opt.id)) {
                    selectedModifiers.push(opt);
                    modifierNames.push(opt.name);
                    modifiersPrice += opt.price;
                }
            });
        });

        const sizeLabel = variant.attributes.map((attr) => attr.attributeValue.value).join('/') || variant.sku || 'Regular';
        const displayName = `${selectedProduct.name} (${sizeLabel})`;

        setOrderItems((prev) => [
            ...prev,
            {
                productVariantId: selectedVariantId,
                name: displayName,
                sku: variant.sku,
                price: variant.price + modifiersPrice,
                quantity: selectedQuantity,
                notes: itemNotes || undefined,
                modifierOptionIds: selectedModifiers.map((m) => m.id),
                modifierNames
            }
        ]);

        // Reset add item states
        setSelectedProductId('');
        setSelectedProduct(null);
        setSelectedVariantId('');
        setSelectedQuantity(1);
        setItemNotes('');
        setSelectedModifierIds([]);
    };

    const handleRemoveItem = (index: number) => {
        setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleCreateOrderSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (orderItems.length === 0) {
            toast.error('Please add at least one item to the order');
            return;
        }

        if (paymentMethod === 'CASH') {
            if (amountTendered < netTotal) {
                toast.error('Insufficient Amount', {
                    description: `Amount tendered must be at least the net total of ₱${netTotal.toFixed(2)}`
                });
                return;
            }
        }

        if (paymentMethod !== 'UNPAID') {
            if (paymentMethod !== 'CASH') {
                if (!referenceNumber.trim() || referenceNumber.trim().length < 5) {
                    toast.error('Reference Number Required', {
                        description: 'Digital payments require a reference number of at least 5 characters.'
                    });
                    return;
                }
            }
        }

        setIsSubmitting(true);

        try {
            // 1. Upload receipt if file is selected
            let uploadedUrl = '';
            if (receiptFile) {
                setIsUploading(true);
                const uploadRes = await uploadImageFile(receiptFile);
                uploadedUrl = uploadRes.url;
                setIsUploading(false);
            }

            // 2. Create POS order
            const customerNameVal =
                customerType === 'MEMBER' && selectedCustomer
                    ? `${selectedCustomer.user.firstName || ''} ${selectedCustomer.user.lastName || ''}`.trim()
                    : guestName;

            const order = await createOrder({
                orderType: orderTypeVal,
                orderSource: 'POS',
                notes: notes || undefined,
                customerId: customerType === 'MEMBER' ? selectedCustomerId : null,
                customerName: customerNameVal || 'Walk-in',
                items: orderItems.map((item) => ({
                    productVariantId: item.productVariantId,
                    quantity: item.quantity,
                    notes: item.notes,
                    modifierOptionIds: item.modifierOptionIds
                }))
            });

            // 3. Create payment transaction if not unpaid
            if (paymentMethod !== 'UNPAID') {
                const paymentPayload = {
                    paymentMethod,
                    amountTendered: paymentMethod === 'CASH' ? amountTendered : undefined,
                    gcashReferenceNumber: paymentMethod !== 'CASH' ? referenceNumber.trim() : undefined,
                    paymentProofPhoto: uploadedUrl || undefined
                };

                await createOrderPayment(order.id, paymentPayload);
                toast.success(`Order #${order.queueNumber} placed and paid successfully!`);
            } else {
                toast.success(`Order Queue #${order.queueNumber} placed successfully!`);
            }

            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            handleBack();
        } catch (err) {
            toast.error('Failed to create order', {
                description: getErrorMessage(err)
            });
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto px-1 py-3">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b pb-4 border-border/40">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                        <span className="cursor-pointer hover:text-foreground transition-colors" onClick={handleBack}>
                            Orders
                        </span>
                        <span>/</span>
                        <span className="text-foreground">Create POS Order</span>
                    </div>
                    <div className="flex items-center gap-2.5 pt-1">
                        <button
                            onClick={handleBack}
                            className="p-1.5 rounded-lg border border-border/60 hover:bg-muted transition-colors shrink-0"
                            title="Back to Orders Log"
                        >
                            <ArrowLeft className="size-4 text-muted-foreground hover:text-foreground" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground leading-none">Create POS Order Session</h1>
                            <p className="text-xs text-muted-foreground pt-1">
                                Process walk-in transactions, guest orders, or customer profile checkouts.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Checkout Panel Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Left Column: Config & Add Item */}
                <div className="space-y-6">
                    {/* Customer & Method Card */}
                    <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm space-y-4">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/30">
                            Customer & Dining Method
                        </h3>

                        <div className="space-y-4 text-xs">
                            <div className="space-y-2">
                                <label className="font-bold text-foreground/80">Customer Type</label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={customerType === 'GUEST' ? 'default' : 'outline'}
                                        onClick={() => setCustomerType('GUEST')}
                                        className="h-9 text-xs flex-1 rounded-lg font-semibold"
                                    >
                                        Walk-in / Guest
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={customerType === 'MEMBER' ? 'default' : 'outline'}
                                        onClick={() => setCustomerType('MEMBER')}
                                        className="h-9 text-xs flex-1 rounded-lg font-semibold"
                                    >
                                        Registered Member
                                    </Button>
                                </div>
                            </div>

                            {customerType === 'GUEST' ? (
                                <div className="space-y-1.5">
                                    <label className="font-bold text-foreground/80">Guest Name</label>
                                    <Input
                                        placeholder="e.g. John, Table 5, Walk-in..."
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        className="h-9.5 bg-background/50 rounded-lg text-xs"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <label className="font-bold text-foreground/80 block mb-1">Select Member Profile</label>
                                    <InfiniteSelect
                                        queryKey={[QUERY_KEY.CUSTOMERS.SELECT_FOR_ORDER_CREATION]}
                                        fetchFn={({ pageParam, query }) =>
                                            getCustomers({ limit: 10, page: pageParam || 1, search: query, status: 'active' })
                                        }
                                        getItems={(page) => page.data}
                                        getNextPageParam={(lastPage) => (lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined)}
                                        getOptionValue={(c) => c.id}
                                        getOptionLabel={(c) => `${c.user.firstName} ${c.user.lastName} (@${c.user.username})`}
                                        value={selectedCustomerId || undefined}
                                        onChange={(val, item) => {
                                            setSelectedCustomerId(val || null);
                                            setSelectedCustomer(item || null);
                                        }}
                                        placeholder="Select customer profile..."
                                        searchPlaceholder="Search by name, email, username..."
                                        className="h-9.5 text-xs bg-background/50 rounded-lg"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground/80">Dining Option</label>
                                <Select value={orderTypeVal} onValueChange={(val: TOrderType) => setOrderTypeVal(val)}>
                                    <SelectTrigger className="h-9.5 bg-background/50 rounded-lg text-xs">
                                        <SelectValue placeholder="Select option" />
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
                        </div>
                    </div>

                    {/* Add Product Workspace Card */}
                    <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm space-y-4">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/30">
                            Add Coffee & Beverages
                        </h3>

                        <div className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground/80 block mb-1">Product</label>
                                <InfiniteSelect
                                    queryKey={[QUERY_KEY.PRODUCTS.SELECT_FOR_ORDER_CREATION]}
                                    fetchFn={({ pageParam, query }) =>
                                        getProductsList({ limit: 10, page: pageParam || 1, search: query, status: 'active' })
                                    }
                                    getItems={(page) => page.data}
                                    getNextPageParam={(lastPage) => (lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined)}
                                    getOptionValue={(p) => p.id}
                                    getOptionLabel={(p) => p.name}
                                    value={selectedProductId || undefined}
                                    onChange={(val, item) => {
                                        setSelectedProductId(val || '');
                                        setSelectedProduct(item || null);
                                        setSelectedVariantId('');
                                        setSelectedModifierIds([]);
                                    }}
                                    placeholder="Search product catalog..."
                                    searchPlaceholder="Search by product name..."
                                    className="h-9.5 text-xs bg-background/50 rounded-lg"
                                />
                            </div>

                            {selectedProduct && (
                                <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-foreground/80">Variant (Size / Attributes)</label>
                                        <Select value={selectedVariantId} onValueChange={(val) => setSelectedVariantId(val)}>
                                            <SelectTrigger className="h-9.5 bg-background/50 rounded-lg text-xs">
                                                <SelectValue placeholder="Choose variant..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {selectedProduct.variants.map((v) => {
                                                    const label = v.attributes.map((a) => a.attributeValue.value).join('/') || v.sku || 'Regular';
                                                    const vForecast = forecastData?.find((f: IForecast) => f.variantId === v.id);

                                                    let stockSuffix = '';
                                                    if (vForecast) {
                                                        if (vForecast.maxProduceable === 0) {
                                                            stockSuffix = ' — Out of Stock';
                                                        } else if (vForecast.maxProduceable === 'Unlimited') {
                                                            stockSuffix = ' — In Stock';
                                                        } else {
                                                            stockSuffix = ` — ${vForecast.maxProduceable} left`;
                                                        }
                                                    }

                                                    return (
                                                        <SelectItem
                                                            key={v.id}
                                                            value={v.id}
                                                            className="text-xs"
                                                            disabled={vForecast?.maxProduceable === 0}
                                                        >
                                                            {label} — ₱{v.price.toFixed(2)}
                                                            {stockSuffix}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>

                                        {/* Variant Stock Badge */}
                                        {(() => {
                                            const selectedVForecast = forecastData?.find((f: IForecast) => f.variantId === selectedVariantId);
                                            if (!selectedVariantId || !selectedVForecast) return null;
                                            return (
                                                <div className="mt-1 flex items-center gap-1.5">
                                                    {selectedVForecast.maxProduceable === 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                                            <span className="size-1 rounded-full bg-rose-500 animate-pulse" />
                                                            Out of Stock
                                                        </span>
                                                    ) : selectedVForecast.maxProduceable === 'Unlimited' ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                            <span className="size-1 rounded-full bg-emerald-500" />
                                                            In Stock (Unlimited)
                                                        </span>
                                                    ) : typeof selectedVForecast.maxProduceable === 'number' &&
                                                      selectedVForecast.maxProduceable <= 10 ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                                                            <span className="size-1 rounded-full bg-amber-500" />
                                                            Only {selectedVForecast.maxProduceable} left!
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                            <span className="size-1 rounded-full bg-emerald-500" />
                                                            In Stock ({selectedVForecast.maxProduceable} available)
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Modifier Groups Checklist */}
                                    {modifierGroupsResponse?.data && modifierGroupsResponse.data.length > 0 && (
                                        <div className="space-y-2 pt-1 animate-in slide-in-from-top-2 duration-200">
                                            <span className="font-bold text-foreground/75 block">Select Add-ons / Modifiers</span>
                                            <div className="space-y-3 border border-border/40 p-3.5 rounded-xl bg-background/50 max-h-[200px] overflow-y-auto">
                                                {modifierGroupsResponse.data.map((group: IModifierGroup) => {
                                                    const groupOptionIds = group.options.map((opt) => opt.id);
                                                    const currentSelectedCount = selectedModifierIds.filter((id) =>
                                                        groupOptionIds.includes(id)
                                                    ).length;
                                                    return (
                                                        <div
                                                            key={group.id}
                                                            className="space-y-1.5 pb-2.5 border-b border-border/10 last:border-0 last:pb-0"
                                                        >
                                                            <div className="flex justify-between items-center mb-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs font-bold text-foreground">{group.name}</span>
                                                                    {group.isRequired ? (
                                                                        <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/10">
                                                                            Required
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted border border-border/40 px-1.5 py-0.2 rounded">
                                                                            Optional
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-2xs text-muted-foreground font-medium">
                                                                    {group.maxSelect === 1 ? 'Choose 1' : `Choose up to ${group.maxSelect}`}
                                                                    {currentSelectedCount > 0 && ` (${currentSelectedCount} selected)`}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {group.options.map((opt) => {
                                                                    const isChecked = selectedModifierIds.includes(opt.id);
                                                                    const optForecast = forecastData?.find((f: IForecast) => f.variantId === opt.id);
                                                                    const isOutOfStock = optForecast?.maxProduceable === 0;
                                                                    const isLowStock =
                                                                        optForecast &&
                                                                        typeof optForecast.maxProduceable === 'number' &&
                                                                        optForecast.maxProduceable > 0 &&
                                                                        optForecast.maxProduceable <= 10;

                                                                    let stockLabel = '';
                                                                    if (isOutOfStock) {
                                                                        stockLabel = ' (OOS)';
                                                                    } else if (isLowStock) {
                                                                        stockLabel = ` (${optForecast.maxProduceable} left)`;
                                                                    }

                                                                    return (
                                                                        <Button
                                                                            key={opt.id}
                                                                            type="button"
                                                                            variant={isChecked ? 'default' : 'outline'}
                                                                            disabled={isOutOfStock && !isChecked}
                                                                            onClick={() => {
                                                                                handleToggleModifierOption(
                                                                                    group.id,
                                                                                    opt.id,
                                                                                    group.maxSelect,
                                                                                    group.isRequired,
                                                                                    group.name
                                                                                );
                                                                            }}
                                                                            className={`h-7.5 text-3xs font-semibold py-0 px-2 rounded-md transition-all ${
                                                                                isChecked
                                                                                    ? 'bg-primary text-primary-foreground'
                                                                                    : isOutOfStock
                                                                                      ? 'opacity-40 border-dashed border-rose-300 bg-rose-500/5 hover:bg-rose-500/5 cursor-not-allowed text-rose-500'
                                                                                      : isLowStock
                                                                                        ? 'border-amber-400/80 hover:border-amber-500 text-amber-700'
                                                                                        : ''
                                                                            }`}
                                                                        >
                                                                            {opt.name} (+₱{opt.price.toFixed(2)}){stockLabel}
                                                                        </Button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div className="space-y-1">
                                            <label className="font-bold text-foreground/80">Quantity</label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={selectedQuantity}
                                                onChange={(e) => setSelectedQuantity(Math.max(1, Number(e.target.value)))}
                                                className="h-9.5 bg-background/50 rounded-lg text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-bold text-foreground/80">Item Notes</label>
                                            <Input
                                                placeholder="e.g. Extra hot..."
                                                value={itemNotes}
                                                onChange={(e) => setItemNotes(e.target.value)}
                                                className="h-9.5 bg-background/50 rounded-lg text-xs"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={handleAddItem}
                                        disabled={
                                            !selectedVariantId ||
                                            (() => {
                                                const selectedVForecast = forecastData?.find((f: IForecast) => f.variantId === selectedVariantId);
                                                return selectedVForecast?.maxProduceable === 0;
                                            })()
                                        }
                                        className="w-full h-9 text-xs font-bold rounded-lg mt-1"
                                    >
                                        Add Item to Receipt
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Checkout Breakdown */}
                <div className="flex flex-col gap-6 lg:min-h-[500px]">
                    {/* Items List Card */}
                    <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm flex-1 flex flex-col min-h-[300px]">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/30 shrink-0">
                            Current Order Receipt
                        </h3>

                        <div className="flex-1 overflow-y-auto space-y-3.5 min-h-[220px] pr-1 py-3">
                            {orderItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                                    <ShoppingBag className="size-8 text-muted-foreground/50 mb-2.5" />
                                    No items added to receipt yet.
                                </div>
                            ) : (
                                orderItems.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start justify-between gap-4 border border-border/30 bg-background/50 hover:bg-background/80 p-3.5 rounded-xl transition-colors text-xs"
                                    >
                                        <div className="min-w-0 space-y-1">
                                            <div className="font-bold text-foreground truncate">
                                                {item.name} <span className="text-muted-foreground font-semibold">x{item.quantity}</span>
                                            </div>
                                            {item.sku && <span className="text-2xs font-mono text-muted-foreground block">{item.sku}</span>}
                                            {item.modifierNames && item.modifierNames.length > 0 && (
                                                <span className="text-2xs text-muted-foreground font-semibold block">
                                                    Addons: {item.modifierNames.join(', ')}
                                                </span>
                                            )}
                                            {item.notes && (
                                                <span className="text-2xs text-amber-600 block italic font-medium">Note: "{item.notes}"</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="font-bold text-foreground/90 text-sm">₱{(item.price * item.quantity).toFixed(2)}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveItem(idx)}
                                                className="size-7.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-500/10 shrink-0"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Payment Method selectors */}
                        <div className="space-y-4 pt-4 border-t border-border/30 shrink-0">
                            <div className="space-y-2 text-xs">
                                <label className="font-bold text-foreground/85">Collection/Payment Method</label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {(
                                        [
                                            { id: 'UNPAID', label: 'Unpaid / Delay', icon: Clock },
                                            { id: 'CASH', label: 'Cash Drawer', icon: Coins },
                                            { id: 'GCASH', label: 'GCash', icon: Wallet },
                                            { id: 'PAYMAYA', label: 'Maya Wallet', icon: Wallet },
                                            { id: 'CREDIT_CARD', label: 'Card Swipe', icon: Landmark }
                                        ] as const
                                    ).map((method) => {
                                        const MethodIcon = method.icon;
                                        return (
                                            <Button
                                                key={method.id}
                                                type="button"
                                                variant={paymentMethod === method.id ? 'default' : 'outline'}
                                                onClick={() => setPaymentMethod(method.id)}
                                                className="h-10 px-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-lg text-3xs font-bold leading-none"
                                            >
                                                <MethodIcon className="size-3.5" />
                                                {method.label}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CASH FLOW details */}
                            {paymentMethod === 'CASH' && (
                                <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150 text-xs">
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-foreground/80 block">Amount Tendered (₱)</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder={netTotal.toFixed(2)}
                                            value={amountTendered || ''}
                                            onChange={(e) => setAmountTendered(e.target.value === '' ? 0 : Number(e.target.value))}
                                            className="h-9.5 text-xs bg-background/50 rounded-lg font-bold"
                                        />
                                    </div>
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex justify-between items-center text-xs font-semibold">
                                        <span className="text-emerald-700">Change Due to Customer:</span>
                                        <span className="text-emerald-600 font-bold text-sm">₱{changeDue.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            {/* DIGITAL WALLETS details */}
                            {(paymentMethod === 'GCASH' || paymentMethod === 'PAYMAYA') && (
                                <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150 text-xs">
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-foreground/80 block">
                                            Reference / Txn ID <span className="text-rose-500">*</span>
                                        </label>
                                        <Input
                                            placeholder={`Enter ${paymentMethod === 'GCASH' ? 'GCash' : 'Maya'} reference ID`}
                                            value={referenceNumber}
                                            onChange={(e) => setReferenceNumber(e.target.value.replace(/\D/g, ''))}
                                            className="h-9.5 text-xs bg-background/50 rounded-lg font-mono"
                                            required
                                        />
                                    </div>

                                    {/* File zone */}
                                    {receiptPreview ? (
                                        <div className="relative border border-border/40 rounded-xl overflow-hidden bg-background/50 p-2 flex items-center justify-between gap-3 text-2xs">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <img
                                                    src={receiptPreview}
                                                    alt="Receipt Preview"
                                                    className="size-9 rounded-lg object-cover shrink-0 cursor-pointer"
                                                    onClick={() => window.open(receiptPreview, '_blank')}
                                                />
                                                <span className="truncate font-semibold text-muted-foreground">{receiptFile?.name}</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={handleRemoveReceipt}
                                                className="size-7.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-500/10"
                                            >
                                                <Trash2 className="size-4.5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-3.5 border border-dashed border-border/80 hover:border-primary hover:bg-muted/10 rounded-xl flex flex-col items-center justify-center gap-1.5 text-2xs text-muted-foreground transition-all cursor-pointer"
                                        >
                                            <Upload className="size-4.5 text-muted-foreground" />
                                            <span className="font-bold text-foreground/80">Upload payment slip screenshot (Optional)</span>
                                        </button>
                                    )}

                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Checkout Details Card */}
                    <div className="border border-border/60 p-5 rounded-2xl bg-muted/10 space-y-4 shadow-xs">
                        <div className="space-y-2 text-xs">
                            <label className="font-bold text-foreground/80 block">Overall Order Notes</label>
                            <Input
                                placeholder="Add queue instructions, buzzer IDs, table info..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="h-9.5 bg-background/50 rounded-lg text-xs"
                            />
                        </div>

                        <div className="space-y-2.5 pt-3 border-t border-border/30 text-xs">
                            <div className="flex justify-between text-muted-foreground font-medium">
                                <span>Items Subtotal:</span>
                                <span className="font-semibold text-foreground/80">₱{netTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-sm text-foreground pt-3 border-t border-dashed border-border/40">
                                <span>Net Due Total:</span>
                                <span className="text-primary font-bold text-base">₱{netTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                disabled={isSubmitting || isUploading}
                                className="h-10.5 text-xs flex-1 rounded-xl font-semibold shadow-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleCreateOrderSubmit}
                                disabled={orderItems.length === 0 || isSubmitting || isUploading}
                                className="h-10.5 text-xs flex-1 rounded-xl font-bold bg-primary text-primary-foreground shadow-sm px-6"
                            >
                                {isUploading ? (
                                    <>
                                        <Spinner className="size-3.5 animate-spin mr-1.5" />
                                        Uploading Receipt...
                                    </>
                                ) : isSubmitting ? (
                                    <>
                                        <Spinner className="size-3.5 animate-spin mr-1.5" />
                                        Processing Order...
                                    </>
                                ) : (
                                    'Place POS Order'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
