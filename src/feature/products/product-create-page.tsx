import * as React from 'react';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PlusCircle, ArrowLeft, Sparkles, FileText, Layers, ChefHat, Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import type { z } from 'zod';

import { createProduct, createProductVariant, createVariantRecipe, deleteProduct } from '#/api/products.api.ts';
import { getCategoriesList, getProductTypesList, getAttributesList, getAttributeValuesList } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { productSchema } from './products.schema.ts';
import ProductPhotoUpload from './components/product-photo-upload.tsx';
import { VariantForm } from './components/variant-form.tsx';
import RecipeDialog from './components/recipe-dialog.tsx';
import type { ICategory, IProductType, IAttribute, IAttributeValue } from '#/feature/product-settings/product-settings-types.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';

type ProductFormValues = z.infer<typeof productSchema>;

interface LocalVariant {
    tempId: string;
    sku: string | null;
    price: number;
    attributeValueIds: string[];
    recipe?: any; // Form values structure for RecipeDialog
}

const generateId = () => {
    return crypto.randomUUID();
};

export default function ProductCreatePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = React.useState('profile');
    const [localVariants, setLocalVariants] = React.useState<LocalVariant[]>([]);
    const [isAddingVariant, setIsAddingVariant] = React.useState(false);
    const [editingVariantId, setEditingVariantId] = React.useState<string | null>(null);
    const [selectedVariantForRecipe, setSelectedVariantForRecipe] = React.useState<LocalVariant | null>(null);
    const [recipeOpen, setRecipeOpen] = React.useState(false);

    const handleBack = () => {
        navigate({
            to: '/admin/products',
            search: {
                page: 1,
                pageSize: 10,
                search: '',
                status: 'active',
                productCategoryId: '',
                productTypeId: ''
            }
        });
    };

    // Query categories and types
    const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.CATEGORIES_LIST, { limit: 50, status: 'active' }],
        queryFn: () => getCategoriesList({ page: 1, limit: 50, status: 'active' })
    });

    const { data: typesData, isLoading: isTypesLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.TYPES_LIST, { limit: 50, status: 'active' }],
        queryFn: () => getProductTypesList({ page: 1, limit: 50, status: 'active' })
    });

    // Query attributes and their value lists for local badge lookups
    const { data: attributesData } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTES_LIST, { limit: 50, status: 'active' }],
        queryFn: () => getAttributesList({ page: 1, limit: 50, status: 'active' })
    });

    const attributes = attributesData?.data || [];
    const attributeValuesQueries = useQueries({
        queries: attributes.map((attr: IAttribute) => ({
            queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attr.id],
            queryFn: () => getAttributeValuesList(attr.id),
            enabled: !!attr.id
        }))
    });

    const valueLookup = React.useMemo(() => {
        const lookup: Record<string, { attrName: string; valText: string } | undefined> = {};
        attributes.forEach((attr: IAttribute, idx: number) => {
            const queryResult = attributeValuesQueries[idx] as any;
            if (queryResult && queryResult.data && queryResult.data.data) {
                queryResult.data.data.forEach((val: IAttributeValue) => {
                    lookup[val.id] = {
                        attrName: attr.name,
                        valText: val.value
                    };
                });
            }
        });
        return lookup;
    }, [attributes, attributeValuesQueries]);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: '',
            photo: '',
            description: '',
            productCategoryId: '',
            productTypeId: ''
        }
    });

    const saveMutation = useMutation({
        mutationFn: async (values: ProductFormValues) => {
            // 1. Create root product
            const newProduct = await createProduct({
                name: values.name,
                photo: values.photo || null,
                description: values.description || null,
                productCategoryId: values.productCategoryId || null,
                productTypeId: values.productTypeId || null
            });

            // 2. Create variants & recipes
            try {
                for (const localV of localVariants) {
                    const newVar = await createProductVariant(newProduct.id, {
                        sku: localV.sku,
                        price: localV.price,
                        attributeValueIds: localV.attributeValueIds
                    });

                    if (localV.recipe) {
                        await createVariantRecipe(newVar.id, {
                            name: localV.recipe.name,
                            description: localV.recipe.description || null,
                            ingredients: localV.recipe.ingredients.map((ing: any) => ({
                                ingredientId: ing.ingredientId,
                                quantity: ing.quantity,
                                ingredientUnitId: ing.ingredientUnitId
                            }))
                        });
                    }
                }
                return newProduct;
            } catch (err) {
                // Rollback: delete the created product profile to keep the database clean
                await deleteProduct(newProduct.id).catch(() => null);
                throw err;
            }
        },
        onSuccess: (newProduct) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            toast.success('Product Created Successfully', {
                description: `${newProduct.name} has been saved with ${localVariants.length} variants.`
            });
            handleBack();
        },
        onError: (error) => {
            toast.error('Failed to create product', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: ProductFormValues) => {
        saveMutation.mutate(values);
    };

    const handleAddVariant = (data: { sku: string | null; price: number; attributeValueIds: string[] }) => {
        const newVariant: LocalVariant = {
            tempId: generateId(),
            sku: data.sku,
            price: data.price,
            attributeValueIds: data.attributeValueIds
        };
        setLocalVariants((prev) => [...prev, newVariant]);
        setIsAddingVariant(false);
    };

    const handleUpdateVariant = (tempId: string, data: { sku: string | null; price: number; attributeValueIds: string[] }) => {
        setLocalVariants((prev) =>
            prev.map((v) => (v.tempId === tempId ? { ...v, sku: data.sku, price: data.price, attributeValueIds: data.attributeValueIds } : v))
        );
        setEditingVariantId(null);
    };

    const handleDeleteVariant = (tempId: string) => {
        setLocalVariants((prev) => prev.filter((v) => v.tempId !== tempId));
    };

    const handleSaveRecipe = (recipeValues: any) => {
        if (!selectedVariantForRecipe) return;
        setLocalVariants((prev) => prev.map((v) => (v.tempId === selectedVariantForRecipe.tempId ? { ...v, recipe: recipeValues } : v)));
    };

    const mockVariantForRecipe = React.useMemo(() => {
        if (!selectedVariantForRecipe) return null;
        return {
            id: selectedVariantForRecipe.tempId,
            productId: 'temp-product-id',
            sku: selectedVariantForRecipe.sku,
            price: selectedVariantForRecipe.price,
            attributes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        } as any;
    }, [selectedVariantForRecipe]);

    const renderLocalAttributeBadges = (valIds: string[]) => {
        if (valIds.length === 0) {
            return <span className="text-xs text-muted-foreground italic font-medium">Standard / No Modifiers</span>;
        }
        return (
            <div className="flex flex-wrap gap-1">
                {valIds.map((id) => {
                    const lookup = valueLookup[id];
                    if (!lookup) return null;
                    return (
                        <Badge
                            key={id}
                            variant="secondary"
                            className="text-xs font-semibold capitalize py-0 px-1.5 bg-secondary/50 text-secondary-foreground/90"
                        >
                            {lookup.attrName}: {lookup.valText}
                        </Badge>
                    );
                })}
            </div>
        );
    };

    const isDataLoading = isCategoriesLoading || isTypesLoading;

    return (
        <div className="flex flex-col gap-6">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col gap-2">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="w-fit h-8 text-xs gap-1.5 pl-1.5 -ml-1 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-3.5" /> Back to Products
                </Button>
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <PlusCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Create Menu Product</h1>
                        <p className="text-xs text-muted-foreground">Define the profile, category, variants, and recipes for the new menu item.</p>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-muted/40 p-1 rounded-xl w-full sm:w-auto border border-border/40 mb-4 flex">
                    <TabsTrigger
                        value="profile"
                        className="flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs"
                    >
                        <FileText className="size-4" /> General Info
                    </TabsTrigger>
                    <TabsTrigger
                        value="variants"
                        className="flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs"
                    >
                        <Layers className="size-4" /> Variants & Recipes ({localVariants.length})
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Profile Details */}
                <TabsContent value="profile" className="focus-visible:outline-none">
                    <Form {...form}>
                        <form id="product-create-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs">
                                {isDataLoading ? (
                                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                                        <Spinner className="h-6 w-6 text-primary animate-spin" />
                                        <span className="text-xs text-muted-foreground font-medium">Loading settings...</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Left Column: Photo Upload */}
                                        <div className="flex flex-col items-center justify-start p-4 bg-muted/20 border border-border/30 rounded-xl space-y-3">
                                            <FormField
                                                control={form.control}
                                                name="photo"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1 w-full flex flex-col items-center">
                                                        <FormLabel className="font-bold text-xs uppercase text-muted-foreground text-center mb-1">
                                                            Product Photo
                                                        </FormLabel>
                                                        <FormControl>
                                                            <ProductPhotoUpload
                                                                currentPhotoUrl={field.value}
                                                                onUploadSuccess={(url) => field.onChange(url)}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="text-xs text-muted-foreground text-center max-w-[200px] leading-relaxed">
                                                Upload a high-quality photo of the beverage. Only JPG, PNG, and WebP are allowed.
                                            </div>
                                        </div>

                                        {/* Right Column: Fields */}
                                        <div className="md:col-span-2 space-y-4">
                                            {/* Product Name */}
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80">Product Name</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="e.g. Spanish Latte"
                                                                {...field}
                                                                className="h-9 bg-background/50 rounded-xl"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Category & Product Type */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="productCategoryId"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="font-semibold text-foreground/80">Category</FormLabel>
                                                            <Select
                                                                value={field.value || 'none'}
                                                                onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger className="h-9 bg-background/50 rounded-xl">
                                                                        <SelectValue placeholder="Select Category" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="none">No Category Assigned</SelectItem>
                                                                    {categoriesData?.data.map((cat: ICategory) => (
                                                                        <SelectItem key={cat.id} value={cat.id}>
                                                                            {cat.name}
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
                                                    name="productTypeId"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="font-semibold text-foreground/80">Product Type</FormLabel>
                                                            <Select
                                                                value={field.value || 'none'}
                                                                onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger className="h-9 bg-background/50 rounded-xl">
                                                                        <SelectValue placeholder="Select Product Type" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="none">No Product Type Assigned</SelectItem>
                                                                    {typesData?.data.map((t: IProductType) => (
                                                                        <SelectItem key={t.id} value={t.id}>
                                                                            {t.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* Description */}
                                            <FormField
                                                control={form.control}
                                                name="description"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80">Description</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Describe flavor profiles, visual aspects, or custom preparation steps..."
                                                                className="min-h-[100px] bg-background/50 resize-y rounded-xl"
                                                                {...field}
                                                                value={field.value || ''}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>
                    </Form>
                </TabsContent>

                {/* Tab 2: Variants & Recipes Management */}
                <TabsContent value="variants" className="focus-visible:outline-none">
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-6">
                        <div className="flex items-center justify-between border-b border-border/40 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                                    <ChefHat className="size-5 text-primary" />
                                    Pricing Variants & Recipe Specifications
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Attach size modifiers, SKU references, base prices, and custom ingredient line items.
                                </p>
                            </div>
                            {!isAddingVariant && !editingVariantId && (
                                <Button
                                    type="button"
                                    onClick={() => setIsAddingVariant(true)}
                                    size="sm"
                                    className="h-8 text-xs gap-1 shadow-sm rounded-lg"
                                >
                                    <Plus className="size-3.5" /> Add Variant
                                </Button>
                            )}
                        </div>

                        {/* Variant Addition Inline */}
                        {isAddingVariant && (
                            <div className="bg-muted/10 border border-dashed border-primary/20 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-bold text-foreground uppercase ">Configure New Variant</h4>
                                <VariantForm onSubmit={handleAddVariant} onCancel={() => setIsAddingVariant(false)} submitLabel="Save Variant" />
                            </div>
                        )}

                        {/* List of Mapped Variants */}
                        <div className="border border-border/45 rounded-xl overflow-hidden bg-background/30">
                            {localVariants.length === 0 ? (
                                <div className="text-center py-16 text-xs text-muted-foreground font-semibold flex flex-col items-center gap-2">
                                    <ShieldAlert className="size-6 text-muted-foreground/80" />
                                    No variants configured for this product yet. Use the button above to configure sizes and pricing.
                                </div>
                            ) : (
                                <div className="divide-y divide-border/40">
                                    {localVariants.map((v) => {
                                        const isEditingThis = editingVariantId === v.tempId;

                                        if (isEditingThis) {
                                            return (
                                                <div key={v.tempId} className="p-4 bg-muted/15">
                                                    <h4 className="text-xs font-bold text-foreground uppercase  mb-3">Edit Variant Settings</h4>
                                                    <VariantForm
                                                        initialSku={v.sku}
                                                        initialPrice={v.price}
                                                        initialValueIds={v.attributeValueIds}
                                                        onSubmit={(data) => handleUpdateVariant(v.tempId, data)}
                                                        onCancel={() => setEditingVariantId(null)}
                                                        submitLabel="Save Changes"
                                                    />
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={v.tempId}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-muted/5 transition-colors"
                                            >
                                                <div className="space-y-1.5 min-w-0">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-sm font-bold text-foreground">₱{v.price.toFixed(2)}</span>
                                                        {v.sku && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs py-0 px-1.5 font-mono uppercase bg-muted/50 border-muted text-muted-foreground"
                                                            >
                                                                {v.sku}
                                                            </Badge>
                                                        )}
                                                        <Badge
                                                            className={`text-xs font-bold px-1.5 py-0 flex items-center gap-1 w-fit uppercase ${
                                                                v.recipe
                                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                                    : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
                                                            }`}
                                                        >
                                                            <ChefHat className="size-2.5" />
                                                            {v.recipe ? 'Recipe Configured' : 'No Recipe'}
                                                        </Badge>
                                                    </div>
                                                    {renderLocalAttributeBadges(v.attributeValueIds)}
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs font-semibold gap-1.5 px-3 border-border/70 hover:bg-muted"
                                                        onClick={() => {
                                                            setSelectedVariantForRecipe(v);
                                                            setRecipeOpen(true);
                                                        }}
                                                    >
                                                        <ChefHat className="size-3.5 text-primary" />
                                                        {v.recipe ? 'Edit Recipe' : 'Configure Recipe'}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                                        onClick={() => setEditingVariantId(v.tempId)}
                                                        title="Edit Variant"
                                                    >
                                                        <Edit2 className="size-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                                        onClick={() => handleDeleteVariant(v.tempId)}
                                                        title="Remove Variant"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Main Submit & Action CTA Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <Button type="button" variant="outline" onClick={handleBack} className="h-9 rounded-xl px-4" disabled={saveMutation.isPending}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    form="product-create-form"
                    disabled={saveMutation.isPending}
                    className="h-9 rounded-xl px-5 font-bold shadow-sm"
                >
                    {saveMutation.isPending ? (
                        <div className="flex items-center gap-1.5">
                            <Spinner className="h-4 w-4 animate-spin" /> Saving Product...
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="size-4" /> Save Product
                        </div>
                    )}
                </Button>
            </div>

            {/* Local Recipe Configuration Dialog */}
            {recipeOpen && selectedVariantForRecipe && (
                <RecipeDialog
                    open={recipeOpen}
                    onOpenChange={setRecipeOpen}
                    variant={mockVariantForRecipe}
                    productName={form.watch('name') || 'Product'}
                    isLocal={true}
                    localRecipe={selectedVariantForRecipe.recipe}
                    onSaveLocalRecipe={handleSaveRecipe}
                />
            )}
        </div>
    );
}
