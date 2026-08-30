import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, AlertTriangle, FileText } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Badge } from '#/components/ui/badge.tsx';

import { disposeBatchSchema } from '../food-prep.schema';
import type { TDisposeBatchSchema } from '../food-prep.schema';
import { disposePreparedBatch } from '#/api/food-prep.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IPreparedItemBatch, PreparedAdjustmentType } from '../food-prep.types';

interface DisposeBatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    batch: IPreparedItemBatch | null;
}

const DISPOSAL_REASONS: Array<{ value: PreparedAdjustmentType; label: string; description: string }> = [
    { value: 'EXPIRED', label: 'Expired', description: 'Reached end of shelf-life validity' },
    { value: 'SPOILED', label: 'Spoiled / Degraded', description: 'Visual defect or quality degradation' },
    { value: 'WASTE', label: 'Accidental Waste', description: 'Dropped, spilled, or contaminated' },
    { value: 'SAMPLING', label: 'Customer Sampling', description: 'Given as promotional taste tests' },
    { value: 'DISPOSED', label: 'General Disposal', description: 'Scheduled end-of-day shelf clearing' },
    { value: 'CORRECTION', label: 'Stock Correction', description: 'Audit count reconciliation' }
];

export default function DisposeBatchDialog({ open, onOpenChange, batch }: DisposeBatchDialogProps) {
    const queryClient = useQueryClient();

    const maxAvailable = batch?.currentQuantity ?? 1;

    const form = useForm<TDisposeBatchSchema>({
        resolver: zodResolver(disposeBatchSchema),
        defaultValues: {
            quantity: maxAvailable,
            reason: batch?.status === 'EXPIRED' ? 'EXPIRED' : 'DISPOSED',
            notes: ''
        }
    });

    React.useEffect(() => {
        if (open && batch) {
            form.reset({
                quantity: batch.currentQuantity,
                reason: batch.status === 'EXPIRED' ? 'EXPIRED' : 'DISPOSED',
                notes: ''
            });
        }
    }, [open, batch, form]);

    const mutation = useMutation({
        mutationFn: (payload: TDisposeBatchSchema) => {
            if (!batch) throw new Error('No batch selected');
            return disposePreparedBatch(batch.id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.FOOD_PREP.SUMMARY] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.FOOD_PREP.BATCHES_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.MENU.CATALOG] });
            toast.success('Disposal Recorded', {
                description: `Successfully wrote off units from batch ${batch?.batchNumber}.`
            });
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to record disposal', {
                description: getErrorMessage(err)
            });
        }
    });

    const onSubmit = (values: TDisposeBatchSchema) => {
        if (values.quantity > maxAvailable) {
            form.setError('quantity', {
                message: `Cannot dispose more than ${maxAvailable} available units`
            });
            return;
        }
        mutation.mutate(values);
    };

    if (!batch) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-6">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <Trash2 className="size-5" />
                        Dispose / Write-Off Batch Units
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Record discarded, spoiled, or sampled display units. These units will be deducted from active shelf inventory.
                    </DialogDescription>
                </DialogHeader>

                {/* Batch Context Card */}
                <div className="bg-muted/20 border border-border/40 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-foreground">{batch.batchNumber}</span>
                        <Badge variant="outline" className="text-xs font-semibold">
                            {batch.currentQuantity} Available
                        </Badge>
                    </div>
                    <p className="text-muted-foreground font-medium truncate">
                        {batch.product?.name} ({batch.variant?.sku || 'Standard Variant'})
                    </p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Quantity to Dispose */}
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-xs font-semibold text-foreground/80">Units to Discard</FormLabel>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => form.setValue('quantity', maxAvailable)}
                                                className="h-5 px-1.5 text-xs text-primary font-bold hover:bg-transparent"
                                            >
                                                Max ({maxAvailable})
                                            </Button>
                                        </div>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={maxAvailable}
                                                step={1}
                                                {...field}
                                                className="h-9 bg-background/50 rounded-xl text-xs font-bold"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Reason Selector */}
                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-foreground/80">Disposal Reason</FormLabel>
                                        <Select value={field.value} onValueChange={(val: PreparedAdjustmentType) => field.onChange(val)}>
                                            <FormControl>
                                                <SelectTrigger className="h-9 bg-background/50 rounded-xl text-xs font-semibold">
                                                    <SelectValue placeholder="Select reason" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {DISPOSAL_REASONS.map((r) => (
                                                    <SelectItem key={r.value} value={r.value} className="text-xs">
                                                        <div className="space-y-0.5">
                                                            <div className="font-semibold">{r.label}</div>
                                                            <div className="text-xs text-muted-foreground">{r.description}</div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Optional Notes */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                                        <FileText className="size-3" /> Audit Notes / Justification
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="e.g. Items left on display overnight past 24-hour mark..."
                                            className="min-h-[60px] bg-background/50 text-xs rounded-xl resize-none"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Caution Alert */}
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 flex items-start gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="size-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>Disposed units are permanent audit entries and immediately reduce POS available stock counts.</span>
                        </div>

                        <DialogFooter className="pt-2 gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs font-bold">
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" disabled={mutation.isPending} className="h-9 px-4 text-xs font-bold gap-1.5">
                                {mutation.isPending ? (
                                    <>
                                        <Spinner className="size-4 animate-spin" /> Discarding...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="size-4" /> Confirm Disposal
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
