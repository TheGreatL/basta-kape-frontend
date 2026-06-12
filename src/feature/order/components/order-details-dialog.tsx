import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, TrendingUp, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { getOrderById, updateOrderStatus } from '#/api/orders.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { TOrderStatus, IOrderItemModifier, IOrderStatusHistory, TOrderStatus as TStatusType, IOrderItem } from '../order.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';

interface OrderDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string | null;
}

export default function OrderDetailsDialog({ open, onOpenChange, orderId }: OrderDetailsDialogProps) {
    const queryClient = useQueryClient();

    const [statusChangeValue, setStatusChangeValue] = React.useState<TOrderStatus | ''>('');
    const [statusChangeNotes, setStatusChangeNotes] = React.useState('');

    // Reset status fields when dialog opens/closes
    React.useEffect(() => {
        if (!open) {
            setStatusChangeValue('');
            setStatusChangeNotes('');
        }
    }, [open]);

    // Query: Detailed Inspected Order
    const { data: orderDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, orderId],
        queryFn: () => getOrderById(orderId!),
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
                    <DialogTitle className="flex items-center gap-2 text-xl font-black text-foreground">Order inspection Details</DialogTitle>
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
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Queue Ticket</div>
                                    <div className="text-base font-black text-foreground">{orderDetails.queueNumber}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Placed On</div>
                                    <div className="font-semibold text-foreground">
                                        {format(new Date(orderDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Order Status</div>
                                    <Badge
                                        variant="outline"
                                        className={`font-bold capitalize py-0.5 px-2.5 mt-0.5 ${getStatusBadgeClass(orderDetails.status)}`}
                                    >
                                        {orderDetails.status.toLowerCase()}
                                    </Badge>
                                </div>
                            </div>

                            {/* Ordered Items list */}
                            <div className="space-y-2.5">
                                <h4 className="font-bold text-foreground/70 uppercase text-[10px] tracking-wider">Ordered Items</h4>
                                <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/20 bg-background/50">
                                    {orderDetails.items?.map((item: IOrderItem) => (
                                        <div key={item.id} className="p-3.5 flex items-start justify-between gap-4">
                                            <div className="min-w-0 space-y-1">
                                                <div className="font-bold text-foreground/80 leading-snug">
                                                    {item.variant.product.name}
                                                    <span className="text-muted-foreground font-medium ml-1.5">x{item.quantity}</span>
                                                </div>

                                                {/* Attributes (e.g. Size: Large) */}
                                                <span className="text-[10px] text-muted-foreground font-medium block">
                                                    Base Variant Price: ₱{item.unitPrice.toFixed(2)}
                                                </span>

                                                {/* Modifiers checklist */}
                                                {item.modifiers.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 pt-1">
                                                        {item.modifiers.map((mod: IOrderItemModifier) => (
                                                            <Badge
                                                                key={mod.id}
                                                                variant="outline"
                                                                className="text-[9px] font-semibold bg-muted/20 py-0 px-2 text-muted-foreground border-border/50"
                                                            >
                                                                + {mod.modifierOption.name} (+₱{mod.price.toFixed(2)})
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Item Notes */}
                                                {item.notes && (
                                                    <span className="text-[10px] text-amber-600 font-medium italic block pt-0.5">
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
                                <div className="border border-border/50 p-4 rounded-xl bg-muted/10 space-y-2.5 text-xs">
                                    <h4 className="font-bold text-foreground/70 border-b border-border/40 pb-1.5 uppercase text-[10px] tracking-wider">
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
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Discounts:</span>
                                            <span className="text-foreground/80">-₱{orderDetails.discountAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-sm pt-2 border-t border-dashed border-border/40">
                                            <span className="text-foreground">Net Due Total:</span>
                                            <span className="text-primary">₱{orderDetails.netTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action forms */}
                                <div className="border border-border/50 p-4 rounded-xl bg-card space-y-3">
                                    <h4 className="font-bold text-foreground/70 border-b border-border/40 pb-1.5 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                        <RefreshCw className="size-3.5 text-muted-foreground animate-pulse-slow" />
                                        Update Preparation State
                                    </h4>
                                    <RequirePermission module="Orders Management" action="update">
                                        <form onSubmit={handleUpdateStatusSubmit} className="space-y-3 text-xs">
                                            <div className="space-y-1">
                                                <label className="font-semibold text-foreground/80">Fulfillment Status</label>
                                                <Select value={statusChangeValue} onValueChange={(val: TOrderStatus) => setStatusChangeValue(val)}>
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
                            </div>

                            {/* Order Status History Audit Logs */}
                            {orderDetails.statusHistory && orderDetails.statusHistory.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                                        <TrendingUp className="size-4 text-muted-foreground" />
                                        Audit Status Log History
                                    </h3>
                                    <div className="border border-border/50 rounded-xl overflow-hidden divide-y divide-border/20 text-2xs bg-muted/5">
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
        </Dialog>
    );
}
