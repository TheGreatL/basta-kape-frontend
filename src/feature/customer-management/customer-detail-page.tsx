import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
    User,
    Calendar,
    Trash2,
    ShoppingCart,
    Minus,
    Plus,
    RefreshCw,
    X,
    ShieldAlert,
    History,
    Search,
    ChevronDown,
    ChevronUp,
    Info,
    ArrowLeft,
    Phone,
    Mail,
    Edit2
} from 'lucide-react';
import { format } from 'date-fns';

import { getCustomerById, updateCustomer, getCart, updateCartItem, removeCartItem, clearCart, getCustomerOrders } from '#/api/customer.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { getFileUrl } from '#/utils/helper.ts';
import { useAuth } from '#/context/AuthContext.tsx';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import { updateCustomerSchema } from './customer.schema.ts';
import type { ICartItemResponse, IUpdateCustomer } from '#/feature/customer/customer.types.ts';
import type { IOrder, IOrderItem, IOrderItemModifier } from '#/feature/order/order.types';

import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';

export default function CustomerDetailPage() {
    const { slug } = useParams({ from: '/admin/customers/$slug' });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: authUser } = useAuth();

    const permissions = getUserPermissions(authUser);
    const hasUpdatePermission = hasPermission(permissions, 'Customers Management', 'update');

    // Fetch customer details (matches UUID or username)
    const { data: customerDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMER_DETAILS, slug],
        queryFn: () => getCustomerById(slug),
        enabled: !!slug
    });

    const [activeTab, setActiveTab] = React.useState('cart');

    // Order history filter & pagination states
    const [orderPage, setOrderPage] = React.useState(1);
    const [orderSearch, setOrderSearch] = React.useState('');
    const [orderStatus, setOrderStatus] = React.useState('all');
    const [expandedOrders, setExpandedOrders] = React.useState<Record<string, boolean>>({});

    // Query: Shopping Cart
    const { data: cartData, isLoading: isCartLoading } = useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.CART, customerDetails?.id],
        queryFn: () => getCart(customerDetails!.id),
        enabled: !!customerDetails?.id && activeTab === 'cart'
    });

    // Query: Customer Orders History
    const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.ORDERS, customerDetails?.id, { page: orderPage, limit: 5, search: orderSearch, status: orderStatus }],
        queryFn: () =>
            getCustomerOrders(customerDetails!.id, {
                page: orderPage,
                limit: 5,
                search: orderSearch || undefined,
                status: orderStatus === 'all' ? undefined : orderStatus
            }),
        enabled: !!customerDetails?.id && activeTab === 'orders'
    });

    const form = useForm({
        resolver: zodResolver(updateCustomerSchema),
        defaultValues: {
            email: '',
            username: '',
            firstName: '',
            lastName: '',
            middleName: '',
            phoneNumber: ''
        }
    });

    React.useEffect(() => {
        if (customerDetails) {
            form.reset({
                email: customerDetails.user.email,
                username: customerDetails.user.username,
                firstName: customerDetails.user.firstName,
                lastName: customerDetails.user.lastName,
                middleName: customerDetails.user.middleName || '',
                phoneNumber: customerDetails.user.phoneNumber || ''
            });
        }
    }, [customerDetails, form]);

    // Mutation: Update Profile
    const updateProfileMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: IUpdateCustomer }) => updateCustomer(id, payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMER_DETAILS, slug] });
            toast.success('Customer Profile Updated', {
                description: 'Customer settings have been successfully modified.'
            });
            // If username changed, redirect to new slug to keep URL in sync
            if (data.user.username !== slug) {
                navigate({ to: '/admin/customers/$slug', params: { slug: data.user.username } });
            }
        },
        onError: (error) => {
            toast.error('Failed to update customer', {
                description: getErrorMessage(error)
            });
        }
    });

    // Mutation: Update Cart Item Quantity
    const updateQuantityMutation = useMutation({
        mutationFn: ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) =>
            updateCartItem(customerDetails!.id, cartItemId, { quantity }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CART, customerDetails?.id] });
            toast.success('Cart Item Updated');
        },
        onError: (err) => {
            toast.error('Failed to update cart item quantity', { description: getErrorMessage(err) });
        }
    });

    // Mutation: Remove Cart Item
    const removeItemMutation = useMutation({
        mutationFn: (cartItemId: string) => removeCartItem(customerDetails!.id, cartItemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CART, customerDetails?.id] });
            toast.success('Item Removed from Cart');
        },
        onError: (err) => {
            toast.error('Failed to remove item', { description: getErrorMessage(err) });
        }
    });

    // Mutation: Clear Cart
    const clearCartMutation = useMutation({
        mutationFn: () => clearCart(customerDetails!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CART, customerDetails?.id] });
            toast.success('Cart Cleared Successfully');
        },
        onError: (err) => {
            toast.error('Failed to clear cart', { description: getErrorMessage(err) });
        }
    });

    const onSubmit = (values: any) => {
        if (!customerDetails) return;
        updateProfileMutation.mutate({
            id: customerDetails.id,
            payload: {
                email: values.email || undefined,
                username: values.username || undefined,
                firstName: values.firstName,
                lastName: values.lastName,
                middleName: values.middleName || null,
                phoneNumber: values.phoneNumber || null
            }
        });
    };

    const handleQuantityChange = (item: ICartItemResponse, diff: number) => {
        const newQty = item.quantity + diff;
        if (newQty < 1) {
            removeItemMutation.mutate(item.id);
        } else {
            updateQuantityMutation.mutate({ cartItemId: item.id, quantity: newQty });
        }
    };

    const toggleOrderExpanded = (orderId: string) => {
        setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
    };

    const renderAttributeBadges = (attributes: any[] | undefined | null) => {
        if (!attributes || attributes.length === 0) {
            return null;
        }
        return (
            <div className="flex flex-wrap gap-1 mt-0.5">
                {attributes.map((attr: any) => (
                    <Badge
                        key={attr.id}
                        variant="secondary"
                        className="text-xs leading-none font-semibold capitalize py-0.5 px-1 bg-primary/5 text-primary border border-primary/10 shadow-3xs"
                    >
                        {attr.attributeValue.attribute.name}: {attr.attributeValue.value}
                    </Badge>
                ))}
            </div>
        );
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40';
            case 'PREPARING':
                return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40';
            case 'READY':
                return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/40';
            case 'COMPLETED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40';
            case 'CANCELLED':
                return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400';
        }
    };

    if (isDetailsLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-3 border rounded-xl bg-card">
                <Spinner className="h-6 w-6 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground font-medium">Loading customer profile...</span>
            </div>
        );
    }

    if (!customerDetails) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-3 border rounded-xl bg-card text-center px-6">
                <ShieldAlert className="h-10 w-10 text-destructive" />
                <h2 className="text-lg font-bold text-foreground">Customer Not Found</h2>
                <p className="text-xs text-muted-foreground max-w-sm">
                    The requested customer profile could not be loaded. They may have been fully deleted or the ID/username is incorrect.
                </p>
                <Button onClick={() => navigate({ to: '/admin/customers' })} variant="outline" className="mt-2 h-9">
                    Back to Customers List
                </Button>
            </div>
        );
    }

    const initials = `${customerDetails.user.firstName[0] || ''}${customerDetails.user.lastName[0] || ''}`.toUpperCase();

    return (
        <div className="flex flex-col gap-6">
            {/* Header / Back Link */}
            <div className="flex flex-col gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: '/admin/customers' })}
                    className="gap-1.5 self-start text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to Customers Directory
                </Button>
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {hasUpdatePermission ? 'Edit Customer Profile' : 'View Customer Profile'}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {hasUpdatePermission
                                ? 'Modify customer profile specifications, email, contact details, and review shopping carts.'
                                : 'Overview of customer credentials, history, and active shopping carts.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Profile Overview Card */}
            <div className="flex flex-col md:flex-row gap-5 items-start bg-muted/20 p-4 rounded-xl border border-border/40 shadow-3xs">
                <div className="size-16 rounded-full overflow-hidden border border-border/60 shrink-0 bg-background/50 flex items-center justify-center shadow-3xs">
                    <span className="font-bold text-xl text-primary/80 uppercase">{initials || 'CU'}</span>
                </div>
                <div className="space-y-1 flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap gap-2 items-center">
                        <h3 className="text-base font-bold text-foreground/90 truncate leading-tight">
                            {customerDetails.user.firstName} {customerDetails.user.lastName}
                        </h3>
                        <Badge variant="outline" className="text-xs py-0 px-2 font-semibold bg-background uppercase">
                            {customerDetails.deletedAt !== null ? 'Archived' : 'Active'}
                        </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="flex items-center gap-1">
                            <User className="size-3 text-muted-foreground" /> @{customerDetails.user.username}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Mail className="size-3 text-muted-foreground" /> {customerDetails.user.email}
                        </span>
                        {customerDetails.user.phoneNumber && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Phone className="size-3 text-muted-foreground" /> {customerDetails.user.phoneNumber}
                                </span>
                            </>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5 font-normal">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        Joined: {format(new Date(customerDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                    </p>
                </div>
            </div>

            {/* Two Column Layout for Profile details & interactive cart/orders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Card (Col span 1) */}
                <div className="lg:col-span-1 rounded-xl border bg-card text-card-foreground shadow-xs p-6 h-fit">
                    <div className="flex items-center gap-2 border-b pb-3 mb-4">
                        <Edit2 className="size-4.5 text-primary" />
                        <h2 className="text-sm font-bold text-foreground/80">Account Details</h2>
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80 text-xs">First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John" disabled={!hasUpdatePermission} {...field} className="h-9 bg-background/50" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80 text-xs">Last Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Doe" disabled={!hasUpdatePermission} {...field} className="h-9 bg-background/50" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="middleName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80 text-xs">Middle Name (Optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Smith"
                                                disabled={!hasUpdatePermission}
                                                {...field}
                                                value={field.value || ''}
                                                className="h-9 bg-background/50"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80 text-xs">Phone Number (Optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="+639171234567"
                                                disabled={!hasUpdatePermission}
                                                {...field}
                                                value={field.value || ''}
                                                className="h-9 bg-background/50"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80 text-xs">Email Address</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="john.doe@gmail.com"
                                                type="email"
                                                disabled={!hasUpdatePermission}
                                                {...field}
                                                className="h-9 bg-background/50"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80 text-xs">Username</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="johndoe"
                                                disabled={!hasUpdatePermission}
                                                {...field}
                                                className="h-9 bg-background/50"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {hasUpdatePermission && (
                                <div className="flex items-center justify-end gap-2 border-t pt-4 mt-4">
                                    <Button
                                        type="submit"
                                        disabled={updateProfileMutation.isPending}
                                        className="h-9 w-full shadow-xs bg-primary hover:bg-primary/95 text-primary-foreground"
                                    >
                                        {updateProfileMutation.isPending ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <Spinner className="h-4 w-4 animate-spin" /> Saving...
                                            </div>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </Button>
                                </div>
                            )}
                        </form>
                    </Form>
                </div>

                {/* Tabs Area (Col span 2) */}
                <div className="lg:col-span-2 rounded-xl border bg-card text-card-foreground shadow-xs p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
                        <TabsList className="w-full grid grid-cols-2 bg-muted/15 border border-border/45 p-1 rounded-xl">
                            <TabsTrigger value="cart" className="gap-1.5 text-xs font-semibold rounded-lg py-1.5">
                                <ShoppingCart className="size-3.5" />
                                Active Shopping Cart
                            </TabsTrigger>
                            <TabsTrigger value="orders" className="gap-1.5 text-xs font-semibold rounded-lg py-1.5">
                                <History className="size-3.5" />
                                Order History
                            </TabsTrigger>
                        </TabsList>

                        {/* SHOPPING CART TAB CONTENT */}
                        <TabsContent value="cart" className="mt-4 space-y-4 outline-hidden">
                            <div className="flex items-center justify-between border-b pb-1.5">
                                <h3 className="text-xs font-bold text-foreground/50 uppercase ">Shopping Cart Items</h3>
                                {cartData && cartData.items.length > 0 && hasUpdatePermission && (
                                    <Button
                                        onClick={() => clearCartMutation.mutate()}
                                        disabled={clearCartMutation.isPending}
                                        size="xs"
                                        variant="outline"
                                        className="h-7 text-xs gap-1 border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive transition-colors shadow-3xs"
                                    >
                                        <X className="size-3" /> Clear Cart
                                    </Button>
                                )}
                            </div>

                            {isCartLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-2 border border-dashed border-border/40 rounded-xl bg-background/50">
                                    <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Syncing shopping cart...</span>
                                </div>
                            ) : !cartData || cartData.items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-1.5 border border-dashed border-border/50 rounded-xl bg-muted/5">
                                    <ShieldAlert className="size-5 text-muted-foreground/85 stroke-[1.5]" />
                                    <span className="text-xs text-muted-foreground font-semibold">Customer's cart is empty</span>
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
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 hover:bg-muted/5 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="size-11 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0 shadow-3xs">
                                                            {productPhoto ? (
                                                                <img
                                                                    src={productPhoto.startsWith('http') ? productPhoto : getFileUrl(productPhoto)}
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
                                                            {renderAttributeBadges(item.productVariant.attributes)}
                                                            {item.productVariant.sku && (
                                                                <span className="text-xs font-mono text-muted-foreground uppercase pt-0.5">
                                                                    SKU: {item.productVariant.sku}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Controls and pricing */}
                                                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 self-stretch sm:self-center">
                                                        {/* Quantity selector */}
                                                        <div className="flex items-center border border-border/60 bg-background rounded-lg p-0.5 shadow-3xs">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-6.5 rounded-md hover:bg-muted hover:text-foreground text-muted-foreground"
                                                                disabled={
                                                                    !hasUpdatePermission ||
                                                                    updateQuantityMutation.isPending ||
                                                                    removeItemMutation.isPending
                                                                }
                                                                onClick={() => handleQuantityChange(item, -1)}
                                                            >
                                                                <Minus className="size-3" />
                                                            </Button>
                                                            <span className="w-7 text-center text-xs font-semibold text-foreground/80">
                                                                {item.quantity}
                                                            </span>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-6.5 rounded-md hover:bg-muted hover:text-foreground text-muted-foreground"
                                                                disabled={
                                                                    !hasUpdatePermission ||
                                                                    updateQuantityMutation.isPending ||
                                                                    removeItemMutation.isPending
                                                                }
                                                                onClick={() => handleQuantityChange(item, 1)}
                                                            >
                                                                <Plus className="size-3" />
                                                            </Button>
                                                        </div>

                                                        {/* Price Breakdown */}
                                                        <div className="text-right flex flex-col justify-center min-w-[70px]">
                                                            <span className="text-xs font-bold text-foreground/80">₱{subtotal.toFixed(2)}</span>
                                                            <span className="text-xs text-muted-foreground font-semibold">
                                                                ₱{item.unitPrice.toFixed(2)} each
                                                            </span>
                                                        </div>

                                                        {/* Delete Single Item */}
                                                        {hasUpdatePermission && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="size-7.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors rounded-lg shadow-3xs border border-transparent hover:border-destructive/10"
                                                                disabled={removeItemMutation.isPending}
                                                                onClick={() => removeItemMutation.mutate(item.id)}
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                                <span className="sr-only">Remove Item</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Total Summary Amount Card */}
                                    <div className="flex justify-between items-center bg-muted/20 p-3.5 rounded-xl border border-border/40 shadow-3xs">
                                        <span className="text-xs font-bold text-foreground/77 uppercase ">Computed Cart Subtotal</span>
                                        <span className="text-base font-bold text-primary">₱{cartData.totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* ORDER HISTORY TAB CONTENT */}
                        <TabsContent value="orders" className="mt-4 space-y-4 outline-hidden">
                            {/* Order history filters */}
                            <div className="flex flex-wrap items-center gap-2.5 bg-muted/10 p-2.5 rounded-xl border border-border/40">
                                <div className="relative flex-1 min-w-[150px]">
                                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search queue number or notes..."
                                        value={orderSearch}
                                        onChange={(e) => {
                                            setOrderSearch(e.target.value);
                                            setOrderPage(1);
                                        }}
                                        className="h-8.5 pl-8 text-xs bg-background/50"
                                    />
                                </div>

                                <Select
                                    value={orderStatus}
                                    onValueChange={(val) => {
                                        setOrderStatus(val);
                                        setOrderPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8.5 min-w-[130px] text-xs bg-background/50">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">
                                            All Statuses
                                        </SelectItem>
                                        <SelectItem value="PENDING" className="text-xs">
                                            Pending
                                        </SelectItem>
                                        <SelectItem value="PREPARING" className="text-xs">
                                            Preparing
                                        </SelectItem>
                                        <SelectItem value="READY" className="text-xs">
                                            Ready
                                        </SelectItem>
                                        <SelectItem value="COMPLETED" className="text-xs">
                                            Completed
                                        </SelectItem>
                                        <SelectItem value="CANCELLED" className="text-xs">
                                            Cancelled
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {isOrdersLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-2">
                                    <Spinner className="h-5 w-5 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-semibold">Loading past orders...</span>
                                </div>
                            ) : !ordersData?.data || ordersData.data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-1.5 border border-dashed border-border/50 rounded-xl bg-muted/5">
                                    <Info className="size-5 text-muted-foreground/80 stroke-[1.5]" />
                                    <span className="text-xs text-muted-foreground font-semibold">No order records found</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Orders List Accordion */}
                                    <div className="space-y-3">
                                        {ordersData.data.map((order: IOrder) => {
                                            const isExpanded = !!expandedOrders[order.id];
                                            return (
                                                <div
                                                    key={order.id}
                                                    className="border border-border/50 rounded-xl overflow-hidden bg-background hover:shadow-xs transition-shadow"
                                                >
                                                    {/* Order Row Header */}
                                                    <div
                                                        onClick={() => toggleOrderExpanded(order.id)}
                                                        className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-muted/10 select-none text-xs"
                                                    >
                                                        <div className="flex flex-wrap items-center gap-3 min-w-0">
                                                            <span className="font-bold text-foreground">Queue {order.queueNumber}</span>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs font-bold py-0.5 px-2 capitalize leading-none ${getStatusBadgeClass(
                                                                    order.status
                                                                )}`}
                                                            >
                                                                {order.status.toLowerCase()}
                                                            </Badge>
                                                            <span className="text-muted-foreground font-medium">
                                                                {format(new Date(order.createdAt), 'MMM dd, hh:mm a')}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className="font-bold text-foreground">₱{order.netTotal.toFixed(2)}</span>
                                                            {isExpanded ? (
                                                                <ChevronUp className="size-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronDown className="size-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Collapsible details content */}
                                                    {isExpanded && (
                                                        <div className="border-t border-border/20 bg-muted/5 p-3.5 space-y-3 text-xs">
                                                            {order.notes && (
                                                                <div className="text-xs text-amber-700 bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg font-medium">
                                                                    <strong>Order Notes:</strong> {order.notes}
                                                                </div>
                                                            )}

                                                            <div className="space-y-2">
                                                                <span className="text-xs font-bold text-foreground/50 uppercase block ">
                                                                    Ordered Items ({order.items?.length || 0})
                                                                </span>

                                                                <div className="divide-y divide-border/25 border border-border/25 rounded-lg overflow-hidden bg-background">
                                                                    {order.items?.map((item: IOrderItem) => (
                                                                        <div key={item.id} className="flex items-start justify-between p-2.5 gap-3">
                                                                            <div className="space-y-0.5">
                                                                                <div className="font-semibold text-foreground/80">
                                                                                    {item.variant.product.name}
                                                                                    <span className="text-muted-foreground font-medium ml-1.5">
                                                                                        x{item.quantity}
                                                                                    </span>
                                                                                </div>
                                                                                {renderAttributeBadges(item.variant.attributes)}

                                                                                {/* Item Customizations / Modifiers */}
                                                                                {item.modifiers.length > 0 && (
                                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                                        {item.modifiers.map((mod: IOrderItemModifier) => (
                                                                                            <Badge
                                                                                                key={mod.id}
                                                                                                variant="outline"
                                                                                                className="text-xs font-semibold bg-background py-0 px-1.5 border-border/60 text-muted-foreground"
                                                                                            >
                                                                                                + {mod.modifierOption.name}
                                                                                            </Badge>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <span className="font-bold text-foreground/75">
                                                                                ₱{item.totalPrice.toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Order History Pagination */}
                                    {ordersData.meta.pageCount > 1 && (
                                        <div className="flex items-center justify-end gap-2 pt-1">
                                            <Button
                                                variant="outline"
                                                size="xs"
                                                disabled={orderPage === 1}
                                                onClick={() => setOrderPage((p) => p - 1)}
                                                className="h-7 w-7 p-0"
                                            >
                                                &lt;
                                            </Button>
                                            <span className="text-xs text-muted-foreground font-semibold">
                                                Page {orderPage} of {ordersData.meta.pageCount}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="xs"
                                                disabled={!ordersData.meta.hasMore}
                                                onClick={() => setOrderPage((p) => p + 1)}
                                                className="h-7 w-7 p-0"
                                            >
                                                &gt;
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
