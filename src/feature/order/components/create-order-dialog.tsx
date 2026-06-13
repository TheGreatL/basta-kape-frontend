import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { createOrder } from '#/api/orders.api.ts';
import { getCustomers } from '#/api/customer.api.ts';
import { getProductsList } from '#/api/products.api.ts';
import { getModifierGroups } from '#/api/modifiers.api.ts';
import { getProductionForecast } from '#/api/inventory.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { TOrderType } from '../order.types';
import type { ICustomerResponse } from '#/feature/customer/customer.types.ts';
import type { IProduct } from '#/feature/products/products.types.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import type { IModifierGroup } from '#/feature/modifier/modifier.types';
import type { IForecast } from '#/feature/inventory/inventory.types';

interface CreateOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CreateOrderDialog({ open, onOpenChange }: CreateOrderDialogProps) {
    const queryClient = useQueryClient();

    // Admin order creation states
    const [customerType, setCustomerType] = React.useState<'GUEST' | 'MEMBER'>('GUEST');
    const [guestName, setGuestName] = React.useState('Walk-in');
    const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
    const [selectedCustomer, setSelectedCustomer] = React.useState<ICustomerResponse | null>(null);
    const [orderTypeVal, setOrderTypeVal] = React.useState<TOrderType>('DINE_IN');
    const [notes, setNotes] = React.useState('');

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

    // Reset fields when dialog opens/closes
    React.useEffect(() => {
        if (!open) {
            setOrderItems([]);
            setCustomerType('GUEST');
            setGuestName('Walk-in');
            setSelectedCustomerId(null);
            setSelectedCustomer(null);
            setOrderTypeVal('DINE_IN');
            setNotes('');
            setSelectedProductId('');
            setSelectedProduct(null);
            setSelectedVariantId('');
            setSelectedQuantity(1);
            setItemNotes('');
            setSelectedModifierIds([]);
        }
    }, [open]);

    // Query: Fetch Modifier Groups for the selected product
    const { data: modifierGroupsResponse } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.MODIFIERS_FOR_ORDER_CREATION, selectedProductId],
        queryFn: () => getModifierGroups({ productId: selectedProductId, limit: 50 }),
        enabled: open && !!selectedProductId
    });

    // Query: Fetch production forecast to get active stock levels and bottlenecks
    const { data: forecastData } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.FORECAST],
        queryFn: getProductionForecast,
        enabled: open
    });

    // Mutation: Create Order
    const createOrderMutation = useMutation({
        mutationFn: createOrder,
        onSuccess: (order) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            toast.success(`Order Queue #${order.queueNumber} placed successfully!`);
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to create order', { description: getErrorMessage(err) });
        }
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

    const handleCreateOrderSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (orderItems.length === 0) {
            toast.error('Please add at least one item to the order');
            return;
        }

        const customerNameVal =
            customerType === 'MEMBER' && selectedCustomer
                ? `${selectedCustomer.user.firstName || ''} ${selectedCustomer.user.lastName || ''}`.trim()
                : guestName;

        createOrderMutation.mutate({
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
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border/60 rounded-2xl">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-black text-foreground">
                        <Plus className="size-5 text-primary" />
                        Create POS Order Session
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Process walk-in transactions, guest orders, or customer profile checkouts.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 text-xs">
                    {/* Left Column: Config & Add Item */}
                    <div className="space-y-4">
                        <div className="border border-border/50 p-4 rounded-xl bg-card space-y-3">
                            <h3 className="font-bold text-xs uppercase text-muted-foreground  pb-1 border-b border-border/30">Customer & Method</h3>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="font-bold text-foreground/80">Customer Type</label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={customerType === 'GUEST' ? 'default' : 'outline'}
                                            onClick={() => setCustomerType('GUEST')}
                                            className="h-8.5 text-xs flex-1 rounded-lg font-semibold"
                                        >
                                            Walk-in / Guest
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={customerType === 'MEMBER' ? 'default' : 'outline'}
                                            onClick={() => setCustomerType('MEMBER')}
                                            className="h-8.5 text-xs flex-1 rounded-lg font-semibold"
                                        >
                                            Registered Member
                                        </Button>
                                    </div>
                                </div>

                                {customerType === 'GUEST' ? (
                                    <div className="space-y-1">
                                        <label className="font-bold text-foreground/80">Guest Name</label>
                                        <Input
                                            placeholder="e.g. John, Table 5, Walk-in..."
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                            className="h-9 bg-background/50 rounded-lg"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-1">
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
                                            className="h-9 text-xs bg-background/50 rounded-lg"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="font-bold text-foreground/80">Dining Option</label>
                                    <Select value={orderTypeVal} onValueChange={(val: TOrderType) => setOrderTypeVal(val)}>
                                        <SelectTrigger className="h-9 bg-background/50 rounded-lg">
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

                        {/* Add Product Item Form */}
                        <div className="border border-border/50 p-4 rounded-xl bg-card space-y-3">
                            <h3 className="font-bold text-xs uppercase text-muted-foreground  pb-1 border-b border-border/30">
                                Add Coffee / Item Options
                            </h3>

                            <div className="space-y-3">
                                <div className="space-y-1">
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
                                        className="h-9 text-xs bg-background/50 rounded-lg"
                                    />
                                </div>

                                {selectedProduct && (
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="font-bold text-foreground/80">Variant (Size / Attributes)</label>
                                            <Select value={selectedVariantId} onValueChange={(val) => setSelectedVariantId(val)}>
                                                <SelectTrigger className="h-9 bg-background/50 rounded-lg">
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

                                            {/* Selected Variant Stock Status Badge */}
                                            {(() => {
                                                const selectedVForecast = forecastData?.find((f: IForecast) => f.variantId === selectedVariantId);
                                                if (!selectedVariantId || !selectedVForecast) return null;
                                                return (
                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        {selectedVForecast.maxProduceable === 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                                                <span className="size-1 rounded-full bg-rose-500 animate-pulse" />
                                                                Out of Stock
                                                            </span>
                                                        ) : selectedVForecast.maxProduceable === 'Unlimited' ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                                <span className="size-1 rounded-full bg-emerald-500" />
                                                                In Stock (Unlimited)
                                                            </span>
                                                        ) : typeof selectedVForecast.maxProduceable === 'number' &&
                                                          selectedVForecast.maxProduceable <= 10 ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                                                                <span className="size-1 rounded-full bg-amber-500" />
                                                                Only {selectedVForecast.maxProduceable} left!
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                                <span className="size-1 rounded-full bg-emerald-500" />
                                                                In Stock ({selectedVForecast.maxProduceable} available)
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Modifiers checklist if available */}
                                        {modifierGroupsResponse?.data && modifierGroupsResponse.data.length > 0 && (
                                            <div className="space-y-2 pt-1">
                                                <span className="font-bold text-foreground/70 block">Select Add-ons</span>
                                                <div className="space-y-2.5 border border-border/40 p-2.5 rounded-lg bg-background/50 max-h-[160px] overflow-y-auto">
                                                    {modifierGroupsResponse.data.map((group: IModifierGroup) => {
                                                        const groupOptionIds = group.options.map((opt) => opt.id);
                                                        const currentSelectedCount = selectedModifierIds.filter((id) =>
                                                            groupOptionIds.includes(id)
                                                        ).length;
                                                        return (
                                                            <div
                                                                key={group.id}
                                                                className="space-y-1 pb-2 border-b border-border/10 last:border-0 last:pb-0"
                                                            >
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-bold text-foreground">{group.name}</span>
                                                                        {group.isRequired ? (
                                                                            <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/10">
                                                                                Required
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs font-semibold text-muted-foreground bg-muted border border-border/40 px-1.5 py-0.2 rounded">
                                                                                Optional
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-xs text-muted-foreground font-medium">
                                                                        {group.maxSelect === 1 ? 'Choose 1' : `Choose up to ${group.maxSelect}`}
                                                                        {currentSelectedCount > 0 && ` (${currentSelectedCount} selected)`}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {group.options.map((opt) => {
                                                                        const isChecked = selectedModifierIds.includes(opt.id);
                                                                        const optForecast = forecastData?.find(
                                                                            (f: IForecast) => f.variantId === opt.id
                                                                        );
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
                                                                                className={`h-7 text-3xs font-semibold py-0 px-2 rounded-md transition-all ${
                                                                                    isOutOfStock
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

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="font-bold text-foreground/80">Quantity</label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={selectedQuantity}
                                                    onChange={(e) => setSelectedQuantity(Math.max(1, Number(e.target.value)))}
                                                    className="h-9 bg-background/50 rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="font-bold text-foreground/80">Item Notes</label>
                                                <Input
                                                    placeholder="e.g. Extra hot..."
                                                    value={itemNotes}
                                                    onChange={(e) => setItemNotes(e.target.value)}
                                                    className="h-9 bg-background/50 rounded-lg"
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
                                            className="w-full h-8.5 font-bold text-xs rounded-lg mt-1"
                                        >
                                            Add Item to Receipt
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Checkout Breakdown */}
                    <div className="flex flex-col h-full space-y-4">
                        <div className="border border-border/50 p-4 rounded-xl bg-card space-y-3 flex-1 flex flex-col min-h-[200px]">
                            <h3 className="font-bold text-xs uppercase text-muted-foreground  pb-1 border-b border-border/30 shrink-0">
                                Current Items
                            </h3>

                            <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0 pr-1">
                                {orderItems.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                                        No items added to receipt yet.
                                    </div>
                                ) : (
                                    orderItems.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-start justify-between gap-3 border border-border/30 bg-background p-2.5 rounded-lg"
                                        >
                                            <div className="min-w-0 space-y-0.5">
                                                <div className="font-bold text-foreground truncate">
                                                    {item.name} x{item.quantity}
                                                </div>
                                                {item.sku && <span className="text-xs text-muted-foreground block">{item.sku}</span>}
                                                {item.modifierNames && item.modifierNames.length > 0 && (
                                                    <span className="text-xs text-muted-foreground font-semibold block">
                                                        Addons: {item.modifierNames.join(', ')}
                                                    </span>
                                                )}
                                                {item.notes && <span className="text-xs text-amber-600 block italic">Note: "{item.notes}"</span>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-foreground/90 shrink-0">
                                                    ₱{(item.price * item.quantity).toFixed(2)}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="size-7 text-muted-foreground hover:text-rose-500 rounded-md"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Summary computations & submit */}
                        <div className="border border-border/50 p-4 rounded-xl bg-muted/10 space-y-3 font-medium shrink-0">
                            <div className="space-y-1.5 text-xs">
                                <label className="font-bold text-foreground/80 block">Overall Order Notes</label>
                                <Input
                                    placeholder="Add queue notes, table numbers..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="h-8.5 bg-background/50 rounded-lg text-xs"
                                />
                            </div>

                            <div className="space-y-1.5 pt-1.5 border-t border-border/30">
                                <div className="flex justify-between text-muted-foreground text-xs">
                                    <span>Items Subtotal:</span>
                                    <span>₱{orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-sm text-foreground pt-1.5 border-t border-dashed border-border/40">
                                    <span>Net Due Total:</span>
                                    <span className="text-primary font-black">
                                        ₱{orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9.5 text-xs rounded-lg font-semibold">
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleCreateOrderSubmit}
                        disabled={orderItems.length === 0 || createOrderMutation.isPending}
                        className="h-9.5 text-xs rounded-lg font-bold bg-primary text-primary-foreground shadow-sm px-6"
                    >
                        {createOrderMutation.isPending ? 'Placing Order...' : 'Place POS Order'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
