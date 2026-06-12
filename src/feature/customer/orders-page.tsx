import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Search, Coffee, ChevronLeft, ChevronRight, ClipboardCheck, Clock } from 'lucide-react';

import { getCustomerOrders } from '#/api/customer.api.ts';
import { useCurrentCustomer } from '#/feature/customer/use-current-customer.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { TOrderStatus, IOrder } from '#/feature/order/order.types.ts';

const STATUS_FILTERS: Array<{ label: string; value: TOrderStatus | 'ALL' }> = [
    { label: 'All Orders', value: 'ALL' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Preparing', value: 'PREPARING' },
    { label: 'Ready', value: 'READY' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' }
];

export default function OrdersPage() {
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [selectedStatus, setSelectedStatus] = useState<TOrderStatus | 'ALL'>('ALL');
    const [page, setPage] = useState(1);
    const limit = 6;

    const { data: customer, isLoading: isCustomerLoading } = useCurrentCustomer();

    // Reset to page 1 on filter/search changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, selectedStatus]);

    const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.ORDERS, customer?.id, page, debouncedSearch, selectedStatus],
        queryFn: () =>
            getCustomerOrders(customer!.id, {
                page,
                limit,
                search: debouncedSearch || undefined,
                status: selectedStatus === 'ALL' ? undefined : selectedStatus
            }),
        enabled: !!customer?.id
    });

    const orders: IOrder[] = ordersData?.data || [];
    const meta = ordersData?.meta;

    const getStatusStyle = (status: TOrderStatus) => {
        switch (status) {
            case 'PENDING':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            case 'PREPARING':
                return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
            case 'READY':
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 animate-pulse';
            case 'COMPLETED':
                return 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20';
            case 'CANCELLED':
                return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
            default:
                return 'bg-muted text-muted-foreground border-border/40';
        }
    };

    if (isCustomerLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-5xl animate-pulse space-y-8 min-h-screen">
                <div className="h-10 w-48 bg-muted rounded" />
                <div className="h-12 w-full bg-muted rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="h-40 bg-muted rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="container mx-auto px-4 py-20 max-w-md text-center min-h-screen flex flex-col justify-center items-center">
                <Coffee className="size-16 text-muted-foreground/60 mb-6" />
                <h3 className="text-xl font-bold text-foreground">Sign In Required</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                    Please register or sign in as a customer to access your personalized orders and transaction history.
                </p>
                <Link to="/login" className="mt-6">
                    <Button className="h-10 px-6 font-semibold rounded-xl">Sign In to Continue</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl min-h-screen">
            {/* Page Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                        <ClipboardCheck className="size-8 text-primary" />
                        My Orders
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Track and check the status of your drinks, snacks, and past purchases.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search orders..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 w-full rounded-xl bg-card border-border/60 focus-visible:ring-primary/20 focus-visible:border-primary/50 text-sm"
                    />
                </div>
            </div>

            {/* Status Pills */}
            <div className="mb-8 overflow-x-auto scrollbar-none pb-2">
                <div className="flex items-center gap-2 min-w-max">
                    {STATUS_FILTERS.map((filter) => (
                        <Button
                            key={filter.value}
                            variant={selectedStatus === filter.value ? 'default' : 'outline'}
                            onClick={() => setSelectedStatus(filter.value)}
                            className="rounded-full h-9 px-5 text-sm font-medium transition-all"
                        >
                            {filter.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Orders Listing */}
            {isOrdersLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="h-44 rounded-2xl border border-border/40 p-5 bg-card space-y-4 animate-pulse">
                            <div className="flex justify-between items-center">
                                <div className="h-6 w-24 bg-muted rounded" />
                                <div className="h-6 w-16 bg-muted rounded-full" />
                            </div>
                            <div className="h-4 w-2/3 bg-muted rounded" />
                            <div className="h-4 w-1/2 bg-muted rounded" />
                            <div className="flex justify-between items-center pt-2">
                                <div className="h-6 w-20 bg-muted rounded" />
                                <div className="h-9 w-24 bg-muted rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border/60 rounded-2xl bg-muted/10">
                    <Coffee className="size-12 text-muted-foreground/60 mb-4 animate-bounce" />
                    <h3 className="text-lg font-bold text-foreground">No orders found</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">
                        {search || selectedStatus !== 'ALL'
                            ? "We couldn't find any orders matching your filters. Try clearing your search!"
                            : "You haven't placed any orders yet. Head to the menu to order your first cup!"}
                    </p>
                    {search || selectedStatus !== 'ALL' ? (
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => {
                                setSearch('');
                                setSelectedStatus('ALL');
                            }}
                        >
                            Reset Filters
                        </Button>
                    ) : (
                        <Link to="/products" className="mt-4">
                            <Button className="font-semibold px-5 h-10 rounded-xl">Browse Menu</Button>
                        </Link>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="group relative flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                            >
                                <div>
                                    {/* Card Top */}
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-muted-foreground">Queue Ticket</span>
                                            <h3 className="text-2xl font-black text-foreground tracking-tight">{order.queueNumber}</h3>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusStyle(order.status)}`}
                                        >
                                            {order.status}
                                        </Badge>
                                    </div>

                                    {/* Order Details */}
                                    <div className="mt-4 space-y-2 text-sm">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Clock className="size-4" />
                                            <span>
                                                {new Date(order.createdAt).toLocaleString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        {/* Order Items List */}
                                        <div className="mt-3 space-y-2 pt-3 border-t border-dashed border-border/40">
                                            {order.items?.map((item) => (
                                                <div key={item.id} className="text-xs space-y-1">
                                                    <div className="flex justify-between items-baseline text-foreground">
                                                        <span className="font-semibold text-foreground">
                                                            {item.quantity}x {item.variant.product.name}
                                                            {item.variant.attributes && item.variant.attributes.length > 0 && (
                                                                <span className="text-muted-foreground font-normal ml-1">
                                                                    (
                                                                    {item.variant.attributes
                                                                        .map((attr: any) => attr.attributeValue?.value)
                                                                        .join(' / ')}
                                                                    )
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="font-bold text-muted-foreground">₱{item.totalPrice.toFixed(2)}</span>
                                                    </div>

                                                    {/* Add-ons/Modifiers */}
                                                    {item.modifiers.length > 0 && (
                                                        <div className="pl-3 flex flex-wrap gap-1">
                                                            {item.modifiers.map((mod) => (
                                                                <span
                                                                    key={mod.id}
                                                                    className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/10"
                                                                >
                                                                    + {mod.modifierOption.name} (+₱{mod.price.toFixed(2)})
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {order.notes && <p className="text-xs text-muted-foreground italic truncate">"{order.notes}"</p>}
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="flex justify-between items-center mt-5 pt-4 border-t border-border/30">
                                    <div>
                                        <span className="text-xs text-muted-foreground">Total Amount</span>
                                        <div className="text-lg font-bold text-foreground">₱{order.netTotal.toFixed(2)}</div>
                                    </div>
                                    <Link to="/orders/$id" params={{ id: order.id }}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 px-4 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 font-semibold"
                                        >
                                            Track Order
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {meta && meta.pageCount > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-12">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((prev) => prev - 1)}
                                className="h-9 w-9 p-0 rounded-xl"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <span className="text-xs font-semibold">
                                Page {meta.currentPage} of {meta.pageCount}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!meta.hasMore}
                                onClick={() => setPage((prev) => prev + 1)}
                                className="h-9 w-9 p-0 rounded-xl"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
