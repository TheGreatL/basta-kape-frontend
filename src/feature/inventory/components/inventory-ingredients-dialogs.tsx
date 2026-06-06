import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Beef } from 'lucide-react';

import { createIngredient, updateIngredient, getIngredientUnits } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IIngredient, IIngredientUnit } from '../inventory.types';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

const ingredientFormSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
    ingredientUnitId: z.string().uuid('Please select a valid measurement unit'),
    reorderPoint: z.number().min(0, 'Reorder point must be 0 or greater'),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional()
});

type IngredientFormValues = z.infer<typeof ingredientFormSchema>;

interface IngredientCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function IngredientCreateDialog({ open, onOpenChange }: IngredientCreateDialogProps) {
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

    const form = useForm<IngredientFormValues>({
        resolver: zodResolver(ingredientFormSchema),
        defaultValues: {
            name: '',
            ingredientUnitId: '',
            reorderPoint: 0,
            description: ''
        }
    });

    React.useEffect(() => {
        if (!open) {
            form.reset({
                name: '',
                ingredientUnitId: '',
                reorderPoint: 0,
                description: ''
            });
        }
    }, [open, form]);

    const createMutation = useMutation({
        mutationFn: createIngredient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.INGREDIENTS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            toast.success('Raw Ingredient Registered', {
                description: 'The new raw material profile and live stock record have been created.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to register ingredient', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: IngredientFormValues) => {
        createMutation.mutate({
            name: values.name,
            ingredientUnitId: values.ingredientUnitId,
            reorderPoint: values.reorderPoint,
            description: values.description || undefined
        });
    };

    const isLoading = !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Beef className="size-5 text-primary" />
                        Register Raw Ingredient
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Configure name, measurement standards, and threshold alerts for a new ingredient.
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
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Ingredient Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Espresso Beans" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="ingredientUnitId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Default Measurement Unit</FormLabel>
                                                <FormControl>
                                                    <InfiniteSelect<IIngredientUnit>
                                                        queryKey={[QUERY_KEY.INVENTORY.UNITS_LIST]}
                                                        fetchFn={async ({ pageParam, query }) => {
                                                            return getIngredientUnits({
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
                                                        getOptionLabel={(item) => `${item.name} (${item.abbreviation})`}
                                                        placeholder="Select unit..."
                                                        searchPlaceholder="Search units..."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="reorderPoint"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Reorder Threshold Point</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Flavor profile, shelf life instructions or storage requirements..."
                                                        className="min-h-[90px] bg-background/50 resize-y"
                                                        {...field}
                                                    />
                                                </FormControl>
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
                            <Button type="submit" disabled={createMutation.isPending || isLoading} className="h-9">
                                {createMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Registering...
                                    </div>
                                ) : (
                                    'Register Ingredient'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

interface IngredientEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ingredient: IIngredient | null;
}

export function IngredientEditDialog({ open, onOpenChange, ingredient }: IngredientEditDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open && ingredient) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open, ingredient]);

    const form = useForm<IngredientFormValues>({
        resolver: zodResolver(ingredientFormSchema),
        defaultValues: {
            name: '',
            ingredientUnitId: '',
            reorderPoint: 0,
            description: ''
        }
    });

    React.useEffect(() => {
        if (open && ingredient) {
            form.reset({
                name: ingredient.name,
                ingredientUnitId: ingredient.ingredientUnitId,
                reorderPoint: ingredient.reorderPoint,
                description: ingredient.description || ''
            });
        }
    }, [open, ingredient, form]);

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: IngredientFormValues }) => updateIngredient(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.INGREDIENTS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            toast.success('Ingredient Details Updated', {
                description: 'The ingredient profile has been successfully modified.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to update ingredient', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: IngredientFormValues) => {
        if (!ingredient) return;
        updateMutation.mutate({
            id: ingredient.id,
            payload: {
                name: values.name,
                ingredientUnitId: values.ingredientUnitId,
                reorderPoint: values.reorderPoint,
                description: values.description || undefined
            }
        });
    };

    const isLoading = !isRendering || !ingredient;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Beef className="size-5 text-primary" />
                        Modify Ingredient Specs
                    </DialogTitle>
                    <DialogDescription className="text-xs">Update configuration parameters for this raw material.</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Loading details...</span>
                                </div>
                            ) : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Ingredient Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Espresso Beans" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="ingredientUnitId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Default Measurement Unit</FormLabel>
                                                <FormControl>
                                                    <InfiniteSelect<IIngredientUnit>
                                                        queryKey={[QUERY_KEY.INVENTORY.UNITS_LIST]}
                                                        fetchFn={async ({ pageParam, query }) => {
                                                            return getIngredientUnits({
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
                                                        getOptionLabel={(item) => `${item.name} (${item.abbreviation})`}
                                                        selectedItem={ingredient.defaultUnit}
                                                        placeholder="Select unit..."
                                                        searchPlaceholder="Search units..."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="reorderPoint"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Reorder Threshold Point</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Flavor profile, shelf life instructions or storage requirements..."
                                                        className="min-h-[90px] bg-background/50 resize-y"
                                                        {...field}
                                                    />
                                                </FormControl>
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
                            <Button type="submit" disabled={updateMutation.isPending || isLoading} className="h-9">
                                {updateMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Saving...
                                    </div>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
