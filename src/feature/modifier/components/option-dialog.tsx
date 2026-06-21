import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Save, X, PlusCircle, Plus, Trash2, AlertTriangle, BookOpen } from 'lucide-react';

import {
    createModifierOption,
    updateModifierOption,
    getModifierOptionRecipe,
    createModifierOptionRecipe,
    updateModifierOptionRecipe,
    deleteModifierOptionRecipe
} from '#/api/modifiers.api.ts';
import { getIngredients, getIngredientUnits } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage, ApiError } from '#/utils/error-handler.ts';
import type { IModifierOption, IModifierRecipe, IModifierRecipeIngredient } from '../modifier.types';
import type { IIngredient, IIngredientUnit } from '#/feature/inventory/inventory.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Switch } from '#/components/ui/switch.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';

const recipeIngredientSchema = z.object({
    ingredientId: z.string().uuid('Please select a valid raw ingredient'),
    quantity: z.number().positive('Quantity must be greater than 0'),
    ingredientUnitId: z.string().uuid('Please select a valid unit'),
    _ingredientName: z.string().optional()
});

const optionFormObjectSchema = z.object({
    name: z.string().min(1, 'Name must be at least 1 character').max(100, 'Name must not exceed 100 characters'),
    price: z.number().min(0, 'Price must be 0 or more'),
    hasRecipe: z.boolean(),
    recipeName: z.string(),
    recipeDescription: z.string(),
    ingredients: z.array(recipeIngredientSchema)
});

const optionFormSchema = optionFormObjectSchema.superRefine((val, ctx) => {
    if (val.hasRecipe) {
        if (!val.recipeName || val.recipeName.trim().length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Recipe name must be at least 2 characters',
                path: ['recipeName']
            });
        }
        if (val.ingredients.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Please add at least one ingredient to the recipe',
                path: ['ingredients']
            });
        }
    }
});

type OptionFormValues = z.infer<typeof optionFormObjectSchema>;

interface OptionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: string;
    option: IModifierOption | null;
}

export default function OptionDialog({ open, onOpenChange, groupId, option }: OptionDialogProps) {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = React.useState(false);

    const form = useForm<OptionFormValues>({
        resolver: zodResolver(optionFormSchema),
        defaultValues: {
            name: '',
            price: 0,
            hasRecipe: false,
            recipeName: '',
            recipeDescription: '',
            ingredients: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'ingredients'
    });

    // Query: Recipe Details
    const {
        data: recipe,
        isLoading: isRecipeLoading,
        isError,
        error
    } = useQuery<IModifierRecipe>({
        queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_OPTION_RECIPE, option?.id],
        queryFn: () => getModifierOptionRecipe(option!.id),
        enabled: open && !!option?.id,
        retry: false
    });

    const isRecipeNotFound = isError && error instanceof ApiError && error.status === 404;

    // Query: Measurement Units
    const { data: unitsData } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.UNITS_LIST, { page: 1, limit: 50, status: 'active' }],
        queryFn: () => getIngredientUnits({ page: 1, limit: 50, status: 'active' }),
        enabled: open
    });

    const units = React.useMemo(() => unitsData?.data || [], [unitsData]);

    // Reset/Populate form values when dialog opens or query updates
    React.useEffect(() => {
        if (open) {
            if (option) {
                const hasFinishedLoadingRecipe = !isRecipeLoading || isRecipeNotFound || !!recipe;
                if (hasFinishedLoadingRecipe) {
                    form.reset({
                        name: option.name,
                        price: option.price,
                        hasRecipe: !!recipe && !recipe.deletedAt,
                        recipeName: recipe?.name || `${option.name} Recipe`,
                        recipeDescription: recipe?.description || '',
                        ingredients:
                            recipe?.ingredients.map((ing: IModifierRecipeIngredient) => ({
                                ingredientId: ing.ingredientId,
                                quantity: ing.quantity,
                                ingredientUnitId: ing.ingredientUnitId,
                                _ingredientName: ing.ingredient.name
                            })) || []
                    });
                }
            } else {
                form.reset({
                    name: '',
                    price: 0,
                    hasRecipe: false,
                    recipeName: '',
                    recipeDescription: '',
                    ingredients: []
                });
            }
        }
    }, [open, option, recipe, isRecipeLoading, isRecipeNotFound, form]);

    // Auto-update recipe name default as option name is typed
    const optionName = form.watch('name');
    React.useEffect(() => {
        if (optionName && !form.getValues('recipeName')) {
            form.setValue('recipeName', `${optionName} Recipe`);
        }
    }, [optionName, form]);

    const onSubmit = async (values: OptionFormValues) => {
        setIsSaving(true);
        try {
            let savedOption: IModifierOption;
            if (option) {
                savedOption = await updateModifierOption(option.id, {
                    name: values.name,
                    price: values.price
                });
            } else {
                savedOption = await createModifierOption(groupId, {
                    name: values.name,
                    price: values.price
                });
            }

            const optionId = savedOption.id;

            // Sync option recipe
            if (values.hasRecipe) {
                const recipePayload = {
                    name: values.recipeName || `${values.name} Recipe`,
                    description: values.recipeDescription || '',
                    ingredients: values.ingredients.map((ing) => ({
                        ingredientId: ing.ingredientId,
                        quantity: ing.quantity,
                        ingredientUnitId: ing.ingredientUnitId
                    }))
                };

                if (recipe && !isRecipeNotFound) {
                    await updateModifierOptionRecipe(optionId, recipePayload);
                } else {
                    await createModifierOptionRecipe(optionId, recipePayload);
                }
            } else {
                // If it existed but is toggled off, delete it
                if (recipe && !isRecipeNotFound) {
                    await deleteModifierOptionRecipe(optionId);
                }
            }

            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_OPTION_RECIPE, optionId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });

            toast.success(option ? 'Option updated successfully' : 'Option added successfully');
            onOpenChange(false);
        } catch (err) {
            toast.error(option ? 'Failed to update option' : 'Failed to add option', {
                description: getErrorMessage(err)
            });
        } finally {
            setIsSaving(false);
        }
    };

    const hasRecipe = form.watch('hasRecipe');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={hasRecipe ? 'max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background' : 'max-w-md bg-background'}
            >
                <DialogHeader className={hasRecipe ? 'px-6 pt-6 pb-2' : ''}>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <PlusCircle className="size-5 text-primary" />
                        {option ? 'Edit Modifier Option' : 'Add Modifier Option'}
                    </DialogTitle>
                    <DialogDescription className="text-xs">Configure modifier option name, price, and raw stock deduction rules.</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className={hasRecipe ? 'flex-1 flex flex-col overflow-hidden' : 'space-y-4 pt-2'}>
                        <div className={hasRecipe ? 'flex-1 overflow-y-auto px-6 py-2 min-h-0 space-y-4' : 'space-y-4 px-1'}>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80">Option Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Oat Milk, Extra Shot" {...field} className="h-9" disabled={isSaving} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80">Additional Price (₱)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={field.value}
                                                onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                                placeholder="0.00"
                                                className="h-9"
                                                disabled={isSaving}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="hasRecipe"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-2xs">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-xs font-bold text-foreground">Deduct Raw Materials (Recipe)</FormLabel>
                                            <p className="text-3xs text-muted-foreground">
                                                Enable stock deductions for inventory items when this option is selected.
                                            </p>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {hasRecipe && (
                                <div className="space-y-4 border-t pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="recipeName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80 text-xs">Recipe Name</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="e.g. Oat Milk Customization Recipe"
                                                            {...field}
                                                            value={field.value || ''}
                                                            className="h-9"
                                                            disabled={isSaving}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="recipeDescription"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80 text-xs">Description / Notes</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="e.g. Steamed barista oat milk addition"
                                                            {...field}
                                                            value={field.value || ''}
                                                            className="h-9"
                                                            disabled={isSaving}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between border-b pb-1.5">
                                            <h4 className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
                                                <BookOpen className="size-4 text-primary" />
                                                Stock Deductions (Ingredients BOM)
                                            </h4>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => append({ ingredientId: '', quantity: 1, ingredientUnitId: '' })}
                                                className="h-8 text-2xs gap-1 shadow-xs"
                                                disabled={isSaving}
                                            >
                                                <Plus className="size-3.5" /> Add Ingredient
                                            </Button>
                                        </div>

                                        {fields.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground font-medium border border-dashed rounded-xl bg-muted/5 gap-1.5">
                                                <AlertTriangle className="size-5 text-muted-foreground" />
                                                No ingredients added. Click "Add Ingredient" to deduct stocks when this modifier is selected.
                                            </div>
                                        ) : (
                                            <div className="space-y-3 pr-1 max-h-[30vh] overflow-y-auto">
                                                {fields.map((field, index) => (
                                                    <div
                                                        key={field.id}
                                                        className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start bg-muted/10 p-3 rounded-xl border border-border/40 relative"
                                                    >
                                                        {/* Ingredient Select */}
                                                        <div className="sm:col-span-5">
                                                            <FormField
                                                                control={form.control}
                                                                name={`ingredients.${index}.ingredientId`}
                                                                render={({ field: selectField }) => (
                                                                    <FormItem>
                                                                        <FormLabel className="text-2xs font-semibold text-foreground/80">
                                                                            Raw Ingredient
                                                                        </FormLabel>
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
                                                                                    return lastPage.meta.hasMore
                                                                                        ? lastPage.meta.currentPage + 1
                                                                                        : undefined;
                                                                                }}
                                                                                value={selectField.value}
                                                                                onChange={(val, item) => {
                                                                                    selectField.onChange(val);
                                                                                    if (item?.defaultUnit?.id) {
                                                                                        form.setValue(
                                                                                            `ingredients.${index}.ingredientUnitId`,
                                                                                            item.defaultUnit.id
                                                                                        );
                                                                                    }
                                                                                }}
                                                                                getOptionValue={(item) => item.id}
                                                                                getOptionLabel={(item) => item.name}
                                                                                selectedItem={
                                                                                    field._ingredientName
                                                                                        ? ({
                                                                                              id: field.ingredientId,
                                                                                              name: field._ingredientName
                                                                                          } as IIngredient)
                                                                                        : undefined
                                                                                }
                                                                                placeholder="Choose ingredient..."
                                                                                searchPlaceholder="Search ingredients..."
                                                                                disabled={isSaving}
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>

                                                        {/* Quantity Input */}
                                                        <div className="sm:col-span-3">
                                                            <FormField
                                                                control={form.control}
                                                                name={`ingredients.${index}.quantity`}
                                                                render={({ field: qtyField }) => (
                                                                    <FormItem>
                                                                        <FormLabel className="text-2xs font-semibold text-foreground/80">
                                                                            Quantity
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                step="any"
                                                                                value={qtyField.value}
                                                                                onChange={(e) =>
                                                                                    qtyField.onChange(
                                                                                        e.target.value === '' ? '' : Number(e.target.value)
                                                                                    )
                                                                                }
                                                                                className="h-9 bg-background/50"
                                                                                placeholder="e.g. 1"
                                                                                disabled={isSaving}
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>

                                                        {/* Unit Select */}
                                                        <div className="sm:col-span-3">
                                                            <FormField
                                                                control={form.control}
                                                                name={`ingredients.${index}.ingredientUnitId`}
                                                                render={({ field: unitField }) => (
                                                                    <FormItem>
                                                                        <FormLabel className="text-2xs font-semibold text-foreground/80">
                                                                            Unit
                                                                        </FormLabel>
                                                                        <Select
                                                                            value={unitField.value}
                                                                            onValueChange={unitField.onChange}
                                                                            disabled={isSaving}
                                                                        >
                                                                            <FormControl>
                                                                                <SelectTrigger className="h-9 bg-background/50">
                                                                                    <SelectValue placeholder="Select unit..." />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent>
                                                                                {units.map((u: IIngredientUnit) => (
                                                                                    <SelectItem key={u.id} value={u.id}>
                                                                                        {u.name} {u.abbreviation ? `(${u.abbreviation})` : ''}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>

                                                        {/* Delete Row Button */}
                                                        <div className="sm:col-span-1 flex items-center justify-end w-full sm:pt-[24px]">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => remove(index)}
                                                                className="size-9 text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                                                                disabled={isSaving}
                                                            >
                                                                <Trash2 className="size-4" />
                                                                <span className="sr-only">Remove row</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className={hasRecipe ? 'border-t bg-muted/30 p-4' : 'pt-2 border-t mt-4'}>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9" disabled={isSaving}>
                                <X className="size-4 mr-1.5" /> Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving} className="h-9 shadow-sm">
                                {isSaving ? <Spinner className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
                                Save Option
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
