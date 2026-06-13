import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, TrendingUp, ArrowRight, CreditCard, CheckCircle2, Tag, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { getOrderById, updateOrderStatus, getOrderPayments } from '#/api/orders.api.ts';
import { getDiscountsConfig, applyDiscountToOrder, removeDiscountFromOrder } from '#/api/discounts.api.ts';
import { updateTransactionReceipt } from '#/api/transactions.api.ts';
import { getFileUrl } from '#/utils/helper';
import type { IDiscount } from '../../store-settings/discounts.types';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { TOrderStatus, IOrderItemModifier, IOrderStatusHistory, TOrderStatus as TStatusType, IOrderItem, IOrderPayment } from '../order.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import ProcessPaymentDialog from './process-payment-dialog.tsx';
import VoidOrderDialog from './void-order-dialog.tsx';
import { CopyButton } from '#/components/ui/copy-button.tsx';

interface OrderDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string | null;
}

export default function OrderDetailsDialog({ open, onOpenChange, orderId }: OrderDetailsDialogProps) {
    const queryClient = useQueryClient();

    const [statusChangeValue, setStatusChangeValue] = React.useState<TOrderStatus | ''>('');
    const [statusChangeNotes, setStatusChangeNotes] = React.useState('');
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
    const [isVoidDialogOpen, setIsVoidDialogOpen] = React.useState(false);
    const [selectedDiscountId, setSelectedDiscountId] = React.useState<string>('');
    const [referenceId, setReferenceId] = React.useState<string>('');
    const [referenceName, setReferenceName] = React.useState<string>('');

    // Reset fields when dialog opens/closes
    React.useEffect(() => {
        if (!open) {
            setStatusChangeValue('');
            setStatusChangeNotes('');
            setIsVoidDialogOpen(false);
            setSelectedDiscountId('');
            setReferenceId('');
            setReferenceName('');
        }
    }, [open]);

    // Query: Discounts
    const { data: discounts } = useQuery({
        queryKey: [QUERY_KEY.STORE_SETTINGS.DISCOUNTS_LIST],
        queryFn: getDiscountsConfig,
        enabled: open
    });

    const activeDiscounts = React.useMemo(() => {
        return discounts?.filter((d: IDiscount) => d.isActive) || [];
    }, [discounts]);

    const applyDiscountMutation = useMutation({
        mutationFn: (payload: { discountId: string; referenceId?: string; referenceName?: string }) => {
            if (!orderId) throw new Error('No order selected');
            return applyDiscountToOrder(orderId, payload);
        },
        onSuccess: (res) => {
            toast.success(`Discount Applied`, {
                description: `Successfully applied discount. Saved amount: ₱${res.amount.toFixed(2)}.`
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, orderId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            setSelectedDiscountId('');
            setReferenceId('');
            setReferenceName('');
        },
        onError: (err) => {
            toast.error('Failed to apply discount', {
                description: getErrorMessage(err)
            });
        }
    });

    const removeDiscountMutation = useMutation({
        mutationFn: () => {
            if (!orderId) throw new Error('No order selected');
            return removeDiscountFromOrder(orderId);
        },
        onSuccess: () => {
            toast.success('Discount removed from order successfully.');
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, orderId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
        },
        onError: (err) => {
            toast.error('Failed to remove discount', {
                description: getErrorMessage(err)
            });
        }
    });

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

    // Query: Detailed Inspected Order
    const { data: orderDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, orderId],
        queryFn: () => getOrderById(orderId!),
        enabled: open && !!orderId
    });

    // Query: Payments List for this order
    const { data: payments } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.ORDER_PAYMENTS, orderId],
        queryFn: () => getOrderPayments(orderId!),
        enabled: open && !!orderId
    });

    // Mutation: Update Status
    const updateStatusMutation = useMutation({
        mutationFn: ({ orderIdVal, payload }: { orderIdVal: string; payload: { status: TOrderStatus; notes?: string } }) =>
            updateOrderStatus(orderIdVal, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, updated.id] });
            toast.success(`Order status updated to ${updated.status}`);
            setStatusChangeValue('');
            setStatusChangeNotes('');
        },
        onError: (err) => {
            toast.error('Failed to update order status', { description: getErrorMessage(err) });
        }
    });

    // Mutation: Approve Pending Digital Payment
    const approvePaymentMutation = useMutation({
        mutationFn: (paymentId: string) => updateTransactionReceipt(paymentId, {}),
        onSuccess: () => {
            toast.success('Digital payment approved successfully');
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            if (orderId) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, orderId] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_PAYMENTS, orderId] });
            }
        },
        onError: (err) => {
            toast.error('Failed to approve payment', { description: getErrorMessage(err) });
        }
    });

    const handleUpdateStatusSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderId || !statusChangeValue) return;
        updateStatusMutation.mutate({
            orderIdVal: orderId,
            payload: {
                status: statusChangeValue,
                notes: statusChangeNotes || undefined
            }
        });
    };

    const getStatusBadgeClass = (s: TStatusType) => {
        switch (s) {
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border/60 rounded-2xl">
                <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">Order inspection Details</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        View order line items, custom choice options, discounts, and cashier status audit logs.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0 text-xs">
                    {isDetailsLoading || !orderDetails ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Spinner className="size-6 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-semibold">Loading transaction records...</span>
                        </div>
                    ) : (
                        <>
                            {/* Header details */}
                            <div className="flex flex-wrap gap-4 items-center justify-between border-b pb-3 border-border/40">
                                <div>
                                    <div className="text-xs uppercase font-bold text-muted-foreground">Queue Ticket</div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="text-base font-bold text-foreground">{orderDetails.queueNumber}</div>
                                        <CopyButton
                                            value={orderDetails.queueNumber}
                                            description={`Queue number #${orderDetails.queueNumber} copied`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase font-bold text-muted-foreground">Placed On</div>
                                    <div className="font-semibold text-foreground">
                                        {format(new Date(orderDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase font-bold text-muted-foreground">Order Status</div>
                                    <Badge
                                        variant="outline"
                                        className={`font-bold capitalize py-0.5 px-2.5 mt-0.5 ${getStatusBadgeClass(orderDetails.status)}`}
                                    >
                                        {orderDetails.status.toLowerCase()}
                                    </Badge>
                                </div>
                            </div>

                            {/* Master Order Notes */}
                            {orderDetails.notes && (
                                <div className="border border-amber-500/20 bg-amber-500/5 p-3.5 rounded-xl space-y-1">
                                    <h4 className="font-bold text-amber-800 uppercase text-[10px] tracking-wider">
                                        Order Instructions & Delivery Details
                                    </h4>
                                    <p className="text-amber-900 leading-relaxed font-mono whitespace-pre-wrap text-[11px]">{orderDetails.notes}</p>
                                </div>
                            )}

                            {/* Ordered Items list */}
                            <div className="space-y-2.5">
                                <h4 className="font-bold text-foreground/70 uppercase text-xs ">Ordered Items</h4>
                                <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/20 bg-background/50">
                                    {orderDetails.items?.map((item: IOrderItem) => (
                                        <div key={item.id} className="p-3.5 flex items-start justify-between gap-4">
                                            <div className="min-w-0 space-y-1">
                                                <div className="font-bold text-foreground/80 leading-snug">
                                                    {item.variant.product.name}
                                                    <span className="text-muted-foreground font-medium ml-1.5">x{item.quantity}</span>
                                                </div>

                                                {/* Attributes (e.g. Size: Large) */}
                                                <span className="text-xs text-muted-foreground font-medium block">
                                                    Base Variant Price: ₱{item.unitPrice.toFixed(2)}
                                                </span>

                                                {/* Modifiers checklist */}
                                                {item.modifiers.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 pt-1">
                                                        {item.modifiers.map((mod: IOrderItemModifier) => (
                                                            <Badge
                                                                key={mod.id}
                                                                variant="outline"
                                                                className="text-xs font-semibold bg-muted/20 py-0 px-2 text-muted-foreground border-border/50"
                                                            >
                                                                + {mod.modifierOption.name} (+₱{mod.price.toFixed(2)})
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Item Notes */}
                                                {item.notes && (
                                                    <span className="text-xs text-amber-600 font-medium italic block pt-0.5">
                                                        Note: "{item.notes}"
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-bold text-foreground/90 shrink-0">₱{item.totalPrice.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Financial computations and Change status form */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                                {/* Amounts Summary */}
                                <div className="space-y-4">
                                    <div className="border border-border/50 p-4 rounded-xl bg-muted/10 space-y-2.5 text-xs">
                                        <h4 className="font-bold text-foreground/70 border-b border-border/40 pb-1.5 uppercase text-xs ">
                                            Computations Breakdown
                                        </h4>
                                        <div className="space-y-2 font-medium">
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>Subtotal Amount:</span>
                                                <span className="text-foreground/80">₱{orderDetails.subtotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>VAT (12% Included):</span>
                                                <span className="text-foreground/80">₱{orderDetails.taxAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex flex-col gap-1 text-muted-foreground">
                                                <div className="flex justify-between">
                                                    <span>Discounts:</span>
                                                    <span className="text-foreground/80">-₱{orderDetails.discountAmount.toFixed(2)}</span>
                                                </div>
                                                {orderDetails.discounts && orderDetails.discounts.length > 0 && (
                                                    <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5 bg-background/50 p-2 rounded-lg border border-border/40">
                                                        {orderDetails.discounts.map((od: any) => (
                                                            <div key={od.id} className="flex flex-col">
                                                                <span className="font-bold text-foreground/80">
                                                                    {od.discount?.name || 'Discount'}
                                                                </span>
                                                                {od.referenceId && (
                                                                    <span className="text-xs font-mono">Card ID: {od.referenceId}</span>
                                                                )}
                                                                {od.referenceName && <span className="text-xs">Holder: {od.referenceName}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between font-bold text-sm pt-2 border-t border-dashed border-border/40">
                                                <span className="text-foreground">Net Due Total:</span>
                                                <span className="text-primary">₱{orderDetails.netTotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Settlement Details Card */}
                                    {payments && payments.length > 0 && (
                                        <div className="border border-emerald-500/20 p-4 rounded-xl bg-emerald-500/5 space-y-2.5 text-xs">
                                            <h4 className="font-bold text-emerald-800 border-b border-emerald-500/20 pb-1.5 uppercase text-xs  flex items-center gap-1.5">
                                                <CheckCircle2 className="size-3.5 text-emerald-600" />
                                                Payment Settlement Details
                                            </h4>
                                            <div className="space-y-2 font-medium text-emerald-800">
                                                {payments.map((payment: IOrderPayment) => (
                                                    <div
                                                        key={payment.id}
                                                        className="space-y-1.5 border-b border-emerald-500/10 pb-1.5 last:border-0 last:pb-0"
                                                    >
                                                        <div className="flex justify-between">
                                                            <span>Payment Status:</span>
                                                            <Badge
                                                                className={`text-[10px] uppercase font-bold py-0 px-1.5 ${
                                                                    payment.paymentStatus === 'PAID'
                                                                        ? 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20'
                                                                        : payment.paymentStatus === 'PENDING'
                                                                          ? 'bg-amber-600/10 text-amber-700 border-amber-600/20'
                                                                          : 'bg-rose-600/10 text-rose-700 border-rose-600/20'
                                                                }`}
                                                            >
                                                                {payment.paymentStatus}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Payment Method:</span>
                                                            <span className="font-bold text-emerald-900">{payment.paymentMethod}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Amount Settled:</span>
                                                            <span className="font-bold text-emerald-900">₱{payment.amount.toFixed(2)}</span>
                                                        </div>
                                                        {payment.paymentMethod === 'CASH' ? (
                                                            <>
                                                                <div className="flex justify-between text-emerald-700">
                                                                    <span>Tendered Cash:</span>
                                                                    <span>₱{(payment.amountTendered || 0).toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex justify-between text-emerald-700">
                                                                    <span>Change Given:</span>
                                                                    <span className="font-semibold text-emerald-900">
                                                                        ₱{(payment.amountChange || 0).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {payment.gcashReferenceNumber && (
                                                                    <div className="flex justify-between text-emerald-700">
                                                                        <span>Reference ID:</span>
                                                                        <span className="font-mono text-xs font-semibold bg-emerald-500/10 px-1 py-0.5 rounded text-emerald-900">
                                                                            {payment.gcashReferenceNumber}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {payment.paymentProofPhoto && (
                                                                    <div className="mt-2 space-y-1">
                                                                        <span className="text-[10px] text-emerald-700 block uppercase font-bold">
                                                                            Screenshot Receipt
                                                                        </span>
                                                                        <div className="border border-emerald-500/20 rounded-lg overflow-hidden bg-background max-h-[140px] flex items-center justify-center relative">
                                                                            <img
                                                                                src={getFileUrl(payment.paymentProofPhoto)}
                                                                                alt="Proof of Payment"
                                                                                className="w-full max-h-[130px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                                                                onClick={() =>
                                                                                    window.open(getFileUrl(payment.paymentProofPhoto), '_blank')
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                        <div className="text-xs text-emerald-600 font-medium pt-1 text-right">
                                                            Paid on {format(new Date(payment.createdAt), 'MMM dd, yyyy - hh:mm a')}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action forms */}
                                <div className="border border-border/50 p-4 rounded-xl bg-card space-y-3">
                                    {orderDetails.status === 'CANCELLED' ? (
                                        <div className="border border-rose-500/20 p-4 rounded-xl bg-rose-500/5 space-y-2 text-xs">
                                            <h4 className="font-bold text-rose-800 border-b border-rose-500/20 pb-1.5 uppercase text-xs  flex items-center gap-1.5">
                                                <AlertTriangle className="size-3.5 text-rose-600" />
                                                Order Void details
                                            </h4>
                                            {orderDetails.voidLogs && orderDetails.voidLogs.length > 0 ? (
                                                (() => {
                                                    const voidLog = orderDetails.voidLogs[0];
                                                    return (
                                                        <div className="space-y-1.5 text-rose-900 font-medium">
                                                            <div className="flex justify-between">
                                                                <span>Authorized By:</span>
                                                                <span className="font-bold">
                                                                    {voidLog.voidedBy.firstName} {voidLog.voidedBy.lastName} (@
                                                                    {voidLog.voidedBy.username})
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Date & Time:</span>
                                                                <span>{format(new Date(voidLog.createdAt), 'MMM dd, yyyy - hh:mm a')}</span>
                                                            </div>
                                                            <div className="mt-1 pt-1.5 border-t border-rose-500/10">
                                                                <span className="text-xs text-rose-700 block font-bold">Stated Reason:</span>
                                                                <span className="italic">"{voidLog.reason}"</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <p className="text-rose-700 font-medium italic">
                                                    No void audit details recorded for this cancellation.
                                                </p>
                                            )}
                                        </div>
                                    ) : orderDetails.status === 'COMPLETED' ? (
                                        <div className="border border-emerald-500/20 p-4 rounded-xl bg-emerald-500/5 space-y-2 text-xs">
                                            <h4 className="font-bold text-emerald-800 border-b border-emerald-500/20 pb-1.5 uppercase text-xs  flex items-center gap-1.5">
                                                <CheckCircle2 className="size-3.5 text-emerald-600" />
                                                Fulfillment Complete
                                            </h4>
                                            <p className="text-emerald-700 leading-normal">
                                                This order has been completed and fully served. No further actions are required.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {orderDetails.status === 'PENDING' &&
                                            payments &&
                                            payments.some((p: IOrderPayment) => p.paymentStatus === 'PENDING') ? (
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-bold text-foreground/70 border-b border-border/40 pb-1.5 uppercase text-xs flex items-center gap-1.5">
                                                            <CreditCard className="size-3.5 text-muted-foreground" />
                                                            Pending Digital Payment
                                                        </h4>
                                                        <p className="text-xs text-muted-foreground leading-normal mt-2">
                                                            This order has a pending digital payment. Please review the reference ID and screenshot
                                                            receipt details on the left, then click Approve to confirm the payment and queue the order
                                                            for preparation.
                                                        </p>
                                                    </div>

                                                    <Button
                                                        type="button"
                                                        disabled={approvePaymentMutation.isPending}
                                                        onClick={() => {
                                                            const pendingPayment = payments.find((p: IOrderPayment) => p.paymentStatus === 'PENDING');
                                                            if (pendingPayment) {
                                                                approvePaymentMutation.mutate(pendingPayment.id);
                                                            }
                                                        }}
                                                        className="w-full h-9.5 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                                                    >
                                                        {approvePaymentMutation.isPending ? (
                                                            <>
                                                                <Spinner className="size-3.5 animate-spin mr-1.5" />
                                                                Approving Payment...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="size-4 mr-1.5" />
                                                                Approve Digital Payment
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            ) : orderDetails.status === 'PENDING' && (!payments || payments.length === 0) ? (
                                                <div className="space-y-4">
                                                    {/* Discounts section */}
                                                    <div className="space-y-3 pb-3 border-b border-dashed border-border/40">
                                                        <h4 className="font-bold text-foreground/70 border-b border-border/40 pb-1.5 uppercase text-xs  flex items-center gap-1.5">
                                                            <Tag className="size-3.5 text-muted-foreground" />
                                                            Order Discounts
                                                        </h4>

                                                        {orderDetails.discounts && orderDetails.discounts.length > 0 ? (
                                                            <div className="space-y-3">
                                                                <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 text-xs flex justify-between items-center">
                                                                    <div>
                                                                        <span className="font-bold text-foreground block">
                                                                            {orderDetails.discounts[0].discount?.name}
                                                                        </span>
                                                                        <span className="text-muted-foreground">
                                                                            Saved ₱{orderDetails.discountAmount.toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                    <RequirePermission module="Point of Sale (POS)" action="delete">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            disabled={removeDiscountMutation.isPending}
                                                                            onClick={() => removeDiscountMutation.mutate()}
                                                                            className="size-7 text-destructive hover:bg-destructive/15 rounded-lg"
                                                                            title="Remove Discount"
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                        </Button>
                                                                    </RequirePermission>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <RequirePermission module="Point of Sale (POS)" action="create">
                                                                <div className="space-y-3">
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs font-semibold text-foreground/80">
                                                                            Select Discount
                                                                        </label>
                                                                        <Select value={selectedDiscountId} onValueChange={setSelectedDiscountId}>
                                                                            <SelectTrigger className="h-8.5 text-xs bg-background/50">
                                                                                <SelectValue placeholder="Choose a discount..." />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {activeDiscounts.map((d: IDiscount) => (
                                                                                    <SelectItem key={d.id} value={d.id} className="text-xs">
                                                                                        {d.name}{' '}
                                                                                        {d.type === 'PERCENTAGE' ? `(${d.value}%)` : `(₱${d.value})`}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>

                                                                    {isSelectedBIR && (
                                                                        <div className="space-y-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                                                                            <div className="text-xs text-amber-700 font-semibold leading-normal">
                                                                                BIR compliance: Enter card details to apply senior/PWD discount.
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <div className="space-y-1">
                                                                                    <label className="text-xs font-bold text-foreground/75 block">
                                                                                        Card ID Number
                                                                                    </label>
                                                                                    <Input
                                                                                        placeholder="e.g. SC-12345"
                                                                                        value={referenceId}
                                                                                        onChange={(e) => setReferenceId(e.target.value)}
                                                                                        className="h-7.5 text-xs bg-background/50 font-mono"
                                                                                    />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <label className="text-xs font-bold text-foreground/75 block">
                                                                                        Cardholder Name
                                                                                    </label>
                                                                                    <Input
                                                                                        placeholder="e.g. Maria Santos"
                                                                                        value={referenceName}
                                                                                        onChange={(e) => setReferenceName(e.target.value)}
                                                                                        className="h-7.5 text-xs bg-background/50"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <Button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            applyDiscountMutation.mutate({
                                                                                discountId: selectedDiscountId,
                                                                                referenceId: isSelectedBIR ? referenceId : undefined,
                                                                                referenceName: isSelectedBIR ? referenceName : undefined
                                                                            });
                                                                        }}
                                                                        disabled={
                                                                            !selectedDiscountId ||
                                                                            (isSelectedBIR && (!referenceId.trim() || !referenceName.trim())) ||
                                                                            applyDiscountMutation.isPending
                                                                        }
                                                                        className="w-full h-8 gap-1.5 text-xs font-semibold shadow-3xs"
                                                                    >
                                                                        {applyDiscountMutation.isPending ? (
                                                                            <Spinner className="size-3.5 animate-spin" />
                                                                        ) : (
                                                                            'Apply Discount'
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </RequirePermission>
                                                        )}
                                                    </div>

                                                    {/* Payment Action block */}
                                                    <div className="space-y-3">
                                                        <div>
                                                            <h4 className="font-bold text-foreground/70 border-b border-border/40 pb-1.5 uppercase text-xs  flex items-center gap-1.5">
                                                                <CreditCard className="size-3.5 text-muted-foreground" />
                                                                Awaiting Payment Collection
                                                            </h4>
                                                            <p className="text-xs text-muted-foreground leading-normal mt-2">
                                                                This order has not been paid yet. Process the payment to transition the order to the
                                                                preparing queue.
                                                            </p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            onClick={() => setIsPaymentDialogOpen(true)}
                                                            className="w-full h-9 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-3xs hover:shadow-xs transition-shadow"
                                                        >
                                                            <CreditCard className="size-4" />
                                                            Collect Payment
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <h4 className="font-bold text-foreground/70 border-b border-border/40 pb-1.5 uppercase text-xs  flex items-center gap-1.5">
                                                        <RefreshCw className="size-3.5 text-muted-foreground animate-pulse-slow" />
                                                        Update Preparation State
                                                    </h4>
                                                    <RequirePermission module="Orders Management" action="update">
                                                        <form onSubmit={handleUpdateStatusSubmit} className="space-y-3 text-xs">
                                                            <div className="space-y-1">
                                                                <label className="font-semibold text-foreground/80">Fulfillment Status</label>
                                                                <Select
                                                                    value={statusChangeValue}
                                                                    onValueChange={(val: TOrderStatus) => setStatusChangeValue(val)}
                                                                >
                                                                    <SelectTrigger className="h-8.5 text-xs bg-background/50">
                                                                        <SelectValue placeholder="Select target status..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
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

                                                            <div className="space-y-1">
                                                                <label className="font-semibold text-foreground/80">Audit Log Notes</label>
                                                                <Input
                                                                    placeholder="Add reason, buzzer IDs, or pick-up logs..."
                                                                    value={statusChangeNotes}
                                                                    onChange={(e) => setStatusChangeNotes(e.target.value)}
                                                                    className="h-8.5 text-xs bg-background/50"
                                                                />
                                                            </div>

                                                            <Button
                                                                type="submit"
                                                                disabled={!statusChangeValue || updateStatusMutation.isPending}
                                                                className="w-full h-8.5 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-3xs"
                                                            >
                                                                {updateStatusMutation.isPending ? (
                                                                    <>
                                                                        <Spinner className="size-3.5 animate-spin" />
                                                                        Saving Change...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ArrowRight className="size-3.5" />
                                                                        Commit Status Change
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </form>
                                                    </RequirePermission>
                                                </div>
                                            )}

                                            {/* Loss Prevention Void override action */}
                                            <div className="pt-3 border-t border-dashed border-border/40">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setIsVoidDialogOpen(true)}
                                                    className="w-full h-8.5 gap-1.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 font-semibold"
                                                >
                                                    <AlertTriangle className="size-3.5 shrink-0" />
                                                    Void Order Session
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Order Status History Audit Logs */}
                            {orderDetails.statusHistory && orderDetails.statusHistory.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <h3 className="text-xs font-bold text-foreground/60 uppercase  flex items-center gap-1.5">
                                        <TrendingUp className="size-4 text-muted-foreground" />
                                        Audit Status Log History
                                    </h3>
                                    <div className="border border-border/50 rounded-xl overflow-hidden divide-y divide-border/20 text-xs bg-muted/5">
                                        {orderDetails.statusHistory.map((history: IOrderStatusHistory) => (
                                            <div key={history.id} className="p-3 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                                                <Badge
                                                    variant="outline"
                                                    className={`font-bold capitalize scale-90 py-0 px-2 shrink-0 ${getStatusBadgeClass(history.status)}`}
                                                >
                                                    {history.status.toLowerCase()}
                                                </Badge>
                                                <div className="flex-1 space-y-0.5">
                                                    <p className="font-semibold text-foreground/80 leading-normal">
                                                        {history.notes || 'Status updated.'}
                                                    </p>
                                                    <div className="text-muted-foreground flex items-center gap-1.5 font-medium scale-95 origin-left">
                                                        <span>
                                                            By:{' '}
                                                            {history.changedBy
                                                                ? `${history.changedBy.firstName} ${history.changedBy.lastName} (@${history.changedBy.username})`
                                                                : `System ID: ${history.changedById}`}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{format(new Date(history.createdAt), 'MMM dd, yyyy - hh:mm a')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0">
                    <Button type="button" onClick={() => onOpenChange(false)} className="h-9 shadow-3xs">
                        Close Inspection
                    </Button>
                </DialogFooter>
            </DialogContent>

            <ProcessPaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} order={orderDetails || null} />
            <VoidOrderDialog
                open={isVoidDialogOpen}
                onOpenChange={setIsVoidDialogOpen}
                orderId={orderDetails?.id || null}
                orderNumber={orderDetails?.queueNumber || null}
                onSuccess={() => onOpenChange(false)}
            />
        </Dialog>
    );
}
