import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { TrendingUp, CheckCircle2, ArrowLeft, Printer, FileText, Download, Volume2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '#/lib/utils.ts';

import { Route } from '#/routes/admin/orders/$id/index.tsx';
import { getOrderById, getOrderPayments } from '#/api/orders.api.ts';
import { getFileUrl, getFrontendReference } from '#/utils/helper';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IOrderStatusHistory, IOrderItem, IOrderPayment, IOrderItemModifier } from './order.types';

import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { CopyButton } from '#/components/ui/copy-button.tsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu.tsx';
import { printReceiptHtml, openReceiptPdf, downloadReceiptPdf } from '#/utils/receipt.ts';

export default function OrderViewPage() {
    const { id: orderId } = Route.useParams();
    const navigate = useNavigate();

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

    // Fetch order details
    const { data: orderDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, orderId],
        queryFn: () => getOrderById(orderId),
        enabled: !!orderId
    });

    // Fetch order payments
    const { data: payments } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.ORDER_PAYMENTS, orderId],
        queryFn: () => getOrderPayments(orderId),
        enabled: !!orderId
    });

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
            case 'PREPARING':
                return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25 animate-pulse';
            case 'READY':
                return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25';
            case 'CANCELLED':
                return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25';
            default:
                return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/25';
        }
    };

    const getStatusTimelineConfig = (status: string) => {
        switch (status) {
            case 'PENDING':
                return {
                    icon: <span className="size-2 rounded-full bg-slate-400" />,
                    colorClass: 'text-slate-600 dark:text-slate-400',
                    borderClass: 'border-slate-200 dark:border-slate-800',
                    bgClass: 'bg-slate-50 dark:bg-slate-950/40'
                };
            case 'PREPARING':
                return {
                    icon: <span className="size-2 rounded-full bg-blue-500 animate-ping" />,
                    colorClass: 'text-blue-600 dark:text-blue-400',
                    borderClass: 'border-blue-200 dark:border-blue-900/50',
                    bgClass: 'bg-blue-50/50 dark:bg-blue-950/20'
                };
            case 'READY':
                return {
                    icon: <span className="size-2 rounded-full bg-amber-500" />,
                    colorClass: 'text-amber-600 dark:text-amber-400',
                    borderClass: 'border-amber-200 dark:border-amber-900/50',
                    bgClass: 'bg-amber-50/50 dark:bg-amber-950/20'
                };
            case 'COMPLETED':
                return {
                    icon: <span className="size-2 rounded-full bg-emerald-500" />,
                    colorClass: 'text-emerald-600 dark:text-emerald-400',
                    borderClass: 'border-emerald-200 dark:border-emerald-900/50',
                    bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/20'
                };
            case 'CANCELLED':
                return {
                    icon: <span className="size-2 rounded-full bg-rose-500" />,
                    colorClass: 'text-rose-600 dark:text-rose-400',
                    borderClass: 'border-rose-200 dark:border-rose-900/50',
                    bgClass: 'bg-rose-50/50 dark:bg-rose-950/20'
                };
            default:
                return {
                    icon: <span className="size-2 rounded-full bg-slate-400" />,
                    colorClass: 'text-slate-600 dark:text-slate-400',
                    borderClass: 'border-slate-200 dark:border-slate-800',
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
                        <span className="text-foreground">Order View</span>
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
                                Order #{orderDetails.queueNumber}
                                <Badge variant="outline" className={`font-bold capitalize py-0.5 px-2.5 ${getStatusBadgeClass(orderDetails.status)}`}>
                                    {orderDetails.status.toLowerCase()}
                                </Badge>
                            </h1>
                            <p className="text-xs text-muted-foreground pt-1">
                                View only: Order line items, custom choice options, discounts, and cashier status audit logs.
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
                                        <Volume2 className="size-3.5 text-amber-500" /> Pager / Buzzer
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
                                    <span className="text-primary text-base font-bold">₱{orderDetails.netTotal.toFixed(2)}</span>
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

                {/* Right Column: Status Timeline audit log history */}
                <div>
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

                            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                {orderDetails.statusHistory.map((history: IOrderStatusHistory) => {
                                    const config = getStatusTimelineConfig(history.status);
                                    return (
                                        <div key={history.id} className="relative group transition-all duration-200">
                                            {/* Timeline Node Icon */}
                                            <div
                                                className={cn(
                                                    'absolute left-[-27px] top-0.5 rounded-full size-6 flex items-center justify-center border bg-background shadow-3xs transition-transform duration-200 group-hover:scale-110 shrink-0',
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
        </div>
    );
}
