import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CalendarIcon, Truck } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';

import { createDelivery, getIngredients } from '#/api/inventory.api.ts';
import { getSuppliersList } from '#/api/suppliers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IIngredient } from '../inventory.types';
import type { ISupplierListItem } from '#/feature/suppliers/suppliers.types';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';
import { Calendar } from '#/components/ui/calendar.tsx';
import { cn } from '#/lib/utils.ts';

const deliveryFormSchema = z.object({
    ingredientId: z.string().uuid('Please select a valid raw ingredient'),
    supplierId: z.string().uuid('Please select a valid supplier').or(z.literal('')).optional(),
    quantityReceived: z.number().gt(0, 'Received quantity must be greater than 0'),
    unitCost: z.number().min(0, 'Unit cost must be 0 or greater'),
    batchNumber: z.string().max(100, 'Batch number must not exceed 100 characters').optional(),
    expiryDate: z.string().optional()
});

type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;

interface DeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preselectedIngredient?: IIngredient | null;
}

export default function DeliveryDialog({ open, onOpenChange, preselectedIngredient }: DeliveryDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open]);

    const form = useForm<DeliveryFormValues>({
        resolver: zodResolver(deliveryFormSchema),
        defaultValues: {
            ingredientId: '',
            supplierId: '',
            quantityReceived: 0,
            unitCost: 0,
            batchNumber: '',
            expiryDate: ''
        }
    });

    React.useEffect(() => {
        if (open) {
            form.reset({
                ingredientId: preselectedIngredient?.id || '',
                supplierId: '',
                quantityReceived: 0,
                unitCost: 0,
                batchNumber: '',
                expiryDate: ''
            });
        }
    }, [open, preselectedIngredient, form]);

    const deliveryMutation = useMutation({
        mutationFn: createDelivery,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.DELIVERIES_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            toast.success('Replenishment Delivery Logged', {
                description: 'Stock quantity incremented and transaction recorded successfully.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to log delivery', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: DeliveryFormValues) => {
        deliveryMutation.mutate({
            ingredientId: values.ingredientId,
            supplierId: values.supplierId || null,
            quantityReceived: values.quantityReceived,
            unitCost: values.unitCost,
            batchNumber: values.batchNumber || undefined,
            expiryDate: values.expiryDate ? new Date(values.expiryDate).toISOString() : null
        });
    };

    const isLoading = !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Truck className="size-5 text-primary" />
                        Log Supplier Stock Delivery
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Log incoming materials to increment active stock counts and update financial unit values.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Loading form...</span>
                                </div>
                            ) : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="ingredientId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Select Raw Ingredient</FormLabel>
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
                                                        getItems={(page) => page.data}
                                                        getNextPageParam={(lastPage) => {
                                                            return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                                        }}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        getOptionValue={(item) => item.id}
                                                        getOptionLabel={(item) => `${item.name}`}
                                                        selectedItem={preselectedIngredient || undefined}
                                                        placeholder="Choose ingredient..."
                                                        searchPlaceholder="Search ingredients..."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

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
                                                        getItems={(page) => page.data}
                                                        getNextPageParam={(lastPage) => {
                                                            return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                                        }}
                                                        value={field.value}
                                                        onChange={(val) => field.onChange(val || '')}
                                                        getOptionValue={(item) => item.id}
                                                        getOptionLabel={(item) => `${item.name}`}
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
                                                        <Input type="number" step="any" {...field} className="h-9 bg-background/50" />
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
                                                        <Input type="number" step="any" {...field} className="h-9 bg-background/50" />
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
                                                                    {field.value && date ? format(date, 'PPP') : <span>Pick a date</span>}
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
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-muted/30 mt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={deliveryMutation.isPending || isLoading} className="h-9">
                                {deliveryMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Logging...
                                    </div>
                                ) : (
                                    'Log Delivery'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
