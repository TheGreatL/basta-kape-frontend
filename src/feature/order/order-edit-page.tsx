import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
    RefreshCw,
    TrendingUp,
    ArrowRight,
    CreditCard,
    CheckCircle2,
    Tag,
    Trash2,
    AlertTriangle,
    ArrowLeft,
    Printer,
    FileText,
    Download,
    Volume2,
    Clock,
    XCircle,
    ChefHat
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '#/lib/utils.ts';

import { Route } from '#/routes/admin/orders/$id/edit.tsx';
import { getOrderById, updateOrderStatus, getOrderPayments } from '#/api/orders.api.ts';
import { getFileUrl, getFrontendReference } from '#/utils/helper';
import { getDiscountsConfig, applyDiscountToOrder, removeDiscountFromOrder } from '#/api/discounts.api.ts';
import { updateTransactionReceipt } from '#/api/transactions.api.ts';
import type { IDiscount } from '../store-settings/discounts.types';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { TOrderStatus, IOrderItemModifier, IOrderStatusHistory, TOrderStatus as TStatusType, IOrderItem, IOrderPayment } from './order.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import ProcessPaymentDialog from './components/process-payment-dialog.tsx';
import VoidOrderDialog from './components/void-order-dialog.tsx';
import { CopyButton } from '#/components/ui/copy-button.tsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu.tsx';
import { printReceiptHtml, openReceiptPdf, downloadReceiptPdf } from '#/utils/receipt.ts';

const discountFormSchema = z.object({
    discountId: z.string().min(1, 'Please select a discount'),
    referenceId: z.string().optional(),
    referenceName: z.string().optional()
});

const statusFormSchema = z.object({
    status: z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']).optional(),
    notes: z.string().optional()
});

export default function OrderEditPage() {
    const { id: orderId } = Route.useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
    const [isVoidDialogOpen, setIsVoidDialogOpen] = React.useState(false);

    const discountForm = useForm<z.infer<typeof discountFormSchema>>({
        resolver: zodResolver(discountFormSchema),
        defaultValues: {
            discountId: '',
            referenceId: '',
            referenceName: ''
        }
    });

    const statusForm = useForm<z.infer<typeof statusFormSchema>>({
        resolver: zodResolver(statusFormSchema),
        defaultValues: {
            status: undefined,
            notes: ''
        }
    });

    const selectedDiscountId = discountForm.watch('discountId');
    const statusChangeValue = statusForm.watch('status');

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

    // Query: Discounts
    const { data: discounts } = useQuery({
        queryKey: [QUERY_KEY.STORE_SETTINGS.DISCOUNTS_LIST],
        queryFn: getDiscountsConfig
    });

    const activeDiscounts = React.useMemo(() => {
        return discounts?.filter((d: IDiscount) => d.isActive) || [];
    }, [discounts]);

    const applyDiscountMutation = useMutation({
        mutationFn: (payload: { discountId: string; referenceId?: string; referenceName?: string }) => {
            return applyDiscountToOrder(orderId, payload);
        },
        onSuccess: (res) => {
            toast.success(`Discount Applied`, {
                description: `Successfully applied discount. Saved amount: ₱${res.amount.toFixed(2)}.`
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, orderId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            discountForm.reset({
                discountId: '',
                referenceId: '',
                referenceName: ''
            });
        },
        onError: (err) => {
            toast.error('Failed to apply discount', {
                description: getErrorMessage(err)
            });
        }
    });

    const removeDiscountMutation = useMutation({
        mutationFn: () => {
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
        queryFn: () => getOrderById(orderId),
        enabled: !!orderId
    });

    // Query: Payments List for this order
    const { data: payments } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.ORDER_PAYMENTS, orderId],
        queryFn: () => getOrderPayments(orderId),
        enabled: !!orderId
    });

    // Mutation: Update Status
    const updateStatusMutation = useMutation({
        mutationFn: ({ orderIdVal, payload }: { orderIdVal: string; payload: { status: TOrderStatus; notes?: string } }) =>
            updateOrderStatus(orderIdVal, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, updated.id] });
            toast.success(`Order status updated to ${updated.status}`);
            statusForm.reset({
                status: undefined,
                notes: ''
            });
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
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, orderId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_PAYMENTS, orderId] });
        },
        onError: (err) => {
            toast.error('Failed to approve payment', { description: getErrorMessage(err) });
        }
    });

    const onApplyDiscountSubmit = (values: z.infer<typeof discountFormSchema>) => {
        if (isSelectedBIR && (!values.referenceId?.trim() || !values.referenceName?.trim())) {
            toast.error('BIR compliance: Card ID and Holder Name are required.');
            return;
        }
        applyDiscountMutation.mutate({
            discountId: values.discountId,
            referenceId: isSelectedBIR ? values.referenceId : undefined,
            referenceName: isSelectedBIR ? values.referenceName : undefined
        });
    };

    const onUpdateStatusSubmit = (values: z.infer<typeof statusFormSchema>) => {
        if (!orderId || !values.status) return;
        updateStatusMutation.mutate({
            orderIdVal: orderId,
            payload: {
                status: values.status,
                notes: values.notes || undefined
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

    const getStatusTimelineConfig = (s: string) => {
        switch (s) {
            case 'PENDING':
                return {
                    icon: <Clock className="size-3 h-3 shrink-0" />,
                    colorClass: 'text-amber-600 dark:text-amber-450',
                    borderClass: 'border-amber-200 dark:border-amber-900/50',
                    bgClass: 'bg-amber-50 dark:bg-amber-950/40'
                };
            case 'PREPARING':
                return {
                    icon: <ChefHat className="size-3 h-3 shrink-0" />,
                    colorClass: 'text-blue-600 dark:text-blue-450',
                    borderClass: 'border-blue-200 dark:border-blue-900/50',
                    bgClass: 'bg-blue-50 dark:bg-blue-950/40'
                };
            case 'READY':
                return {
                    icon: <Volume2 className="size-3 h-3 shrink-0" />,
                    colorClass: 'text-teal-600 dark:text-teal-450',
                    borderClass: 'border-teal-200 dark:border-teal-900/50',
                    bgClass: 'bg-teal-50 dark:bg-teal-950/40'
                };
            case 'COMPLETED':
                return {
                    icon: <CheckCircle2 className="size-3 h-3 shrink-0" />,
                    colorClass: 'text-emerald-600 dark:text-emerald-450',
                    borderClass: 'border-emerald-200 dark:border-emerald-900/50',
                    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40'
                };
            case 'CANCELLED':
                return {
                    icon: <XCircle className="size-3 h-3 shrink-0" />,
                    colorClass: 'text-rose-600 dark:text-rose-450',
                    borderClass: 'border-rose-200 dark:border-rose-900/50',
                    bgClass: 'bg-rose-50 dark:bg-rose-950/40'
                };
            default:
                return {
                    icon: <Clock className="size-3 h-3 shrink-0" />,
                    colorClass: 'text-slate-600 dark:text-slate-400',
                    borderClass: 'border-slate-200 dark:border-slate-800/40',
                    bgClass: 'bg-slate-50 dark:bg-slate-950/40'
                };
        }
    };

    if (isDetailsLoading || !orderDetails) {
        return (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Spinner className="size-7 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground font-semibold">Loading transaction records...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 ">
            {/* Header & Breadcrumbs */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b pb-4 border-border/40">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                        <span className="cursor-pointer hover:text-foreground transition-colors" onClick={handleBack}>
                            Orders
                        </span>
                        <span>/</span>
                        <span className="text-foreground">Order Details</span>
                    </div>
                    <div className="flex items-center gap-2.5 pt-1">
                        <button
                            onClick={handleBack}
                            className="p-1.5 rounded-lg border border-border/60 hover:bg-muted transition-colors shrink-0"
                            title="Back to Orders Log"
                        >
                            <ArrowLeft className="size-4 text-muted-foreground hover:text-foreground" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground leading-none flex items-center gap-2">
                                Order Inspection Details
                                <Badge variant="outline" className={`font-bold capitalize py-0.5 px-2.5 ${getStatusBadgeClass(orderDetails.status)}`}>
                                    {orderDetails.status.toLowerCase()}
                                </Badge>
                            </h1>
                            <p className="text-xs text-muted-foreground pt-1">
                                View order line items, custom choice options, discounts, and cashier status audit logs.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-2 md:mt-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-9 gap-1.5 font-bold shadow-xs text-xs">
                                <Printer className="size-4 shrink-0" />
                                Print / View Receipt
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="rounded-xl font-medium" align="end">
                            <DropdownMenuItem onClick={() => printReceiptHtml(orderDetails.id)} className="text-xs gap-2 font-semibold">
                                <Printer className="size-3.5 text-muted-foreground" />
                                Print Thermal (HTML)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openReceiptPdf(orderDetails.id)} className="text-xs gap-2 font-semibold">
                                <FileText className="size-3.5 text-muted-foreground" />
                                Open PDF Receipt
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => downloadReceiptPdf(orderDetails.id, orderDetails.queueNumber)}
                                className="text-xs gap-2 font-semibold"
                            >
                                <Download className="size-3.5 text-muted-foreground" />
                                Download PDF Receipt
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Content Desk Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-xs">
                {/* Left & Middle Column: Ticket info & computs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Ticket Header & Items Log */}
                    <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm space-y-4">
                        <div className="flex flex-wrap gap-4 items-center justify-between border-b pb-3.5 border-border/30">
                            <div>
                                <div className="text-xs uppercase font-bold  text-muted-foreground">Queue Ticket Number</div>
                                <div className="flex items-center gap-1.5">
                                    <div className="text-lg font-bold text-foreground">{orderDetails.queueNumber}</div>
                                    <CopyButton value={orderDetails.queueNumber} description={`Queue number #${orderDetails.queueNumber} copied`} />
                                </div>
                            </div>
                            <div>
                                <div className="text-xs uppercase font-bold  text-muted-foreground">Reference No.</div>
                                <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm pt-0.5">
                                    <span className="font-mono">
                                        {orderDetails.referenceNumber || getFrontendReference(orderDetails.createdAt, orderDetails.queueNumber)}
                                    </span>
                                    <CopyButton
                                        value={orderDetails.referenceNumber || getFrontendReference(orderDetails.createdAt, orderDetails.queueNumber)}
                                        description="Reference number copied"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="text-xs uppercase font-bold  text-muted-foreground">Receipt ID</div>
                                <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm pt-0.5">
                                    <span className="font-mono">{orderDetails.id.slice(0, 8).toUpperCase()}</span>
                                    <CopyButton value={orderDetails.id.slice(0, 8).toUpperCase()} description="Receipt ID copied" />
                                </div>
                            </div>
                            {orderDetails.buzzerId && (
                                <div>
                                    <div className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1">
                                        <Volume2 className="size-3.5 text-amber-500 animate-pulse" /> Pager / Buzzer
                                    </div>
                                    <div className="font-bold text-amber-600 dark:text-amber-400 text-sm pt-0.5">
                                        Device ID: #{orderDetails.buzzerId}
                                    </div>
                                </div>
                            )}
                            <div>
                                <div className="text-xs uppercase font-bold  text-muted-foreground">Placed On</div>
                                <div className="font-semibold text-foreground text-sm pt-0.5">
                                    {format(new Date(orderDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs uppercase font-bold  text-muted-foreground">Customer</div>
                                <div className="font-semibold text-foreground text-sm pt-0.5">{orderDetails.customerName || 'Walk-in Customer'}</div>
                            </div>
                        </div>

                        {/* Master Order Notes */}
                        {orderDetails.notes && (
                            <div className="border border-amber-500/25 bg-amber-500/5 p-4 rounded-xl space-y-1">
                                <h4 className="font-bold text-amber-800 uppercase text-xs ">Order Instructions & Delivery Details</h4>
                                <p className="text-amber-900 leading-relaxed font-mono whitespace-pre-wrap text-2xs">{orderDetails.notes}</p>
                            </div>
                        )}

                        {/* Ordered Items list */}
                        <div className="space-y-3">
                            <h4 className="font-bold text-foreground/75 uppercase text-2xs ">Ordered Items</h4>
                            <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/20 bg-background/30">
                                {orderDetails.items?.map((item: IOrderItem) => (
                                    <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                                        <div className="min-w-0 space-y-1">
                                            <div className="font-bold text-foreground/90 leading-snug text-sm">
                                                {item.variant.product.name}
                                                <span className="text-muted-foreground font-semibold ml-2">x{item.quantity}</span>
                                            </div>

                                            <span className="text-2xs text-muted-foreground font-medium block">
                                                Base Variant Price: ₱{item.unitPrice.toFixed(2)}
                                            </span>

                                            {/* Modifiers badges */}
                                            {item.modifiers.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-1.5">
                                                    {item.modifiers.map((mod: IOrderItemModifier) => (
                                                        <Badge
                                                            key={mod.id}
                                                            variant="outline"
                                                            className="text-xs font-semibold bg-muted/20 py-0.5 px-2 text-muted-foreground border-border/50"
                                                        >
                                                            + {mod.modifierOption.name} (+₱{mod.price.toFixed(2)})
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Item Notes */}
                                            {item.notes && (
                                                <span className="text-2xs text-amber-600 font-semibold italic block pt-1">Note: "{item.notes}"</span>
                                            )}
                                        </div>
                                        <span className="font-bold text-foreground/90 text-sm shrink-0">₱{item.totalPrice.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Financial Calculations & Summary details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Amounts Summary */}
                        <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm space-y-3.5">
                            <h4 className="font-bold text-foreground/75 border-b border-border/30 pb-2 uppercase text-2xs ">Computation Breakdown</h4>
                            <div className="space-y-2.5 font-medium text-xs">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Subtotal Amount:</span>
                                    <span className="text-foreground/80 font-semibold">₱{orderDetails.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>VAT (12% Included):</span>
                                    <span className="text-foreground/80 font-semibold">₱{orderDetails.taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col gap-1.5 text-muted-foreground border-b border-dashed border-border/20 pb-2">
                                    <div className="flex justify-between">
                                        <span>Applied Discounts:</span>
                                        <span className="text-foreground/80 font-semibold">-₱{orderDetails.discountAmount.toFixed(2)}</span>
                                    </div>
                                    {orderDetails.discounts && orderDetails.discounts.length > 0 && (
                                        <div className="text-xs text-muted-foreground space-y-1 bg-background/50 p-2.5 rounded-xl border border-border/40">
                                            {orderDetails.discounts.map((od: any) => (
                                                <div key={od.id} className="flex flex-col">
                                                    <span className="font-bold text-foreground/80">{od.discount?.name || 'Discount'}</span>
                                                    {od.referenceId && <span className="font-mono mt-0.5">Card ID: {od.referenceId}</span>}
                                                    {od.referenceName && <span>Holder: {od.referenceName}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between font-bold text-sm pt-2">
                                    <span className="text-foreground">Net Due Total:</span>
                                    <span className="text-primary text-base font-extrabold">₱{orderDetails.netTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Settlement details card */}
                        {payments && payments.length > 0 && (
                            <div className="border border-emerald-500/20 p-5 rounded-2xl bg-emerald-500/5 shadow-3xs space-y-3.5">
                                <h4 className="font-bold text-emerald-800 border-b border-emerald-500/20 pb-2 uppercase text-2xs  flex items-center gap-1.5">
                                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                                    Payment Settlement Details
                                </h4>
                                <div className="space-y-3 font-medium text-emerald-800 text-xs">
                                    {payments.map((payment: IOrderPayment) => (
                                        <div key={payment.id} className="space-y-2.5 border-b border-emerald-500/10 pb-2.5 last:border-0 last:pb-0">
                                            <div className="flex justify-between">
                                                <span>Payment Status:</span>
                                                <Badge
                                                    className={`text-xs uppercase font-bold py-0.5 px-2 ${
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
                                                <span className="font-bold text-emerald-900 text-sm">₱{payment.amount.toFixed(2)}</span>
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
                                                        <div className="flex justify-between text-emerald-700 items-center">
                                                            <span>Reference ID:</span>
                                                            <span className="font-mono text-2xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-900 border border-emerald-500/20">
                                                                {payment.gcashReferenceNumber}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {payment.paymentProofPhoto && (
                                                        <div className="mt-2.5 space-y-1">
                                                            <span className="text-xs text-emerald-700 block uppercase font-bold">
                                                                Screenshot Receipt
                                                            </span>
                                                            <div className="border border-emerald-500/20 rounded-xl overflow-hidden bg-background max-h-[140px] flex items-center justify-center relative shadow-3xs">
                                                                <img
                                                                    src={getFileUrl(payment.paymentProofPhoto)}
                                                                    alt="Proof of Payment"
                                                                    className="w-full max-h-[130px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                                                    onClick={() => window.open(getFileUrl(payment.paymentProofPhoto), '_blank')}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <div className="text-xs text-emerald-600 font-semibold pt-1 text-right">
                                                Paid on {format(new Date(payment.createdAt), 'MMM dd, yyyy - hh:mm a')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Actions console & Audit log history */}
                <div className="space-y-6">
                    {/* Action Panel Card */}
                    <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm space-y-4">
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
                                            <div className="space-y-2 text-rose-900 font-medium">
                                                <div className="flex justify-between">
                                                    <span>Authorized By:</span>
                                                    <span className="font-bold text-rose-950">
                                                        {voidLog.voidedBy.firstName} {voidLog.voidedBy.lastName}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Date & Time:</span>
                                                    <span>{format(new Date(voidLog.createdAt), 'MMM dd, yyyy - hh:mm a')}</span>
                                                </div>
                                                <div className="mt-1 pt-2 border-t border-rose-500/10">
                                                    <span className="text-xs text-rose-700 block font-bold uppercase ">Reason:</span>
                                                    <span className="italic">"{voidLog.reason}"</span>
                                                </div>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <p className="text-rose-700 font-medium italic">No void audit details recorded for this cancellation.</p>
                                )}
                            </div>
                        ) : orderDetails.status === 'COMPLETED' ? (
                            <div className="border border-emerald-500/20 p-4 rounded-xl bg-emerald-500/5 space-y-2.5 text-xs">
                                <h4 className="font-bold text-emerald-800 border-b border-emerald-500/20 pb-1.5 uppercase text-xs  flex items-center gap-1.5">
                                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                                    Fulfillment Complete
                                </h4>
                                <p className="text-emerald-700 leading-relaxed font-medium">
                                    This order has been completed and fully served. No further actions are required.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {orderDetails.status === 'PENDING' &&
                                payments &&
                                payments.some((p: IOrderPayment) => p.paymentStatus === 'PENDING') ? (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <h4 className="font-bold text-foreground/75 border-b border-border/30 pb-2 uppercase text-2xs  flex items-center gap-1.5">
                                                <CreditCard className="size-3.5 text-muted-foreground" />
                                                Pending Digital Payment
                                            </h4>
                                            <p className="text-xs text-muted-foreground leading-normal mt-2">
                                                This order has a pending digital payment. Please review the reference ID and screenshot receipt
                                                details on the left, then click Approve to confirm the payment and queue the order for preparation.
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
                                            className="w-full h-10 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
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
                                        {/* Discounts Section */}
                                        <div className="space-y-3 pb-3 border-b border-dashed border-border/30">
                                            <h4 className="font-bold text-foreground/75 border-b border-border/30 pb-2 uppercase text-2xs  flex items-center gap-1.5">
                                                <Tag className="size-3.5 text-muted-foreground" />
                                                Order Discounts
                                            </h4>

                                            {orderDetails.discounts && orderDetails.discounts.length > 0 ? (
                                                <div className="space-y-2">
                                                    <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs flex justify-between items-center">
                                                        <div>
                                                            <span className="font-bold text-foreground block">
                                                                {orderDetails.discounts[0].discount?.name}
                                                            </span>
                                                            <span className="text-muted-foreground font-semibold">
                                                                Saved ₱{orderDetails.discountAmount.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <RequirePermission module="Point of Sale (POS)" action="delete">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                disabled={removeDiscountMutation.isPending}
                                                                onClick={() => removeDiscountMutation.mutate()}
                                                                className="size-8 text-destructive hover:bg-destructive/15 rounded-lg"
                                                                title="Remove Discount"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </RequirePermission>
                                                    </div>
                                                </div>
                                            ) : (
                                                <RequirePermission module="Point of Sale (POS)" action="create">
                                                    <Form {...discountForm}>
                                                        <form onSubmit={discountForm.handleSubmit(onApplyDiscountSubmit)} className="space-y-3">
                                                            <FormField
                                                                control={discountForm.control}
                                                                name="discountId"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-1.5">
                                                                        <FormLabel className="text-xs font-semibold text-foreground/80">
                                                                            Select Discount
                                                                        </FormLabel>
                                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                                            <FormControl>
                                                                                <SelectTrigger className="h-9 text-xs bg-background/50 rounded-lg">
                                                                                    <SelectValue placeholder="Choose a discount..." />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent className="rounded-xl">
                                                                                {activeDiscounts.map((d: IDiscount) => (
                                                                                    <SelectItem key={d.id} value={d.id} className="text-xs">
                                                                                        {d.name}{' '}
                                                                                        {d.type === 'PERCENTAGE' ? `(${d.value}%)` : `(₱${d.value})`}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            {isSelectedBIR && (
                                                                <div className="space-y-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 animate-in slide-in-from-top-2 duration-150">
                                                                    <div className="text-xs text-amber-700 font-bold leading-normal">
                                                                        BIR compliance: Enter card details to apply senior/PWD discount.
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <FormField
                                                                            control={discountForm.control}
                                                                            name="referenceId"
                                                                            render={({ field }) => (
                                                                                <FormItem className="space-y-1">
                                                                                    <FormLabel className="text-xs font-bold text-foreground/75 block">
                                                                                        Card ID Number
                                                                                    </FormLabel>
                                                                                    <FormControl>
                                                                                        <Input
                                                                                            placeholder="e.g. SC-12345"
                                                                                            {...field}
                                                                                            className="h-8 text-2xs bg-background/50 font-mono rounded-lg"
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
                                                                                <FormItem className="space-y-1">
                                                                                    <FormLabel className="text-xs font-bold text-foreground/75 block">
                                                                                        Cardholder Name
                                                                                    </FormLabel>
                                                                                    <FormControl>
                                                                                        <Input
                                                                                            placeholder="e.g. Maria Santos"
                                                                                            {...field}
                                                                                            className="h-8 text-2xs bg-background/50 rounded-lg"
                                                                                        />
                                                                                    </FormControl>
                                                                                    <FormMessage />
                                                                                </FormItem>
                                                                            )}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <Button
                                                                type="submit"
                                                                disabled={applyDiscountMutation.isPending}
                                                                className="w-full h-8.5 gap-1.5 text-xs font-semibold shadow-3xs rounded-lg"
                                                            >
                                                                {applyDiscountMutation.isPending ? (
                                                                    <Spinner className="size-3.5 animate-spin" />
                                                                ) : (
                                                                    'Apply Discount'
                                                                )}
                                                            </Button>
                                                        </form>
                                                    </Form>
                                                </RequirePermission>
                                            )}
                                        </div>

                                        {/* Payment Action block */}
                                        <div className="space-y-3">
                                            <div>
                                                <h4 className="font-bold text-foreground/75 border-b border-border/30 pb-2 uppercase text-2xs  flex items-center gap-1.5">
                                                    <CreditCard className="size-3.5 text-muted-foreground" />
                                                    Awaiting Payment Collection
                                                </h4>
                                                <p className="text-xs text-muted-foreground leading-normal mt-2 font-medium">
                                                    This order has not been paid yet. Process the payment to transition the order to the preparing
                                                    queue.
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={() => setIsPaymentDialogOpen(true)}
                                                className="w-full h-10 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-xs hover:shadow-md transition-all rounded-xl"
                                            >
                                                <CreditCard className="size-4" />
                                                Collect Payment
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3.5">
                                        <h4 className="font-bold text-foreground/75 border-b border-border/30 pb-2 uppercase text-2xs  flex items-center gap-1.5">
                                            <RefreshCw className="size-3.5 text-muted-foreground animate-pulse" />
                                            Update Preparation State
                                        </h4>
                                        <RequirePermission module="Orders Management" action="update">
                                            <Form {...statusForm}>
                                                <form onSubmit={statusForm.handleSubmit(onUpdateStatusSubmit)} className="space-y-3.5 text-xs">
                                                    <FormField
                                                        control={statusForm.control}
                                                        name="status"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-1.5">
                                                                <FormLabel className="font-semibold text-foreground/80">Fulfillment Status</FormLabel>
                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                    <FormControl>
                                                                        <SelectTrigger className="h-9.5 text-xs bg-background/50 rounded-lg">
                                                                            <SelectValue placeholder="Select target status..." />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent className="rounded-xl">
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
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={statusForm.control}
                                                        name="notes"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-1.5">
                                                                <FormLabel className="font-semibold text-foreground/80">Audit Log Notes</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Add reason, buzzer IDs, or pick-up logs..."
                                                                        {...field}
                                                                        className="h-9.5 text-xs bg-background/50 rounded-lg"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <Button
                                                        type="submit"
                                                        disabled={!statusChangeValue || updateStatusMutation.isPending}
                                                        className="w-full h-9.5 gap-1.5 text-xs bg-primary text-primary-foreground font-bold shadow-3xs rounded-lg"
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
                                            </Form>
                                        </RequirePermission>
                                    </div>
                                )}

                                {/* Void override action */}
                                <div className="pt-3.5 border-t border-dashed border-border/30">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsVoidDialogOpen(true)}
                                        className="w-full h-9.5 gap-1.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 font-bold rounded-lg"
                                    >
                                        <AlertTriangle className="size-3.5 shrink-0" />
                                        Void Order Session
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status History Logs Card */}
                    {orderDetails.statusHistory && orderDetails.statusHistory.length > 0 && (
                        <div className="border border-border/60 p-5 rounded-2xl bg-card shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-border/30 pb-3">
                                <h3 className="text-xs font-bold text-foreground/60 uppercase flex items-center gap-1.5">
                                    <TrendingUp className="size-4 text-muted-foreground" />
                                    Audit Status Log History
                                </h3>
                                <span className="text-xs bg-muted px-2.5 py-0.5 rounded-full font-bold text-muted-foreground/80 border border-border/40">
                                    {orderDetails.statusHistory.length} logs
                                </span>
                            </div>

                            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {orderDetails.statusHistory.map((history: IOrderStatusHistory) => {
                                    const config = getStatusTimelineConfig(history.status);
                                    return (
                                        <div key={history.id} className="relative group transition-all duration-200">
                                            {/* Timeline Node Icon */}
                                            <div
                                                className={cn(
                                                    'absolute -left-[27px] top-0.5 rounded-full size-6 flex items-center justify-center border bg-background shadow-3xs transition-transform duration-200 group-hover:scale-110 shrink-0',
                                                    config.colorClass,
                                                    config.borderClass,
                                                    config.bgClass
                                                )}
                                            >
                                                {config.icon}
                                            </div>

                                            {/* Timeline Content */}
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={cn(
                                                                'text-xs font-bold uppercase  px-1.5 py-0.5 rounded border leading-none shrink-0',
                                                                config.colorClass,
                                                                config.borderClass,
                                                                config.bgClass
                                                            )}
                                                        >
                                                            {history.status.toLowerCase()}
                                                        </span>
                                                        {history.changedBy && (
                                                            <span className="text-xs text-muted-foreground font-semibold">
                                                                by {history.changedBy.firstName} {history.changedBy.lastName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground font-mono font-medium shrink-0">
                                                        {format(new Date(history.createdAt), 'MMM dd, hh:mm a')}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-foreground/85 font-medium leading-relaxed">
                                                    {history.notes || 'Status updated.'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Inlined Payment & Void dialog overrides */}
            <ProcessPaymentDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen} order={orderDetails} />
            <VoidOrderDialog
                open={isVoidDialogOpen}
                onOpenChange={setIsVoidDialogOpen}
                orderId={orderDetails.id}
                orderNumber={orderDetails.queueNumber}
                onSuccess={handleBack}
            />
        </div>
    );
}
