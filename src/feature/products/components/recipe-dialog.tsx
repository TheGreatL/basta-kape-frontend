import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '#/components/ui/alert-dialog.tsx';
import { format } from 'date-fns';
import { ChefHat, Plus, Trash2, Edit2, Save, X, BookOpen, AlertTriangle, Calendar, RotateCcw } from 'lucide-react';

import {
    getProductById,
    getVariantRecipe,
    createVariantRecipe,
    updateVariantRecipe,
    deleteVariantRecipe,
    restoreVariantRecipe
} from '#/api/products.api.ts';
import { getIngredients, getIngredientUnits } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage, ApiError } from '#/utils/error-handler.ts';
import type { IProduct, IProductVariant, IRecipe, IRecipeIngredient } from '../products.types';
import type { IIngredient, IIngredientUnit } from '#/feature/inventory/inventory.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import { Badge } from '#/components/ui/badge.tsx';

const recipeIngredientSchema = z.object({
    ingredientId: z.string().uuid('Please select a valid raw ingredient'),
    quantity: z.number().positive('Quantity must be greater than 0'),
    ingredientUnitId: z.string().uuid('Please select a valid unit'),
    _ingredientName: z.string().optional()
});

const recipeFormSchema = z.object({
    name: z.string().min(2, 'Recipe name must be at least 2 characters').max(100, 'Recipe name must not exceed 100 characters'),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional().nullable(),
    ingredients: z.array(recipeIngredientSchema).min(1, 'Please add at least one ingredient to the recipe')
});

type RecipeFormValues = z.infer<typeof recipeFormSchema>;

interface RecipeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    variant: IProductVariant | null;
    productName: string;
    isLocal?: boolean;
    localRecipe?: RecipeFormValues | null;
    onSaveLocalRecipe?: (recipe: RecipeFormValues) => void;
}

export default function RecipeDialog({
    open,
    onOpenChange,
    variant,
    productName,
    isLocal = false,
    localRecipe = null,
    onSaveLocalRecipe
}: RecipeDialogProps) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = React.useState(false);
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
            setIsEditing(false);
        }
    }, [open]);

    // Query: Recipe Details
    const {
        data: recipe,
        isLoading: isRecipeLoading,
        isError,
        error
    } = useQuery<IRecipe>({
        queryKey: [QUERY_KEY.PRODUCTS.VARIANT_RECIPE, variant?.id],
        queryFn: () => getVariantRecipe(variant!.id),
        enabled: open && !!variant?.id && !isLocal,
        retry: false
    });

    // Query: Product Details to get other variants for copying recipes
    const { data: productDetailsData } = useQuery<IProduct>({
        queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, variant?.productId],
        queryFn: () => getProductById(variant!.productId),
        enabled: open && !!variant?.productId
    });

    const otherVariants = React.useMemo(() => {
        if (!productDetailsData || !variant) return [];
        return productDetailsData.variants.filter((v: IProductVariant) => v.id !== variant.id && !!v.recipe);
    }, [productDetailsData, variant]);

    const handleCopyRecipe = async (otherVariantId: string) => {
        if (!otherVariantId) return;
        try {
            const copiedRecipe = await getVariantRecipe(otherVariantId);
            form.reset({
                name: `${productName} Recipe (${variant?.attributes.map((a) => a.attributeValue.value).join(', ') || 'Custom'})`,
                description: copiedRecipe.description || '',
                ingredients: copiedRecipe.ingredients.map((ing) => ({
                    ingredientId: ing.ingredientId,
                    quantity: ing.quantity,
                    ingredientUnitId: ing.ingredientUnitId,
                    _ingredientName: ing.ingredient.name
                }))
            });
            toast.success('Recipe template copied successfully. Save changes to apply!');
        } catch (err) {
            toast.error('Failed to copy recipe template', { description: getErrorMessage(err) });
        }
    };

    const isNotFound = isLocal ? true : isError && error instanceof ApiError && error.status === 404;
    const isDataLoading = isLocal ? !isRendering || !variant : (isRecipeLoading && !isNotFound) || !isRendering || !variant;

    // Query: Measurement Units
    const { data: unitsData } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.UNITS_LIST, { page: 1, limit: 50, status: 'active' }],
        queryFn: () => getIngredientUnits({ page: 1, limit: 50, status: 'active' }),
        enabled: open
    });

    const units = React.useMemo(() => unitsData?.data || [], [unitsData]);

    const form = useForm<RecipeFormValues>({
        resolver: zodResolver(recipeFormSchema),
        defaultValues: {
            name: '',
            description: '',
            ingredients: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'ingredients'
    });

    // Populate form values when recipe changes
    React.useEffect(() => {
        if (isLocal) {
            if (localRecipe) {
                form.reset(localRecipe);
            } else {
                form.reset({
                    name: `${productName} Recipe`,
                    description: '',
                    ingredients: []
                });
            }
        } else if (recipe) {
            form.reset({
                name: recipe.name,
                description: recipe.description || '',
                ingredients: recipe.ingredients.map((ing: IRecipeIngredient) => ({
                    ingredientId: ing.ingredientId,
                    quantity: ing.quantity,
                    ingredientUnitId: ing.ingredientUnitId,
                    _ingredientName: ing.ingredient.name
                }))
            });
        } else {
            form.reset({
                name: `${productName} Recipe`,
                description: '',
                ingredients: []
            });
        }
    }, [recipe, localRecipe, isLocal, productName, form]);

    // Mutations
    const createRecipeMutation = useMutation({
        mutationFn: (payload: RecipeFormValues) => createVariantRecipe(variant!.id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.VARIANT_RECIPE, variant?.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            toast.success('Recipe Created Successfully');
            setIsEditing(false);
        },
        onError: (err) => {
            toast.error('Failed to create recipe', { description: getErrorMessage(err) });
        }
    });

    const updateRecipeMutation = useMutation({
        mutationFn: (payload: RecipeFormValues) => updateVariantRecipe(variant!.id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.VARIANT_RECIPE, variant?.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            toast.success('Recipe Updated Successfully');
            setIsEditing(false);
        },
        onError: (err) => {
            toast.error('Failed to update recipe', { description: getErrorMessage(err) });
        }
    });

    const deleteRecipeMutation = useMutation({
        mutationFn: () => deleteVariantRecipe(variant!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.VARIANT_RECIPE, variant?.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            toast.success('Recipe Deleted Successfully');
            setIsEditing(false);
        },
        onError: (err) => {
            toast.error('Failed to delete recipe', { description: getErrorMessage(err) });
        }
    });

    const restoreRecipeMutation = useMutation({
        mutationFn: () => restoreVariantRecipe(variant!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.VARIANT_RECIPE, variant?.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            toast.success('Recipe Restored Successfully');
        },
        onError: (err) => {
            toast.error('Failed to restore recipe', { description: getErrorMessage(err) });
        }
    });

    const onSubmit = (values: RecipeFormValues) => {
        if (isLocal) {
            if (onSaveLocalRecipe) {
                onSaveLocalRecipe(values);
            }
            onOpenChange(false);
        } else if (isNotFound) {
            createRecipeMutation.mutate(values);
        } else {
            updateRecipeMutation.mutate(values);
        }
    };

    const handleCancel = () => {
        if (isLocal) {
            onOpenChange(false);
        } else if (recipe) {
            form.reset({
                name: recipe.name,
                description: recipe.description || '',
                ingredients: recipe.ingredients.map((ing: IRecipeIngredient) => ({
                    ingredientId: ing.ingredientId,
                    quantity: ing.quantity,
                    ingredientUnitId: ing.ingredientUnitId,
                    _ingredientName: ing.ingredient.name
                }))
            });
            setIsEditing(false);
        } else {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <ChefHat className="size-5 text-primary" />
                        Drink Recipe Build Specifications
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Configure recipe details and raw ingredient bills of materials required to brew or prepare the variant.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
                    {isDataLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Spinner className="h-6 w-6 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-medium">Loading recipe...</span>
                        </div>
                    ) : isEditing || isNotFound ? (
                        // Form Edit/Create Mode
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                {otherVariants.length > 0 && (
                                    <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold text-foreground/80">Copy Recipe Template</span>
                                            <span className="text-2xs text-muted-foreground">Select a variant to copy its ingredient list.</span>
                                        </div>
                                        <Select onValueChange={handleCopyRecipe}>
                                            <SelectTrigger className="h-8 text-xs bg-background">
                                                <SelectValue placeholder="Select variant to copy recipe from..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {otherVariants.map((v: IProductVariant) => {
                                                    const attrString = v.attributes.map((a: any) => a.attributeValue.value).join(', ');
                                                    return (
                                                        <SelectItem key={v.id} value={v.id} className="text-xs">
                                                            {attrString || 'Standard'} (SKU: {v.sku || 'N/A'})
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Recipe Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. Standard Cappuccino Recipe"
                                                        {...field}
                                                        className="h-9 bg-background/50"
                                                    />
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
                                                <FormLabel className="font-semibold text-foreground/80">Description / Notes</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. Double shot espresso with 1:1 steamed milk ratio"
                                                        value={field.value || ''}
                                                        onChange={field.onChange}
                                                        className="h-9 bg-background/50"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between border-b pb-1">
                                        <h4 className="text-sm font-bold text-foreground/80 flex items-center gap-1.5">
                                            <BookOpen className="size-4 text-primary" />
                                            Ingredients Bill of Materials
                                        </h4>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => append({ ingredientId: '', quantity: 1, ingredientUnitId: '' })}
                                            className="h-8 text-xs gap-1 shadow-sm"
                                        >
                                            <Plus className="size-3.5" /> Add Ingredient
                                        </Button>
                                    </div>

                                    {fields.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-xs text-muted-foreground font-medium border border-dashed rounded-xl bg-muted/5 gap-1.5">
                                            <AlertTriangle className="size-5 text-muted-foreground" />
                                            No ingredients added to this recipe. Click "Add Ingredient" above.
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                                            {fields.map((field, index) => (
                                                <div
                                                    key={field.id}
                                                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start bg-muted/20 p-3.5 rounded-xl border border-border/40 relative"
                                                >
                                                    {/* Ingredient Select */}
                                                    <div className="sm:col-span-5">
                                                        <FormField
                                                            control={form.control}
                                                            name={`ingredients.${index}.ingredientId`}
                                                            render={({ field: selectField }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs font-semibold text-foreground/80">
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
                                                                    <FormLabel className="text-xs font-semibold text-foreground/80">
                                                                        Quantity
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            step="any"
                                                                            value={qtyField.value}
                                                                            onChange={(e) =>
                                                                                qtyField.onChange(e.target.value === '' ? '' : Number(e.target.value))
                                                                            }
                                                                            className="h-9 bg-background/50"
                                                                            placeholder="e.g. 1"
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
                                                                    <FormLabel className="text-xs font-semibold text-foreground/80">Unit</FormLabel>
                                                                    <Select value={unitField.value} onValueChange={unitField.onChange}>
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

                                <DialogFooter className="border-t bg-muted/30 pt-4 mt-6">
                                    <Button type="button" variant="outline" onClick={handleCancel} className="h-9">
                                        <X className="size-4 mr-1.5" /> Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={createRecipeMutation.isPending || updateRecipeMutation.isPending}
                                        className="h-9 shadow-sm"
                                    >
                                        <Save className="size-4 mr-1.5" /> Save Recipe Build
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    ) : (
                        // View Details Mode
                        recipe && (
                            <div className="space-y-5">
                                {recipe.deletedAt && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                                        <AlertTriangle className="size-4 shrink-0 animate-bounce" />
                                        <span>This recipe is archived / soft-deleted. Restore it to reactivate it.</span>
                                    </div>
                                )}

                                <div className="bg-muted/20 p-4 rounded-xl border border-border/40 space-y-1">
                                    <h3 className="text-base font-bold text-foreground leading-tight">{recipe.name}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {recipe.description || 'No notes or special preparation instructions entered.'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-foreground/80 flex items-center gap-1.5 border-b pb-1">
                                        <BookOpen className="size-4 text-primary" />
                                        Recipe Ingredients Build List
                                    </h4>
                                    <div className="border border-border/40 rounded-xl overflow-hidden bg-background/30 max-h-[35vh] overflow-y-auto">
                                        {recipe.ingredients.length === 0 ? (
                                            <div className="text-center py-8 text-xs text-muted-foreground font-medium italic">
                                                No ingredients mapped to this recipe.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border/30">
                                                {recipe.ingredients.map((ing: IRecipeIngredient) => (
                                                    <div key={ing.id} className="flex justify-between items-center p-3 text-xs">
                                                        <div className="font-semibold text-foreground/80">{ing.ingredient.name}</div>
                                                        <Badge
                                                            variant="outline"
                                                            className="font-bold text-foreground/90 bg-background/50 border-border/40 py-0.5 px-2"
                                                        >
                                                            {ing.quantity} {ing.unit.abbreviation || ing.unit.name}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Audit Card */}
                                <div className="space-y-2.5 pt-1">
                                    <div className="flex items-center border-b pb-1">
                                        <h4 className="text-xs font-bold text-foreground/75 flex items-center gap-1.5">
                                            <Calendar className="size-3.5 text-primary" />
                                            System Audit Logs
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/40">
                                        <div>
                                            <span className="font-semibold text-foreground/75 block">Created Date</span>
                                            {format(new Date(recipe.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                            {recipe.createdBy && (
                                                <span className="block mt-0.5 text-muted-foreground/80">
                                                    by {recipe.createdBy.firstName} {recipe.createdBy.lastName}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-foreground/75 block">Last Updated</span>
                                            {format(new Date(recipe.updatedAt), 'MMMM dd, yyyy - hh:mm a')}
                                            {recipe.updatedBy && (
                                                <span className="block mt-0.5 text-muted-foreground/80">
                                                    by {recipe.updatedBy.firstName} {recipe.updatedBy.lastName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="border-t bg-muted/30 pt-4 mt-6">
                                    {recipe.deletedAt ? (
                                        <RequirePermission module="Products Management" action="delete">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        disabled={restoreRecipeMutation.isPending}
                                                        className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                    >
                                                        <RotateCcw className="size-4" /> Restore Recipe
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="flex items-center gap-2 font-bold text-foreground">
                                                            <RotateCcw className="size-5 text-emerald-600" />
                                                            Restore Recipe
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to restore this recipe build <strong>"{recipe.name}"</strong>? This
                                                            will make it active and link it back to the product variant.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => restoreRecipeMutation.mutate()}
                                                            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                        >
                                                            Confirm Restore
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </RequirePermission>
                                    ) : (
                                        <>
                                            <RequirePermission module="Products Management" action="delete">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
                                                            deleteRecipeMutation.mutate();
                                                        }
                                                    }}
                                                    disabled={deleteRecipeMutation.isPending}
                                                    className="h-9 border-destructive text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="size-4 mr-1.5" /> Delete Recipe
                                                </Button>
                                            </RequirePermission>

                                            <div className="flex-1" />

                                            <RequirePermission module="Products Management" action="update">
                                                <Button type="button" onClick={() => setIsEditing(true)} className="h-9">
                                                    <Edit2 className="size-4 mr-1.5" /> Edit Recipe
                                                </Button>
                                            </RequirePermission>
                                        </>
                                    )}
                                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                        Close
                                    </Button>
                                </DialogFooter>
                            </div>
                        )
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
