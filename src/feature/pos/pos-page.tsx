import * as React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Monitor, CheckCircle2 } from 'lucide-react';

import { useRegisterShiftStore } from '#/store/register-shift-store.ts';
import { useAuth } from '#/context/AuthContext';
import { getErrorMessage } from '#/utils/error-handler.ts';

import { getMenuCatalog, getMenuCategories, getMenuTypes } from '#/api/menu.api.ts';
import { getModifierGroups } from '#/api/modifiers.api.ts';
import { getCustomers } from '#/api/customer.api.ts';
import { createOrder, createOrderPayment, updateOrderStatus } from '#/api/orders.api.ts';
import { getDiscountsConfig, applyDiscountToOrder } from '#/api/discounts.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';

import type { IMenuProduct, IMenuProductVariant } from '../menu/menu.types';
import type { IModifierOption } from '../modifier/modifier.types';
import type { IDiscount } from '../store-settings/discounts.types';
import type { IOrder } from '../order/order.types';

import { Spinner } from '#/components/ui/spinner.tsx';

// Import refactored POS components
import ShiftLockOverlay from './components/shift-lock-overlay.tsx';
import CatalogToolbar from './components/catalog-toolbar.tsx';
import ProductsGrid from './components/products-grid.tsx';
import CartSidebar from './components/cart-sidebar.tsx';
import ProductCustomizerDialog from './components/product-customizer-dialog.tsx';
import DiscountSelectDialog from './components/discount-select-dialog.tsx';
import CheckoutPaymentDialog from './components/checkout-payment-dialog.tsx';
import { ReceiptPreviewDialog } from './components/receipt-preview-dialog.tsx';

// Cart Item Type
interface CartItem {
    id: string; // Unique row ID
    product: IMenuProduct;
    variant: IMenuProductVariant;
    modifierOptions: IModifierOption[];
    quantity: number;
    notes?: string;
}

export default function PosPage() {
    const { activeShift, isLoading, hasChecked, fetchActiveShift, openShift } = useRegisterShiftStore();
    const { user: currentUser } = useAuth();

    // Catalog States
    const [search, setSearch] = React.useState('');
    const [productCategoryId, setProductCategoryId] = React.useState('');
    const [productTypeId, setProductTypeId] = React.useState('');
    const [page, setPage] = React.useState(1);
    const pageSize = 12;

    // Cart States
    const [cart, setCart] = React.useState<CartItem[]>([]);
    const [appliedDiscount, setAppliedDiscount] = React.useState<IDiscount | null>(null);
    const [discountRefId, setDiscountRefId] = React.useState('');
    const [discountRefName, setDiscountRefName] = React.useState('');
    const [editingCartItemId, setEditingCartItemId] = React.useState<string | null>(null);

    // Product Customizer Modal States
    const [configProduct, setConfigProduct] = React.useState<IMenuProduct | null>(null);
    const [isConfigOpen, setIsConfigOpen] = React.useState(false);
    const [selectedVariant, setSelectedVariant] = React.useState<IMenuProductVariant | null>(null);
    const [chosenModifiers, setChosenModifiers] = React.useState<Record<string, string[] | undefined>>({}); // groupId -> array of optionIds
    const [configQuantity, setConfigQuantity] = React.useState(1);
    const [configNotes, setConfigNotes] = React.useState('');

    // Discount Select Modal States
    const [isDiscountOpen, setIsDiscountOpen] = React.useState(false);

    // Checkout Panel States
    const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
    const [customerType, setCustomerType] = React.useState<'GUEST' | 'MEMBER'>('GUEST');
    const [guestName, setGuestName] = React.useState('Walk-in Customer');
    const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>('');
    const [buzzerId, setBuzzerId] = React.useState('');
    const [orderType, setOrderType] = React.useState<'DINE_IN' | 'TAKE_OUT' | 'DELIVERY'>('DINE_IN');
    const [paymentMethod, setPaymentMethod] = React.useState<'CASH' | 'GCASH' | 'PAYMAYA' | 'CREDIT_CARD'>('CASH');
    const [cashTendered, setCashTendered] = React.useState<number | ''>('');
    const [referenceNumber, setReferenceNumber] = React.useState('');
    const [paymentProofPhoto, setPaymentProofPhoto] = React.useState('');

    // Receipt Modal States
    const [, setPlacedOrder] = React.useState<IOrder | null>(null);
    const [receiptHtml, setReceiptHtml] = React.useState<string | null>(null);
    const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
    const [isReceiptLoading, setIsReceiptLoading] = React.useState(false);
    const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

    // Opening Shift Fetch
    React.useEffect(() => {
        if (!hasChecked) {
            fetchActiveShift();
        }
    }, [hasChecked, fetchActiveShift]);

    // -------------------------------------------------------------
    // QUERIES FOR CATALOG & CONFIG
    // -------------------------------------------------------------

    // Query categories list
    const { data: categoriesData } = useQuery({
        queryKey: [QUERY_KEY.MENU.CATEGORIES_LIST],
        queryFn: getMenuCategories,
        enabled: !!activeShift
    });

    // Query product types list
    const { data: typesData } = useQuery({
        queryKey: [QUERY_KEY.MENU.TYPES_LIST],
        queryFn: getMenuTypes,
        enabled: !!activeShift
    });

    // Query menu items catalog
    const {
        data: menuData,
        isLoading: isMenuLoading,
        error: menuError
    } = useQuery({
        queryKey: [QUERY_KEY.MENU.CATALOG, { page, search, productCategoryId, productTypeId }],
        queryFn: () =>
            getMenuCatalog({
                page,
                limit: pageSize,
                search,
                productCategoryId: productCategoryId || undefined,
                productTypeId: productTypeId || undefined
            }),
        enabled: !!activeShift
    });

    // Query modifier groups for customizer modal
    const { data: modifierGroupsData, isLoading: isModifiersLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS, { productId: configProduct?.id }],
        queryFn: () => getModifierGroups({ productId: configProduct!.id, limit: 50 }),
        enabled: !!configProduct?.id && isConfigOpen
    });

    // Query active discounts
    const { data: discountsData } = useQuery({
        queryKey: [QUERY_KEY.STORE_SETTINGS.DISCOUNTS_LIST],
        queryFn: getDiscountsConfig,
        enabled: !!activeShift
    });

    // Query members list
    const { data: membersData } = useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMERS_LIST, { limit: 50 }],
        queryFn: () => getCustomers({ limit: 50 }),
        enabled: !!activeShift
    });

    // Reset pagination to page 1 on filter/search change
    React.useEffect(() => {
        setPage(1);
    }, [search, productCategoryId, productTypeId]);

    // -------------------------------------------------------------
    // CART CALCULATION LOGIC
    // -------------------------------------------------------------

    const getCartItemPrice = (item: CartItem) => {
        const modifiersTotal = item.modifierOptions.reduce((sum, opt) => sum + opt.price, 0);
        return item.variant.price + modifiersTotal;
    };

    const cartSubtotal = React.useMemo(() => {
        return cart.reduce((sum, item) => sum + getCartItemPrice(item) * item.quantity, 0);
    }, [cart]);

    const discountAmount = React.useMemo(() => {
        if (!appliedDiscount || cartSubtotal === 0) return 0;
        if (appliedDiscount.type === 'PERCENTAGE') {
            return Math.round(((cartSubtotal * appliedDiscount.value) / 100) * 100) / 100;
        } else {
            return Math.min(appliedDiscount.value, cartSubtotal);
        }
    }, [appliedDiscount, cartSubtotal]);

    const cartNetTotal = React.useMemo(() => {
        const net = cartSubtotal - discountAmount;
        return net > 0 ? net : 0;
    }, [cartSubtotal, discountAmount]);

    const cartVatAmount = React.useMemo(() => {
        // VAT-inclusive 12% calculation: netTotal * (12 / 112)
        return Math.round(cartNetTotal * (12 / 112) * 100) / 100;
    }, [cartNetTotal]);

    // Default cash tendered auto-filler & proof reset
    React.useEffect(() => {
        if (isCheckoutOpen) {
            setCashTendered('');
            setPaymentProofPhoto('');
        }
    }, [isCheckoutOpen]);

    // -------------------------------------------------------------
    // CART MUTATORS
    // -------------------------------------------------------------

    const handleProductClick = (product: IMenuProduct) => {
        // If product has 0 variants, block
        if (product.variants.length === 0) {
            toast.error('No variants configured for this product.');
            return;
        }

        setConfigProduct(product);
        setSelectedVariant(product.variants[0]);
        setChosenModifiers({});
        setConfigQuantity(1);
        setConfigNotes('');
        setIsConfigOpen(true);
    };

    const handleEditCartItem = (item: CartItem) => {
        setEditingCartItemId(item.id);
        setConfigProduct(item.product);
        setSelectedVariant(item.variant);

        // Group modifier selections by parent group ID
        const initialChosenModifiers: Record<string, string[] | undefined> = {};
        item.modifierOptions.forEach((opt) => {
            if (!initialChosenModifiers[opt.modifierGroupId]) {
                initialChosenModifiers[opt.modifierGroupId] = [];
            }
            initialChosenModifiers[opt.modifierGroupId]!.push(opt.id);
        });
        setChosenModifiers(initialChosenModifiers);

        setConfigQuantity(item.quantity);
        setConfigNotes(item.notes || '');
        setIsConfigOpen(true);
    };

    const handleAddToCart = () => {
        if (!configProduct || !selectedVariant) return;

        // Flatten chosen modifiers
        const chosenOptionsList: IModifierOption[] = [];
        if (modifierGroupsData?.data) {
            for (const group of modifierGroupsData.data) {
                const selections = chosenModifiers[group.id] || [];
                // Check minSelect validation
                if (selections.length < group.minSelect) {
                    toast.error(`Please select at least ${group.minSelect} option(s) for "${group.name}".`);
                    return;
                }
                // Check maxSelect validation
                if (selections.length > group.maxSelect) {
                    toast.error(`Please select at most ${group.maxSelect} option(s) for "${group.name}".`);
                    return;
                }

                const optionsForGroup = group.options.filter((opt: IModifierOption) => selections.includes(opt.id));
                chosenOptionsList.push(...optionsForGroup);
            }
        }

        if (editingCartItemId) {
            setCart((prev) =>
                prev.map((item) =>
                    item.id === editingCartItemId
                        ? {
                              ...item,
                              product: configProduct,
                              variant: selectedVariant,
                              modifierOptions: chosenOptionsList,
                              quantity: configQuantity,
                              notes: configNotes.trim() || undefined
                          }
                        : item
                )
            );
            setIsConfigOpen(false);
            toast.success(`Updated ${configProduct.name} in cart.`);
            setEditingCartItemId(null);
        } else {
            const newCartItem: CartItem = {
                id: crypto.randomUUID(),
                product: configProduct,
                variant: selectedVariant,
                modifierOptions: chosenOptionsList,
                quantity: configQuantity,
                notes: configNotes.trim() || undefined
            };

            setCart((prev) => [...prev, newCartItem]);
            setIsConfigOpen(false);
            toast.success(`Added ${configQuantity}x ${configProduct.name} to checkout cart.`);
        }
    };

    const updateCartQuantity = (rowId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.id === rowId) {
                        const newQty = item.quantity + delta;
                        return { ...item, quantity: newQty };
                    }
                    return item;
                })
                .filter((item) => item.quantity > 0)
        );
    };

    const removeCartItem = (rowId: string) => {
        setCart((prev) => prev.filter((item) => item.id !== rowId));
        toast.info('Item removed from cart.');
    };

    const clearCart = () => {
        setCart([]);
        setAppliedDiscount(null);
        setDiscountRefId('');
        setDiscountRefName('');
        toast.info('Cart cleared.');
    };

    // -------------------------------------------------------------
    // DISCOUNTS HANDLERS
    // -------------------------------------------------------------

    const handleApplyDiscount = (discount: IDiscount) => {
        setAppliedDiscount(discount);
        // Prompt for senior/pwd reference if required
        if (discount.name.toLowerCase().includes('senior') || discount.name.toLowerCase().includes('pwd')) {
            setDiscountRefName(discount.name);
        } else {
            setDiscountRefId('');
            setDiscountRefName('');
        }
        setIsDiscountOpen(false);
        toast.success(`Discount "${discount.name}" applied to cart.`);
    };

    const handleRemoveDiscount = () => {
        setAppliedDiscount(null);
        setDiscountRefId('');
        setDiscountRefName('');
        toast.info('Discount removed.');
    };

    // -------------------------------------------------------------
    // CHECKOUT PROCESS
    // -------------------------------------------------------------

    const checkoutMutation = useMutation({
        mutationFn: async () => {
            if (cart.length === 0) throw new Error('Cart is empty.');
            if (paymentMethod === 'CASH' && (cashTendered === '' || cashTendered < cartNetTotal)) {
                throw new Error(`Tendered cash must be at least the total of ₱${cartNetTotal.toFixed(2)}.`);
            }
            if ((paymentMethod === 'GCASH' || paymentMethod === 'PAYMAYA') && !referenceNumber.trim()) {
                throw new Error('Digital payment Reference ID is required.');
            }

            const customerObj =
                customerType === 'MEMBER' && membersData?.data ? membersData.data.find((m: any) => m.id === selectedCustomerId) : null;

            // 1. Post Create Order
            const orderPayload = {
                orderType,
                orderSource: 'POS' as const,
                notes: 'POS checkout transaction.',
                customerId: customerType === 'MEMBER' ? selectedCustomerId : null,
                customerName: customerType === 'MEMBER' && customerObj ? `${customerObj.user.firstName} ${customerObj.user.lastName}` : guestName,
                buzzerId: buzzerId || null,
                items: cart.map((item: CartItem) => ({
                    productVariantId: item.variant.id,
                    quantity: item.quantity,
                    notes: item.notes || undefined,
                    modifierOptionIds: item.modifierOptions.map((o: IModifierOption) => o.id)
                }))
            };

            const order = await createOrder(orderPayload);

            // 2. Apply Discount if configured
            if (appliedDiscount) {
                await applyDiscountToOrder(order.id, {
                    discountId: appliedDiscount.id,
                    referenceId: discountRefId || null,
                    referenceName: discountRefName || null
                });
            }

            // 3. Process Payment
            await createOrderPayment(order.id, {
                paymentMethod,
                amountTendered: paymentMethod === 'CASH' ? Number(cashTendered) : order.netTotal,
                gcashReferenceNumber: paymentMethod !== 'CASH' ? referenceNumber : undefined,
                paymentProofPhoto: paymentMethod !== 'CASH' ? paymentProofPhoto || undefined : undefined
            });

            // 4. Update status to PREPARING to show up in kitchen queue
            const finalOrder = await updateOrderStatus(order.id, {
                status: 'PREPARING',
                notes: 'Checkout confirmed and paid at front register.'
            });

            return finalOrder;
        },
        onSuccess: async (order) => {
            setPlacedOrder(order);
            setIsCheckoutOpen(false);
            setCart([]);
            setAppliedDiscount(null);
            setDiscountRefId('');
            setDiscountRefName('');

            // Load receipt template HTML
            setIsReceiptLoading(true);
            setIsReceiptOpen(true);
            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/orders/${order.id}/receipt?format=html`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
                        }
                    }
                );
                if (response.ok) {
                    const html = await response.text();
                    setReceiptHtml(html);
                } else {
                    setReceiptHtml('<p class="p-6 text-center text-xs text-muted-foreground">Failed to render receipt template.</p>');
                }
            } catch (err) {
                setReceiptHtml('<p class="p-6 text-center text-xs text-muted-foreground">Error loading receipt details.</p>');
            } finally {
                setIsReceiptLoading(false);
            }
        },
        onError: (err) => {
            toast.error('POS Checkout Failed', {
                description: getErrorMessage(err)
            });
        }
    });

    const handlePrintReceipt = () => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.focus();
            iframeRef.current.contentWindow.print();
        }
    };

    if (isLoading || !hasChecked) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Spinner className="h-7 w-7 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">Validating register shift status...</p>
                </div>
            </div>
        );
    }

    if (!activeShift) {
        // Drawer Lock Overlay
        return <ShiftLockOverlay currentUser={currentUser} openShift={openShift} />;
    }

    // MAIN POS WORKSPACE VIEW
    return (
        <div className="flex flex-col gap-5 h-[calc(100vh-100px)] overflow-hidden">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 text-left">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Monitor className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground leading-tight">POS Sales Checkout</h1>
                        <p className="text-xs text-muted-foreground">Process customer payments, beverage custom orders, and generate prints.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-3 py-1 rounded-lg text-xs font-semibold">
                    <CheckCircle2 className="size-4" />
                    Active Balance: ₱{activeShift.startBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            </div>

            {/* Layout Columns */}
            <div className="flex-1 flex gap-5 overflow-hidden min-h-0">
                {/* LEFT: PRODUCTS LIST & CATALOG FILTERING */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <CatalogToolbar
                        search={search}
                        setSearch={setSearch}
                        productCategoryId={productCategoryId}
                        setProductCategoryId={setProductCategoryId}
                        productTypeId={productTypeId}
                        setProductTypeId={setProductTypeId}
                        categoriesData={categoriesData}
                        typesData={typesData}
                    />

                    <div className="flex-1 overflow-y-auto min-h-0">
                        <ProductsGrid
                            menuData={menuData}
                            isMenuLoading={isMenuLoading}
                            menuError={menuError}
                            page={page}
                            setPage={setPage}
                            onProductClick={handleProductClick}
                        />
                    </div>
                </div>

                {/* RIGHT: ACTIVE CART SIDEBAR */}
                <CartSidebar
                    cart={cart}
                    updateCartQuantity={updateCartQuantity}
                    removeCartItem={removeCartItem}
                    clearCart={clearCart}
                    appliedDiscount={appliedDiscount}
                    handleRemoveDiscount={handleRemoveDiscount}
                    cartSubtotal={cartSubtotal}
                    discountAmount={discountAmount}
                    cartVatAmount={cartVatAmount}
                    cartNetTotal={cartNetTotal}
                    onOpenDiscount={() => setIsDiscountOpen(true)}
                    onOpenCheckout={() => setIsCheckoutOpen(true)}
                    getCartItemPrice={getCartItemPrice}
                    onEditCartItem={handleEditCartItem}
                />
            </div>

            {/* MODALS */}
            <ProductCustomizerDialog
                open={isConfigOpen}
                onOpenChange={(open) => {
                    setIsConfigOpen(open);
                    if (!open) {
                        setEditingCartItemId(null);
                        setConfigProduct(null);
                        setSelectedVariant(null);
                        setChosenModifiers({});
                        setConfigQuantity(1);
                        setConfigNotes('');
                    }
                }}
                configProduct={configProduct}
                selectedVariant={selectedVariant}
                setSelectedVariant={setSelectedVariant}
                chosenModifiers={chosenModifiers}
                setChosenModifiers={setChosenModifiers}
                configQuantity={configQuantity}
                setConfigQuantity={setConfigQuantity}
                configNotes={configNotes}
                setConfigNotes={setConfigNotes}
                onAddToCart={handleAddToCart}
                isModifiersLoading={isModifiersLoading}
                modifierGroupsData={modifierGroupsData}
                isEditing={!!editingCartItemId}
            />

            <DiscountSelectDialog
                open={isDiscountOpen}
                onOpenChange={setIsDiscountOpen}
                discountsData={discountsData}
                onApplyDiscount={handleApplyDiscount}
            />

            <CheckoutPaymentDialog
                open={isCheckoutOpen}
                onOpenChange={setIsCheckoutOpen}
                cartNetTotal={cartNetTotal}
                cart={cart}
                membersData={membersData}
                customerType={customerType}
                setCustomerType={setCustomerType}
                guestName={guestName}
                setGuestName={setGuestName}
                selectedCustomerId={selectedCustomerId}
                setSelectedCustomerId={setSelectedCustomerId}
                buzzerId={buzzerId}
                setBuzzerId={setBuzzerId}
                orderType={orderType}
                setOrderType={setOrderType}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                cashTendered={cashTendered}
                setCashTendered={setCashTendered}
                referenceNumber={referenceNumber}
                setReferenceNumber={setReferenceNumber}
                appliedDiscount={appliedDiscount}
                discountRefId={discountRefId}
                setDiscountRefId={setDiscountRefId}
                discountRefName={discountRefName}
                setDiscountRefName={setDiscountRefName}
                isPending={checkoutMutation.isPending}
                onSubmit={() => checkoutMutation.mutate()}
                paymentProofPhoto={paymentProofPhoto}
                setPaymentProofPhoto={setPaymentProofPhoto}
            />

            <ReceiptPreviewDialog
                open={isReceiptOpen}
                onOpenChange={setIsReceiptOpen}
                isLoading={isReceiptLoading}
                receiptHtml={receiptHtml}
                onPrint={handlePrintReceipt}
                iframeRef={iframeRef}
            />
        </div>
    );
}
