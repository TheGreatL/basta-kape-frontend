import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
    Package,
    ArrowLeft,
    Save,
    ChefHat,
    Plus,
    Edit2,
    Trash2,
    RotateCcw,
    Calendar,
    FileText,
    Layers,
    SlidersHorizontal,
    Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import type { z } from 'zod';

import { Route } from '#/routes/admin/products/$id/edit.tsx';
import { getProductById, updateProduct, bulkSyncProductVariants } from '#/api/products.api.ts';
import { getCategoriesList, getProductTypesList, getAttributesList, getAttributeValuesList } from '#/api/product-settings.ts';
import { getModifierGroups, updateModifierGroup, deleteModifierOption } from '#/api/modifiers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { productSchema } from './products.schema.ts';
import ProductPhotoUpload from './components/product-photo-upload.tsx';
import RecipeDialog from './components/recipe-dialog.tsx';
import OptionDialog from '#/feature/modifier/components/option-dialog.tsx';
import type { ICategory, IProductType, IAttribute, IAttributeValue } from '#/feature/product-settings/product-settings-types.ts';
import type { IProduct, IProductVariant, IVariantAttribute } from './products.types';
import type { IModifierGroup, IModifierOption } from '#/feature/modifier/modifier.types.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';
import { Switch } from '#/components/ui/switch.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card.tsx';

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

    // Grid variants local state (for the spreadsheet-like matrix)
    interface IGridVariant {
        id?: string;
        sku: string;
        price: number;
        attributeValueIds: string[];
        attributeValueLabels: string[];
        recipeConfigured: boolean;
    }
    const [gridVariants, setGridVariants] = React.useState<IGridVariant[]>([]);

    // Selected variant for recipe configuration dialog
    const [selectedVariantForRecipe, setSelectedVariantForRecipe] = React.useState<IProductVariant | null>(null);
    const [recipeOpen, setRecipeOpen] = React.useState(false);

    // Matrix generator states
    const [activeAttributes, setActiveAttributes] = React.useState<Record<string, boolean>>({});
    const [selectedValuesMap, setSelectedValuesMap] = React.useState<Record<string, Array<{ id: string; value: string }>>>({});
    const [defaultPrice, setDefaultPrice] = React.useState<number>(0);
    const [skuPrefix, setSkuPrefix] = React.useState<string>('');

    // Bulk action states
    const [bulkPriceInput, setBulkPriceInput] = React.useState<string>('');
    const [bulkSkuPrefixInput, setBulkSkuPrefixInput] = React.useState<string>('');

    // Modifier options dialog states
    const [optionDialogOpen, setOptionDialogOpen] = React.useState(false);
    const [selectedGroupIdForOption, setSelectedGroupIdForOption] = React.useState<string>('');
    const [selectedOption, setSelectedOption] = React.useState<IModifierOption | null>(null);

    // Modifier groups filtering state
    const [modifierSearch, setModifierSearch] = React.useState('');

    // Query: Product Details
    const {
        data: productDetails,
        isLoading: isDetailsLoading,
        isError,
        refetch
    } = useQuery<IProduct>({
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

    // Query attributes list
    const { data: attributesData, isLoading: isAttributesLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTES_LIST, { limit: 100, status: 'active' }],
        queryFn: () => getAttributesList({ page: 1, limit: 100, status: 'active' })
    });

    // Query modifier groups
    const { data: modifierGroupsData, isLoading: isGroupsLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS, { limit: 100 }],
        queryFn: () => getModifierGroups({ page: 1, limit: 100 })
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

    // Sync form values and grid variants on details load
    React.useEffect(() => {
        if (productDetails) {
            form.reset({
                name: productDetails.name,
                photo: productDetails.photo || '',
                description: productDetails.description || '',
                productCategoryId: productDetails.productCategoryId || '',
                productTypeId: productDetails.productTypeId || ''
            });
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (productDetails.variants) {
                setGridVariants(
                    productDetails.variants.map((v: IProductVariant) => ({
                        id: v.id,
                        sku: v.sku || '',
                        price: v.price,
                        attributeValueIds: v.attributes.map((a: IVariantAttribute) => a.productAttributeValueId),
                        attributeValueLabels: v.attributes.map((a: IVariantAttribute) => a.attributeValue.value),
                        recipeConfigured: !!v.recipe
                    }))
                );

                // Populate active attributes & selectedValuesMap for the matrix generator inputs
                const activeAttrs: Record<string, boolean> = {};
                const selectedVals: Record<string, Array<{ id: string; value: string }>> = {};

                productDetails.variants.forEach((v: IProductVariant) => {
                    v.attributes.forEach((a: IVariantAttribute) => {
                        const attrId = a.attributeValue.productAttributeId;
                        const valId = a.productAttributeValueId;
                        const valText = a.attributeValue.value;

                        activeAttrs[attrId] = true;
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        if (!selectedVals[attrId]) {
                            selectedVals[attrId] = [];
                        }
                        if (!selectedVals[attrId].some((x) => x.id === valId)) {
                            selectedVals[attrId].push({ id: valId, value: valText });
                        }
                    });
                });

                setActiveAttributes(activeAttrs);
                setSelectedValuesMap(selectedVals);
            }
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

    // Sync variants mutation
    const syncVariantsMutation = useMutation({
        mutationFn: (payload: { variants: Array<{ id?: string | null; sku?: string | null; price: number; attributeValueIds: string[] }> }) =>
            bulkSyncProductVariants(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            toast.success('Variants Saved Successfully', {
                description: 'The product variants and matrix configurations have been synchronized.'
            });
        },
        onError: (error) => {
            toast.error('Failed to save variants', {
                description: getErrorMessage(error)
            });
        }
    });

    // Toggle modifier group link
    const toggleModifierGroupMutation = useMutation({
        mutationFn: async ({ group, link }: { group: IModifierGroup; link: boolean }) => {
            const currentProductIds = group.products.map((p) => p.id);
            let nextProductIds: string[];
            if (link) {
                nextProductIds = [...currentProductIds, id];
            } else {
                nextProductIds = currentProductIds.filter((pid) => pid !== id);
            }
            return updateModifierGroup(group.id, { productIds: nextProductIds });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS] });
            toast.success('Modifier customization updated');
        },
        onError: (err) => {
            toast.error('Failed to link modifier customization', { description: getErrorMessage(err) });
        }
    });

    // Delete modifier option
    const deleteOptionMutation = useMutation({
        mutationFn: (optionId: string) => deleteModifierOption(optionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS] });
            toast.success('Modifier option deleted successfully');
        },
        onError: (err) => {
            toast.error('Failed to delete modifier option', { description: getErrorMessage(err) });
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

    // Cartesian Product Permutations Generator
    const generateMatrix = () => {
        const selectedArrays: Array<Array<{ id: string; value: string }>> = [];

        attributesData?.data.forEach((attr: IAttribute) => {
            if (activeAttributes[attr.id]) {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                const values = selectedValuesMap[attr.id] || [];
                if (values.length > 0) {
                    selectedArrays.push(values);
                }
            }
        });

        if (selectedArrays.length === 0) {
            toast.warning('Please select at least one attribute and its option values to generate.');
            return;
        }

        // Cartesian product builder
        const combinations = selectedArrays.reduce<Array<Array<{ id: string; value: string }>>>(
            (acc, val) => acc.flatMap((d) => val.map((e) => [...d, e])),
            [[]]
        );

        setGridVariants((prev) => {
            const next = [...prev];
            combinations.forEach((combo) => {
                // Sort combo by ID to keep IDs and Labels in matching indexes
                const sortedCombo = [...combo].sort((a, b) => a.id.localeCompare(b.id));
                const attributeValueIds = sortedCombo.map((c) => c.id);
                const attributeValueLabels = sortedCombo.map((c) => c.value);

                // Check if this combination already exists in gridVariants
                const exists = next.some(
                    (v) =>
                        v.attributeValueIds.length === attributeValueIds.length &&
                        v.attributeValueIds
                            .slice()
                            .sort()
                            .every((val, index) => val === attributeValueIds[index])
                );

                if (!exists) {
                    const skuSuffix = sortedCombo.map((c) => c.value.replace(/\s+/g, '').toUpperCase()).join('-');
                    const generatedSku = skuPrefix.trim() ? `${skuPrefix.trim().toUpperCase()}-${skuSuffix}` : '';

                    next.push({
                        sku: generatedSku,
                        price: defaultPrice,
                        attributeValueIds,
                        attributeValueLabels,
                        recipeConfigured: false
                    });
                }
            });
            return next;
        });

        toast.success(`Generated combinations matrix. Save changes to sync!`);
    };

    const handleAttributeChange = (variantIndex: number, oldValueId: string | undefined, newValueId: string, newValueLabel: string) => {
        setGridVariants((prev) =>
            prev.map((item, idx) => {
                if (idx !== variantIndex) return item;

                const nextIds = [...item.attributeValueIds];
                const nextLabels = [...item.attributeValueLabels];

                if (oldValueId) {
                    const existingIndex = nextIds.indexOf(oldValueId);
                    if (existingIndex !== -1) {
                        nextIds[existingIndex] = newValueId;
                        nextLabels[existingIndex] = newValueLabel;
                    } else {
                        nextIds.push(newValueId);
                        nextLabels.push(newValueLabel);
                    }
                } else {
                    nextIds.push(newValueId);
                    nextLabels.push(newValueLabel);
                }

                return {
                    ...item,
                    attributeValueIds: nextIds,
                    attributeValueLabels: nextLabels
                };
            })
        );
    };

    const selectedVariantObject = React.useMemo(() => {
        if (!selectedVariantForRecipe || !productDetails) return null;
        return productDetails.variants.find((v: IProductVariant) => v.id === selectedVariantForRecipe.id) || null;
    }, [selectedVariantForRecipe, productDetails]);

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
                                Edit product profile specifications, pricing variants, recipes, and modifiers.
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
                        <Layers className="size-4" /> Variants & Recipes ({gridVariants.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="modifiers"
                        className="flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs"
                    >
                        <SlidersHorizontal className="size-4" /> Modifiers & Customizations
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
                                                <Save className="size-4" /> Save Product Details
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
                        <div>
                            <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                                <ChefHat className="size-5 text-primary" />
                                Pricing Variants & Recipe Specifications
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Generate attribute permutations using the generator, or edit pricing matrix and recipe ingredients inline.
                            </p>
                        </div>

                        {/* Variant Matrix Generator Card */}
                        <div className="bg-muted/10 border rounded-2xl p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-2">
                                <div>
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                        <Sparkles className="size-4 text-primary" />
                                        Variant Matrix Auto-Generator
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Select attribute options to auto-generate all possible combination permutations.
                                    </p>
                                </div>
                                <Button type="button" size="sm" onClick={generateMatrix} className="h-8 text-xs font-semibold gap-1.5 shadow-sm">
                                    <Plus className="size-3.5" /> Generate Matrix
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Default Pricing & SKUs */}
                                <div className="space-y-3 bg-background p-4 rounded-xl border border-border/30">
                                    <h5 className="text-xs font-bold text-foreground/80 uppercase">Default Fields</h5>
                                    <div className="space-y-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground">Default Price (₱)</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={defaultPrice}
                                                onChange={(e) => setDefaultPrice(Number(e.target.value) || 0)}
                                                className="h-8 text-xs bg-background/50"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-muted-foreground font-mono">
                                                Auto SKU Prefix (Optional)
                                            </label>
                                            <Input
                                                placeholder="e.g. LATTE"
                                                value={skuPrefix}
                                                onChange={(e) => setSkuPrefix(e.target.value)}
                                                className="h-8 text-xs uppercase bg-background/50 font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Checked attributes checklist */}
                                <div className="md:col-span-2 space-y-3 bg-background p-4 rounded-xl border border-border/30">
                                    <h5 className="text-xs font-bold text-foreground/80 uppercase">Select Matrix Modifiers</h5>
                                    {isAttributesLoading ? (
                                        <div className="flex items-center gap-1.5 py-4">
                                            <Spinner className="size-4 animate-spin text-primary" />
                                            <span className="text-xs text-muted-foreground font-medium">Loading attributes...</span>
                                        </div>
                                    ) : !attributesData?.data || attributesData.data.length === 0 ? (
                                        <div className="text-xs text-muted-foreground italic py-4">
                                            No custom options defined. Head to Product Settings to create custom attributes (e.g. Size, Milk Option).
                                        </div>
                                    ) : (
                                        <div className="space-y-3 divide-y divide-border/20">
                                            {attributesData.data.map((attr: IAttribute) => {
                                                const isChecked = !!activeAttributes[attr.id];
                                                return (
                                                    <div key={attr.id} className="pt-2.5 first:pt-0">
                                                        <label className="flex items-center gap-2 text-xs font-bold text-foreground/80 cursor-pointer select-none">
                                                            <Checkbox
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    setActiveAttributes((prev) => ({ ...prev, [attr.id]: !!checked }));
                                                                    if (!checked) {
                                                                        setSelectedValuesMap((prev) => {
                                                                            const next = { ...prev };
                                                                            delete next[attr.id];
                                                                            return next;
                                                                        });
                                                                    }
                                                                }}
                                                            />
                                                            <span>{attr.name}</span>
                                                            {attr.description && (
                                                                <span className="text-muted-foreground font-normal">({attr.description})</span>
                                                            )}
                                                        </label>
                                                        {isChecked && (
                                                            <div className="mt-2.5">
                                                                <AttributeValuesChecklist
                                                                    attributeId={attr.id}
                                                                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                                                                    selectedValues={selectedValuesMap[attr.id] || []}
                                                                    onSelectionChange={(selected) => {
                                                                        setSelectedValuesMap((prev) => ({
                                                                            ...prev,
                                                                            [attr.id]: selected
                                                                        }));
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bulk Operations and Grid List */}
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 bg-muted/10 p-3 rounded-xl border border-border/30 text-xs">
                                <span className="font-bold text-foreground/80">Bulk Actions:</span>
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Bulk Price (₱)"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={bulkPriceInput}
                                        onChange={(e) => setBulkPriceInput(e.target.value)}
                                        className="h-8 w-28 text-xs bg-background"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            if (bulkPriceInput === '') return;
                                            const priceVal = Number(bulkPriceInput);
                                            setGridVariants((prev) => prev.map((v) => ({ ...v, price: priceVal })));
                                            toast.success(`Updated price for all variants to ₱${priceVal.toFixed(2)}`);
                                            setBulkPriceInput('');
                                        }}
                                        className="h-8 text-xs font-semibold px-2.5"
                                    >
                                        Apply Price
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Bulk SKU Prefix"
                                        value={bulkSkuPrefixInput}
                                        onChange={(e) => setBulkSkuPrefixInput(e.target.value)}
                                        className="h-8 w-36 text-xs uppercase bg-background font-mono"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            if (!bulkSkuPrefixInput.trim()) return;
                                            const prefix = bulkSkuPrefixInput.trim().toUpperCase();
                                            setGridVariants((prev) =>
                                                prev.map((v) => {
                                                    if (v.attributeValueLabels.length === 0) return { ...v, sku: prefix };
                                                    const suffix = v.attributeValueLabels.map((l) => l.replace(/\s+/g, '').toUpperCase()).join('-');
                                                    return { ...v, sku: `${prefix}-${suffix}` };
                                                })
                                            );
                                            toast.success(`Generated SKU list with prefix ${prefix}`);
                                            setBulkSkuPrefixInput('');
                                        }}
                                        className="h-8 text-xs font-semibold px-2.5"
                                    >
                                        Apply SKUs
                                    </Button>
                                </div>
                            </div>

                            <div className="border border-border/40 rounded-xl overflow-hidden bg-background/30 max-h-[500px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-muted/20">
                                        <TableRow>
                                            <TableHead className="w-[45%] text-xs font-bold uppercase">Pricing Variants / Custom Mappings</TableHead>
                                            <TableHead className="w-[20%] text-xs font-bold uppercase font-mono">SKU Code</TableHead>
                                            <TableHead className="w-[20%] text-xs font-bold uppercase">Base Price (₱)</TableHead>
                                            <TableHead className="w-[15%] text-xs font-bold uppercase text-center">Recipe Build</TableHead>
                                            <TableHead className="w-[5%] text-xs font-bold uppercase text-right"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {gridVariants.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground font-semibold">
                                                    No variants configured. Use the Matrix Generator above to generate permutations.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            gridVariants.map((v, index) => {
                                                return (
                                                    <TableRow key={index} className="hover:bg-muted/10 transition-colors">
                                                        <TableCell className="align-middle">
                                                            {v.attributeValueLabels.length === 0 &&
                                                            Object.keys(activeAttributes).filter((k) => activeAttributes[k]).length === 0 ? (
                                                                <span className="text-xs text-muted-foreground italic font-medium pl-1">
                                                                    Standard Variant (Base Product)
                                                                </span>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-3 items-center">
                                                                    {attributesData?.data
                                                                        .filter((attr: IAttribute) => activeAttributes[attr.id])
                                                                        .map((attr: IAttribute) => (
                                                                            <VariantAttributeSelect
                                                                                key={attr.id}
                                                                                attributeId={attr.id}
                                                                                attributeName={attr.name}
                                                                                valueIds={v.attributeValueIds}
                                                                                onValueChange={(oldValId, newValId, newValLabel) =>
                                                                                    handleAttributeChange(index, oldValId, newValId, newValLabel)
                                                                                }
                                                                            />
                                                                        ))}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="align-middle">
                                                            <Input
                                                                value={v.sku}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setGridVariants((prev) =>
                                                                        prev.map((item, i) => (i === index ? { ...item, sku: val } : item))
                                                                    );
                                                                }}
                                                                className="h-8 text-xs font-mono bg-background uppercase placeholder:italic"
                                                                placeholder="AUTO-GENERATE"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="align-middle">
                                                            <div className="relative">
                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                                                                    ₱
                                                                </span>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={v.price}
                                                                    onChange={(e) => {
                                                                        const val = Number(e.target.value) || 0;
                                                                        setGridVariants((prev) =>
                                                                            prev.map((item, i) => (i === index ? { ...item, price: val } : item))
                                                                        );
                                                                    }}
                                                                    className="h-8 text-xs pl-6 bg-background font-semibold"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="align-middle text-center">
                                                            {v.id ? (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        setSelectedVariantForRecipe(v as any);
                                                                        setRecipeOpen(true);
                                                                    }}
                                                                    className={`h-8 text-2xs font-semibold gap-1 px-2 hover:bg-muted ${
                                                                        v.recipeConfigured
                                                                            ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20'
                                                                            : 'text-amber-600 hover:text-amber-700 bg-amber-50 dark:bg-amber-950/20'
                                                                    }`}
                                                                >
                                                                    <ChefHat className="size-3" />
                                                                    {v.recipeConfigured ? 'Edit Recipe' : 'Add Recipe'}
                                                                </Button>
                                                            ) : (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-2xs text-muted-foreground uppercase py-0.5 border-dashed"
                                                                >
                                                                    Save to config
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="align-middle text-right">
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => {
                                                                    setGridVariants((prev) => prev.filter((_, i) => i !== index));
                                                                }}
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setGridVariants((prev) => [
                                            ...prev,
                                            {
                                                sku: '',
                                                price: 0,
                                                attributeValueIds: [],
                                                attributeValueLabels: [],
                                                recipeConfigured: false
                                            }
                                        ]);
                                    }}
                                    className="h-8 text-2xs gap-1 border-dashed"
                                >
                                    <Plus className="size-3" /> Add Standard / Custom Row
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() => syncVariantsMutation.mutate({ variants: gridVariants })}
                                    disabled={syncVariantsMutation.isPending}
                                    className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm"
                                >
                                    {syncVariantsMutation.isPending ? (
                                        <>
                                            <Spinner className="h-4 w-4 animate-spin" /> Saving Matrix...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="size-4" /> Save & Sync Matrix
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Tab 3: Modifiers & Customizations Management */}
                <TabsContent value="modifiers" className="focus-visible:outline-none">
                    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-3 gap-2">
                            <div>
                                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                                    <SlidersHorizontal className="size-5 text-primary" />
                                    Modifiers & Product Customizations
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Link modifier choice groups (e.g. Milk Choice, Extra Toppings) and configure adjustment options recipes.
                                </p>
                            </div>

                            <Input
                                placeholder="Search modifiers..."
                                value={modifierSearch}
                                onChange={(e) => setModifierSearch(e.target.value)}
                                className="h-8 text-xs w-full sm:w-[220px] bg-background/50"
                            />
                        </div>

                        {isGroupsLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-2">
                                <Spinner className="size-6 text-primary animate-spin" />
                                <span className="text-xs text-muted-foreground font-semibold">Loading customization modifiers...</span>
                            </div>
                        ) : !modifierGroupsData?.data || modifierGroupsData.data.length === 0 ? (
                            <div className="text-center py-12 text-xs text-muted-foreground italic">No modifier customization groups found.</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {modifierGroupsData.data
                                    .filter((group: IModifierGroup) => group.name.toLowerCase().includes(modifierSearch.toLowerCase()))
                                    .map((group: IModifierGroup) => {
                                        const isLinked = group.products.some((p) => p.id === id);

                                        return (
                                            <Card
                                                key={group.id}
                                                className={`border transition-all shadow-2xs overflow-hidden flex flex-col ${
                                                    isLinked
                                                        ? 'border-primary/45 bg-primary/2 dark:bg-primary-[0.01]'
                                                        : 'border-border/50 bg-card opacity-85'
                                                }`}
                                            >
                                                <CardHeader className="p-4 pb-3 border-b bg-muted/15 flex flex-row items-center justify-between gap-3">
                                                    <div>
                                                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                                            {group.name}
                                                        </CardTitle>
                                                        <span className="text-3xs text-muted-foreground font-semibold block mt-0.5">
                                                            {group.isRequired ? 'REQUIRED' : 'OPTIONAL'} • SELECT {group.minSelect}-{group.maxSelect}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-3xs px-1.5 py-0 uppercase ${
                                                                isLinked
                                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                                    : 'bg-muted text-muted-foreground border-muted-foreground/20'
                                                            }`}
                                                        >
                                                            {isLinked ? 'Linked' : 'Unlinked'}
                                                        </Badge>
                                                        <Switch
                                                            checked={isLinked}
                                                            onCheckedChange={(checked) =>
                                                                toggleModifierGroupMutation.mutate({ group, link: checked })
                                                            }
                                                            disabled={toggleModifierGroupMutation.isPending}
                                                        />
                                                    </div>
                                                </CardHeader>
                                                <CardContent
                                                    className={`p-4 flex-1 flex flex-col min-h-0 ${!isLinked ? 'select-none pointer-events-none opacity-40 bg-muted/5' : ''}`}
                                                >
                                                    <div className="flex-1 space-y-3 min-h-0">
                                                        <div className="flex items-center justify-between border-b border-border/20 pb-1">
                                                            <span className="text-2xs font-bold text-muted-foreground block uppercase">
                                                                Modifier Choices
                                                            </span>
                                                            {isLinked && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedGroupIdForOption(group.id);
                                                                        setSelectedOption(null);
                                                                        setOptionDialogOpen(true);
                                                                    }}
                                                                    className="h-6 text-3xs font-semibold gap-1 px-1.5 text-primary hover:text-primary hover:bg-primary/5"
                                                                >
                                                                    <Plus className="size-3" /> Add Choice
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {group.options.length === 0 ? (
                                                            <div className="text-center py-6 text-3xs text-muted-foreground italic">
                                                                No choices defined in this modifier group. Click "Add Choice" to define values.
                                                            </div>
                                                        ) : (
                                                            <ul className="divide-y divide-border/20 max-h-[160px] overflow-y-auto">
                                                                {group.options.map((opt) => (
                                                                    <li key={opt.id} className="flex justify-between items-center py-2 text-xs">
                                                                        <div>
                                                                            <span className="font-semibold text-foreground/80">{opt.name}</span>
                                                                            <span className="text-3xs text-muted-foreground block font-bold">
                                                                                +₱{opt.price.toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                        {isLinked && (
                                                                            <div className="flex items-center gap-1">
                                                                                <Button
                                                                                    type="button"
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    onClick={() => {
                                                                                        setSelectedGroupIdForOption(group.id);
                                                                                        setSelectedOption(opt);
                                                                                        setOptionDialogOpen(true);
                                                                                    }}
                                                                                    className="size-7 text-muted-foreground hover:text-primary"
                                                                                >
                                                                                    <Edit2 className="size-3" />
                                                                                </Button>
                                                                                <Button
                                                                                    type="button"
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    onClick={() => {
                                                                                        if (confirm(`Delete the choice "${opt.name}"?`)) {
                                                                                            deleteOptionMutation.mutate(opt.id);
                                                                                        }
                                                                                    }}
                                                                                    disabled={deleteOptionMutation.isPending}
                                                                                    className="size-7 text-muted-foreground hover:text-destructive"
                                                                                >
                                                                                    <Trash2 className="size-4" />
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                            </div>
                        )}
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
            <RecipeDialog open={recipeOpen} onOpenChange={setRecipeOpen} variant={selectedVariantObject} productName={productDetails.name} />

            {/* Option Dialog for Modifiers choices editing */}
            <OptionDialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen} groupId={selectedGroupIdForOption} option={selectedOption} />
        </div>
    );
}

// Sub-component to fetch attribute values checklist for the matrix generator
interface AttributeValuesChecklistProps {
    attributeId: string;
    onSelectionChange: (selected: Array<{ id: string; value: string }>) => void;
    selectedValues: Array<{ id: string; value: string }>;
}

function AttributeValuesChecklist({ attributeId, onSelectionChange, selectedValues }: AttributeValuesChecklistProps) {
    const { data: valuesData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attributeId],
        queryFn: () => getAttributeValuesList(attributeId)
    });

    const handleToggle = (val: IAttributeValue, checked: boolean) => {
        if (checked) {
            onSelectionChange([...selectedValues, { id: val.id, value: val.value }]);
        } else {
            onSelectionChange(selectedValues.filter((v) => v.id !== val.id));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-1.5 py-1 pl-6">
                <Spinner className="size-3 animate-spin text-muted-foreground" />
                <span className="text-2xs text-muted-foreground">Loading values...</span>
            </div>
        );
    }

    if (!valuesData?.data || valuesData.data.length === 0) {
        return (
            <div className="text-2xs text-muted-foreground italic pl-6 py-1">
                No values found for this attribute. Define values in Product Settings.
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2.5 pl-6 py-1">
            {valuesData.data.map((val: IAttributeValue) => {
                const isChecked = selectedValues.some((v) => v.id === val.id);
                return (
                    <label key={val.id} className="flex items-center gap-1.5 text-xs text-foreground/80 cursor-pointer select-none">
                        <Checkbox checked={isChecked} onCheckedChange={(checked) => handleToggle(val, !!checked)} />
                        <span className="capitalize">{val.value}</span>
                    </label>
                );
            })}
        </div>
    );
}

interface VariantAttributeSelectProps {
    attributeId: string;
    attributeName: string;
    valueIds: string[];
    onValueChange: (oldValueId: string | undefined, newValueId: string, newValueLabel: string) => void;
}

function VariantAttributeSelect({ attributeId, attributeName, valueIds, onValueChange }: VariantAttributeSelectProps) {
    const { data: valuesData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attributeId],
        queryFn: () => getAttributeValuesList(attributeId)
    });

    const values = valuesData?.data || [];
    const selectedValue = values.find((v: IAttributeValue) => valueIds.includes(v.id));

    if (isLoading) {
        return <Spinner className="size-3 animate-spin text-muted-foreground" />;
    }

    if (values.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1 min-w-[120px] text-left">
            <span className="text-xs font-bold text-muted-foreground uppercase">{attributeName}</span>
            <Select
                value={selectedValue?.id || 'none'}
                onValueChange={(valId) => {
                    const matched = values.find((v: IAttributeValue) => v.id === valId);
                    if (matched) {
                        onValueChange(selectedValue?.id, matched.id, matched.value);
                    }
                }}
            >
                <SelectTrigger className="h-8 text-xs bg-background/50 rounded-lg">
                    <SelectValue placeholder={`Select ${attributeName}`} />
                </SelectTrigger>
                <SelectContent>
                    {values.map((v: IAttributeValue) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v.value}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
