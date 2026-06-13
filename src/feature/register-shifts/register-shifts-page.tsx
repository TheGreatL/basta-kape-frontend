import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Timer, Clock, Coins, FileText, CheckCircle2, AlertTriangle, User, ArrowRight, History } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { useRegisterShiftStore } from '#/store/register-shift-store.ts';
import { useAuthStore } from '#/store/auth-store.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card.tsx';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert.tsx';
import type { IRegisterShift } from './register-shifts.types';

// Validation Schemas
const openShiftSchema = z.object({
    startBalance: z.number().min(0, 'Starting balance must be non-negative'),
    notes: z.string().max(1000, 'Max 1000 characters').optional().nullable()
});

const closeShiftSchema = z.object({
    actualBalance: z.number().min(0, 'Physical balance count must be non-negative'),
    notes: z.string().max(1000, 'Max 1000 characters').optional().nullable()
});

type OpenShiftFormValues = z.infer<typeof openShiftSchema>;
type CloseShiftFormValues = z.infer<typeof closeShiftSchema>;

export default function RegisterShiftsPage() {
    const { activeShift, isLoading, hasChecked, fetchActiveShift, openShift, closeShift } = useRegisterShiftStore();
    const currentUser = useAuthStore((state) => state.user);
    const [closedSummary, setClosedSummary] = React.useState<IRegisterShift | null>(null);

    const queryClient = useQueryClient();

    React.useEffect(() => {
        fetchActiveShift();
    }, [fetchActiveShift]);

    // RHF Forms
    const openForm = useForm<OpenShiftFormValues>({
        resolver: zodResolver(openShiftSchema),
        defaultValues: {
            startBalance: 5000,
            notes: ''
        }
    });

    const closeForm = useForm<CloseShiftFormValues>({
        resolver: zodResolver(closeShiftSchema),
        defaultValues: {
            actualBalance: 0,
            notes: ''
        }
    });

    // Mutations
    const openShiftMutation = useMutation({
        mutationFn: openShift,
        onSuccess: (shift) => {
            toast.success('Register Shift Drawer Opened', {
                description: `Shift session successfully initialized with standard balance of ₱${shift.startBalance.toFixed(2)}.`
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.REGISTER_SHIFTS.HISTORY] });
            openForm.reset();
        },
        onError: (err) => {
            toast.error('Failed to open register shift', {
                description: getErrorMessage(err)
            });
        }
    });

    const closeShiftMutation = useMutation({
        mutationFn: closeShift,
        onSuccess: (shift) => {
            toast.success('Register Shift Drawer Closed', {
                description: 'Operational shift session successfully ended and drawer settled.'
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.REGISTER_SHIFTS.HISTORY] });
            setClosedSummary(shift);
            closeForm.reset();
        },
        onError: (err) => {
            toast.error('Failed to close register shift', {
                description: getErrorMessage(err)
            });
        }
    });

    const handleOpenSubmit = (values: OpenShiftFormValues) => {
        openShiftMutation.mutate(values);
    };

    const handleCloseSubmit = (values: CloseShiftFormValues) => {
        closeShiftMutation.mutate(values);
    };

    if (isLoading && !hasChecked) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Spinner className="h-7 w-7 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">Checking active shift drawer status...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Timer className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Shift Drawer Management</h1>
                        <p className="text-xs text-muted-foreground">Open or close register sessions and verify daily drawer balances.</p>
                    </div>
                </div>
                <div>
                    <Link to="/admin/register-shifts/history">
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 w-full sm:w-auto">
                            <History className="size-4" />
                            View Shift History Logs
                        </Button>
                    </Link>
                </div>
            </div>

            {activeShift ? (
                // Active Shift Session View
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Active Shift Details Card */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <Card className="shadow-xs border-border/60 bg-card/40 backdrop-blur-xs">
                            <CardHeader className="border-b border-border/40 pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                                        <Timer className="size-5 text-emerald-600" />
                                        Active Shift Session
                                    </CardTitle>
                                    <Badge className="bg-emerald-100/90 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40 font-semibold px-2.5 py-0.5 text-xs">
                                        Open Session
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    You have a running register shift session. Close this drawer session when leaving POS duties.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 mt-0.5">
                                        <User className="size-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground block font-medium">Assigned Cashier</span>
                                        <span className="text-sm font-bold text-foreground">
                                            {activeShift.cashier
                                                ? `${activeShift.cashier.firstName} ${activeShift.cashier.lastName}`
                                                : `${currentUser?.firstName} ${currentUser?.lastName}`}
                                        </span>
                                        <span className="text-xs text-muted-foreground block mt-0.5">
                                            @{activeShift.cashier?.username || currentUser?.username}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 mt-0.5">
                                        <Clock className="size-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground block font-medium">Opened Time</span>
                                        <span className="text-sm font-bold text-foreground">
                                            {format(new Date(activeShift.openedAt), 'MMM dd, yyyy - hh:mm a')}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 mt-0.5">
                                        <Coins className="size-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground block font-medium">Opening Start Cash</span>
                                        <span className="text-sm font-bold text-foreground">
                                            ₱
                                            {activeShift.startBalance.toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 mt-0.5">
                                        <FileText className="size-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground block font-medium">Opening Notes</span>
                                        <span className="text-sm font-medium text-foreground italic">
                                            {activeShift.notes || 'No notes provided at opening.'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Alert className="border-emerald-500/20 bg-emerald-500/5 text-emerald-600 rounded-xl">
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle className="font-bold">Drawer Unlocked</AlertTitle>
                            <AlertDescription className="text-xs font-medium">
                                Cashier transactions and sales checkout endpoints are active and ready.
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Settle / Close Drawer Card */}
                    <div>
                        <Card className="shadow-xs border-border/60 bg-card/40 backdrop-blur-xs">
                            <CardHeader className="border-b border-border/40 pb-4">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Coins className="size-5 text-primary" />
                                    Close & Settle Drawer
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Count physical cash in the drawer and settle the active register shift session.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <Form {...closeForm}>
                                    <form onSubmit={closeForm.handleSubmit(handleCloseSubmit)} className="space-y-4">
                                        <FormField
                                            control={closeForm.control}
                                            name="actualBalance"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1">
                                                        <Coins className="size-3.5 text-muted-foreground" />
                                                        Physical Cash Count (₱)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={field.value}
                                                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                            className="h-9 bg-background/50"
                                                        />
                                                    </FormControl>
                                                    <FormDescription className="text-xs text-muted-foreground">
                                                        Enter exact final drawer cash. Discrepancies will be logged automatically.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={closeForm.control}
                                            name="notes"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80">Settle Comments / Notes</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="e.g. Morning drawer was fully balanced, no discrepancies found."
                                                            value={field.value || ''}
                                                            onChange={field.onChange}
                                                            className="bg-background/50 text-xs resize-none"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <Button
                                            type="submit"
                                            disabled={closeShiftMutation.isPending}
                                            className="w-full h-9 gap-1.5 shadow-sm bg-amber-600 hover:bg-amber-700 text-white"
                                        >
                                            {closeShiftMutation.isPending ? (
                                                <>
                                                    <Spinner className="h-4 w-4 animate-spin" />
                                                    Settling Shift...
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowRight className="size-4" />
                                                    Settle & Close Shift
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                // Open Shift Form View
                <div className="max-w-2xl mx-auto">
                    <Card className="shadow-xs border-border/60 bg-card/40 backdrop-blur-xs">
                        <CardHeader className="border-b border-border/40 pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Timer className="size-5 text-primary" />
                                Open New Shift Drawer
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Set drawer starting balance and notes to initialize register session.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Form {...openForm}>
                                <form onSubmit={openForm.handleSubmit(handleOpenSubmit)} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={openForm.control}
                                            name="startBalance"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1">
                                                        <Coins className="size-3.5 text-muted-foreground" />
                                                        Opening Start Cash (₱)
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
                                                    <FormDescription className="text-xs text-muted-foreground">
                                                        The amount of cash placed in the register for change.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-xl border border-primary/20 mt-4 md:mt-6 h-fit self-start">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                                                <User className="size-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-xs text-muted-foreground block font-medium leading-none">Starting Cashier</span>
                                                <span className="text-xs font-bold text-foreground truncate block mt-0.5">
                                                    {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System Cashier'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <FormField
                                        control={openForm.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Opening Comments / Notes</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="e.g. Standard morning cash drawer load."
                                                        value={field.value || ''}
                                                        onChange={field.onChange}
                                                        className="bg-background/50 text-xs resize-none"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Alert className="border-amber-500/20 bg-amber-500/5 text-amber-600 rounded-xl">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle className="font-bold">POS Drawer Locked</AlertTitle>
                                        <AlertDescription className="text-xs font-medium">
                                            No active register shift is open for your account. You must open a register session to proceed with
                                            cashier POS transactions.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="flex justify-end border-t border-border/40 pt-4 mt-6">
                                        <Button type="submit" disabled={openShiftMutation.isPending} className="h-9 gap-1.5 shadow-sm min-w-[150px]">
                                            {openShiftMutation.isPending ? (
                                                <>
                                                    <Spinner className="h-4 w-4 animate-spin" />
                                                    Opening Shift...
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowRight className="size-4" />
                                                    Open Shift Session
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Shift Summary Dialog */}
            <Dialog open={!!closedSummary} onOpenChange={(open) => !open && setClosedSummary(null)}>
                {closedSummary && (
                    <DialogContent className="max-w-md bg-background rounded-2xl overflow-hidden p-0 border border-border/80 shadow-2xl">
                        <DialogHeader className="px-6 pt-6 pb-2">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 mb-2">
                                <CheckCircle2 className="h-6 w-6 animate-bounce" />
                            </div>
                            <DialogTitle className="text-center text-xl font-bold">Register Shift Closed</DialogTitle>
                            <DialogDescription className="text-center text-xs text-muted-foreground">
                                Shift session ended. Here is the summary of transactions and cash drawer discrepancy.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="px-6 py-4 space-y-4">
                            {/* Summary Cards */}
                            <div className="bg-muted/20 p-4 rounded-xl border border-border/40 space-y-3">
                                <div className="flex items-center justify-between text-xs border-b border-border/30 pb-2">
                                    <span className="text-muted-foreground font-semibold">Opening Cash (Start)</span>
                                    <span className="font-bold text-foreground">
                                        ₱
                                        {closedSummary.startBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs border-b border-border/30 pb-2">
                                    <span className="text-muted-foreground font-semibold">Aggregate Cash Sales</span>
                                    <span className="font-bold text-foreground">
                                        ₱
                                        {((closedSummary.endBalance ?? 0) - closedSummary.startBalance).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs border-b border-border/30 pb-2">
                                    <span className="text-muted-foreground font-semibold">Expected Cash (End)</span>
                                    <span className="font-bold text-foreground">
                                        ₱
                                        {(closedSummary.endBalance ?? 0).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs pb-1">
                                    <span className="text-muted-foreground font-semibold">Physical Cash Drawer Count</span>
                                    <span className="font-bold text-foreground">
                                        ₱
                                        {(closedSummary.actualBalance ?? 0).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </span>
                                </div>
                            </div>

                            {/* Discrepancy Status Card */}
                            {(() => {
                                const difference = (closedSummary.actualBalance ?? 0) - (closedSummary.endBalance ?? 0);
                                if (difference === 0) {
                                    return (
                                        <Alert className="border-emerald-500/20 bg-emerald-500/5 text-emerald-600 rounded-xl py-3">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <AlertTitle className="font-bold text-xs">Drawer Balanced</AlertTitle>
                                            <AlertDescription className="text-xs font-medium mt-0.5">
                                                No discrepancies detected. All physical cash counts perfectly match expected electronic transactions.
                                            </AlertDescription>
                                        </Alert>
                                    );
                                }

                                const isShort = difference < 0;
                                return (
                                    <Alert
                                        className={`rounded-xl py-3 ${
                                            isShort
                                                ? 'border-destructive/20 bg-destructive/5 text-destructive'
                                                : 'border-amber-500/20 bg-amber-500/5 text-amber-600'
                                        }`}
                                    >
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle className="font-bold text-xs">{isShort ? 'Drawer Shortage' : 'Drawer Surplus'}</AlertTitle>
                                        <AlertDescription className="text-xs font-medium mt-0.5">
                                            Drawer is {isShort ? 'short' : 'over'} by{' '}
                                            <span className="font-bold">
                                                ₱
                                                {Math.abs(difference).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </span>
                                            . Discrepancy was logged under audit details.
                                        </AlertDescription>
                                    </Alert>
                                );
                            })()}
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                            <Button type="button" onClick={() => setClosedSummary(null)} className="w-full h-9">
                                Close Summary
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
}
