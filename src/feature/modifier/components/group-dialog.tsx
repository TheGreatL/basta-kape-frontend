import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Save, X, Settings2, Package, Search } from 'lucide-react';

import { createModifierGroup, updateModifierGroup } from '#/api/modifiers.api.ts';
import { getProductsList } from '#/api/products.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IModifierGroup } from '../modifier.types';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Switch } from '#/components/ui/switch.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { ScrollArea } from '#/components/ui/scroll-area.tsx';

const groupFormSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
    isRequired: z.boolean(),
    minSelect: z.number().min(0, 'Minimum selection must be 0 or more'),
    maxSelect: z.number().min(1, 'Maximum selection must be at least 1'),
    productIds: z.array(z.string().uuid())
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

interface GroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    group: IModifierGroup | null;
}

export default function GroupDialog({ open, onOpenChange, group }: GroupDialogProps) {
    const queryClient = useQueryClient();
    const [productSearch, setProductSearch] = React.useState('');

    // Query: Fetch products list to link with
    const { data: productsData } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST, { page: 1, limit: 150, status: 'active' }],
        queryFn: () => getProductsList({ page: 1, limit: 150, status: 'active' }),
        enabled: open
    });

    const products = React.useMemo(() => productsData?.data || [], [productsData]);

    const filteredProducts = React.useMemo(() => {
        if (!productSearch) return products;
        const q = productSearch.toLowerCase();
        return products.filter((p) => p.name.toLowerCase().includes(q));
    }, [products, productSearch]);

    const form = useForm<GroupFormValues>({
        resolver: zodResolver(groupFormSchema),
        defaultValues: {
            name: '',
            isRequired: false,
            minSelect: 0,
            maxSelect: 1,
            productIds: []
        }
    });

    const isRequiredVal = form.watch('isRequired');

    // Automatically update minSelect when isRequired toggles
    React.useEffect(() => {
        if (isRequiredVal) {
            if (form.getValues('minSelect') === 0) {
                form.setValue('minSelect', 1);
            }
        } else {
            form.setValue('minSelect', 0);
        }
    }, [isRequiredVal, form]);

    // Reset/Populate form values when dialog opens or changes
    React.useEffect(() => {
        if (open) {
            if (group) {
                form.reset({
                    name: group.name,
                    isRequired: group.isRequired,
                    minSelect: group.minSelect,
                    maxSelect: group.maxSelect,
                    productIds: group.products.map((p) => p.id)
                });
            } else {
                form.reset({
                    name: '',
                    isRequired: false,
                    minSelect: 0,
                    maxSelect: 1,
                    productIds: []
                });
            }
            setProductSearch('');
        }
    }, [open, group, form]);

    // Mutation: Create
    const createMutation = useMutation({
        mutationFn: (payload: GroupFormValues) => createModifierGroup(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS] });
            toast.success('Modifier group created successfully');
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to create modifier group', { description: getErrorMessage(err) });
        }
    });

    // Mutation: Update
    const updateMutation = useMutation({
        mutationFn: (payload: GroupFormValues) => updateModifierGroup(group!.id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUP_DETAILS, group?.id] });
            toast.success('Modifier group updated successfully');
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error('Failed to update modifier group', { description: getErrorMessage(err) });
        }
    });

    const onSubmit = (values: GroupFormValues) => {
        if (group) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Settings2 className="size-5 text-primary" />
                        {group ? 'Edit Modifier Group' : 'Create Modifier Group'}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {group
                            ? 'Configure modifier settings, select options parameters, and map to products.'
                            : 'Set up a new customization category (e.g. Milk Alternatives, Sweetness levels).'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80">Group Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Milk Alternatives, Sweetness Level" {...field} className="h-9" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-border/40 items-center">
                                <FormField
                                    control={form.control}
                                    name="isRequired"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col gap-1 items-start">
                                            <FormLabel className="font-semibold text-foreground/80 leading-none">Required Group</FormLabel>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="minSelect"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="font-semibold text-foreground/80">Min Options</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    disabled={isRequiredVal}
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                    className="h-9 w-full bg-background"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="maxSelect"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="font-semibold text-foreground/80">Max Options</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                    className="h-9 w-full bg-background"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Linked Products Checklist */}
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1.5">
                                        <Package className="size-4 text-primary" />
                                        Map to Menu Products
                                    </FormLabel>
                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                        {form.watch('productIds').length} selected
                                    </span>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search products..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="h-9 pl-9 bg-background/50 text-xs"
                                    />
                                </div>

                                <div className="border border-border/40 rounded-xl overflow-hidden bg-background/20">
                                    <ScrollArea className="h-[180px] p-2">
                                        {filteredProducts.length === 0 ? (
                                            <div className="text-center py-8 text-xs text-muted-foreground italic">
                                                No products found matching search filter.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {filteredProducts.map((p) => {
                                                    const isChecked = form.watch('productIds').includes(p.id);
                                                    return (
                                                        <label
                                                            key={p.id}
                                                            className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                                                                isChecked
                                                                    ? 'bg-primary/5 border-primary/20 text-primary-foreground dark:text-primary-foreground'
                                                                    : 'bg-background hover:bg-muted/30 border-border/40 text-foreground/85'
                                                            }`}
                                                        >
                                                            <Checkbox
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    const currentIds = form.getValues('productIds');
                                                                    if (checked) {
                                                                        form.setValue('productIds', [...currentIds, p.id]);
                                                                    } else {
                                                                        form.setValue(
                                                                            'productIds',
                                                                            currentIds.filter((id) => id !== p.id)
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                            <span className="truncate">{p.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-muted/30 mt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                <X className="size-4 mr-1.5" /> Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="h-9 shadow-sm">
                                <Save className="size-4 mr-1.5" /> {group ? 'Save Changes' : 'Create Group'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
