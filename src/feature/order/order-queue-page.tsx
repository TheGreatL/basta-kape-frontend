import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Check, CheckCircle2, XCircle, Coffee, Search, RefreshCw, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

import { getOrders, updateOrderStatus } from '#/api/orders.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IOrder, TOrderStatus, TOrderType } from './order.types';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import ProcessPaymentDialog from '#/feature/order/components/process-payment-dialog.tsx';
import VoidOrderDialog from '#/feature/order/components/void-order-dialog.tsx';
import { CopyButton } from '#/components/ui/copy-button.tsx';

export default function OrderQueuePage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [autoRefreshInterval, setAutoRefreshInterval] = React.useState<number>(10000); // Default: 10s

    // Void dialog states
    const [voidOrderId, setVoidOrderId] = React.useState<string | null>(null);
    const [voidOrderNumber, setVoidOrderNumber] = React.useState<string | null>(null);

    // Payment dialog states
    const [paymentOrder, setPaymentOrder] = React.useState<IOrder | null>(null);

    // Timer state to force refresh the elapsed minutes ticker every 30 seconds
    const [, setTicker] = React.useState(0);
    React.useEffect(() => {
        const interval = setInterval(() => setTicker((t) => t + 1), 30000);
        return () => clearInterval(interval);
    }, []);

    // Query: Fetch all active orders (limit 100, no status filter to get all, then filter client side)
    const {
        data: queueData,
        isLoading,
        isFetching,
        refetch
    } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST, { limit: 50 }],
        queryFn: () => getOrders({ limit: 50, page: 1 }),
        refetchInterval: autoRefreshInterval > 0 ? autoRefreshInterval : false
    });

    // Mutation: Update Status
    const updateStatusMutation = useMutation({
        mutationFn: ({ orderId, payload }: { orderId: string; payload: { status: TOrderStatus; notes?: string } }) =>
            updateOrderStatus(orderId, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            toast.success(`Order #${updated.queueNumber} updated to ${updated.status}`);
        },
        onError: (err) => {
            toast.error('Failed to transition order status', { description: getErrorMessage(err) });
        }
    });

    const handleTransition = (orderId: string, targetStatus: TOrderStatus) => {
        updateStatusMutation.mutate({
            orderId,
            payload: { status: targetStatus, notes: `Transitioned to ${targetStatus} via KDS Board` }
        });
    };

    // Filter queue client side
    const activeOrders = React.useMemo(() => {
        if (!queueData?.data) return [];
        return queueData.data.filter((order: IOrder) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED');
    }, [queueData]);

    const filteredOrders = React.useMemo(() => {
        if (!searchQuery) return activeOrders;
        const q = searchQuery.toLowerCase();
        return activeOrders.filter(
            (o: IOrder) => o.queueNumber.toLowerCase().includes(q) || (o.customerName && o.customerName.toLowerCase().includes(q))
        );
    }, [activeOrders, searchQuery]);

    // Separate columns
    const pendingOrders = React.useMemo(() => filteredOrders.filter((o: IOrder) => o.status === 'PENDING'), [filteredOrders]);
    const preparingOrders = React.useMemo(() => filteredOrders.filter((o: IOrder) => o.status === 'PREPARING'), [filteredOrders]);
    const readyOrders = React.useMemo(() => filteredOrders.filter((o: IOrder) => o.status === 'READY'), [filteredOrders]);

    // Helpers
    const getElapsedMinutes = (createdAtStr: string) => {
        const diffMs = new Date().getTime() - new Date(createdAtStr).getTime();
        return Math.floor(diffMs / 60000);
    };

    const getTimerColorClass = (mins: number) => {
        if (mins >= 15) {
            return 'text-rose-600 dark:text-rose-400 font-bold animate-pulse';
        }
        if (mins >= 8) {
            return 'text-amber-600 dark:text-amber-400 font-bold';
        }
        return 'text-muted-foreground font-semibold';
    };

    const getOrderTypeBadgeColor = (type: TOrderType) => {
        switch (type) {
            case 'DINE_IN':
                return 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/40';
            case 'TAKE_OUT':
                return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/40';
            case 'DELIVERY':
                return 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900/40';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    // Render Card component for modular KDS styling
    const renderOrderCard = (order: IOrder) => {
        const mins = getElapsedMinutes(order.createdAt);
        return (
            <div
                key={order.id}
                className="border border-border/60 bg-card rounded-xl p-4 shadow-3xs flex flex-col gap-3.5 hover:shadow-xs transition-shadow relative overflow-hidden"
            >
                {/* Visual time indicator stripe */}
                {mins >= 15 && <div className="absolute left-0 inset-y-0 w-1 bg-rose-500 animate-pulse" />}
                {mins >= 8 && mins < 15 && <div className="absolute left-0 inset-y-0 w-1 bg-amber-500" />}

                {/* Card Header */}
                <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2.5">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                            <span className="font-mono text-base font-black text-foreground">{order.queueNumber}</span>
                            <CopyButton value={order.queueNumber} description={`Queue number #${order.queueNumber} copied`} />
                        </div>
                        <div className="flex items-center gap-1">
                            <Badge
                                variant="outline"
                                className={`text-xs font-bold py-0 px-1.5 leading-none uppercase ${getOrderTypeBadgeColor(order.orderType)}`}
                            >
                                {order.orderType.replace('_', ' ')}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                        <Clock className={`size-3 shrink-0 ${mins >= 15 ? 'text-rose-500 animate-spin-slow' : ''}`} />
                        <span className={getTimerColorClass(mins)}>{mins === 0 ? 'Just now' : `${mins}m ago`}</span>
                    </div>
                </div>

                {/* Card Body: Items checklist */}
                <div className="flex-1 space-y-2.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-primary/40" />
                        <span className="text-xs font-bold text-foreground/90 truncate">{order.customerName || 'Walk-in Customer'}</span>
                    </div>

                    {/* Overall Notes (if available) */}
                    {order.notes && (
                        <div className="text-xs text-amber-700 bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg font-medium leading-relaxed">
                            <strong>Note:</strong> {order.notes}
                        </div>
                    )}

                    {/* Items List */}
                    <div className="space-y-1.5 text-xs text-foreground/80 pl-3 border-l border-border/50">
                        {order.items?.map((item) => (
                            <div key={item.id} className="leading-tight">
                                <div className="font-semibold text-foreground/90">
                                    {item.quantity} x {item.variant.product.name}
                                </div>
                                {/* Size/Attributes string */}
                                {item.variant.sku && <span className="text-xs text-muted-foreground font-semibold">{item.variant.sku}</span>}
                                {/* Modifiers list */}
                                {item.modifiers.length > 0 && (
                                    <div className="text-xs text-muted-foreground font-medium flex flex-wrap gap-x-1 pl-1">
                                        {item.modifiers.map((mod) => (
                                            <span key={mod.id}>+ {mod.modifierOption.name}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-border/30">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => {
                            setVoidOrderId(order.id);
                            setVoidOrderNumber(order.queueNumber);
                        }}
                        className="h-8.5 px-2 hover:bg-rose-500/10 hover:text-rose-600 text-muted-foreground transition-colors text-xs rounded-lg"
                        title="Void Order"
                    >
                        <XCircle className="size-4 shrink-0" />
                    </Button>

                    {order.status === 'PENDING' && (
                        <Button
                            size="sm"
                            onClick={() => setPaymentOrder(order)}
                            className="h-8.5 flex-1 gap-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-lg shadow-3xs hover:shadow-xs transition-shadow"
                        >
                            <CreditCard className="size-3.5 shrink-0" />
                            Collect Payment
                        </Button>
                    )}

                    {order.status === 'PREPARING' && (
                        <Button
                            size="sm"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => handleTransition(order.id, 'READY')}
                            className="h-8.5 flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-3xs hover:shadow-xs transition-shadow"
                        >
                            <Check className="size-3.5 stroke-[2.5] shrink-0" />
                            Mark Ready
                        </Button>
                    )}

                    {order.status === 'READY' && (
                        <Button
                            size="sm"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => handleTransition(order.id, 'COMPLETED')}
                            className="h-8.5 flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-3xs hover:shadow-xs transition-shadow"
                        >
                            <CheckCircle2 className="size-3.5 shrink-0" />
                            Complete Pick
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-80px)] overflow-hidden">
            {/* Header / Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Coffee className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Order Queue board</h1>
                        <p className="text-xs text-muted-foreground">
                            Kitchen Display System (KDS) board monitoring active drink preps and pickup lifecycles.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Filter queue by no. or name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8.5 w-[200px] pl-8.5 bg-background/50 text-xs"
                        />
                    </div>

                    <Select value={String(autoRefreshInterval)} onValueChange={(val) => setAutoRefreshInterval(Number(val))}>
                        <SelectTrigger className="h-8.5 min-w-[120px] bg-background/50 text-xs gap-1.5">
                            <RefreshCw className="size-3.5 text-muted-foreground" />
                            <SelectValue placeholder="Auto refresh" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0" className="text-xs">
                                Refresh: Off
                            </SelectItem>
                            <SelectItem value="5000" className="text-xs">
                                Refresh: 5s
                            </SelectItem>
                            <SelectItem value="10000" className="text-xs">
                                Refresh: 10s
                            </SelectItem>
                            <SelectItem value="30000" className="text-xs">
                                Refresh: 30s
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="size-8.5 rounded-lg border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/10 shrink-0"
                        title="Manual Reload"
                    >
                        <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Board Workspace */}
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <Spinner className="h-7 w-7 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">Initializing kitchen queue parameters...</p>
                </div>
            ) : activeOrders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 border border-dashed rounded-2xl bg-muted/5">
                    <CheckCircle2 className="size-10 text-emerald-500/80 stroke-[1.25]" />
                    <p className="text-base font-bold text-foreground">Active Order Queue is Clear!</p>
                    <p className="text-xs text-muted-foreground">Drinks and checkouts will appear here for preparation tracking.</p>
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 overflow-hidden min-h-0">
                    {/* COLUMN 1: PENDING */}
                    <div className="flex flex-col h-full overflow-hidden border border-border/45 rounded-xl bg-muted/10">
                        <div className="p-3.5 bg-muted/30 border-b border-border/45 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <h3 className="text-xs font-bold uppercase text-foreground/80 ">Pending Orders</h3>
                            </div>
                            <Badge
                                variant="secondary"
                                className="text-xs font-bold py-0.5 px-2 bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            >
                                {pendingOrders.length}
                            </Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                            {pendingOrders.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground text-xs font-medium">
                                    No pending orders.
                                </div>
                            ) : (
                                pendingOrders.map((o: IOrder) => renderOrderCard(o))
                            )}
                        </div>
                    </div>

                    {/* COLUMN 2: PREPARING */}
                    <div className="flex flex-col h-full overflow-hidden border border-border/45 rounded-xl bg-muted/10">
                        <div className="p-3.5 bg-muted/30 border-b border-border/45 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                <h3 className="text-xs font-bold uppercase text-foreground/80 ">Preparing</h3>
                            </div>
                            <Badge
                                variant="secondary"
                                className="text-xs font-bold py-0.5 px-2 bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            >
                                {preparingOrders.length}
                            </Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                            {preparingOrders.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground text-xs font-medium">
                                    No orders in preparation.
                                </div>
                            ) : (
                                preparingOrders.map((o: IOrder) => renderOrderCard(o))
                            )}
                        </div>
                    </div>

                    {/* COLUMN 3: READY */}
                    <div className="flex flex-col h-full overflow-hidden border border-border/45 rounded-xl bg-muted/10">
                        <div className="p-3.5 bg-muted/30 border-b border-border/45 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <h3 className="text-xs font-bold uppercase text-foreground/80 ">Ready for Pick</h3>
                            </div>
                            <Badge
                                variant="secondary"
                                className="text-xs font-bold py-0.5 px-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            >
                                {readyOrders.length}
                            </Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                            {readyOrders.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center py-20 text-center text-muted-foreground text-xs font-medium">
                                    No orders ready for pickup.
                                </div>
                            ) : (
                                readyOrders.map((o: IOrder) => renderOrderCard(o))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Void Confirmation Override Dialog */}
            <VoidOrderDialog
                open={!!voidOrderId}
                onOpenChange={(open) => !open && setVoidOrderId(null)}
                orderId={voidOrderId}
                orderNumber={voidOrderNumber}
            />

            {/* Payment Modal */}
            <ProcessPaymentDialog open={!!paymentOrder} onOpenChange={(open) => !open && setPaymentOrder(null)} order={paymentOrder} />
        </div>
    );
}
