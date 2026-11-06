import { formatCurrency } from '#/utils/helper.ts';
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Clock,
    Coffee,
    Volume2,
    Receipt,
    ClipboardList,
    CheckCircle2,
    Loader2,
    XCircle,
    AlertCircle,
    User,
    Store,
    Printer,
    Download,
    CreditCard,
    Eye,
    Truck,
    ExternalLink,
    Pencil
} from 'lucide-react';

import { getOrderById, updateOrderCourier, completeDeliveryOrder } from '#/api/orders.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Separator } from '#/components/ui/separator.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { getFileUrl, getFrontendReference, getProductPhotoUrl, handleProductImageError } from '#/utils/helper';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IOrderStatusHistory, IOrderItemModifier, IOrderItem, TOrderStatus, IOrderPayment, TRiderVehicle } from '#/feature/order/order.types.ts';
import { RIDER_VEHICLES } from '#/feature/order/order.types.ts';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu.tsx';
import { downloadReceiptPdf, getReceiptPdfBlobUrl } from '#/utils/receipt.ts';
import FileViewerDialog from '#/components/ui/file-viewer-dialog.tsx';

export default function OrderDetailsPage() {
    const { id } = useParams({
        from: '/_customer/_protected/orders/$id'
    });

    const queryClient = useQueryClient();
    const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
    const [viewingFileName, setViewingFileName] = useState<string | undefined>(undefined);

    const [riderName, setRiderName] = useState('');
    const [riderPlate, setRiderPlate] = useState('');
    const [riderVehicle, setRiderVehicle] = useState<TRiderVehicle>('Motorcycle');
    const [trackingLink, setTrackingLink] = useState('');
    const [isEditingCourier, setIsEditingCourier] = useState(false);

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

    const hasCourierDetails = Boolean(order?.riderName || order?.riderPlate || order?.riderVehicle || order?.trackingLink);

    useEffect(() => {
        if (order) {
            setRiderName((prev) => prev || order.riderName || '');
            setRiderPlate((prev) => prev || order.riderPlate || '');
            if (order.riderVehicle && RIDER_VEHICLES.includes(order.riderVehicle as TRiderVehicle)) {
                setRiderVehicle(order.riderVehicle as TRiderVehicle);
            }
            setTrackingLink((prev) => prev || order.trackingLink || '');
        }
    }, [order]);

    const courierMutation = useMutation({
        mutationFn: (payload: { riderName: string; riderPlate: string; riderVehicle: TRiderVehicle; trackingLink: string }) =>
            updateOrderCourier(id, payload),
        onSuccess: (updatedOrder) => {
            toast.success('Courier Details Submitted', {
                description: 'Your rider details have been shared with the store.'
            });
            setRiderName(updatedOrder.riderName || '');
            setRiderPlate(updatedOrder.riderPlate || '');
            if (updatedOrder.riderVehicle && RIDER_VEHICLES.includes(updatedOrder.riderVehicle as TRiderVehicle)) {
                setRiderVehicle(updatedOrder.riderVehicle as TRiderVehicle);
            }
            setTrackingLink(updatedOrder.trackingLink || '');
            setIsEditingCourier(false);
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.ORDERS] });
        },
        onError: (err) => {
            toast.error('Failed to submit courier details', {
                description: getErrorMessage(err)
            });
        }
    });

    const completeOrderMutation = useMutation({
        mutationFn: () => completeDeliveryOrder(id),
        onSuccess: () => {
            toast.success('Order Completed', {
                description: 'Thank you for confirming receipt of your delivery order!'
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.ORDERS] });
        },
        onError: (err) => {
            toast.error('Failed to complete order', {
                description: getErrorMessage(err)
            });
        }
    });

    const handleCourierSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!riderName.trim() || !riderPlate.trim() || !trackingLink.trim()) {
            toast.error('Incomplete Courier Details', {
                description: 'Please fill in all rider fields including a valid tracking link URL.'
            });
            return;
        }
        try {
            new URL(trackingLink.trim());
        } catch {
            toast.error('Invalid Tracking Link URL', {
                description: 'Please enter a valid URL starting with http:// or https://.'
            });
            return;
        }
        courierMutation.mutate({
            riderName: riderName.trim(),
            riderPlate: riderPlate.trim(),
            riderVehicle,
            trackingLink: trackingLink.trim()
        });
    };

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

    const orderStatuses: TOrderStatus[] =
        order.orderType === 'DELIVERY'
            ? ['PENDING', 'APPROVED', 'PREPARING', 'READY', 'DISPATCHED', 'COMPLETED']
            : ['PENDING', 'APPROVED', 'PREPARING', 'READY', 'COMPLETED'];
    const currentStatusIndex = orderStatuses.indexOf(order.status);
    const isCancelled = order.status === 'CANCELLED';

    const getStatusText = (status: TOrderStatus) => {
        switch (status) {
            case 'PENDING':
                return 'Order Placed';
            case 'APPROVED':
                return 'Approved';
            case 'PREPARING':
                return 'Brewing / Preparing';
            case 'READY':
                return 'Ready for Pickup';
            case 'DISPATCHED':
                return 'Dispatched';
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
            case 'APPROVED':
                return 'Payment confirmed. Your order has been approved and queued.';
            case 'PREPARING':
                return 'Our baristas are preparing your custom beverage and fresh pastry.';
            case 'READY':
                return order.orderType === 'DELIVERY'
                    ? 'Your order is ready for pickup! Please book your courier and submit the rider details below so our staff can hand over your order.'
                    : 'Your order is ready! Please claim it at the barista counter.';
            case 'DISPATCHED':
                return 'Your order has been handed over to your courier and is on its way!';
            case 'COMPLETED':
                return order.orderType === 'DELIVERY'
                    ? 'Your delivery order has been completed. Enjoy your coffee experience!'
                    : 'Your order has been picked up. Enjoy your coffee experience!';
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
            case 'APPROVED':
                return <CheckCircle2 className="size-5 text-indigo-500" />;
            case 'PREPARING':
                return <Loader2 className="size-5 text-sky-500 animate-spin" />;
            case 'READY':
                return <Volume2 className="size-5 text-emerald-500 animate-bounce" />;
            case 'DISPATCHED':
                return <Truck className="size-5 text-teal-500 animate-pulse" />;
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
            {/* Back Button & Action Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-8">
                <Link
                    to="/orders"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="size-4" />
                    <span>Back to My Orders</span>
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 bg-background border-border/60 hover:bg-muted text-foreground text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
                        >
                            <Printer className="size-4 shrink-0" />
                            Print / View Receipt
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl animate-in slide-in-from-top-2 duration-150" align="end">
                        <DropdownMenuItem
                            onClick={async () => {
                                const blobUrl = await getReceiptPdfBlobUrl(order.id);
                                setViewingFileUrl(blobUrl);
                                setViewingFileName(`Receipt-${order.id.slice(0, 8).toUpperCase()}.pdf`);
                            }}
                            className="text-xs gap-2 font-semibold cursor-pointer"
                        >
                            <Eye className="size-3.5 text-muted-foreground" />
                            View Receipt
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => downloadReceiptPdf(order.id, `Receipt-${order.id.slice(0, 8).toUpperCase()}.pdf`)}
                            className="text-xs gap-2 font-semibold cursor-pointer"
                        >
                            <Download className="size-3.5 text-muted-foreground" />
                            Download Receipt
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

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
                        <div className="flex flex-col gap-0.5 pt-1.5 text-xs text-muted-foreground font-mono">
                            <span>
                                Reference No:{' '}
                                <span className="font-bold text-foreground">
                                    {order.referenceNumber || getFrontendReference(order.createdAt, order.queueNumber)}
                                </span>
                            </span>
                            <span>
                                Receipt ID: <span className="font-bold text-foreground">{order.id.slice(0, 8).toUpperCase()}</span>
                            </span>
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
                            <span className="font-bold text-foreground">{format(new Date(order.createdAt), 'MMMM dd, yyyy - hh:mm a')}</span>
                        </div>
                    </div>
                </div>

                {/* Progress Stepper Card */}
                <div className="p-6 md:p-8 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xs shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                        <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <h2 className="text-xl font-bold text-foreground ">{getStatusText(order.status)}</h2>
                        </div>
                        {order.orderType === 'DELIVERY' && order.status === 'READY' && !hasCourierDetails && (
                            <Badge
                                variant="outline"
                                className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold text-xs px-3 py-1 rounded-full gap-1.5 animate-pulse"
                            >
                                <AlertCircle className="size-3.5 shrink-0" />
                                Action Required: Input Courier Details
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">{getStatusDescription(order.status)}</p>

                    {order.orderType === 'DELIVERY' && order.status === 'READY' && !hasCourierDetails && (
                        <div className="mb-8 flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
                            <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-bounce" />
                            <div className="text-xs space-y-1 leading-relaxed">
                                <span className="font-bold text-sm block text-amber-900 dark:text-amber-200">
                                    Courier Details Required Before Dispatch
                                </span>
                                <span>
                                    Your order is ready for pickup, but you haven&apos;t submitted your courier details yet. Please book a rider and
                                    fill out the <strong>Courier / Rider Details</strong> form below so our staff can hand over and dispatch your
                                    order.
                                </span>
                            </div>
                        </div>
                    )}

                    {order.orderType === 'DELIVERY' && order.status === 'DISPATCHED' && (
                        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-300">
                            <div className="flex items-start gap-3">
                                <Truck className="size-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                                <div className="text-xs space-y-1 leading-relaxed">
                                    <span className="font-bold text-sm block text-teal-900 dark:text-teal-200">
                                        Order On Its Way — Has Your Order Arrived?
                                    </span>
                                    <span>
                                        Once your courier delivers your order, please click <strong>Order Received</strong> to mark your order as
                                        completed.
                                    </span>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                disabled={completeOrderMutation.isPending}
                                onClick={() => completeOrderMutation.mutate()}
                                className="h-9 px-4 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shrink-0"
                            >
                                {completeOrderMutation.isPending ? (
                                    <>
                                        <Loader2 className="size-3.5 animate-spin" />
                                        Completing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="size-3.5 shrink-0" />
                                        Order Received
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

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
                                            {isActive && status === 'APPROVED' ? (
                                                <CheckCircle2 className="size-4 animate-pulse" />
                                            ) : isActive && status === 'PREPARING' ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : isActive && status === 'READY' ? (
                                                <Volume2 className="size-4 animate-pulse" />
                                            ) : isActive && status === 'DISPATCHED' ? (
                                                <Truck className="size-4 animate-pulse" />
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

                {/* Courier / Rider Details Card for Delivery Orders */}
                {order.orderType === 'DELIVERY' && !isCancelled && (
                    <div
                        className={`p-6 rounded-2xl border bg-card shadow-sm space-y-4 transition-all ${
                            order.status === 'READY' && !hasCourierDetails ? 'border-amber-500/50 ring-2 ring-amber-500/15' : 'border-border/40'
                        }`}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Truck className="size-5 text-primary" />
                                <h2 className="text-lg font-bold text-foreground">Courier / Rider Details</h2>
                                {order.status === 'READY' && !hasCourierDetails && (
                                    <Badge
                                        variant="outline"
                                        className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold text-2xs px-2.5 py-0.5 rounded-full gap-1"
                                    >
                                        <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
                                        Input Required
                                    </Badge>
                                )}
                                {hasCourierDetails && (
                                    <Badge
                                        variant="outline"
                                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-2xs px-2.5 py-0.5 rounded-full gap-1"
                                    >
                                        <CheckCircle2 className="size-3 shrink-0" />
                                        Submitted
                                    </Badge>
                                )}
                            </div>
                            {order.status === 'READY' && hasCourierDetails && !isEditingCourier && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setRiderName(order.riderName || '');
                                        setRiderPlate(order.riderPlate || '');
                                        if (order.riderVehicle && RIDER_VEHICLES.includes(order.riderVehicle as TRiderVehicle)) {
                                            setRiderVehicle(order.riderVehicle as TRiderVehicle);
                                        }
                                        setTrackingLink(order.trackingLink || '');
                                        setIsEditingCourier(true);
                                    }}
                                    className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl"
                                >
                                    <Pencil className="size-3.5" />
                                    Update Rider Details
                                </Button>
                            )}
                        </div>

                        {order.status === 'READY' && (!hasCourierDetails || isEditingCourier) ? (
                            <form onSubmit={handleCourierSubmit} className="space-y-4 pt-1">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Your order is <strong>Ready for Pickup</strong>! Please book your preferred courier and provide the rider details
                                    below so our staff can verify and hand over your order.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground/80 block">
                                            Rider Name <span className="text-rose-500">*</span>
                                        </label>
                                        <Input
                                            placeholder="e.g. Juan Dela Cruz"
                                            value={riderName}
                                            onChange={(e) => setRiderName(e.target.value)}
                                            maxLength={100}
                                            className="h-10 text-xs rounded-xl bg-background/50 border-border/60"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground/80 block">
                                            Plate Number <span className="text-rose-500">*</span>
                                        </label>
                                        <Input
                                            placeholder="e.g. ABC 1234"
                                            value={riderPlate}
                                            onChange={(e) => setRiderPlate(e.target.value)}
                                            maxLength={50}
                                            className="h-10 text-xs rounded-xl bg-background/50 border-border/60 font-mono uppercase"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground/80 block">
                                            Vehicle <span className="text-rose-500">*</span>
                                        </label>
                                        <Select value={riderVehicle} onValueChange={(v) => setRiderVehicle(v as TRiderVehicle)}>
                                            <SelectTrigger className="h-10 text-xs rounded-xl bg-background/50 border-border/60">
                                                <SelectValue placeholder="Select vehicle type" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {RIDER_VEHICLES.map((vehicle) => (
                                                    <SelectItem key={vehicle} value={vehicle} className="text-xs">
                                                        {vehicle}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground/80 block">
                                            Tracking Link URL <span className="text-rose-500">*</span>
                                        </label>
                                        <Input
                                            type="url"
                                            placeholder="https://..."
                                            value={trackingLink}
                                            onChange={(e) => setTrackingLink(e.target.value)}
                                            maxLength={1000}
                                            className="h-10 text-xs rounded-xl bg-background/50 border-border/60"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    {hasCourierDetails && isEditingCourier && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsEditingCourier(false)}
                                            disabled={courierMutation.isPending}
                                            className="h-9 px-4 text-xs font-bold rounded-xl"
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    <Button type="submit" disabled={courierMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl">
                                        {courierMutation.isPending ? (
                                            <>
                                                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                                                Submitting...
                                            </>
                                        ) : (
                                            'Submit Courier Details'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        ) : hasCourierDetails ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                                <div className="p-3.5 rounded-xl border border-border/40 bg-muted/10 space-y-1">
                                    <span className="text-muted-foreground font-semibold block">Rider Name</span>
                                    <span className="font-bold text-foreground text-sm">{order.riderName || '—'}</span>
                                </div>
                                <div className="p-3.5 rounded-xl border border-border/40 bg-muted/10 space-y-1">
                                    <span className="text-muted-foreground font-semibold block">Plate Number</span>
                                    <span className="font-bold text-foreground font-mono text-sm uppercase">{order.riderPlate || '—'}</span>
                                </div>
                                <div className="p-3.5 rounded-xl border border-border/40 bg-muted/10 space-y-1">
                                    <span className="text-muted-foreground font-semibold block">Vehicle</span>
                                    <span className="font-bold text-foreground text-sm">{order.riderVehicle || '—'}</span>
                                </div>
                                <div className="p-3.5 rounded-xl border border-border/40 bg-muted/10 space-y-1">
                                    <span className="text-muted-foreground font-semibold block">Tracking Link</span>
                                    {order.trackingLink ? (
                                        <a
                                            href={order.trackingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 font-bold text-primary hover:underline break-all"
                                        >
                                            <span className="truncate max-w-[220px]">{order.trackingLink}</span>
                                            <ExternalLink className="size-3.5 shrink-0" />
                                        </a>
                                    ) : (
                                        <span className="font-bold text-foreground">—</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                                <Clock className="size-4 text-primary shrink-0 mt-0.5" />
                                <span>
                                    Once your order status reaches <strong>Ready for Pickup</strong>, you will be able to book your courier and submit
                                    the rider details (Rider Name, Plate Number, Vehicle, and Tracking Link URL) here.
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Items Summary Table */}
                <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-border/40 flex items-center gap-2">
                        <Coffee className="size-5 text-primary" />
                        <h2 className="text-lg font-bold text-foreground">Order Items</h2>
                    </div>

                    <div className="divide-y divide-border/40">
                        {order.items?.map((item: IOrderItem) => (
                            <div key={item.id} className="p-5 flex justify-between gap-4">
                                <div className="flex items-start gap-3.5 min-w-0">
                                    <div className="size-14 rounded-xl overflow-hidden bg-muted border border-border/60 shrink-0 flex items-center justify-center">
                                        {item.variant.product.photo ? (
                                            <img
                                                src={getProductPhotoUrl(item.variant.product.photo)}
                                                alt={item.variant.product.name}
                                                onError={handleProductImageError}
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <Coffee className="size-6 text-muted-foreground/40" />
                                        )}
                                    </div>
                                    <div className="space-y-1 min-w-0">
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
                                                        + {mod.modifierOption.name} ({formatCurrency(mod.price)})
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Line item comments */}
                                        {item.notes && <p className="text-xs text-muted-foreground/80 italic pt-1">Instructions: "{item.notes}"</p>}
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="font-bold text-sm text-foreground">{formatCurrency(item.totalPrice)}</span>
                                    <span className="block text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} each</span>
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
                            <span className="font-medium text-foreground">{formatCurrency(order.subtotal)}</span>
                        </div>

                        {order.discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                                <span>Discount</span>
                                <span className="font-medium">-{formatCurrency(order.discountAmount)}</span>
                            </div>
                        )}

                        <Separator className="bg-border/60" />

                        <div className="flex justify-between items-baseline pt-1">
                            <span className="font-bold text-base text-foreground">
                                {order.paymentStatus === 'PAID' ? 'Total Paid' : 'Total Amount Due'}
                            </span>
                            <span className="font-bold text-2xl text-primary ">{formatCurrency(order.netTotal)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Information Card */}
                {order.payments && order.payments.length > 0 ? (
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
                                            {payment.paymentMethod === 'GCASH' ? 'GCash' : 'Cash'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                                        <span className="font-semibold text-muted-foreground">Status</span>
                                        <Badge
                                            variant="outline"
                                            className={`text-xs font-bold py-0.5 px-2 capitalize ${
                                                order.paymentStatus === 'PAID'
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40'
                                                    : order.paymentStatus === 'PENDING'
                                                      ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40'
                                                      : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40'
                                            }`}
                                        >
                                            {order.paymentStatus.toLowerCase()}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                                        <span className="font-semibold text-muted-foreground">Amount Settled</span>
                                        <span className="font-bold text-foreground">{formatCurrency(payment.amount)}</span>
                                    </div>
                                    {payment.paymentMethod === 'CASH' ? (
                                        <>
                                            {payment.amountTendered !== null && payment.amountTendered !== undefined && (
                                                <div className="flex justify-between items-center pb-2 border-b border-border/30">
                                                    <span className="font-semibold text-muted-foreground">Amount Tendered</span>
                                                    <span className="font-medium text-foreground">{formatCurrency(payment.amountTendered)}</span>
                                                </div>
                                            )}
                                            {payment.amountChange !== null && payment.amountChange !== undefined && (
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-muted-foreground">Change Given</span>
                                                    <span className="font-bold text-emerald-600">{formatCurrency(payment.amountChange)}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {payment.paymentReferenceNumber && (
                                                <div className="flex justify-between items-center pb-2 border-b border-border/30">
                                                    <span className="font-semibold text-muted-foreground">Reference ID</span>
                                                    <span className="font-mono text-xs bg-muted border border-border/40 px-2 py-0.5 rounded text-foreground font-bold">
                                                        {payment.paymentReferenceNumber}
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
                                                            onClick={() => {
                                                                setViewingFileUrl(payment.paymentProofPhoto || null);
                                                                setViewingFileName(`Payment-Proof-${payment.id.slice(0, 8)}`);
                                                            }}
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
                ) : (
                    <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/15 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Receipt className="size-5 text-amber-600 dark:text-amber-400" />
                                <h2 className="text-lg font-bold text-foreground">Payment Information</h2>
                            </div>
                            <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold text-xs uppercase px-2.5 py-0.5 rounded-full"
                            >
                                Unpaid / Pending Payment
                            </Badge>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-xl border border-amber-500/20 bg-card/80 backdrop-blur-xs">
                            <div className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                <CreditCard className="size-6 text-amber-600 dark:text-amber-400 animate-pulse" />
                            </div>
                            <div className="space-y-1 text-center sm:text-left flex-1">
                                <h3 className="font-bold text-base text-foreground">No Payment Recorded Yet</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Payment has not been settled for this order yet. Please present your Queue Ticket at the store counter to complete
                                    payment.
                                </p>
                            </div>
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
                                            <span className="text-xs text-muted-foreground">{format(new Date(history.createdAt), 'hh:mm a')}</span>
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

            {/* File Viewer Modal */}
            <FileViewerDialog
                open={!!viewingFileUrl}
                onOpenChange={(open) => !open && setViewingFileUrl(null)}
                fileUrl={viewingFileUrl}
                fileName={viewingFileName}
                title="Payment Proof Attachment"
            />
        </div>
    );
}
