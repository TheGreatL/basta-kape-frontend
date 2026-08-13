import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PackagePlus, Trash2, Sliders, CalendarIcon } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';

import { createDelivery, createAdjustment, updatePhysicalCount, getIngredients } from '#/api/inventory.api.ts';
import { getSuppliersList } from '#/api/suppliers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IIngredient, TAdjustmentType } from '../inventory.types';
import type { ISupplierListItem } from '#/feature/suppliers/suppliers.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';
import { Calendar } from '#/components/ui/calendar.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import { cn } from '#/lib/utils.ts';

export type TStockActionMode = 'ADD_STOCK' | 'LOG_WASTE' | 'CORRECTION';

const WASTE_TYPE_OPTIONS: { value: TAdjustmentType; label: string }[] = [
    { value: 'WASTE', label: 'General Waste / Damage' },
    { value: 'SPOILED', label: 'Spoiled / Quality Loss' },
    { value: 'EXPIRED', label: 'Expired Product' },
    { value: 'THEFT', label: 'Theft / Missing Stock' },
    { value: 'PROMOTIONAL_USE', label: 'Promotional Use / Sample' }
];

const unifiedFormSchema = z.object({
    mode: z.enum(['ADD_STOCK', 'LOG_WASTE', 'CORRECTION']),
    ingredientId: z.string().uuid('Please select a valid raw ingredient'),
    // Delivery fields
    supplierId: z.string().uuid('Please select a valid supplier').or(z.literal('')).optional(),
    quantityReceived: z.number().optional(),
    unitCost: z.number().min(0).optional(),
    batchNumber: z.string().max(100).optional(),
    expiryDate: z.string().optional(),
    // Waste fields
    adjustmentType: z.enum(['WASTE', 'SPOILED', 'EXPIRED', 'THEFT', 'PROMOTIONAL_USE', 'PHYSICAL_COUNT_DISCREPANCY']).optional(),
    adjustmentQuantity: z.number().optional(),
    reason: z.string().max(500).optional(),
    // Physical Count Sync fields
    actualPhysicalCount: z.number().min(0, 'Physical count cannot be negative').optional()
});

type UnifiedFormValues = z.infer<typeof unifiedFormSchema>;

interface UnifiedStockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialMode?: TStockActionMode;
    preselectedIngredient?: IIngredient | null;
    currentSystemStock?: number;
}

export default function UnifiedStockDialog({
    open,
    onOpenChange,
    initialMode = 'ADD_STOCK',
    preselectedIngredient,
    currentSystemStock
}: UnifiedStockDialogProps) {
    const queryClient = useQueryClient();
    const [mode, setMode] = React.useState<TStockActionMode>(initialMode);
    const [selectedIngredient, setSelectedIngredient] = React.useState<IIngredient | null>(preselectedIngredient || null);

    const form = useForm<UnifiedFormValues>({
        resolver: zodResolver(unifiedFormSchema),
        defaultValues: {
            mode: initialMode,
            ingredientId: preselectedIngredient?.id || '',
            supplierId: '',
            quantityReceived: 0,
            unitCost: 0,
            batchNumber: '',
            expiryDate: '',
            adjustmentType: 'WASTE',
            adjustmentQuantity: 0,
            reason: '',
            actualPhysicalCount: currentSystemStock ?? 0
        }
    });

    React.useEffect(() => {
        if (open) {
            setMode(initialMode);
            setSelectedIngredient(preselectedIngredient || null);
            form.reset({
                mode: initialMode,
                ingredientId: preselectedIngredient?.id || '',
                supplierId: '',
                quantityReceived: 0,
                unitCost: 0,
                batchNumber: '',
                expiryDate: '',
                adjustmentType: 'WASTE',
                adjustmentQuantity: 0,
                reason: '',
                actualPhysicalCount: currentSystemStock ?? 0
            });
        }
    }, [open, initialMode, preselectedIngredient, currentSystemStock, form]);

    const handleModeChange = (newMode: TStockActionMode) => {
        setMode(newMode);
        form.setValue('mode', newMode);
    };

    // Delivery mutation
    const deliveryMutation = useMutation({
        mutationFn: createDelivery,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.DELIVERIES_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            toast.success('Stock Replenishment Logged', {
                description: 'Incoming ingredient stock incremented successfully.'
            });
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to log delivery', { description: getErrorMessage(err) });
        }
    });

    // Waste / Adjustment mutation
    const adjustmentMutation = useMutation({
        mutationFn: createAdjustment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.ADJUSTMENTS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            toast.success('Stock Adjustment Logged', {
                description: 'Ingredient inventory count adjusted successfully.'
            });
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to log adjustment', { description: getErrorMessage(err) });
        }
    });

    // Physical Count Overwrite mutation
    const physicalCountMutation = useMutation({
        mutationFn: ({ ingredientId, currentQuantity }: { ingredientId: string; currentQuantity: number }) =>
            updatePhysicalCount(ingredientId, currentQuantity),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.ADJUSTMENTS_LIST] });
            toast.success('Physical Count Audit Saved', {
                description: 'Inventory level updated and audit timestamp logged.'
            });
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to update physical count', { description: getErrorMessage(err) });
        }
    });

    const onSubmit = (values: UnifiedFormValues) => {
        if (mode === 'ADD_STOCK') {
            if (!values.quantityReceived || values.quantityReceived <= 0) {
                form.setError('quantityReceived', { message: 'Received quantity must be greater than 0' });
                return;
            }
            deliveryMutation.mutate({
                ingredientId: values.ingredientId,
                supplierId: values.supplierId || null,
                quantityReceived: values.quantityReceived,
                unitCost: values.unitCost || 0,
                batchNumber: values.batchNumber || undefined,
                expiryDate: values.expiryDate ? new Date(values.expiryDate).toISOString() : null
            });
        } else if (mode === 'LOG_WASTE') {
            if (!values.adjustmentQuantity || values.adjustmentQuantity <= 0) {
                form.setError('adjustmentQuantity', { message: 'Quantity must be greater than 0' });
                return;
            }
            adjustmentMutation.mutate({
                ingredientId: values.ingredientId,
                quantity: -Math.abs(values.adjustmentQuantity),
                type: values.adjustmentType || 'WASTE',
                reason: values.reason || undefined
            });
        } else {
            if (values.actualPhysicalCount === undefined || values.actualPhysicalCount < 0) {
                form.setError('actualPhysicalCount', { message: 'Physical count cannot be negative' });
                return;
            }
            physicalCountMutation.mutate({
                ingredientId: values.ingredientId,
                currentQuantity: values.actualPhysicalCount
            });
        }
    };

    const isPending = deliveryMutation.isPending || adjustmentMutation.isPending || physicalCountMutation.isPending;
    const unitAbbr = selectedIngredient?.defaultUnit?.abbreviation || selectedIngredient?.defaultUnit?.name || '';
    const watchActualCount = form.watch('actualPhysicalCount');
    const calculatedDiff = currentSystemStock !== undefined && watchActualCount !== undefined ? watchActualCount - currentSystemStock : undefined;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-3">
                    <DialogTitle className="text-xl font-bold">Manage Inventory Stock</DialogTitle>
                    <DialogDescription className="text-xs">
                        Replenish incoming stock, log waste/spoilage, or sync physical shelf counts.
                    </DialogDescription>

                    {/* Mode Segmented Tab Switcher */}
                    <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg mt-3">
                        <button
                            type="button"
                            onClick={() => handleModeChange('ADD_STOCK')}
                            className={cn(
                                'flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                                mode === 'ADD_STOCK' ? 'bg-background text-emerald-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <PackagePlus className="size-3.5" /> Add Stock
                        </button>

                        <button
                            type="button"
                            onClick={() => handleModeChange('LOG_WASTE')}
                            className={cn(
                                'flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                                mode === 'LOG_WASTE' ? 'bg-background text-rose-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Trash2 className="size-3.5" /> Log Waste
                        </button>

                        <button
                            type="button"
                            onClick={() => handleModeChange('CORRECTION')}
                            className={cn(
                                'flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                                mode === 'CORRECTION' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Sliders className="size-3.5" /> Count Sync
                        </button>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {/* Raw Ingredient Select */}
                            <FormField
                                control={form.control}
                                name="ingredientId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80">Raw Ingredient</FormLabel>
                                        <FormControl>
                                            <InfiniteSelect<IIngredient>
                                                queryKey={[QUERY_KEY.INVENTORY.INGREDIENTS_LIST]}
                                                fetchFn={async ({ pageParam, query }) => {
                                                    return getIngredients({
                                                        page: pageParam || 1,
                                                        limit: 20,
                                                        search: query,
                                                        status: 'active'
                                                    });
                                                }}
                                                getItems={(resPage) => resPage.data}
                                                getNextPageParam={(lastPage) => {
                                                    return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                                }}
                                                value={field.value}
                                                onChange={(val, item) => {
                                                    field.onChange(val);
                                                    setSelectedIngredient(item || null);
                                                }}
                                                getOptionValue={(item) => item.id}
                                                getOptionLabel={(item) => {
                                                    const unitStr = item.defaultUnit
                                                        ? ` (${item.defaultUnit.abbreviation || item.defaultUnit.name})`
                                                        : '';
                                                    return `${item.name}${unitStr}`;
                                                }}
                                                selectedItem={preselectedIngredient || undefined}
                                                placeholder="Choose ingredient..."
                                                searchPlaceholder="Search ingredients..."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 🟢 MODE 1: ADD STOCK (DELIVERY) */}
                            {mode === 'ADD_STOCK' && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="supplierId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Select Supplier (Optional)</FormLabel>
                                                <FormControl>
                                                    <InfiniteSelect<ISupplierListItem>
                                                        queryKey={[QUERY_KEY.SUPPLIERS.SUPPLIERS_LIST]}
                                                        fetchFn={async ({ pageParam, query }) => {
                                                            return getSuppliersList({
                                                                page: pageParam || 1,
                                                                limit: 20,
                                                                search: query,
                                                                status: 'active'
                                                            });
                                                        }}
                                                        getItems={(resPage) => resPage.data}
                                                        getNextPageParam={(lastPage) => {
                                                            return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                                        }}
                                                        value={field.value || ''}
                                                        onChange={(val) => field.onChange(val || '')}
                                                        getOptionValue={(item) => item.id}
                                                        getOptionLabel={(item) => item.name}
                                                        placeholder="Choose supplier profile..."
                                                        searchPlaceholder="Search suppliers..."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="quantityReceived"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80">Qty Received</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            {...field}
                                                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                            className="h-9 bg-background/50"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="unitCost"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80">Unit Cost (₱)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            {...field}
                                                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                            className="h-9 bg-background/50"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="batchNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Lot / Batch Code</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. BATCH-A45" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="expiryDate"
                                        render={({ field }) => {
                                            const parsedDate = field.value ? parse(field.value, 'yyyy-MM-dd', new Date()) : undefined;
                                            const date = parsedDate && isValid(parsedDate) ? parsedDate : undefined;

                                            return (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel className="font-semibold text-foreground/80">Expiration Date</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        'w-full h-9 pl-3 text-left font-normal bg-background/50',
                                                                        !field.value && 'text-muted-foreground'
                                                                    )}
                                                                >
                                                                    {field.value && date ? format(date, 'PPP') : <span>Pick expiration date</span>}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={date}
                                                                onSelect={(selectedDate) => {
                                                                    field.onChange(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
                                                                }}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }}
                                    />
                                </>
                            )}

                            {/* 🔴 MODE 2: LOG WASTE */}
                            {mode === 'LOG_WASTE' && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="adjustmentType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Waste Reason Category</FormLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 bg-background/50">
                                                            <SelectValue placeholder="Select reason category..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {WASTE_TYPE_OPTIONS.map((opt) => (
                                                            <SelectItem key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="adjustmentQuantity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between">
                                                    <FormLabel className="font-semibold text-foreground/80">Deduction Quantity</FormLabel>
                                                    {unitAbbr && (
                                                        <span className="text-xs font-semibold text-rose-600 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                                                            Unit: {unitAbbr}
                                                        </span>
                                                    )}
                                                </div>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        placeholder="e.g. 500"
                                                        {...field}
                                                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                        className="h-9 bg-background/50"
                                                    />
                                                </FormControl>
                                                <p className="text-[11px] text-muted-foreground">Enter amount to deduct from active stock count.</p>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="reason"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Notes / Details</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Spilled during prep, damaged package..."
                                                        className="min-h-[80px] bg-background/50 resize-y text-xs"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {/* 🔵 MODE 3: PHYSICAL COUNT CORRECTION */}
                            {mode === 'CORRECTION' && (
                                <>
                                    {currentSystemStock !== undefined && (
                                        <div className="rounded-lg border bg-muted/20 p-3 flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-medium">Current System Stock:</span>
                                            <span className="font-bold text-foreground">
                                                {currentSystemStock.toLocaleString()} {unitAbbr}
                                            </span>
                                        </div>
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="actualPhysicalCount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between">
                                                    <FormLabel className="font-semibold text-foreground/80">Actual Physical Count On Shelf</FormLabel>
                                                    {unitAbbr && (
                                                        <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                                                            Unit: {unitAbbr}
                                                        </span>
                                                    )}
                                                </div>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        placeholder="Enter actual counted units on shelf..."
                                                        {...field}
                                                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                        className="h-9 bg-background/50"
                                                    />
                                                </FormControl>
                                                {calculatedDiff !== undefined && (
                                                    <p
                                                        className={`text-xs font-semibold ${
                                                            calculatedDiff === 0
                                                                ? 'text-emerald-600'
                                                                : calculatedDiff < 0
                                                                  ? 'text-rose-600'
                                                                  : 'text-primary'
                                                        }`}
                                                    >
                                                        Net Discrepancy: {calculatedDiff > 0 ? '+' : ''}
                                                        {calculatedDiff.toLocaleString()} {unitAbbr}
                                                    </p>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-muted/30 mt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending} className="h-9">
                                {isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Saving...
                                    </div>
                                ) : mode === 'ADD_STOCK' ? (
                                    'Add Stock'
                                ) : mode === 'LOG_WASTE' ? (
                                    'Deduct Waste'
                                ) : (
                                    'Update Physical Count'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
