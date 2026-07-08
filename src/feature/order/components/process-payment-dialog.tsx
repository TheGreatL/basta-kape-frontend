import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Coins, CreditCard, CheckCircle2, Landmark, Wallet, Upload, Trash2 } from 'lucide-react';

import { getErrorMessage } from '#/utils/error-handler.ts';
import { createOrderPayment, getOrderPayments } from '#/api/orders.api.ts';
import { uploadImageFile, updateTransactionReceipt } from '#/api/transactions.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IOrder } from '../order.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { getFileUrl } from '#/utils/helper';

// Dynamic payment validation schema builder
const createPaymentSchema = (netTotal: number) => {
    return z.discriminatedUnion('paymentMethod', [
        z
            .object({
                paymentMethod: z.literal('CASH'),
                amountTendered: z.number().min(0, 'Amount tendered must be non-negative')
            })
            .refine((data) => data.amountTendered >= netTotal, {
                message: `Amount tendered must be at least the net total of ₱${netTotal.toFixed(2)}`,
                path: ['amountTendered']
            }),
        z.object({
            paymentMethod: z.enum(['GCASH', 'PAYMAYA', 'CREDIT_CARD']),
            gcashReferenceNumber: z.string().min(5, 'Reference number must be at least 5 characters'),
            paymentProofPhoto: z.string().max(1000, 'Max 1000 characters').optional()
        })
    ]);
};

interface ProcessPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: IOrder | null;
    onSuccess?: () => void;
}

export default function ProcessPaymentDialog({ open, onOpenChange, order, onSuccess }: ProcessPaymentDialogProps) {
    const queryClient = useQueryClient();

    const [overridePending, setOverridePending] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    // Query: Fetch payments for this order
    const { data: payments, isLoading: isPaymentsLoading } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.ORDER_PAYMENTS, order?.id],
        queryFn: () => getOrderPayments(order!.id),
        enabled: open && !!order?.id
    });

    const pendingPayment = React.useMemo(() => {
        return payments?.find(
            (p: any) =>
                p.paymentStatus === 'PENDING' && (p.paymentMethod === 'GCASH' || p.paymentMethod === 'PAYMAYA' || p.paymentMethod === 'CREDIT_CARD')
        );
    }, [payments]);

    // Reset override when dialog closes
    React.useEffect(() => {
        if (!open) {
            setOverridePending(false);
        }
    }, [open]);

    // Mutation: Approve Pending Digital Payment
    const approvePaymentMutation = useMutation({
        mutationFn: (paymentId: string) => updateTransactionReceipt(paymentId, {}),
        onSuccess: () => {
            toast.success('Digital payment approved successfully');
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, order?.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_PAYMENTS, order?.id] });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (err) => {
            toast.error('Failed to approve payment', { description: getErrorMessage(err) });
        }
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const uploadRes = await uploadImageFile(file);
            paymentForm.setValue('paymentProofPhoto', uploadRes.url);
            toast.success('Proof of payment uploaded successfully');
        } catch (err) {
            toast.error('Failed to upload image', {
                description: getErrorMessage(err)
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleRemovePhoto = () => {
        paymentForm.setValue('paymentProofPhoto', undefined);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const netTotal = order?.netTotal || 0;
    const paymentSchema = React.useMemo(() => createPaymentSchema(netTotal), [netTotal]);

    type PaymentFormValues = z.infer<ReturnType<typeof createPaymentSchema>>;

    const paymentForm = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            paymentMethod: 'CASH',
            amountTendered: netTotal || 0
        }
    });

    const paymentMethodValue = paymentForm.watch('paymentMethod');
    const cashAmountTendered = paymentForm.watch('amountTendered' as any);

    // Synchronize form default values when order/netTotal changes
    React.useEffect(() => {
        if (open && order) {
            paymentForm.reset({
                paymentMethod: 'CASH',
                amountTendered: order.netTotal
            } as any);
        }
    }, [open, order, paymentForm]);

    // Live Change Math
    const changeDue = React.useMemo(() => {
        if (paymentMethodValue !== 'CASH') return 0;
        const tendered = Number(cashAmountTendered) || 0;
        const diff = tendered - netTotal;
        return diff > 0 ? diff : 0;
    }, [paymentMethodValue, cashAmountTendered, netTotal]);

    // Mutations
    const processPaymentMutation = useMutation({
        mutationFn: (values: PaymentFormValues) => {
            if (!order) throw new Error('No order selected');
            return createOrderPayment(order.id, values);
        },
        onSuccess: (payment) => {
            toast.success('Payment Processed Successfully', {
                description: `Transaction logged via ${payment.paymentMethod}. Change due: ₱${(payment.amountChange || 0).toFixed(2)}.`
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, order?.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_PAYMENTS, order?.id] });
            paymentForm.reset();
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (err) => {
            toast.error('Failed to process payment', {
                description: getErrorMessage(err)
            });
        }
    });

    const handlePaymentSubmit = (values: PaymentFormValues) => {
        processPaymentMutation.mutate(values);
    };

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background border-border/60 rounded-2xl p-0 overflow-hidden shadow-2xl">
                <>
                    <DialogHeader className="px-6 pt-6 pb-2 border-b border-border/40">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <CreditCard className="size-5 text-primary" />
                            Process Order Payment
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Record payment for Ticket **#{order.queueNumber}** (Customer: **{order.customerName || 'Walk-in'}**).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-5">
                        {isPaymentsLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2">
                                <Spinner className="size-5 text-primary animate-spin" />
                                <span className="text-xs text-muted-foreground">Checking existing payments...</span>
                            </div>
                        ) : pendingPayment && !overridePending ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                    <div className="flex gap-2 items-start">
                                        <Coins className="size-5 text-amber-500 shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-foreground">Pending Digital Payment Verification</h4>
                                            <p className="text-xs text-muted-foreground mt-1 leading-normal">
                                                Order has an existing reference request for{' '}
                                                <span className="font-bold text-foreground">{pendingPayment.paymentMethod}</span>. Ref ID:{' '}
                                                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                    {pendingPayment.gcashReferenceNumber}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    {pendingPayment.paymentProofPhoto && (
                                        <div className="rounded-lg overflow-hidden border border-border/40 aspect-video max-h-32 bg-muted flex items-center justify-center relative group">
                                            <img
                                                src={getFileUrl(pendingPayment.paymentProofPhoto)}
                                                alt="Proof of Payment"
                                                className="size-full object-contain"
                                            />
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => approvePaymentMutation.mutate(pendingPayment.id)}
                                            disabled={approvePaymentMutation.isPending}
                                            className="flex-1 h-8.5 text-xs font-bold gap-1.5"
                                        >
                                            {approvePaymentMutation.isPending ? (
                                                <Spinner className="size-3 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="size-4" />
                                            )}
                                            Approve Payment
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setOverridePending(true)}
                                            className="h-8.5 text-xs font-semibold px-3"
                                        >
                                            Override
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Selection Tabs */}
                                <div className="grid grid-cols-4 gap-2 mb-4 bg-muted/40 p-1 rounded-lg border border-border/40">
                                    {(['CASH', 'GCASH', 'PAYMAYA', 'CREDIT_CARD'] as const).map((method) => {
                                        const active = paymentMethodValue === method;
                                        let label = method as string;
                                        let icon = <CreditCard className="size-3.5" />;
                                        if (method === 'CASH') {
                                            label = 'Cash';
                                            icon = <Coins className="size-3.5" />;
                                        } else if (method === 'GCASH') {
                                            label = 'GCash';
                                            icon = <Wallet className="size-3.5 text-blue-500" />;
                                        } else if (method === 'PAYMAYA') {
                                            label = 'Maya';
                                            icon = <Landmark className="size-3.5 text-green-500" />;
                                        } else if (method === 'CREDIT_CARD') {
                                            label = 'Card';
                                            icon = <CreditCard className="size-3.5 text-purple-500" />;
                                        }

                                        return (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => {
                                                    paymentForm.setValue('paymentMethod', method);
                                                    if (method !== 'CASH') {
                                                        paymentForm.setValue('amountTendered', netTotal);
                                                    }
                                                }}
                                                className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-md text-[10px] font-bold border transition-all ${
                                                    active
                                                        ? 'bg-background border-border/80 text-foreground shadow-xs'
                                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {icon}
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <Form {...paymentForm}>
                                    <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="space-y-4">
                                        {/* CASH FORM */}
                                        {paymentMethodValue === 'CASH' && (
                                            <div className="space-y-3.5">
                                                <FormField
                                                    control={paymentForm.control}
                                                    name="amountTendered"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1.5 text-xs">
                                                                <Coins className="size-3.5 text-muted-foreground" />
                                                                Amount Paid (₱)
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={field.value || ''}
                                                                    onChange={(e) =>
                                                                        field.onChange(e.target.value === '' ? 0 : Number(e.target.value))
                                                                    }
                                                                    className="h-9.5 bg-background/50 text-xs font-semibold"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 border rounded-xl border-border/40">
                                                    <div className="flex flex-col text-left">
                                                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                                            Net Total
                                                        </span>
                                                        <span className="text-sm font-bold text-foreground mt-0.5">₱{netTotal.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex flex-col text-right">
                                                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                                            Change Due
                                                        </span>
                                                        <span className="text-sm font-extrabold text-emerald-600 mt-0.5">
                                                            ₱{changeDue.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* DIGITAL PAYMENTS FORM */}
                                        {paymentMethodValue !== 'CASH' && (
                                            <div className="space-y-3">
                                                <FormField
                                                    control={paymentForm.control}
                                                    name="gcashReferenceNumber"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="font-semibold text-foreground/80 text-xs">Reference Number</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="Enter 13-digit Reference ID"
                                                                    value={field.value || ''}
                                                                    onChange={field.onChange}
                                                                    className="h-9 bg-background/50 text-xs font-semibold"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={paymentForm.control}
                                                    name="paymentProofPhoto"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="font-semibold text-foreground/80 text-xs">
                                                                Upload Receipt Screenshot
                                                            </FormLabel>
                                                            <FormControl>
                                                                <div className="space-y-2">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={handleFileChange}
                                                                        ref={fileInputRef}
                                                                        className="hidden"
                                                                    />
                                                                    {field.value ? (
                                                                        <div className="relative group rounded-xl overflow-hidden border border-border/60 aspect-video max-h-32 bg-muted flex items-center justify-center">
                                                                            <img
                                                                                src={getFileUrl(field.value)}
                                                                                alt="Uploaded receipt"
                                                                                className="size-full object-contain"
                                                                            />
                                                                            <Button
                                                                                type="button"
                                                                                variant="destructive"
                                                                                size="icon"
                                                                                onClick={handleRemovePhoto}
                                                                                className="absolute top-2 right-2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                                            >
                                                                                <Trash2 className="size-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            disabled={isUploading}
                                                                            onClick={handleUploadClick}
                                                                            className="w-full h-24 border-dashed border-border/80 flex flex-col gap-1.5 items-center justify-center bg-background/50 hover:bg-background/80"
                                                                        >
                                                                            {isUploading ? (
                                                                                <>
                                                                                    <Spinner className="size-5 text-primary animate-spin" />
                                                                                    <span className="text-[10px] text-muted-foreground font-bold">
                                                                                        Uploading Receipt...
                                                                                    </span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Upload className="size-5 text-muted-foreground" />
                                                                                    <span className="text-[10px] text-muted-foreground font-bold">
                                                                                        Click to select image file
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={processPaymentMutation.isPending}
                                            className="w-full h-9.5 gap-1.5 text-xs font-bold mt-4"
                                        >
                                            {processPaymentMutation.isPending ? (
                                                <>
                                                    <Spinner className="h-4 w-4 animate-spin" />
                                                    Recording Payment...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="size-4" />
                                                    Confirm Payment of ₱{netTotal.toFixed(2)}
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </Form>
                            </>
                        )}
                    </div>
                </>
                <DialogFooter className="px-6 py-3 border-t bg-muted/30 shrink-0">
                    <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="h-8.5 text-xs">
                        Cancel Action
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
