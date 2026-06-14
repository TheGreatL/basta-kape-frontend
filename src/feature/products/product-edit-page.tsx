import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Package, ArrowLeft, Save, ChefHat, Plus, Edit2, Trash2, RotateCcw, Calendar, ShieldAlert, FileText, Layers } from 'lucide-react';
import { format } from 'date-fns';
import type { z } from 'zod';

import { Route } from '#/routes/admin/products/$id/edit.tsx';
import {
    getProductById,
    updateProduct,
    createProductVariant,
    updateProductVariant,
    deleteProductVariant,
    restoreProductVariant
} from '#/api/products.api.ts';
import { getCategoriesList, getProductTypesList } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { productSchema } from './products.schema.ts';
import ProductPhotoUpload from './components/product-photo-upload.tsx';
import { VariantForm } from './components/variant-form.tsx';
import RecipeDialog from './components/recipe-dialog.tsx';
import type { ICategory, IProductType } from '#/feature/product-settings/product-settings-types.ts';
import type { IProductVariant, IVariantAttribute } from './products.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
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

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductEditPage() {
    const { id } = Route.useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

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

    // Active tab state
    const [activeTab, setActiveTab] = React.useState('profile');

    // Variant action states
    const [isAddingVariant, setIsAddingVariant] = React.useState(false);
    const [editingVariantId, setEditingVariantId] = React.useState<string | null>(null);
    const [selectedVariantForRecipe, setSelectedVariantForRecipe] = React.useState<IProductVariant | null>(null);
    const [recipeOpen, setRecipeOpen] = React.useState(false);

    // Query: Product Details
    const {
        data: productDetails,
        isLoading: isDetailsLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, id],
        queryFn: () => getProductById(id),
        enabled: !!id
    });

    // Query categories and types
    const { data: categoriesData } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.CATEGORIES_LIST, { limit: 50, status: 'active' }],
        queryFn: () => getCategoriesList({ page: 1, limit: 50, status: 'active' })
    });

    const { data: typesData } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.TYPES_LIST, { limit: 50, status: 'active' }],
        queryFn: () => getProductTypesList({ page: 1, limit: 50, status: 'active' })
    });

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

    // Sync form values on details load
    React.useEffect(() => {
        if (productDetails) {
            form.reset({
                name: productDetails.name,
                photo: productDetails.photo || '',
                description: productDetails.description || '',
                productCategoryId: productDetails.productCategoryId || '',
                productTypeId: productDetails.productTypeId || ''
            });
        }
    }, [productDetails, form]);

    // Product details update mutation
    const updateMutation = useMutation({
        mutationFn: (payload: ProductFormValues) => updateProduct(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            toast.success('Product Details Saved', {
                description: 'Product general configurations have been updated successfully.'
            });
        },
        onError: (error) => {
            toast.error('Failed to update product details', {
                description: getErrorMessage(error)
            });
        }
    });

    // Variant mutations
    const createVariantMutation = useMutation({
        mutationFn: (payload: { sku: string | null; price: number; attributeValueIds: string[] }) => createProductVariant(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            toast.success('Product Variant Created');
            setIsAddingVariant(false);
        },
        onError: (error) => {
            toast.error('Failed to create variant', { description: getErrorMessage(error) });
        }
    });

    const updateVariantMutation = useMutation({
        mutationFn: ({ variantId, payload }: { variantId: string; payload: { sku: string | null; price: number; attributeValueIds: string[] } }) =>
            updateProductVariant(variantId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            toast.success('Product Variant Updated');
            setEditingVariantId(null);
        },
        onError: (error) => {
            toast.error('Failed to update variant', { description: getErrorMessage(error) });
        }
    });

    const deleteVariantMutation = useMutation({
        mutationFn: deleteProductVariant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            toast.success('Product Variant Removed');
        },
        onError: (error) => {
            toast.error('Failed to delete variant', { description: getErrorMessage(error) });
        }
    });

    const restoreVariantMutation = useMutation({
        mutationFn: restoreProductVariant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            toast.success('Product Variant Restored');
        },
        onError: (error) => {
            toast.error('Failed to restore variant', { description: getErrorMessage(error) });
        }
    });

    const onSubmitProfile = (values: ProductFormValues) => {
        updateMutation.mutate({
            name: values.name,
            photo: values.photo || null,
            description: values.description || null,
            productCategoryId: values.productCategoryId || null,
            productTypeId: values.productTypeId || null
        });
    };

    const renderAttributeBadges = (variant: IProductVariant) => {
        if (variant.attributes.length === 0) {
            return <span className="text-xs text-muted-foreground italic font-medium">Standard / No Modifiers</span>;
        }
        return (
            <div className="flex flex-wrap gap-1">
                {variant.attributes.map((attr) => (
                    <Badge
                        key={attr.id}
                        variant="secondary"
                        className="text-xs font-semibold capitalize py-0 px-1.5 bg-secondary/50 text-secondary-foreground/90"
                    >
                        {attr.attributeValue.attribute.name}: {attr.attributeValue.value}
                    </Badge>
                ))}
            </div>
        );
    };

    if (isDetailsLoading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Spinner className="size-8 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground font-semibold">Loading product configuration...</span>
                </div>
            </div>
        );
    }

    if (isError || !productDetails) {
        return (
            <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-3">
                <p className="text-sm text-rose-500 font-bold">Failed to load product details profile.</p>
                <Button onClick={() => refetch()} variant="outline" size="sm" className="h-9 gap-1.5 font-bold">
                    <RotateCcw className="size-4" /> Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header section */}
            <div className="flex flex-col gap-2">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="w-fit h-8 text-xs gap-1.5 pl-1.5 -ml-1 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-3.5" /> Back to Products
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                            <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-foreground leading-tight truncate">{productDetails.name}</h1>
                            <p className="text-xs text-muted-foreground truncate">
                                Edit product profile specifications, pricing variants, and recipe ingredients.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main view container using tabs */}
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
                        <Layers className="size-4" /> Variants & Recipes ({productDetails.variants.length})
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Profile Editor */}
                <TabsContent value="profile" className="focus-visible:outline-none">
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmitProfile)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Photo Upload Column */}
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
                                                            currentPhotoUrl={field.value || ''}
                                                            onUploadSuccess={(url) => field.onChange(url)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="text-xs text-muted-foreground text-center max-w-[200px] leading-relaxed">
                                            Modify the beverage image representation. Only JPG, PNG, and WebP format.
                                        </div>
                                    </div>

                                    {/* Core fields */}
                                    <div className="md:col-span-2 space-y-4">
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

                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80">Description</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Describe visual attributes or notes..."
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

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                                    <Button type="submit" disabled={updateMutation.isPending} className="h-9 rounded-xl px-5 font-bold shadow-sm">
                                        {updateMutation.isPending ? (
                                            <div className="flex items-center gap-1.5">
                                                <Spinner className="h-4 w-4" /> Saving...
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <Save className="size-4" /> Save Profile Details
                                            </div>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>
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
                                <RequirePermission module="Products Management" action="update">
                                    <Button onClick={() => setIsAddingVariant(true)} size="sm" className="h-8 text-xs gap-1 shadow-sm rounded-lg">
                                        <Plus className="size-3.5" /> Add Variant
                                    </Button>
                                </RequirePermission>
                            )}
                        </div>

                        {/* Variant Addition Inline */}
                        {isAddingVariant && (
                            <div className="bg-muted/10 border border-dashed border-primary/20 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-bold text-foreground uppercase ">Configure New Variant</h4>
                                <VariantForm
                                    onSubmit={(data) => createVariantMutation.mutate(data)}
                                    onCancel={() => setIsAddingVariant(false)}
                                    isPending={createVariantMutation.isPending}
                                    submitLabel="Save Variant"
                                />
                            </div>
                        )}

                        {/* List of Mapped Variants */}
                        <div className="border border-border/45 rounded-xl overflow-hidden bg-background/30">
                            {productDetails.variants.length === 0 ? (
                                <div className="text-center py-16 text-xs text-muted-foreground font-semibold flex flex-col items-center gap-2">
                                    <ShieldAlert className="size-6 text-muted-foreground/80" />
                                    No variants configured for this product. Use the button above to configure sizes and pricing.
                                </div>
                            ) : (
                                <div className="divide-y divide-border/40">
                                    {productDetails.variants.map((v: IProductVariant) => {
                                        const isEditingThis = editingVariantId === v.id;

                                        if (isEditingThis) {
                                            return (
                                                <div key={v.id} className="p-4 bg-muted/15">
                                                    <h4 className="text-xs font-bold text-foreground uppercase  mb-3">Edit Variant Settings</h4>
                                                    <VariantForm
                                                        initialSku={v.sku}
                                                        initialPrice={v.price}
                                                        initialValueIds={v.attributes.map((a: IVariantAttribute) => a.productAttributeValueId)}
                                                        onSubmit={(data) => updateVariantMutation.mutate({ variantId: v.id, payload: data })}
                                                        onCancel={() => setEditingVariantId(null)}
                                                        isPending={updateVariantMutation.isPending}
                                                        submitLabel="Save Changes"
                                                    />
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={v.id}
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
                                                    {renderAttributeBadges(v)}
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                                    <RequirePermission module="Products Management" action="read">
                                                        <Button
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
                                                    </RequirePermission>
                                                    <RequirePermission module="Products Management" action="update">
                                                        {!v.deletedAt && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                                                onClick={() => setEditingVariantId(v.id)}
                                                                title="Edit Variant"
                                                            >
                                                                <Edit2 className="size-4" />
                                                            </Button>
                                                        )}
                                                    </RequirePermission>
                                                    <RequirePermission module="Products Management" action="delete">
                                                        {v.deletedAt ? (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="size-8 text-muted-foreground hover:text-emerald-600 transition-colors"
                                                                        title="Restore Variant"
                                                                        disabled={restoreVariantMutation.isPending}
                                                                    >
                                                                        <RotateCcw className="size-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle className="flex items-center gap-2 font-bold text-foreground">
                                                                            <RotateCcw className="size-5 text-emerald-600" />
                                                                            Restore Variant
                                                                        </AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Are you sure you want to restore the variant priced at{' '}
                                                                            <strong>₱{v.price.toFixed(2)}</strong>?
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => restoreVariantMutation.mutate(v.id)}
                                                                            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                                        >
                                                                            Confirm Restore
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        ) : (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                                                onClick={() => deleteVariantMutation.mutate(v.id)}
                                                                disabled={deleteVariantMutation.isPending}
                                                                title="Delete Variant"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        )}
                                                    </RequirePermission>
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

            {/* System Audit Logs Metadata */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase text-muted-foreground  flex items-center gap-1.5">
                    <Calendar className="size-4 text-muted-foreground/80" />
                    Audit Log Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground bg-muted/20 p-4 rounded-xl border border-border/40">
                    <div>
                        <span className="font-bold text-foreground/85 block mb-0.5">Date Created</span>
                        {format(new Date(productDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                        {productDetails.createdBy && (
                            <span className="block text-muted-foreground/80 mt-0.5">
                                by {productDetails.createdBy.firstName} {productDetails.createdBy.lastName}
                            </span>
                        )}
                    </div>
                    <div>
                        <span className="font-bold text-foreground/85 block mb-0.5">Last System Modification</span>
                        {format(new Date(productDetails.updatedAt), 'MMMM dd, yyyy - hh:mm a')}
                        {productDetails.updatedBy && (
                            <span className="block text-muted-foreground/80 mt-0.5">
                                by {productDetails.updatedBy.firstName} {productDetails.updatedBy.lastName}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Recipe Configuration Slide-out / Modal Drawer */}
            <RecipeDialog open={recipeOpen} onOpenChange={setRecipeOpen} variant={selectedVariantForRecipe} productName={productDetails.name} />
        </div>
    );
}
