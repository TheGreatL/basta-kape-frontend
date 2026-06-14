import { Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Coffee, Volume2, Receipt, ClipboardList, CheckCircle2, Loader2, XCircle, AlertCircle, User, Store } from 'lucide-react';

import { getOrderById } from '#/api/orders.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Separator } from '#/components/ui/separator.tsx';
import { getFileUrl } from '#/utils/helper';
import type { IOrderStatusHistory, IOrderItemModifier, IOrderItem, TOrderStatus, IOrderPayment } from '#/feature/order/order.types.ts';

export default function OrderDetailsPage() {
    const { id } = useParams({
        from: '/_customer/orders/$id'
    });

    // Fetch order details with 5-second polling interval for real-time tracking
    const {
        data: order,
        isLoading,
        isError
    } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, id],
        queryFn: () => getOrderById(id),
        enabled: !!id,
        refetchInterval: 5000 // Refetch every 5 seconds
    });

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl animate-pulse space-y-8 min-h-screen">
                <div className="h-6 w-32 bg-muted rounded" />
                <div className="h-28 bg-muted rounded-2xl" />
                <div className="h-44 bg-muted rounded-2xl" />
                <div className="h-60 bg-muted rounded-2xl" />
            </div>
        );
    }

    if (isError || !order) {
        return (
            <div className="container mx-auto px-4 py-20 max-w-md text-center min-h-screen flex flex-col justify-center items-center">
                <XCircle className="size-14 text-destructive mb-4" />
                <h3 className="text-xl font-bold text-foreground">Failed to retrieve order</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                    The requested order could not be loaded. It may not exist, or you may not have permission to view it.
                </p>
                <Link to="/orders" className="mt-6">
                    <Button variant="outline" className="h-10 px-6 font-semibold rounded-xl">
                        Back to Orders
                    </Button>
                </Link>
            </div>
        );
    }

    const orderStatuses: TOrderStatus[] = ['PENDING', 'PREPARING', 'READY', 'COMPLETED'];
    const currentStatusIndex = orderStatuses.indexOf(order.status);
    const isCancelled = order.status === 'CANCELLED';

    const getStatusText = (status: TOrderStatus) => {
        switch (status) {
            case 'PENDING':
                return 'Order Placed';
            case 'PREPARING':
                return 'Brewing / Preparing';
            case 'READY':
                return 'Ready for Pickup';
            case 'COMPLETED':
                return 'Completed';
            case 'CANCELLED':
                return 'Cancelled';
            default:
                return status;
        }
    };

    const getStatusDescription = (status: TOrderStatus) => {
        switch (status) {
            case 'PENDING':
                return 'We have received your order and are waiting for validation.';
            case 'PREPARING':
                return 'Our baristas are preparing your custom beverage and fresh pastry.';
            case 'READY':
                return 'Your order is ready! Please claim it at the barista counter.';
            case 'COMPLETED':
                return 'Your order has been picked up. Enjoy your coffee experience!';
            case 'CANCELLED':
                return 'This order has been cancelled. Please contact staff for assistance.';
            default:
                return '';
        }
    };

    const getStatusIcon = (status: TOrderStatus) => {
        switch (status) {
            case 'PENDING':
                return <Clock className="size-5 text-amber-500" />;
            case 'PREPARING':
                return <Loader2 className="size-5 text-sky-500 animate-spin" />;
            case 'READY':
                return <Volume2 className="size-5 text-emerald-500 animate-bounce" />;
            case 'COMPLETED':
                return <CheckCircle2 className="size-5 text-stone-500" />;
            case 'CANCELLED':
                return <XCircle className="size-5 text-rose-500" />;
            default:
                return null;
        }
    };

    const formatOrderType = (type: string) => {
        return type.replace('_', ' ');
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
            {/* Back Button */}
            <Link
                to="/orders"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
                <ArrowLeft className="size-4" />
                <span>Back to My Orders</span>
            </Link>

            <div className="grid grid-cols-1 gap-8">
                {/* Header Ticket Stats */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center p-6 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xs gap-4 shadow-sm">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase ">Queue Number</span>
                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl font-bold text-foreground ">{order.queueNumber}</span>
                            <Badge
                                variant="outline"
                                className="text-xs rounded-full font-bold px-3 py-0.5 bg-primary/5 text-primary border-primary/20"
                            >
                                {formatOrderType(order.orderType)}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 md:items-center">
                        {order.buzzerId && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-primary">
                                <Volume2 className="size-5 animate-pulse" />
                                <div className="text-xs">
                                    <span className="font-bold block">Buzzer Active</span>
                                    <span className="font-semibold text-primary/80">Device ID: #{order.buzzerId}</span>
                                </div>
                            </div>
                        )}

                        <div className="text-sm md:text-right">
                            <span className="text-xs text-muted-foreground block font-medium">Order Date</span>
                            <span className="font-bold text-foreground">
                                {new Date(order.createdAt).toLocaleString(undefined, {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Progress Stepper Card */}
                <div className="p-6 md:p-8 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xs shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        {getStatusIcon(order.status)}
                        <h2 className="text-xl font-bold text-foreground ">{getStatusText(order.status)}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-8">{getStatusDescription(order.status)}</p>

                    {!isCancelled ? (
                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-0 mt-8">
                            {/* Stepper progress connector line */}
                            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border md:left-0 md:right-0 md:top-[15px] md:bottom-auto md:w-auto md:h-0.5 z-0" />
                            <div
                                className="absolute left-[15px] top-0 w-0.5 bg-primary md:left-0 md:top-[15px] md:bottom-auto md:h-0.5 z-0 transition-all duration-500"
                                style={{
                                    height: '100%',
                                    maxHeight: `${(currentStatusIndex / (orderStatuses.length - 1)) * 100}%`,
                                    width: 'auto'
                                }}
                            />
                            {/* Desktop only progress line width override */}
                            <div
                                className="hidden md:block absolute left-0 top-[15px] h-0.5 bg-primary z-0 transition-all duration-500"
                                style={{
                                    width: `${(currentStatusIndex / (orderStatuses.length - 1)) * 100}%`
                                }}
                            />

                            {orderStatuses.map((status, index) => {
                                const isCompleted = index <= currentStatusIndex;
                                const isActive = index === currentStatusIndex;

                                return (
                                    <div key={status} className="flex md:flex-col items-center gap-4 md:gap-2.5 relative z-10">
                                        <div
                                            className={`size-8 rounded-full flex items-center justify-center border font-bold text-xs transition-all duration-300 ${
                                                isActive
                                                    ? 'bg-primary text-primary-foreground border-primary ring-4 ring-primary/20 scale-110'
                                                    : isCompleted
                                                      ? 'bg-primary/10 text-primary border-primary'
                                                      : 'bg-background text-muted-foreground border-border'
                                            }`}
                                        >
                                            {isActive && status === 'PREPARING' ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : isActive && status === 'READY' ? (
                                                <Volume2 className="size-4 animate-pulse" />
                                            ) : isCompleted ? (
                                                <CheckCircle2 className="size-4" />
                                            ) : (
                                                index + 1
                                            )}
                                        </div>
                                        <div className="flex flex-col md:items-center text-left md:text-center">
                                            <span className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                                {getStatusText(status)}
                                            </span>
                                            {isActive && (
                                                <span className="text-xs text-primary/80 font-bold uppercase  animate-pulse block mt-0.5">
                                                    Current Status
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                            <AlertCircle className="size-5 shrink-0" />
                            <div className="text-xs">
                                <span className="font-bold block">Cancelled Details</span>
                                <span className="font-medium">
                                    This transaction has been cancelled. Staff reference logs: "{order.notes || 'No description provided'}"
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Items Summary Table */}
                <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-border/40 flex items-center gap-2">
                        <Coffee className="size-5 text-primary" />
                        <h2 className="text-lg font-bold text-foreground">Order Items</h2>
                    </div>

                    <div className="divide-y divide-border/40">
                        {order.items?.map((item: IOrderItem) => (
                            <div key={item.id} className="p-5 flex justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-base text-foreground">{item.variant.product.name}</span>
                                        <span className="text-xs text-muted-foreground font-semibold">x{item.quantity}</span>
                                    </div>

                                    {/* Variant descriptor attributes */}
                                    {item.variant.attributes && item.variant.attributes.length > 0 && (
                                        <div className="text-xs text-muted-foreground font-medium">
                                            Option: {item.variant.attributes.map((attr: any) => attr.attributeValue?.value).join(' / ')}
                                        </div>
                                    )}

                                    {/* Modifiers breakdown */}
                                    {item.modifiers.length > 0 && (
                                        <div className="pt-1.5 space-y-1">
                                            {item.modifiers.map((mod: IOrderItemModifier) => (
                                                <span
                                                    key={mod.id}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-md mr-1.5"
                                                >
                                                    + {mod.modifierOption.name} (₱{mod.price.toFixed(2)})
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Line item comments */}
                                    {item.notes && <p className="text-xs text-muted-foreground/80 italic pt-1">Instructions: "{item.notes}"</p>}
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="font-bold text-sm text-foreground">₱{item.totalPrice.toFixed(2)}</span>
                                    <span className="block text-xs text-muted-foreground">₱{item.unitPrice.toFixed(2)} each</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Receipt breakdown summary footer */}
                    <div className="bg-muted/30 p-5 border-t border-border/40 space-y-3">
                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-foreground uppercase ">
                            <Receipt className="size-4 text-muted-foreground" />
                            <span>Payment Summary</span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium text-foreground">₱{order.subtotal.toFixed(2)}</span>
                        </div>

                        {order.discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                                <span>Discount</span>
                                <span className="font-medium">-₱{order.discountAmount.toFixed(2)}</span>
                            </div>
                        )}

                        {order.taxAmount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Sales Tax</span>
                                <span className="font-medium text-foreground">₱{order.taxAmount.toFixed(2)}</span>
                            </div>
                        )}

                        <Separator className="bg-border/60" />

                        <div className="flex justify-between items-baseline pt-1">
                            <span className="font-bold text-base text-foreground">
                                {order.payments && order.payments.some((p: IOrderPayment) => p.paymentStatus === 'PAID')
                                    ? 'Total Paid'
                                    : 'Total Amount Due'}
                            </span>
                            <span className="font-bold text-2xl text-primary ">₱{order.netTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Information Card */}
                {order.payments && order.payments.length > 0 && (
                    <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Receipt className="size-5 text-primary" />
                            <h2 className="text-lg font-bold text-foreground">Payment Information</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {order.payments.map((payment: IOrderPayment) => (
                                <div key={payment.id} className="space-y-3 p-4 rounded-xl border border-border/40 bg-muted/10">
                                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                                        <span className="font-semibold text-muted-foreground">Payment Method</span>
                                        <span className="font-bold text-foreground capitalize">
                                            {payment.paymentMethod === 'PAYMAYA' ? 'Maya' : payment.paymentMethod.toLowerCase()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                                        <span className="font-semibold text-muted-foreground">Status</span>
                                        <Badge
                                            variant="outline"
                                            className={`text-2xs font-bold py-0.5 px-2 capitalize ${
                                                payment.paymentStatus === 'PAID'
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40'
                                                    : payment.paymentStatus === 'PENDING'
                                                      ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40'
                                                      : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40'
                                            }`}
                                        >
                                            {payment.paymentStatus.toLowerCase()}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                                        <span className="font-semibold text-muted-foreground">Amount Settled</span>
                                        <span className="font-bold text-foreground">₱{payment.amount.toFixed(2)}</span>
                                    </div>
                                    {payment.paymentMethod === 'CASH' ? (
                                        <>
                                            {payment.amountTendered !== null && payment.amountTendered !== undefined && (
                                                <div className="flex justify-between items-center pb-2 border-b border-border/30">
                                                    <span className="font-semibold text-muted-foreground">Amount Tendered</span>
                                                    <span className="font-medium text-foreground">₱{payment.amountTendered.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {payment.amountChange !== null && payment.amountChange !== undefined && (
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-muted-foreground">Change Given</span>
                                                    <span className="font-bold text-emerald-600">₱{payment.amountChange.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {payment.gcashReferenceNumber && (
                                                <div className="flex justify-between items-center pb-2 border-b border-border/30">
                                                    <span className="font-semibold text-muted-foreground">Reference ID</span>
                                                    <span className="font-mono text-xs bg-muted border border-border/40 px-2 py-0.5 rounded text-foreground font-bold">
                                                        {payment.gcashReferenceNumber}
                                                    </span>
                                                </div>
                                            )}
                                            {payment.paymentProofPhoto && (
                                                <div className="space-y-1.5 pt-1">
                                                    <span className="text-xs font-semibold text-muted-foreground block">
                                                        Uploaded Receipt Screenshot
                                                    </span>
                                                    <div className="border border-border/40 rounded-xl overflow-hidden bg-background max-h-[160px] flex items-center justify-center relative group">
                                                        <img
                                                            src={getFileUrl(payment.paymentProofPhoto)}
                                                            alt="Receipt Screenshot"
                                                            className="w-full max-h-[150px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                                            onClick={() => window.open(getFileUrl(payment.paymentProofPhoto), '_blank')}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Status Transitions Audit Trail */}
                {order.statusHistory && order.statusHistory.length > 0 && (
                    <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ClipboardList className="size-5 text-primary" />
                            <h2 className="text-lg font-bold text-foreground">Order Updates Timeline</h2>
                        </div>

                        <div className="relative pl-6 border-l border-border/60 space-y-6">
                            {order.statusHistory.map((history: IOrderStatusHistory) => (
                                <div key={history.id} className="relative">
                                    {/* Marker Dot */}
                                    <div className="absolute left-[-30px] top-1.5 size-2.5 rounded-full bg-primary border border-background" />

                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-baseline gap-2">
                                            <span className="text-sm font-bold text-foreground">{getStatusText(history.status)}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(history.createdAt).toLocaleTimeString(undefined, {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            {history.changedBy ? (
                                                <>
                                                    <User className="size-3" />
                                                    <span>Updated by {history.changedBy.firstName || history.changedBy.username}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Store className="size-3" />
                                                    <span>System Update</span>
                                                </>
                                            )}
                                        </div>

                                        {history.notes && (
                                            <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/30 mt-1 italic max-w-xl">
                                                "{history.notes}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
