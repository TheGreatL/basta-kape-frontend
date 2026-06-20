import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Trash2, Upload, ArrowLeft, ShoppingBag, Tag, CreditCard, CheckCircle2, Printer, FileText, Download, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type z from 'zod';

import { createOrder, createOrderPayment, getOrderById } from '#/api/orders.api.ts';
import { getCustomers } from '#/api/customer.api.ts';
import { getProductsList } from '#/api/products.api.ts';
import { getModifierGroups } from '#/api/modifiers.api.ts';
import { getProductionForecast } from '#/api/inventory.api.ts';
import { uploadImageFile } from '#/api/transactions.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { ICustomerResponse } from '#/feature/customer/customer.types.ts';
import type { IProduct } from '#/feature/products/products.types.ts';
import { orderCreateFormSchema, orderDiscountFormSchema, createOrderPaymentSchema, PAYMENT_METHODS } from './order.types';
import type { IOrder } from './order.types';
import type { IDiscount } from '../store-settings/discounts.types';
import { getDiscountsConfig, applyDiscountToOrder, removeDiscountFromOrder } from '#/api/discounts.api.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import type { IModifierGroup } from '#/feature/modifier/modifier.types';
import type { IForecast } from '#/feature/inventory/inventory.types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu.tsx';
import CheckoutSuccessDialog from './components/checkout-success-dialog.tsx';
import { printReceiptHtml, openReceiptPdf, downloadReceiptPdf } from '#/utils/receipt.ts';

export default function OrderCreatePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Two-Step checkout wizard state
    const [createdOrder, setCreatedOrder] = React.useState<IOrder | null>(null);
    const [receiptPreview, setReceiptPreview] = React.useState<string>('');
    const [isUploading, setIsUploading] = React.useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
    const [selectedCustomer, setSelectedCustomer] = React.useState<ICustomerResponse | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = React.useState<boolean>(false);
    const [lastSubmittedPayment, setLastSubmittedPayment] = React.useState<{
        paymentMethod: string;
        amountTendered?: number;
        changeDue?: number;
    } | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    // Form 1: Order Creation (Step 1)
    const orderForm = useForm<z.infer<typeof orderCreateFormSchema>>({
        resolver: zodResolver(orderCreateFormSchema),
        defaultValues: {
            customerType: 'GUEST',
            guestName: 'Walk-in',
            customerId: null,
            buzzerId: '',
            orderType: 'DINE_IN',
            notes: '',
            items: []
        }
    });

    const customerType = orderForm.watch('customerType');
    const orderType = orderForm.watch('orderType');
    const orderItems = orderForm.watch('items');

    // Query: Discounts catalog
    const { data: discounts } = useQuery({
        queryKey: [QUERY_KEY.STORE_SETTINGS.DISCOUNTS_LIST],
        queryFn: getDiscountsConfig
    });

    const activeDiscounts = React.useMemo(() => {
        return discounts?.filter((d: IDiscount) => d.isActive) || [];
    }, [discounts]);

    // Form 2: Apply Discount (Step 2)
    const discountForm = useForm<z.infer<typeof orderDiscountFormSchema>>({
        resolver: zodResolver(orderDiscountFormSchema),
        defaultValues: {
            discountId: '',
            referenceId: '',
            referenceName: ''
        }
    });

    const selectedDiscountId = discountForm.watch('discountId');
    const selectedDiscount = React.useMemo(() => {
        return activeDiscounts.find((d: IDiscount) => d.id === selectedDiscountId);
    }, [selectedDiscountId, activeDiscounts]);

    const isSelectedBIR = React.useMemo(() => {
        if (!selectedDiscount) return false;
        const nameLower = selectedDiscount.name.toLowerCase();
        const codeLower = (selectedDiscount.code ?? '').toLowerCase();
        return (
            nameLower.includes('senior') ||
            nameLower.includes('sc') ||
            nameLower.includes('pwd') ||
            codeLower.includes('senior') ||
            codeLower.includes('sc') ||
            codeLower.includes('pwd')
        );
    }, [selectedDiscount]);

    // Form 3: Payment Collection (Step 2)
    const subtotal = React.useMemo(() => {
        return orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [orderItems]);

    const currentNetTotal = createdOrder?.netTotal ?? subtotal;
    const paymentSchema = React.useMemo(() => createOrderPaymentSchema(currentNetTotal), [currentNetTotal]);

    type PaymentFormValues = z.infer<ReturnType<typeof createOrderPaymentSchema>>;

    const paymentForm = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            paymentMethod: 'UNPAID',
            amountTendered: currentNetTotal,
            referenceNumber: ''
        } as any
    });

    const paymentMethod = paymentForm.watch('paymentMethod');
    const amountTendered = paymentForm.watch('amountTendered') ?? 0;

    // Reset default payment form values when order is created/updated
    React.useEffect(() => {
        if (createdOrder) {
            paymentForm.reset({
                paymentMethod: 'CASH',
                amountTendered: createdOrder.netTotal,
                referenceNumber: '',
                receiptFile: null
            });
        }
    }, [createdOrder, paymentForm]);

    // Temporary item state (local to adding beverages panel)
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

        paymentForm.setValue('receiptFile', file, { shouldValidate: true });
        const previewUrl = URL.createObjectURL(file);
        setReceiptPreview(previewUrl);
    };

    const handleRemoveReceipt = () => {
        paymentForm.setValue('receiptFile', null, { shouldValidate: true });
        if (receiptPreview) {
            URL.revokeObjectURL(receiptPreview);
            setReceiptPreview('');
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    React.useEffect(() => {
        if (paymentMethod === 'CASH') {
            paymentForm.setValue('amountTendered', currentNetTotal);
        }
    }, [paymentMethod, currentNetTotal, paymentForm]);

    const changeDue = React.useMemo(() => {
        if (paymentMethod !== 'CASH') return 0;
        const diff = amountTendered - currentNetTotal;
        return diff > 0 ? diff : 0;
    }, [paymentMethod, amountTendered, currentNetTotal]);

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

        const newItems = [
            ...orderItems,
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
        ];

        orderForm.setValue('items', newItems, { shouldValidate: true });

        // Reset add item states
        setSelectedProductId('');
        setSelectedProduct(null);
        setSelectedVariantId('');
        setSelectedQuantity(1);
        setItemNotes('');
        setSelectedModifierIds([]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = orderItems.filter((_, idx) => idx !== index);
        orderForm.setValue('items', newItems, { shouldValidate: true });
    };

    // Step 1: Place POS Order
    const onPlaceOrderSubmit = async (values: z.infer<typeof orderCreateFormSchema>) => {
        setIsSubmitting(true);
        try {
            const customerNameVal =
                values.customerType === 'MEMBER' && selectedCustomer
                    ? `${selectedCustomer.user.firstName || ''} ${selectedCustomer.user.lastName || ''}`.trim()
                    : values.guestName;

            const order = await createOrder({
                orderType: values.orderType,
                orderSource: 'POS',
                notes: values.notes || undefined,
                customerId: values.customerType === 'MEMBER' ? values.customerId : null,
                customerName: customerNameVal || 'Walk-in',
                buzzerId: (values.orderType === 'DINE_IN' || values.orderType === 'TAKE_OUT') && values.buzzerId ? values.buzzerId : undefined,
                items: values.items.map((item) => ({
                    productVariantId: item.productVariantId,
                    quantity: item.quantity,
                    notes: item.notes,
                    modifierOptionIds: item.modifierOptionIds
                }))
            });

            // Re-fetch created order details so we get full includes
            const detailedOrder = await getOrderById(order.id);
            setCreatedOrder(detailedOrder);

            toast.success(`Order Queue #${order.queueNumber} placed successfully!`, {
                description: 'Order created. Please configure discounts or confirm the payment below.'
            });

            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
        } catch (err) {
            toast.error('Failed to create order', {
                description: getErrorMessage(err)
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step 2: Apply Discount
    const onApplyDiscountSubmit = async (values: z.infer<typeof orderDiscountFormSchema>) => {
        if (!createdOrder) return;
        if (isSelectedBIR && (!values.referenceId?.trim() || !values.referenceName?.trim())) {
            toast.error('BIR compliance: Card ID and Holder Name are required.');
            return;
        }

        try {
            await applyDiscountToOrder(createdOrder.id, {
                discountId: values.discountId,
                referenceId: isSelectedBIR ? values.referenceId : undefined,
                referenceName: isSelectedBIR ? values.referenceName : undefined
            });

            const updatedOrder = await getOrderById(createdOrder.id);
            setCreatedOrder(updatedOrder);

            toast.success('Discount applied successfully.');
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
        } catch (err) {
            toast.error('Failed to apply discount', {
                description: getErrorMessage(err)
            });
        }
    };

    const handleRemoveDiscount = async () => {
        if (!createdOrder) return;
        try {
            await removeDiscountFromOrder(createdOrder.id);
            const updatedOrder = await getOrderById(createdOrder.id);
            setCreatedOrder(updatedOrder);

            toast.success('Discount removed successfully.');
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            discountForm.reset();
        } catch (err) {
            toast.error('Failed to remove discount', {
                description: getErrorMessage(err)
            });
        }
    };

    // Step 2: Settle Payment
    const onPaymentSubmit = async (values: PaymentFormValues) => {
        if (!createdOrder) return;

        setIsSubmitting(true);
        try {
            if (values.paymentMethod === 'UNPAID') {
                setLastSubmittedPayment({
                    paymentMethod: 'UNPAID',
                    amountTendered: 0,
                    changeDue: 0
                });
                setShowSuccessDialog(true);
                queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
                return;
            }

            let uploadedUrl = '';
            if (values.receiptFile) {
                setIsUploading(true);
                const uploadRes = await uploadImageFile(values.receiptFile);
                uploadedUrl = uploadRes.url;
                setIsUploading(false);
            }

            const paymentPayload = {
                paymentMethod: values.paymentMethod,
                amountTendered: values.paymentMethod === 'CASH' ? values.amountTendered : undefined,
                gcashReferenceNumber: values.paymentMethod !== 'CASH' ? values.referenceNumber?.trim() : undefined,
                paymentProofPhoto: uploadedUrl || undefined
            };

            await createOrderPayment(createdOrder.id, paymentPayload);
            setLastSubmittedPayment({
                paymentMethod: values.paymentMethod,
                amountTendered: values.paymentMethod === 'CASH' ? values.amountTendered : createdOrder.netTotal,
                changeDue: values.paymentMethod === 'CASH' ? changeDue : 0
            });
            setShowSuccessDialog(true);
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
        } catch (err) {
            toast.error('Failed to process payment', {
                description: getErrorMessage(err)
            });
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };

    const renderCustomerMethodCard = (disabled: boolean) => {
        return (
            <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm space-y-4">
                <h3 className="font-bold text-xs uppercase text-muted-foreground pb-2 border-b border-border/30">Customer & Dining Method</h3>

                <div className="space-y-4 text-xs">
                    <FormField
                        control={orderForm.control}
                        name="customerType"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="font-bold text-foreground/80">Customer Type</FormLabel>
                                <FormControl>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={field.value === 'GUEST' ? 'default' : 'outline'}
                                            disabled={disabled}
                                            onClick={() => {
                                                field.onChange('GUEST');
                                                orderForm.setValue('customerId', null);
                                                orderForm.setValue('guestName', 'Walk-in');
                                            }}
                                            className="h-9 text-xs flex-1 rounded-lg font-semibold"
                                        >
                                            Walk-in / Guest
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={field.value === 'MEMBER' ? 'default' : 'outline'}
                                            disabled={disabled}
                                            onClick={() => {
                                                field.onChange('MEMBER');
                                                orderForm.setValue('guestName', '');
                                                orderForm.setValue('customerId', null);
                                            }}
                                            className="h-9 text-xs flex-1 rounded-lg font-semibold"
                                        >
                                            Registered Member
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {customerType === 'GUEST' ? (
                        <FormField
                            control={orderForm.control}
                            name="guestName"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="font-bold text-foreground/80">Guest Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g. John, Table 5, Walk-in..."
                                            {...field}
                                            disabled={disabled}
                                            className="h-9.5 bg-background/50 rounded-lg text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ) : (
                        <FormField
                            control={orderForm.control}
                            name="customerId"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="font-bold text-foreground/80 block mb-1">Select Member Profile</FormLabel>
                                    <FormControl>
                                        <InfiniteSelect
                                            queryKey={[QUERY_KEY.CUSTOMERS.SELECT_FOR_ORDER_CREATION]}
                                            fetchFn={({ pageParam, query }) =>
                                                getCustomers({ limit: 10, page: pageParam || 1, search: query, status: 'active' })
                                            }
                                            getItems={(page) => page.data}
                                            getNextPageParam={(lastPage) => (lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined)}
                                            getOptionValue={(c) => c.id}
                                            getOptionLabel={(c) => `${c.user.firstName} ${c.user.lastName} (@${c.user.username})`}
                                            value={field.value || undefined}
                                            onChange={(val, item) => {
                                                field.onChange(val || null);
                                                setSelectedCustomer(item || null);
                                            }}
                                            placeholder="Select customer profile..."
                                            searchPlaceholder="Search by name, email, username..."
                                            disabled={disabled}
                                            className="h-9.5 text-xs bg-background/50 rounded-lg"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <FormField
                        control={orderForm.control}
                        name="orderType"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="font-bold text-foreground/80">Dining Option</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                                    <FormControl>
                                        <SelectTrigger className="h-9.5 bg-background/50 rounded-lg text-xs">
                                            <SelectValue placeholder="Select option" />
                                        </SelectTrigger>
                                    </FormControl>
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
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {(orderType === 'DINE_IN' || orderType === 'TAKE_OUT') && (
                        <FormField
                            control={orderForm.control}
                            name="buzzerId"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                                    <FormLabel className="font-bold text-foreground/80 flex items-center gap-1">
                                        <Volume2 className="size-3.5" /> Pager / Buzzer ID (Optional)
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g. 12, 45..."
                                            {...field}
                                            disabled={disabled}
                                            className="h-9.5 bg-background/50 rounded-lg text-xs font-semibold"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
            </div>
        );
    };

    const renderAddProductCard = (disabled: boolean) => {
        return (
            <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm space-y-4">
                <h3 className="font-bold text-xs uppercase text-muted-foreground pb-2 border-b border-border/30">Add Coffee & Beverages</h3>

                <div className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                        <label className="font-bold text-foreground/80 block mb-1">Product</label>
                        <InfiniteSelect
                            queryKey={[QUERY_KEY.PRODUCTS.SELECT_FOR_ORDER_CREATION]}
                            fetchFn={({ pageParam, query }) => getProductsList({ limit: 10, page: pageParam || 1, search: query, status: 'active' })}
                            getItems={(page) => page.data}
                            getNextPageParam={(lastPage) => (lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined)}
                            getOptionValue={(p) => p.id}
                            getOptionLabel={(p) => p.name}
                            value={selectedProductId || undefined}
                            onChange={(val, item) => {
                                setSelectedProductId(val || '');
                                setSelectedProduct(item || null);
                                if (item && item.variants.length === 1) {
                                    setSelectedVariantId(item.variants[0].id);
                                } else {
                                    setSelectedVariantId('');
                                }
                                setSelectedModifierIds([]);
                            }}
                            placeholder="Search product catalog..."
                            searchPlaceholder="Search by product name..."
                            disabled={disabled}
                            className="h-9.5 text-xs bg-background/50 rounded-lg"
                        />
                    </div>

                    {selectedProduct && (
                        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground/80">Variant (Size / Attributes)</label>
                                <Select value={selectedVariantId} onValueChange={(val) => setSelectedVariantId(val)} disabled={disabled}>
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
                                                <SelectItem key={v.id} value={v.id} className="text-xs">
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
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                                    <span className="size-1 rounded-full bg-rose-500 animate-pulse" />
                                                    Out of Stock
                                                </span>
                                            ) : selectedVForecast.maxProduceable === 'Unlimited' ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                    <span className="size-1 rounded-full bg-emerald-500" />
                                                    In Stock (Unlimited)
                                                </span>
                                            ) : typeof selectedVForecast.maxProduceable === 'number' && selectedVForecast.maxProduceable <= 10 ? (
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

                            {/* Modifier Groups Checklist */}
                            {modifierGroupsResponse?.data && modifierGroupsResponse.data.length > 0 && (
                                <div className="space-y-2 pt-1 animate-in slide-in-from-top-2 duration-200">
                                    <span className="font-bold text-foreground/75 block">Select Add-ons / Modifiers</span>
                                    <div className="space-y-3 border border-border/40 p-3.5 rounded-xl bg-background/50 max-h-[200px] overflow-y-auto">
                                        {modifierGroupsResponse.data.map((group: IModifierGroup) => {
                                            const groupOptionIds = group.options.map((opt) => opt.id);
                                            const currentSelectedCount = selectedModifierIds.filter((id) => groupOptionIds.includes(id)).length;
                                            return (
                                                <div key={group.id} className="space-y-1.5 pb-2.5 border-b border-border/10 last:border-0 last:pb-0">
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
                                                                    disabled={disabled || (isOutOfStock && !isChecked)}
                                                                    onClick={() => {
                                                                        handleToggleModifierOption(
                                                                            group.id,
                                                                            opt.id,
                                                                            group.maxSelect,
                                                                            group.isRequired,
                                                                            group.name
                                                                        );
                                                                    }}
                                                                    className={`h-7.5 text-xs font-semibold py-0 px-2 rounded-md transition-all ${
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
                                        disabled={disabled}
                                        onChange={(e) => setSelectedQuantity(Math.max(1, Number(e.target.value)))}
                                        className="h-9.5 bg-background/50 rounded-lg text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-bold text-foreground/80">Item Notes</label>
                                    <Input
                                        placeholder="e.g. Extra hot..."
                                        value={itemNotes}
                                        disabled={disabled}
                                        onChange={(e) => setItemNotes(e.target.value)}
                                        className="h-9.5 bg-background/50 rounded-lg text-xs"
                                    />
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={handleAddItem}
                                disabled={
                                    disabled ||
                                    !selectedVariantId ||
                                    (() => {
                                        const selectedVForecast = forecastData?.find((f: IForecast) => f.variantId === selectedVariantId);
                                        return selectedVForecast?.maxProduceable === 0;
                                    })()
                                }
                                className="w-full h-9 text-xs font-bold rounded-lg mt-1"
                            >
                                {(() => {
                                    const selectedVForecast = forecastData?.find((f: IForecast) => f.variantId === selectedVariantId);
                                    if (selectedVariantId && selectedVForecast?.maxProduceable === 0) {
                                        return 'Out of Stock';
                                    }
                                    return 'Add Item to Receipt';
                                })()}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderReceiptCard = (disabled: boolean) => {
        const titleText = createdOrder ? `POS Order Queue #${createdOrder.queueNumber} Receipt` : 'Current Order Receipt';
        return (
            <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm flex-1 flex flex-col min-h-[300px]">
                <h3 className="font-bold text-xs uppercase text-muted-foreground pb-2 border-b border-border/30 shrink-0">{titleText}</h3>

                <div className="flex-1 overflow-y-auto space-y-3.5 min-h-[220px] pr-1 py-3">
                    {disabled && createdOrder ? (
                        createdOrder.items?.map((item) => {
                            const sizeLabel =
                                item.variant.attributes?.map((attr: any) => attr.attributeValue.value).join('/') || item.variant.sku || 'Regular';
                            const displayName = `${item.variant.product.name} (${sizeLabel})`;
                            return (
                                <div
                                    key={item.id}
                                    className="flex items-start justify-between gap-4 border border-border/30 bg-background/50 hover:bg-background/80 p-3.5 rounded-xl transition-colors text-xs"
                                >
                                    <div className="min-w-0 space-y-1">
                                        <div className="font-bold text-foreground truncate">
                                            {displayName} <span className="text-muted-foreground font-semibold">x{item.quantity}</span>
                                        </div>
                                        {item.variant.sku && (
                                            <span className="text-2xs font-mono text-muted-foreground block">{item.variant.sku}</span>
                                        )}
                                        {item.modifiers.length > 0 && (
                                            <span className="text-2xs text-muted-foreground font-semibold block">
                                                Addons: {item.modifiers.map((m: any) => m.modifierOption.name).join(', ')}
                                            </span>
                                        )}
                                        {item.notes && <span className="text-2xs text-amber-600 block italic font-medium">Note: "{item.notes}"</span>}
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="font-bold text-foreground/90 text-sm">₱{item.totalPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                            );
                        })
                    ) : orderItems.length === 0 ? (
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
                                    {item.notes && <span className="text-2xs text-amber-600 block italic font-medium">Note: "{item.notes}"</span>}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="font-bold text-foreground/90 text-sm">₱{(item.price * item.quantity).toFixed(2)}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveItem(idx)}
                                        disabled={disabled}
                                        className="size-7.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-500/10 shrink-0"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Global Items validation error messages */}
                {!disabled && (
                    <FormField
                        control={orderForm.control}
                        name="items"
                        render={() => (
                            <FormItem>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 ">
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
                            type="button"
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

            {/* Two-step Wizard Layout */}
            {!createdOrder ? (
                // STEP 1: PLACE ORDER FORM
                <Form {...orderForm}>
                    <form onSubmit={orderForm.handleSubmit(onPlaceOrderSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* Left Column: Build Order */}
                        <div className="space-y-6">
                            {renderCustomerMethodCard(false)}
                            {renderAddProductCard(false)}
                        </div>

                        {/* Right Column: Receipt Breakdown & Action */}
                        <div className="flex flex-col gap-6 lg:min-h-[500px]">
                            {renderReceiptCard(false)}

                            {/* Checkout Details Card */}
                            <div className="border border-border/60 p-5 rounded-2xl bg-muted/10 space-y-4 shadow-xs">
                                <FormField
                                    control={orderForm.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2 text-xs">
                                            <FormLabel className="font-bold text-foreground/80 block">Overall Order Notes</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Add queue instructions, buzzer IDs, table info..."
                                                    {...field}
                                                    className="h-9.5 bg-background/50 rounded-lg text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-2.5 pt-3 border-t border-border/30 text-xs">
                                    <div className="flex justify-between text-muted-foreground font-medium">
                                        <span>Items Subtotal:</span>
                                        <span className="font-semibold text-foreground/80">₱{subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-sm text-foreground pt-3 border-t border-dashed border-border/40">
                                        <span>Net Due Total:</span>
                                        <span className="text-primary font-bold text-base">₱{subtotal.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleBack}
                                        disabled={isSubmitting}
                                        className="h-10.5 text-xs flex-1 rounded-xl font-semibold shadow-xs"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={orderItems.length === 0 || isSubmitting}
                                        className="h-10.5 text-xs flex-1 rounded-xl font-bold bg-primary text-primary-foreground shadow-sm px-6"
                                    >
                                        {isSubmitting ? (
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
                    </form>
                </Form>
            ) : (
                // STEP 2: APPLY DISCOUNT & PROCESS PAYMENT FOR THE CREATED ORDER
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in fade-in duration-200">
                    {/* Left Column: Locked Order Builder */}
                    <div className="space-y-6">
                        <Form {...orderForm}>
                            {renderCustomerMethodCard(true)}
                            {renderAddProductCard(true)}
                        </Form>
                    </div>

                    {/* Right Column: Checkout & Payments Console */}
                    <div className="space-y-6">
                        {renderReceiptCard(true)}

                        {/* Order Notes Banner */}
                        {createdOrder.notes && (
                            <div className="bg-muted/30 border border-border/50 p-4 rounded-2xl text-xs text-muted-foreground font-medium space-y-1">
                                <span className="font-bold text-foreground/80">Order Notes:</span>
                                <p>"{createdOrder.notes}"</p>
                            </div>
                        )}

                        {/* Settle Console (Discounts, Payments) */}
                        <div className="space-y-6">
                            {/* Order Status Banner */}
                            <div className="flex items-center justify-between border border-emerald-500/20 bg-emerald-500/5 p-3.5 rounded-xl text-xs font-semibold text-emerald-700 gap-4">
                                <span className="flex items-center gap-1.5 min-w-0 truncate">
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 animate-bounce" />
                                    <span className="truncate">POS Order Queue #{createdOrder.queueNumber} Placed</span>
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7.5 px-2 bg-background border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 text-xs font-bold gap-1 rounded-lg"
                                            >
                                                <Printer className="size-3.5 shrink-0" />
                                                Receipt
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="rounded-xl" align="end">
                                            <DropdownMenuItem
                                                onClick={() => printReceiptHtml(createdOrder.id)}
                                                className="text-xs gap-2 font-semibold"
                                            >
                                                <Printer className="size-3.5 text-muted-foreground" />
                                                Print Thermal (HTML)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openReceiptPdf(createdOrder.id)} className="text-xs gap-2 font-semibold">
                                                <FileText className="size-3.5 text-muted-foreground" />
                                                Open PDF Receipt
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => downloadReceiptPdf(createdOrder.id, createdOrder.queueNumber)}
                                                className="text-xs gap-2 font-semibold"
                                            >
                                                <Download className="size-3.5 text-muted-foreground" />
                                                Download PDF Receipt
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <span className="bg-emerald-500/10 px-2.5 py-1 rounded text-2xs font-extrabold border border-emerald-500/20 uppercase leading-none">
                                        {createdOrder.status}
                                    </span>
                                </div>
                            </div>

                            {/* Form 2: Discounts Console */}
                            <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm space-y-4">
                                <div className="flex items-center gap-1.5 pb-2.5 border-b border-border/30">
                                    <Tag className="size-4 text-primary shrink-0" />
                                    <span className="font-bold text-xs uppercase text-muted-foreground">Order Discounts</span>
                                </div>

                                {createdOrder.discounts && createdOrder.discounts.length > 0 ? (
                                    // Applied Discount View
                                    <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                                        <div className="space-y-1">
                                            <div className="font-bold text-foreground flex items-center gap-1.5">
                                                <span>{createdOrder.discounts[0].discount?.name || 'Discount'}</span>
                                                <span className="text-primary font-extrabold font-mono">
                                                    {createdOrder.discounts[0].discount?.type === 'PERCENTAGE'
                                                        ? `-${createdOrder.discounts[0].discount.value}%`
                                                        : `-₱${(createdOrder.discounts[0].discount?.value ?? 0).toFixed(2)}`}
                                                </span>
                                            </div>
                                            {createdOrder.discounts[0].referenceId && (
                                                <div className="text-xs text-muted-foreground font-semibold">
                                                    Ref: {createdOrder.discounts[0].referenceId} | Holder: {createdOrder.discounts[0].referenceName}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleRemoveDiscount}
                                            disabled={isSubmitting}
                                            className="h-8 text-2xs px-3 rounded-lg border-rose-300 hover:bg-rose-500/10 hover:text-rose-500 font-semibold"
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ) : (
                                    // Select & Apply Discount Form
                                    <Form {...discountForm}>
                                        <form onSubmit={discountForm.handleSubmit(onApplyDiscountSubmit)} className="space-y-4 text-xs">
                                            <FormField
                                                control={discountForm.control}
                                                name="discountId"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1.5">
                                                        <FormLabel className="font-bold text-foreground/80">Available Discounts</FormLabel>
                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-9.5 bg-background/50 rounded-lg text-xs">
                                                                    <SelectValue placeholder="Choose a discount to apply..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="rounded-xl">
                                                                {activeDiscounts.map((d: IDiscount) => {
                                                                    const badge = d.type === 'PERCENTAGE' ? `${d.value}%` : `₱${d.value}`;
                                                                    return (
                                                                        <SelectItem key={d.id} value={d.id} className="text-xs">
                                                                            {d.name} ({badge} off)
                                                                        </SelectItem>
                                                                    );
                                                                })}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {isSelectedBIR && (
                                                <div className="grid grid-cols-2 gap-3.5 pt-1 animate-in slide-in-from-top-1 duration-150">
                                                    <FormField
                                                        control={discountForm.control}
                                                        name="referenceId"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-1.5">
                                                                <FormLabel className="font-bold text-foreground/80">
                                                                    Card ID / Ref <span className="text-rose-500">*</span>
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="e.g. SC-12345"
                                                                        {...field}
                                                                        className="h-9.5 bg-background/50 rounded-lg text-xs font-semibold"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={discountForm.control}
                                                        name="referenceName"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-1.5">
                                                                <FormLabel className="font-bold text-foreground/80">
                                                                    Holder Name <span className="text-rose-500">*</span>
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="e.g. Maria Clara"
                                                                        {...field}
                                                                        className="h-9.5 bg-background/50 rounded-lg text-xs"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            )}

                                            <Button
                                                type="submit"
                                                disabled={!selectedDiscountId || isSubmitting}
                                                variant="outline"
                                                className="w-full h-9 text-xs font-bold rounded-lg border-primary/40 text-primary hover:bg-primary/5"
                                            >
                                                Apply Selected Discount
                                            </Button>
                                        </form>
                                    </Form>
                                )}
                            </div>

                            {/* Form 3: Payment Collection Card */}
                            <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm space-y-4">
                                <div className="flex items-center gap-1.5 pb-2.5 border-b border-border/30">
                                    <CreditCard className="size-4 text-primary shrink-0" />
                                    <span className="font-bold text-xs uppercase text-muted-foreground">Payment Collection</span>
                                </div>

                                <Form {...paymentForm}>
                                    <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4 text-xs">
                                        <FormField
                                            control={paymentForm.control}
                                            name="paymentMethod"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <FormLabel className="font-bold text-foreground/85">Payment Method</FormLabel>
                                                    <FormControl>
                                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                            {PAYMENT_METHODS.map((method) => {
                                                                const MethodIcon = method.icon;
                                                                return (
                                                                    <Button
                                                                        key={method.id}
                                                                        type="button"
                                                                        variant={field.value === method.id ? 'default' : 'outline'}
                                                                        onClick={() => {
                                                                            field.onChange(method.id);
                                                                            if (method.id === 'CASH') {
                                                                                paymentForm.setValue('amountTendered', createdOrder.netTotal);
                                                                            } else {
                                                                                paymentForm.setValue('amountTendered', 0);
                                                                            }
                                                                        }}
                                                                        className="h-10 px-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-lg text-xs font-bold leading-none"
                                                                    >
                                                                        <MethodIcon className="size-3.5" />
                                                                        {method.label}
                                                                    </Button>
                                                                );
                                                            })}
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* CASH FLOW details */}
                                        {paymentMethod === 'CASH' && (
                                            <FormField
                                                control={paymentForm.control}
                                                name="amountTendered"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                                        <div className="space-y-1.5">
                                                            <FormLabel className="font-bold text-foreground/80 block">Amount Tendered (₱)</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder={createdOrder.netTotal.toFixed(2)}
                                                                    value={field.value || ''}
                                                                    onChange={(e) =>
                                                                        field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                                                                    }
                                                                    className="h-9.5 text-xs bg-background/50 rounded-lg font-bold"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </div>
                                                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex justify-between items-center text-xs font-semibold">
                                                            <span className="text-emerald-700">Change Due to Customer:</span>
                                                            <span className="text-emerald-600 font-bold text-sm">₱{changeDue.toFixed(2)}</span>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {/* DIGITAL WALLETS details */}
                                        {(paymentMethod === 'GCASH' || paymentMethod === 'PAYMAYA') && (
                                            <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                                <FormField
                                                    control={paymentForm.control}
                                                    name="referenceNumber"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-1.5">
                                                            <FormLabel className="font-bold text-foreground/80 block">
                                                                Reference / Txn ID <span className="text-rose-500">*</span>
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder={`Enter ${paymentMethod === 'GCASH' ? 'GCash' : 'Maya'} reference ID`}
                                                                    value={field.value || ''}
                                                                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                                                                    className="h-9.5 text-xs bg-background/50 rounded-lg font-mono font-bold"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                {/* File zone */}
                                                <FormField
                                                    control={paymentForm.control}
                                                    name="receiptFile"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <div>
                                                                    {receiptPreview ? (
                                                                        <div className="relative border border-border/40 rounded-xl overflow-hidden bg-background/50 p-2 flex items-center justify-between gap-3 text-2xs">
                                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                                <img
                                                                                    src={receiptPreview}
                                                                                    alt="Receipt Preview"
                                                                                    className="size-9 rounded-lg object-cover shrink-0 cursor-pointer"
                                                                                    onClick={() => window.open(receiptPreview, '_blank')}
                                                                                />
                                                                                <span className="truncate font-semibold text-muted-foreground">
                                                                                    {field.value?.name}
                                                                                </span>
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
                                                                            <span className="font-bold text-foreground/80">
                                                                                Upload payment slip screenshot (Optional)
                                                                            </span>
                                                                        </button>
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        ref={fileInputRef}
                                                                        onChange={handleFileChange}
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                    />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        )}

                                        {/* Settle / Complete Panel Summary */}
                                        <div className="space-y-2.5 pt-4 border-t border-border/30">
                                            <div className="flex justify-between text-muted-foreground font-medium">
                                                <span>Order Subtotal:</span>
                                                <span className="font-semibold text-foreground/80">₱{createdOrder.subtotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-muted-foreground font-medium">
                                                <span>Discounts:</span>
                                                <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                                                    -₱{createdOrder.discountAmount.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between font-bold text-sm text-foreground pt-3 border-t border-dashed border-border/40">
                                                <span>Total Net Amount:</span>
                                                <span className="text-primary font-extrabold text-base">₱{createdOrder.netTotal.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            {paymentMethod !== 'UNPAID' && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        onPaymentSubmit({
                                                            paymentMethod: 'UNPAID',
                                                            amountTendered: 0,
                                                            referenceNumber: '',
                                                            receiptFile: null
                                                        } as any)
                                                    }
                                                    disabled={isSubmitting || isUploading}
                                                    className="h-10.5 text-xs flex-1 rounded-xl font-semibold shadow-xs"
                                                >
                                                    Skip & Save Unpaid
                                                </Button>
                                            )}
                                            <Button
                                                type="submit"
                                                disabled={isSubmitting || isUploading}
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
                                                        Processing...
                                                    </>
                                                ) : paymentMethod === 'UNPAID' ? (
                                                    'Save & Exit POS'
                                                ) : (
                                                    'Confirm & Collect'
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {createdOrder && (
                <CheckoutSuccessDialog
                    open={showSuccessDialog}
                    onOpenChange={setShowSuccessDialog}
                    order={createdOrder}
                    paymentMethod={lastSubmittedPayment?.paymentMethod ?? 'UNPAID'}
                    amountTendered={lastSubmittedPayment?.amountTendered}
                    changeDue={lastSubmittedPayment?.changeDue}
                    onClose={handleBack}
                />
            )}
        </div>
    );
}
