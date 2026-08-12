import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FileText, Layers, SlidersHorizontal, RotateCcw } from 'lucide-react';
import type { z } from 'zod';

import { Route } from '#/routes/admin/products/$id/edit.tsx';
import { getProductById, updateProduct, bulkSyncProductVariants } from '#/api/products.api.ts';
import { getCategoriesList, getProductTypesList, getAttributesList } from '#/api/product-settings.ts';
import { getModifierGroups, deleteModifierGroup, deleteModifierOption } from '#/api/modifiers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { productSchema } from './products.schema.ts';
import RecipeDialog from './components/recipe-dialog.tsx';
import GroupDialog from '#/feature/modifier/components/group-dialog.tsx';
import OptionDialog from '#/feature/modifier/components/option-dialog.tsx';
import type { IAttribute } from '#/feature/product-settings/product-settings-types.ts';
import type { IProduct, IProductVariant, IVariantAttribute } from './products.types';
import type { IModifierGroup, IModifierOption } from '#/feature/modifier/modifier.types.ts';

import { Spinner } from '#/components/ui/spinner.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';
import { ConfirmDialog } from '#/components/ui/confirm-dialog.tsx';

import EditProductHeader from './components/edit/edit-product-header.tsx';
import EditProfileTab from './components/edit/edit-profile-tab.tsx';
import EditVariantsTab from './components/edit/edit-variants-tab.tsx';
import type { IGridVariant } from './components/edit/edit-variants-tab.tsx';
import EditCustomizationsTab from './components/edit/edit-customizations-tab.tsx';

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
    const [gridVariants, setGridVariants] = React.useState<IGridVariant[]>([]);

    // Selected variant for recipe configuration dialog
    const [selectedVariantForRecipe, setSelectedVariantForRecipe] = React.useState<IGridVariant | null>(null);
    const [recipeOpen, setRecipeOpen] = React.useState(false);

    // Matrix generator states
    const [activeAttributes, setActiveAttributes] = React.useState<Record<string, boolean>>({});
    const [selectedValuesMap, setSelectedValuesMap] = React.useState<Record<string, Array<{ id: string; value: string }>>>({});
    const [defaultPrice, setDefaultPrice] = React.useState<number>(0);
    const [skuPrefix, setSkuPrefix] = React.useState<string>('');

    // Bulk action states
    const [bulkPriceInput, setBulkPriceInput] = React.useState<string>('');
    const [bulkSkuPrefixInput, setBulkSkuPrefixInput] = React.useState<string>('');

    // Modifier group & options dialog states
    const [groupDialogOpen, setGroupDialogOpen] = React.useState(false);
    const [selectedGroup, setSelectedGroup] = React.useState<IModifierGroup | null>(null);
    const [deletingGroup, setDeletingGroup] = React.useState<IModifierGroup | null>(null);

    const [optionDialogOpen, setOptionDialogOpen] = React.useState(false);
    const [selectedGroupIdForOption, setSelectedGroupIdForOption] = React.useState<string>('');
    const [selectedOption, setSelectedOption] = React.useState<IModifierOption | null>(null);
    const [deletingOption, setDeletingOption] = React.useState<IModifierOption | null>(null);

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
    const { data: attributesData } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTES_LIST, { limit: 50, status: 'active' }],
        queryFn: () => getAttributesList({ page: 1, limit: 50, status: 'active' })
    });

    // Query modifier groups for THIS product specifically
    const { data: modifierGroupsData, isLoading: isGroupsLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS, id, { limit: 50 }],
        queryFn: () => getModifierGroups({ page: 1, limit: 50, productId: id }),
        enabled: !!id
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

                    if (!selectedVals[attrId].some((x) => x.id === valId)) {
                        selectedVals[attrId].push({ id: valId, value: valText });
                    }
                });
            });

            setActiveAttributes(activeAttrs);
            setSelectedValuesMap(selectedVals);
        }
    }, [productDetails, form]);

    // Product details update mutation
    const updateMutation = useMutation({
        mutationFn: (payload: ProductFormValues) => updateProduct(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            toast.success('Product Details Saved', {
                description: 'Product general configurations updated successfully.'
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
                description: 'Product variants and pricing matrix updated.'
            });
        },
        onError: (error) => {
            toast.error('Failed to save variants', {
                description: getErrorMessage(error)
            });
        }
    });

    // Delete modifier group
    const deleteGroupMutation = useMutation({
        mutationFn: (groupId: string) => deleteModifierGroup(groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS] });
            toast.success('Customization group deleted');
        },
        onError: (err) => {
            toast.error('Failed to delete customization group', { description: getErrorMessage(err) });
        }
    });

    // Delete modifier option
    const deleteOptionMutation = useMutation({
        mutationFn: (optionId: string) => deleteModifierOption(optionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS] });
            toast.success('Customization choice deleted successfully');
        },
        onError: (err) => {
            toast.error('Failed to delete customization choice', { description: getErrorMessage(err) });
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
                const values = selectedValuesMap[attr.id];
                if (values.length > 0) {
                    selectedArrays.push(values);
                }
            }
        });

        if (selectedArrays.length === 0) {
            toast.warning('Please select at least one attribute and its option values to generate.');
            return;
        }

        const combinations = selectedArrays.reduce<Array<Array<{ id: string; value: string }>>>(
            (acc, val) => acc.flatMap((d) => val.map((e) => [...d, e])),
            [[]]
        );

        setGridVariants((prev) => {
            const next = [...prev];
            combinations.forEach((combo) => {
                const sortedCombo = [...combo].sort((a, b) => a.id.localeCompare(b.id));
                const attributeValueIds = sortedCombo.map((c) => c.id);
                const attributeValueLabels = sortedCombo.map((c) => c.value);

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

    const selectedVariantObject = React.useMemo(() => {
        if (!selectedVariantForRecipe || !productDetails) return null;
        if (selectedVariantForRecipe.id) {
            const found = productDetails.variants.find((v: IProductVariant) => v.id === selectedVariantForRecipe.id);
            if (found) return found;
        }
        return {
            id: selectedVariantForRecipe.id || '',
            productId: id,
            sku: selectedVariantForRecipe.sku,
            price: selectedVariantForRecipe.price,
            attributes: selectedVariantForRecipe.attributeValueIds.map((valId, idx) => ({
                id: valId,
                productVariantId: selectedVariantForRecipe.id || '',
                attributeValueId: valId,
                attributeValue: {
                    id: valId,
                    attributeId: '',
                    value: selectedVariantForRecipe.attributeValueLabels[idx] || valId
                }
            })),
            recipe: null
        } as unknown as IProductVariant;
    }, [selectedVariantForRecipe, productDetails, id]);

    if (isDetailsLoading) {
        return (
            <div className="flex h-[75vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Spinner className="size-8 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground font-semibold">Loading product configuration...</span>
                </div>
            </div>
        );
    }

    if (isError || !productDetails) {
        return (
            <div className="flex h-[75vh] w-full flex-col items-center justify-center gap-3">
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
            <EditProductHeader product={productDetails} onBack={handleBack} />

            {/* Tabbed Navigation Bar */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-muted/40 p-1 rounded-xl w-full sm:w-auto border border-border/40 mb-4 flex flex-wrap">
                    <TabsTrigger value="profile" className="flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold">
                        <FileText className="size-4" /> 1. General Info
                    </TabsTrigger>
                    <TabsTrigger value="variants" className="flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold">
                        <Layers className="size-4" /> 2. Drink Sizes & Recipes ({gridVariants.length})
                    </TabsTrigger>
                    <TabsTrigger value="modifiers" className="flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold">
                        <SlidersHorizontal className="size-4" /> 3. Add-ons & Customizations
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Profile Editor */}
                <TabsContent value="profile" className="focus-visible:outline-none">
                    <EditProfileTab
                        form={form}
                        onSubmit={onSubmitProfile}
                        categoriesData={categoriesData}
                        typesData={typesData}
                        isSaving={updateMutation.isPending}
                    />
                </TabsContent>

                {/* Tab 2: Variants & Recipes */}
                <TabsContent value="variants" className="focus-visible:outline-none">
                    <EditVariantsTab
                        gridVariants={gridVariants}
                        setGridVariants={setGridVariants}
                        onSaveVariants={() => {
                            const seen = new Set<string>();
                            let duplicateCombo = '';
                            for (const v of gridVariants) {
                                const key = [...v.attributeValueIds].sort().join(':');
                                if (seen.has(key)) {
                                    duplicateCombo = v.attributeValueLabels.join(' • ') || 'Standard Drink';
                                    break;
                                }
                                seen.add(key);
                            }

                            if (duplicateCombo) {
                                toast.error('Cannot Save Variants', {
                                    description: `Duplicate combination "${duplicateCombo}" detected. Each variant combination must be unique per drink.`
                                });
                                return;
                            }

                            syncVariantsMutation.mutate({ variants: gridVariants });
                        }}
                        isSaving={syncVariantsMutation.isPending}
                        onOpenRecipe={(variant) => {
                            if (!variant.id) {
                                toast.info('Save Variants Matrix First', {
                                    description:
                                        'This is a new drink variant. Please click "Save Variants Matrix" above to save changes before configuring its ingredient recipe.'
                                });
                                return;
                            }
                            setSelectedVariantForRecipe(variant);
                            setRecipeOpen(true);
                        }}
                        attributesData={attributesData}
                        activeAttributes={activeAttributes}
                        setActiveAttributes={setActiveAttributes}
                        selectedValuesMap={selectedValuesMap}
                        setSelectedValuesMap={setSelectedValuesMap}
                        defaultPrice={defaultPrice}
                        setDefaultPrice={setDefaultPrice}
                        skuPrefix={skuPrefix}
                        setSkuPrefix={setSkuPrefix}
                        onGenerateMatrix={generateMatrix}
                        bulkPriceInput={bulkPriceInput}
                        setBulkPriceInput={setBulkPriceInput}
                        onApplyBulkPrice={() => {
                            const priceNum = parseFloat(bulkPriceInput);
                            if (!isNaN(priceNum)) {
                                setGridVariants((prev) => prev.map((v) => ({ ...v, price: priceNum })));
                                setBulkPriceInput('');
                                toast.success(`Updated price to ₱${priceNum.toFixed(2)} for all variants.`);
                            }
                        }}
                        bulkSkuPrefixInput={bulkSkuPrefixInput}
                        setBulkSkuPrefixInput={setBulkSkuPrefixInput}
                        onApplyBulkSku={() => {
                            const prefix = bulkSkuPrefixInput.trim().toUpperCase();
                            if (prefix) {
                                setGridVariants((prev) =>
                                    prev.map((v) => ({
                                        ...v,
                                        sku: v.sku ? `${prefix}-${v.sku}` : `${prefix}-${v.attributeValueLabels.join('-').toUpperCase()}`
                                    }))
                                );
                                setBulkSkuPrefixInput('');
                                toast.success(`Appended SKU prefix "${prefix}" to all variants.`);
                            }
                        }}
                    />
                </TabsContent>

                {/* Tab 3: Customizations & Options */}
                <TabsContent value="modifiers" className="focus-visible:outline-none">
                    <EditCustomizationsTab
                        modifierGroupsData={modifierGroupsData}
                        isGroupsLoading={isGroupsLoading}
                        modifierSearch={modifierSearch}
                        setModifierSearch={setModifierSearch}
                        onOpenCreateGroup={() => {
                            setSelectedGroup(null);
                            setGroupDialogOpen(true);
                        }}
                        onOpenEditGroup={(group) => {
                            setSelectedGroup(group);
                            setGroupDialogOpen(true);
                        }}
                        onDeleteGroup={(group) => setDeletingGroup(group)}
                        onOpenCreateOption={(groupId) => {
                            setSelectedGroupIdForOption(groupId);
                            setSelectedOption(null);
                            setOptionDialogOpen(true);
                        }}
                        onOpenEditOption={(groupId, option) => {
                            setSelectedGroupIdForOption(groupId);
                            setSelectedOption(option);
                            setOptionDialogOpen(true);
                        }}
                        onDeleteOption={(option) => setDeletingOption(option)}
                    />
                </TabsContent>
            </Tabs>

            {/* Recipe Configuration Slide-out / Modal Drawer */}
            <RecipeDialog open={recipeOpen} onOpenChange={setRecipeOpen} variant={selectedVariantObject} productName={productDetails.name} />

            {/* Modifier Group Dialog */}
            <GroupDialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen} group={selectedGroup} targetProductId={id} />

            {/* Option Dialog for Modifiers choices editing */}
            <OptionDialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen} groupId={selectedGroupIdForOption} option={selectedOption} />

            {/* Group Delete Confirmation */}
            <ConfirmDialog
                open={!!deletingGroup}
                onOpenChange={(open) => !open && setDeletingGroup(null)}
                title="Delete Customization Group"
                description={`Are you sure you want to delete customization group "${deletingGroup?.name}"? All options within this group will also be permanently deleted.`}
                confirmText="Delete Group"
                variant="destructive"
                isLoading={deleteGroupMutation.isPending}
                onConfirm={() => {
                    if (deletingGroup) {
                        deleteGroupMutation.mutate(deletingGroup.id, {
                            onSettled: () => setDeletingGroup(null)
                        });
                    }
                }}
            />

            {/* Option Delete Confirmation */}
            <ConfirmDialog
                open={!!deletingOption}
                onOpenChange={(open) => !open && setDeletingOption(null)}
                title="Delete Choice"
                description={`Are you sure you want to delete choice "${deletingOption?.name}"? This action cannot be undone.`}
                confirmText="Delete Choice"
                variant="destructive"
                isLoading={deleteOptionMutation.isPending}
                onConfirm={() => {
                    if (deletingOption) {
                        deleteOptionMutation.mutate(deletingOption.id, {
                            onSettled: () => setDeletingOption(null)
                        });
                    }
                }}
            />
        </div>
    );
}
