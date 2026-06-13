import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Coins, CreditCard, Lock, ArrowRight, ShieldAlert, CheckCircle2, Landmark, Wallet, Upload, Trash2 } from 'lucide-react';

import { useRegisterShiftStore } from '#/store/register-shift-store.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { createOrderPayment } from '#/api/orders.api.ts';
import { uploadImageFile } from '#/api/transactions.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IOrder } from '../order.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { getFileUrl } from '#/utils/helper';

// Opening shift validation schema
const openShiftSchema = z.object({
    startBalance: z.number().min(0, 'Starting balance must be non-negative'),
    notes: z.string().max(1000, 'Max 1000 characters').optional().nullable()
});

type OpenShiftFormValues = z.infer<typeof openShiftSchema>;

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
    const { activeShift, openShift } = useRegisterShiftStore();

    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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

    // Forms
    const openForm = useForm<OpenShiftFormValues>({
        resolver: zodResolver(openShiftSchema),
        defaultValues: {
            startBalance: 5000,
            notes: ''
        }
    });

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
    const openShiftMutation = useMutation({
        mutationFn: openShift,
        onSuccess: (shift) => {
            toast.success('POS Shift Started', {
                description: `Register shift successfully initialized. Opening cash balance: ₱${shift.startBalance.toFixed(2)}.`
            });
            openForm.reset();
        },
        onError: (err) => {
            toast.error('Failed to start POS shift', {
                description: getErrorMessage(err)
            });
        }
    });

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

    const handleOpenSubmit = (values: OpenShiftFormValues) => {
        openShiftMutation.mutate(values);
    };

    const handlePaymentSubmit = (values: PaymentFormValues) => {
        processPaymentMutation.mutate(values);
    };

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background border-border/60 rounded-2xl p-0 overflow-hidden shadow-2xl">
                {!activeShift ? (
                    // Inline Drawer Open form if shift is locked
                    <>
                        <DialogHeader className="px-6 pt-6 pb-2">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 text-destructive mb-2">
                                <Lock className="h-6 w-6" />
                            </div>
                            <DialogTitle className="text-center text-lg font-bold">Register Shift Drawer Locked</DialogTitle>
                            <DialogDescription className="text-center text-xs text-muted-foreground">
                                Active register session required to process PHP {netTotal.toFixed(2)} payment for Order #{order.queueNumber}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="px-6 py-4">
                            <Form {...openForm}>
                                <form onSubmit={openForm.handleSubmit(handleOpenSubmit)} className="space-y-4">
                                    <FormField
                                        control={openForm.control}
                                        name="startBalance"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1.5 text-xs">
                                                    <Coins className="size-3.5 text-muted-foreground" />
                                                    Opening Cash (₱)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="5000.00"
                                                        value={field.value}
                                                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                        className="h-9 bg-background/50 text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={openForm.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80 text-xs">Opening Shift Comments</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Add cash drawer breakdown notes..."
                                                        value={field.value || ''}
                                                        onChange={field.onChange}
                                                        className="bg-background/50 text-xs resize-none h-20"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Alert className="border-destructive/20 bg-destructive/5 text-destructive rounded-xl py-2.5">
                                        <ShieldAlert className="h-4 w-4" />
                                        <AlertTitle className="font-bold text-xs">Drawer Required</AlertTitle>
                                        <AlertDescription className="text-xs font-medium leading-normal">
                                            Sales audits enforce drawer balance logs. Opening the drawer will initialize POS active session.
                                        </AlertDescription>
                                    </Alert>

                                    <Button
                                        type="submit"
                                        disabled={openShiftMutation.isPending}
                                        className="w-full h-9 gap-1.5 text-xs font-semibold mt-2"
                                    >
                                        {openShiftMutation.isPending ? (
                                            <>
                                                <Spinner className="h-4 w-4 animate-spin" />
                                                Opening Drawer...
                                            </>
                                        ) : (
                                            <>
                                                <ArrowRight className="size-4" />
                                                Open Drawer & Start Checkout
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </>
                ) : (
                    // Regular Payment Processor view
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
                            {/* Order Total Highlight */}
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center mb-5 shrink-0">
                                <div>
                                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Amount Due</span>
                                    <span className="text-xl font-black text-foreground">
                                        ₱{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-semibold px-2 py-0.5 uppercase">
                                    Unpaid
                                </Badge>
                            </div>

                            <Form {...paymentForm}>
                                <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="space-y-4">
                                    {/* Payment Method Selector */}
                                    <FormField
                                        control={paymentForm.control}
                                        name="paymentMethod"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="font-semibold text-foreground/80 text-xs">Payment Method</FormLabel>
                                                <FormControl>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {[
                                                            { id: 'CASH', label: 'Cash', icon: Coins },
                                                            { id: 'GCASH', label: 'GCash', icon: Wallet },
                                                            { id: 'PAYMAYA', label: 'PayMaya', icon: Landmark },
                                                            { id: 'CREDIT_CARD', label: 'Card', icon: CreditCard }
                                                        ].map((method) => {
                                                            const Icon = method.icon;
                                                            const isSelected = field.value === method.id;
                                                            return (
                                                                <button
                                                                    key={method.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        field.onChange(method.id);
                                                                        if (method.id === 'CASH') {
                                                                            paymentForm.setValue('amountTendered' as any, netTotal);
                                                                        } else {
                                                                            paymentForm.setValue('amountTendered' as any, undefined);
                                                                        }
                                                                    }}
                                                                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                                                                        isSelected
                                                                            ? 'bg-primary/10 border-primary text-primary font-bold shadow-3xs'
                                                                            : 'bg-background hover:bg-muted/10 border-border/60 text-muted-foreground hover:text-foreground'
                                                                    }`}
                                                                >
                                                                    <Icon className="size-4.5 mb-1" />
                                                                    <span className="text-xs">{method.label}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Cash Panel */}
                                    {paymentMethodValue === 'CASH' && (
                                        <div className="space-y-4 pt-2 border-t border-dashed border-border/40">
                                            <FormField
                                                control={paymentForm.control}
                                                name="amountTendered"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1.5 text-xs">
                                                            <Coins className="size-3.5 text-muted-foreground" />
                                                            Amount Tendered (₱)
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                placeholder={netTotal.toFixed(2)}
                                                                value={field.value}
                                                                onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                                className="h-9 bg-background/50 text-xs font-bold text-foreground"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Change Due Display */}
                                            <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex justify-between items-center text-xs">
                                                <span className="text-emerald-700 font-semibold">Change Due:</span>
                                                <span className="text-emerald-600 font-bold text-sm">
                                                    ₱{changeDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Digital Panel */}
                                    {paymentMethodValue !== 'CASH' && (
                                        <div className="space-y-4 pt-2 border-t border-dashed border-border/40">
                                            <FormField
                                                control={paymentForm.control}
                                                name="gcashReferenceNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80 text-xs">
                                                            Digital Reference Number
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="text"
                                                                placeholder="e.g. 9012345678901"
                                                                value={field.value || ''}
                                                                onChange={field.onChange}
                                                                className="h-9 bg-background/50 text-xs font-mono"
                                                            />
                                                        </FormControl>
                                                        <FormDescription className="text-xs text-muted-foreground">
                                                            Input reference ID (minimum 5 characters) printed on receipt.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={paymentForm.control}
                                                name="paymentProofPhoto"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1.5">
                                                        <FormLabel className="font-semibold text-foreground/80 text-xs">
                                                            Proof of Payment Receipt
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="space-y-2">
                                                                <input
                                                                    type="file"
                                                                    ref={fileInputRef}
                                                                    onChange={handleFileChange}
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                />
                                                                {isUploading ? (
                                                                    <div className="flex flex-col items-center justify-center border border-border/60 rounded-xl min-h-[140px] bg-muted/10 gap-2">
                                                                        <Spinner className="h-6 w-6 text-primary animate-spin" />
                                                                        <span className="text-xs text-muted-foreground font-medium">
                                                                            Uploading receipt...
                                                                        </span>
                                                                    </div>
                                                                ) : field.value ? (
                                                                    <div className="relative border border-border/40 rounded-xl overflow-hidden bg-muted/5 min-h-[140px] flex items-center justify-center group">
                                                                        <img
                                                                            src={getFileUrl(field.value)}
                                                                            alt="Payment Proof"
                                                                            className="w-full max-h-[220px] object-contain cursor-pointer"
                                                                            onClick={() => window.open(getFileUrl(field.value), '_blank')}
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            variant="destructive"
                                                                            size="icon"
                                                                            onClick={handleRemovePhoto}
                                                                            className="absolute top-2 right-2 size-7 rounded-lg shadow-md opacity-90 hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        onClick={handleUploadClick}
                                                                        className="border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-muted/15 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all gap-1 text-center"
                                                                    >
                                                                        <div className="size-8.5 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground mb-1">
                                                                            <Upload className="size-4.5" />
                                                                        </div>
                                                                        <span className="text-xs font-bold text-foreground">
                                                                            Upload payment screenshot
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            JPEG, PNG, WEBP (max. 5MB)
                                                                        </span>
                                                                    </div>
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
                        </div>
                    </>
                )}
                <DialogFooter className="px-6 py-3 border-t bg-muted/30 shrink-0">
                    <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="h-8.5 text-xs">
                        Cancel Action
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
