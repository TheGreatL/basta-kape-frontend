import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Monitor, Lock, Coins, ArrowRight, ShieldAlert, CheckCircle2, User, Clock, ShoppingBag } from 'lucide-react';

import { useRegisterShiftStore } from '#/store/register-shift-store.ts';
import { useAuthStore } from '#/store/auth-store.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card.tsx';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert.tsx';

// Validation Schema
const openShiftSchema = z.object({
    startBalance: z.number().min(0, 'Starting balance must be non-negative'),
    notes: z.string().max(1000, 'Max 1000 characters').optional().nullable()
});

type OpenShiftFormValues = z.infer<typeof openShiftSchema>;

export default function PosPage() {
    const { activeShift, isLoading, hasChecked, fetchActiveShift, openShift } = useRegisterShiftStore();
    const currentUser = useAuthStore((state) => state.user);

    React.useEffect(() => {
        if (!hasChecked) {
            fetchActiveShift();
        }
    }, [hasChecked, fetchActiveShift]);

    // RHF Form for drawer opening
    const openForm = useForm<OpenShiftFormValues>({
        resolver: zodResolver(openShiftSchema),
        defaultValues: {
            startBalance: 5000,
            notes: ''
        }
    });

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

    const handleOpenSubmit = (values: OpenShiftFormValues) => {
        openShiftMutation.mutate(values);
    };

    if (isLoading || !hasChecked) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Spinner className="h-7 w-7 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">Validating register shift status...</p>
                </div>
            </div>
        );
    }

    if (!activeShift) {
        // Render Lock Overlay for POS Drawer Requirement
        return (
            <div className="grow flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-lg">
                    <Card className="shadow-2xl border-border/70 bg-card/60 backdrop-blur-md relative overflow-hidden transition-all duration-300">
                        {/* Lock Accent Stripe */}
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-destructive" />

                        <CardHeader className="text-center pt-8 border-b border-border/40 pb-5">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 text-destructive mb-3">
                                <Lock className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-xl font-bold text-foreground">Cashier Register Drawer Locked</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                                An active register shift session is required to proceed with point of sale transactions and checkouts.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pt-6">
                            <Form {...openForm}>
                                <form onSubmit={openForm.handleSubmit(handleOpenSubmit)} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={openForm.control}
                                            name="startBalance"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/85 flex items-center gap-1.5">
                                                        <Coins className="size-3.5 text-muted-foreground" />
                                                        Opening Drawer Cash (₱)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="5000.00"
                                                            value={field.value}
                                                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                            className="h-9 bg-background/50"
                                                        />
                                                    </FormControl>
                                                    <FormDescription className="text-xs text-muted-foreground leading-tight">
                                                        Starting cash in drawer for daily customer changes.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="flex items-center gap-2.5 bg-muted/30 p-3 rounded-xl border border-border/50 self-start mt-2">
                                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                                                <User className="size-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-xs text-muted-foreground block font-medium">Logged Cashier</span>
                                                <span className="text-xs font-bold text-foreground truncate block">
                                                    {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'POS Operator'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <FormField
                                        control={openForm.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/85">Opening Shift Notes</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Add notes about cash drawer count, shift sched, or terminal ID..."
                                                        value={field.value || ''}
                                                        onChange={field.onChange}
                                                        className="bg-background/50 text-xs resize-none"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Alert className="border-destructive/20 bg-destructive/5 text-destructive rounded-xl py-3">
                                        <ShieldAlert className="h-4 w-4" />
                                        <AlertTitle className="font-bold text-xs">Checkout Blocked</AlertTitle>
                                        <AlertDescription className="text-2xs font-medium mt-0.5">
                                            Sales posting and drawer balance locks are enforced. Open the shift register to initialize checkout.
                                        </AlertDescription>
                                    </Alert>

                                    <Button
                                        type="submit"
                                        disabled={openShiftMutation.isPending}
                                        className="w-full h-9 gap-1.5 shadow-sm mt-4 bg-primary text-primary-foreground"
                                    >
                                        {openShiftMutation.isPending ? (
                                            <>
                                                <Spinner className="h-4 w-4 animate-spin" />
                                                Starting POS Session...
                                            </>
                                        ) : (
                                            <>
                                                <ArrowRight className="size-4" />
                                                Open Drawer & Start Sales
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Render unlocked active POS workspace
    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Monitor className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">POS Sales Checkout</h1>
                        <p className="text-xs text-muted-foreground">Process customer payments, beverage custom orders, and generate prints.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-semibold">
                    <CheckCircle2 className="size-4" />
                    Shift Drawer Active: ₱{activeShift.startBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>

            {/* POS Checkout placeholder workspace */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <Card className="shadow-xs border-border/60 bg-card/40 backdrop-blur-xs min-h-[300px] flex flex-col items-center justify-center text-center p-8">
                        <ShoppingBag className="size-10 text-muted-foreground/75 mb-3" />
                        <h3 className="text-base font-bold text-foreground">Menu Products Catalog Workspace</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mt-1">
                            Products catalogue list is unblocked. Select drinks items to build cashier checkout carts and process sales.
                        </p>
                    </Card>
                </div>

                <div>
                    <Card className="shadow-xs border-border/60 bg-card/40 backdrop-blur-xs min-h-[300px] flex flex-col justify-between p-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Active Drawer Session</h4>
                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground font-semibold">Active Cashier:</span>
                                    <span className="font-bold text-foreground">
                                        {activeShift.cashier
                                            ? `${activeShift.cashier.firstName} ${activeShift.cashier.lastName}`
                                            : `${currentUser?.firstName} ${currentUser?.lastName}`}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground font-semibold">Opened At:</span>
                                    <span className="font-medium text-foreground">{format(new Date(activeShift.openedAt), 'hh:mm a (MMM dd)')}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <span className="text-muted-foreground font-semibold">Starting balance:</span>
                                    <span className="font-bold text-foreground">₱{activeShift.startBalance.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border/40 space-y-2.5">
                            <div className="text-2xs text-muted-foreground font-medium flex items-start gap-1">
                                <Clock className="size-3 shrink-0 mt-0.5" />
                                <span>Physical cash sales transaction details are aggregated and saved to the database.</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
