import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Cookie, Plus, Clock, FileText, Check, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import { cn } from '#/lib/utils.ts';

import { createBatchSchema } from '../food-prep.schema';
import type { TCreateBatchSchema } from '../food-prep.schema';
import { createPreparedBatch } from '#/api/food-prep.api.ts';
import { getProductionForecast } from '#/api/inventory.api.ts';
import { getProductById } from '#/api/products.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IDisplayStockItemSummary } from '../food-prep.types';
import type { IForecast } from '#/feature/inventory/inventory.types';

interface BakeBatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preselectedItem?: IDisplayStockItemSummary | null;
}

const SHELF_LIFE_PRESETS = [
    { label: '6 Hours', minutes: 360 },
    { label: '12 Hours', minutes: 720 },
    { label: '24 Hours (1 Day)', minutes: 1440 },
    { label: '48 Hours (2 Days)', minutes: 2880 },
    { label: '3 Days', minutes: 4320 },
    { label: '7 Days', minutes: 10080 },
    { label: '30 Days', minutes: 43200 }
];

export default function BakeBatchDialog({ open, onOpenChange, preselectedItem }: BakeBatchDialogProps) {
    const queryClient = useQueryClient();
    const [selectedForecast, setSelectedForecast] = React.useState<IForecast | null>(null);

    // Fetch real-time live raw ingredients forecast for preselected item
    const { data: preselectedForecastData, isLoading: isPreselectedForecastLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.FORECAST, 'bake-dialog-preselected', preselectedItem?.productVariantId],
        queryFn: () => getProductionForecast({ search: preselectedItem?.productName || '' }),
        enabled: open && !!preselectedItem?.productVariantId
    });

    const preselectedForecast = React.useMemo(() => {
        if (!preselectedForecastData || !preselectedItem) return null;
        return preselectedForecastData.data.find((f: IForecast) => f.variantId === preselectedItem.productVariantId) || null;
    }, [preselectedForecastData, preselectedItem]);

    const activeForecast = selectedForecast || preselectedForecast;
    const currentMaxProduceable = activeForecast ? activeForecast.maxProduceable : null;
    const bottleneck = activeForecast?.bottleneck || null;

    const selectedProductId = activeForecast?.productId || preselectedItem?.productId;

    // Query product details for defaultShelfLife
    const { data: productDetails } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, selectedProductId],
        queryFn: () => getProductById(selectedProductId!),
        enabled: open && !!selectedProductId
    });

    const form = useForm<TCreateBatchSchema>({
        resolver: zodResolver(createBatchSchema),
        defaultValues: {
            productVariantId: preselectedItem?.productVariantId || '',
            quantity: 12,
            shelfLifeMinutes: 1440,
            notes: ''
        }
    });

    // Sync defaultShelfLife if available
    React.useEffect(() => {
        if (productDetails?.defaultShelfLife) {
            form.setValue('shelfLifeMinutes', productDetails.defaultShelfLife);
        }
    }, [productDetails, form]);

    // Reset state when preselectedItem or dialog open state changes
    React.useEffect(() => {
        if (open) {
            setSelectedForecast(null);
            form.reset({
                productVariantId: preselectedItem?.productVariantId || '',
                quantity: 12,
                shelfLifeMinutes: 1440,
                notes: ''
            });
        }
    }, [open, preselectedItem, form]);

    // Adjust quantity when maxProduceable resolves for selected variant
    React.useEffect(() => {
        if (typeof currentMaxProduceable === 'number') {
            const currentQty = form.getValues('quantity');
            if (currentMaxProduceable === 0) {
                form.setValue('quantity', 0, { shouldValidate: true });
            } else if (currentQty > currentMaxProduceable || currentQty === 0) {
                form.setValue('quantity', Math.min(12, currentMaxProduceable), { shouldValidate: true });
            }
        }
    }, [currentMaxProduceable, form]);

    // Calculate calculated expiry timestamp live
    const shelfLifeMinutes = form.watch('shelfLifeMinutes') || 1440;
    const estimatedExpiry = React.useMemo(() => {
        const d = new Date(Date.now() + shelfLifeMinutes * 60 * 1000);
        return format(d, 'MMM d, yyyy, h:mm a');
    }, [shelfLifeMinutes]);

    const quantityValue = form.watch('quantity');
    const isExceedingStock = typeof currentMaxProduceable === 'number' && quantityValue > currentMaxProduceable;
    const isOutOfStock = typeof currentMaxProduceable === 'number' && currentMaxProduceable === 0;

    const mutation = useMutation({
        mutationFn: (payload: TCreateBatchSchema) => createPreparedBatch(payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.FOOD_PREP.SUMMARY] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.FOOD_PREP.BATCHES_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.MENU.CATALOG] });
            toast.success('Food Batch Recorded', {
                description: `Batch ${data.batchNumber} (${data.quantityPrepared} units) logged to display inventory.`
            });
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to log preparation batch', {
                description: getErrorMessage(err)
            });
        }
    });

    const onSubmit = (values: TCreateBatchSchema) => {
        if (isOutOfStock) {
            toast.error('Cannot record batch', {
                description: 'Raw recipe ingredients in inventory are depleted for this item.'
            });
            return;
        }

        if (typeof currentMaxProduceable === 'number' && values.quantity > currentMaxProduceable) {
            form.setError('quantity', {
                type: 'manual',
                message: `Quantity cannot exceed ${currentMaxProduceable} available units.`
            });
            return;
        }

        mutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px] p-6">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                        <Cookie className="size-5 text-primary" />
                        Record Food Preparation / Bake Batch
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Log freshly prepared pastries or food into display stock. Raw recipe ingredients will be automatically deducted from
                        inventory.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        {/* Infinite Product Variant Select using Inventory Capacity Forecasts */}
                        <FormField
                            control={form.control}
                            name="productVariantId"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="text-xs font-semibold text-foreground/80">Food Item & Variant</FormLabel>
                                        {isPreselectedForecastLoading ? (
                                            <span className="text-xs text-muted-foreground animate-pulse">Checking raw stock...</span>
                                        ) : typeof currentMaxProduceable === 'number' ? (
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-xs font-bold py-0.5 px-2',
                                                    currentMaxProduceable > 0
                                                        ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'
                                                        : 'text-destructive border-destructive/30 bg-destructive/10'
                                                )}
                                            >
                                                {currentMaxProduceable > 0
                                                    ? `${currentMaxProduceable} units produceable`
                                                    : '0 units produceable (Out of raw stock)'}
                                            </Badge>
                                        ) : currentMaxProduceable === 'Unlimited' ? (
                                            <Badge variant="outline" className="text-xs text-muted-foreground py-0.5 px-2">
                                                Unlimited Raw Stock
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <FormControl>
                                        <InfiniteSelect<IForecast>
                                            queryKey={[QUERY_KEY.INVENTORY.FORECAST, 'bake-batch-forecast-select']}
                                            fetchFn={async ({ pageParam, query }) => {
                                                return getProductionForecast({
                                                    page: pageParam || 1,
                                                    limit: 20,
                                                    search: query
                                                });
                                            }}
                                            getItems={(page) => page.data}
                                            getNextPageParam={(lastPage) => {
                                                return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                            }}
                                            value={field.value}
                                            onChange={(val, item) => {
                                                field.onChange(val || '');
                                                setSelectedForecast(item || null);
                                                if (typeof item?.maxProduceable === 'number') {
                                                    if (item.maxProduceable === 0) {
                                                        form.setValue('quantity', 0, { shouldValidate: true });
                                                    } else {
                                                        form.setValue('quantity', Math.min(12, item.maxProduceable), { shouldValidate: true });
                                                    }
                                                }
                                            }}
                                            getOptionValue={(item) => item.variantId}
                                            getOptionLabel={(item) => (
                                                <div className="flex items-center justify-between w-full gap-2">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold truncate text-xs">{item.name}</span>
                                                        {item.sku && (
                                                            <span className="text-xs text-muted-foreground font-mono truncate">{item.sku}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {typeof item.maxProduceable === 'number' ? (
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    'text-xs font-bold py-0 px-1.5',
                                                                    item.maxProduceable > 0
                                                                        ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'
                                                                        : 'text-destructive border-destructive/30 bg-destructive/10'
                                                                )}
                                                            >
                                                                {item.maxProduceable > 0 ? `${item.maxProduceable} bakeable` : '0 bakeable'}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-xs text-muted-foreground py-0 px-1.5">
                                                                Unlimited
                                                            </Badge>
                                                        )}
                                                        <span className="text-xs font-bold text-primary">₱{item.price.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            selectedItem={
                                                preselectedItem
                                                    ? {
                                                          variantId: preselectedItem.productVariantId,
                                                          productId: preselectedItem.productId,
                                                          name: `${preselectedItem.productName} (${preselectedItem.variantLabel || 'Standard'})`,
                                                          sku: preselectedItem.sku,
                                                          price: preselectedItem.price,
                                                          hasRecipe: true,
                                                          maxProduceable: preselectedForecast?.maxProduceable ?? 0,
                                                          bottleneck: preselectedForecast?.bottleneck ?? null,
                                                          ingredients: []
                                                      }
                                                    : undefined
                                            }
                                            placeholder="Search & select food product variant..."
                                            searchPlaceholder="Search products by name or SKU..."
                                            className="h-9 bg-background/50 rounded-xl text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Out of Stock Warning Banner with Bottleneck Details */}
                        {isOutOfStock && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2.5 text-xs text-destructive">
                                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <span className="font-bold">Insufficient Raw Stock</span>
                                    <p className="text-destructive/90 text-xs">
                                        Current inventory does not have enough raw recipe ingredients to bake or prepare this item.
                                        {bottleneck && (
                                            <span className="block mt-1 font-semibold">
                                                Limiting Ingredient: {bottleneck.name} ({bottleneck.currentQuantity} {bottleneck.unit} available,{' '}
                                                {bottleneck.requiredQuantity} {bottleneck.unit} required per unit)
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Quantity Prepared & Shelf Life Validity */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-xs font-semibold text-foreground/80">Quantity Prepared</FormLabel>
                                            {typeof currentMaxProduceable === 'number' && (
                                                <span className="text-xs text-muted-foreground">
                                                    Stock left:{' '}
                                                    <span
                                                        className={cn(
                                                            'font-bold',
                                                            currentMaxProduceable > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                                                        )}
                                                    >
                                                        {currentMaxProduceable}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative flex items-center">
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={
                                                        typeof currentMaxProduceable === 'number' && currentMaxProduceable > 0
                                                            ? currentMaxProduceable
                                                            : undefined
                                                    }
                                                    step={1}
                                                    placeholder="e.g. 12"
                                                    disabled={isOutOfStock}
                                                    {...field}
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                                                    className={cn(
                                                        'h-9 bg-background/50 rounded-xl text-xs font-bold',
                                                        typeof currentMaxProduceable === 'number' && currentMaxProduceable > 0 && 'pr-14',
                                                        isExceedingStock && 'border-destructive focus-visible:ring-destructive text-destructive'
                                                    )}
                                                />
                                            </FormControl>
                                            {typeof currentMaxProduceable === 'number' && currentMaxProduceable > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => form.setValue('quantity', currentMaxProduceable, { shouldValidate: true })}
                                                    className="absolute right-1 h-7 px-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg"
                                                >
                                                    MAX
                                                </Button>
                                            )}
                                        </div>
                                        {isExceedingStock ? (
                                            <p className="text-xs text-destructive font-medium">
                                                Cannot exceed available raw stock ({currentMaxProduceable} units)
                                            </p>
                                        ) : (
                                            <FormMessage />
                                        )}
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="shelfLifeMinutes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-foreground/80">Shelf Life Validity (Minutes)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={1}
                                                step={1}
                                                placeholder="e.g. 1440 (24h)"
                                                {...field}
                                                value={field.value}
                                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                                                className="h-9 bg-background/50 rounded-xl text-xs font-semibold"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Shelf Life Preset Chips */}
                        <div className="space-y-1.5">
                            <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                <Clock className="size-3" /> Quick Validity Presets:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {SHELF_LIFE_PRESETS.map((preset) => {
                                    const isSelected = shelfLifeMinutes === preset.minutes;
                                    return (
                                        <Badge
                                            key={preset.minutes}
                                            variant={isSelected ? 'default' : 'outline'}
                                            onClick={() => form.setValue('shelfLifeMinutes', preset.minutes)}
                                            className="cursor-pointer text-xs py-0.5 px-2 font-medium hover:bg-primary/20 transition-colors"
                                        >
                                            {isSelected && <Check className="size-3 mr-1" />}
                                            {preset.label}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Estimated Expiration Banner */}
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                                <span className="font-bold text-foreground flex items-center gap-1">
                                    <Clock className="size-3.5 text-primary" />
                                    Estimated Batch Expiration
                                </span>
                                <p className="text-muted-foreground text-xs">{estimatedExpiry}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs font-bold">
                                {shelfLifeMinutes >= 1440
                                    ? `${(shelfLifeMinutes / 1440).toFixed(1)} Days`
                                    : `${(shelfLifeMinutes / 60).toFixed(1)} Hours`}
                            </Badge>
                        </div>

                        {/* Optional Batch Notes */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                                        <FileText className="size-3" /> Batch Notes (Optional)
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="e.g. Morning fresh bake #1, oven set to 180°C..."
                                            className="min-h-[60px] bg-background/50 text-xs rounded-xl resize-none"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-2 gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs font-bold">
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={mutation.isPending || isOutOfStock || isExceedingStock || quantityValue <= 0}
                                className="h-9 px-4 text-xs font-bold gap-1.5"
                            >
                                {mutation.isPending ? (
                                    <>
                                        <Spinner className="size-4 animate-spin" /> Recording Batch...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="size-4" /> Record Fresh Batch
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
