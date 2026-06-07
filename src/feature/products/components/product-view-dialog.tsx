import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Calendar, Plus, Trash2, Edit2, ShieldAlert, ChefHat } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { getProductById, createProductVariant, updateProductVariant, deleteProductVariant } from '#/api/products.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { getFileUrl } from '#/utils/helper.ts';
import type { IProduct, IProductVariant, IVariantAttribute } from '../products.types';
import { VariantForm } from './variant-form.tsx';
import RecipeDialog from './recipe-dialog.tsx';

import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';

interface ProductViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: IProduct | null;
}

export default function ProductViewDialog({ open, onOpenChange, product }: ProductViewDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);

    // Variant action states
    const [isAddingVariant, setIsAddingVariant] = React.useState(false);
    const [editingVariantId, setEditingVariantId] = React.useState<string | null>(null);
    const [selectedVariantForRecipe, setSelectedVariantForRecipe] = React.useState<IProductVariant | null>(null);
    const [recipeOpen, setRecipeOpen] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
            setIsAddingVariant(false);
            setEditingVariantId(null);
            setSelectedVariantForRecipe(null);
            setRecipeOpen(false);
        }
    }, [open]);

    // Query: Product Details
    const { data: productDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, product?.id],
        queryFn: () => getProductById(product!.id),
        enabled: open && !!product?.id
    });

    // Mutations for Variants
    const createVariantMutation = useMutation({
        mutationFn: (payload: { sku: string | null; price: number; attributeValueIds: string[] }) => createProductVariant(product!.id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, product?.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            toast.success('Product Variant Created');
            setIsAddingVariant(false);
        },
        onError: (error) => {
            toast.error('Failed to create variant', { description: getErrorMessage(error) });
        }
    });

    const updateVariantMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: { sku: string | null; price: number; attributeValueIds: string[] } }) =>
            updateProductVariant(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, product?.id] });
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
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCT_DETAILS, product?.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST] });
            toast.success('Product Variant Removed');
        },
        onError: (error) => {
            toast.error('Failed to delete variant', { description: getErrorMessage(error) });
        }
    });

    const isDataLoading = isDetailsLoading || !isRendering;

    // Helper to format attribute badges
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
                        className="text-xs font-semibold capitalize py-0.5 px-1.5 bg-secondary/50 text-secondary-foreground/90"
                    >
                        {attr.attributeValue.attribute.name}: {attr.attributeValue.value}
                    </Badge>
                ))}
            </div>
        );
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Package className="size-5 text-primary" />
                        Menu Product Profile Details
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Audit product settings, view categorization, and manage pricing variants list.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 min-h-0">
                    {isDataLoading ? (
                        <div className="flex flex-col items-center justify-center py-28 gap-3">
                            <Spinner className="h-6 w-6 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-medium">Loading details...</span>
                        </div>
                    ) : (
                        productDetails && (
                            <>
                                {/* Profile Summary */}
                                <div className="flex flex-col sm:flex-row gap-5 items-start bg-muted/20 p-4 rounded-xl border border-border/40">
                                    <div className="size-24 rounded-lg overflow-hidden border border-border shrink-0 bg-background/50 flex items-center justify-center">
                                        {productDetails.photo ? (
                                            <img
                                                src={
                                                    productDetails.photo.startsWith('http') ? productDetails.photo : getFileUrl(productDetails.photo)
                                                }
                                                alt={productDetails.name}
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <Package className="size-8 stroke-[1.5] text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="space-y-1.5 flex-1 min-w-0 w-full">
                                        <h3 className="text-lg font-bold text-foreground leading-tight truncate">{productDetails.name}</h3>
                                        <div className="flex flex-wrap gap-2 pt-0.5">
                                            <Badge variant="outline" className="text-xs py-0.5 px-2 bg-background font-semibold">
                                                Category: {productDetails.category?.name || 'Unassigned'}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs py-0.5 px-2 bg-background font-semibold">
                                                Type: {productDetails.type?.name || 'Unassigned'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed pt-1.5">
                                            {productDetails.description || 'No description provided.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Variants Manager */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b pb-1">
                                        <h3 className="text-sm font-bold text-foreground/85 flex items-center gap-1.5">
                                            <Package className="size-4 text-primary" />
                                            Pricing Variants List
                                        </h3>
                                        {!isAddingVariant && !editingVariantId && (
                                            <RequirePermission module="Products Management" action="update">
                                                <Button onClick={() => setIsAddingVariant(true)} size="sm" className="h-8 text-xs gap-1 shadow-sm">
                                                    <Plus className="size-3.5" /> Configure Variant
                                                </Button>
                                            </RequirePermission>
                                        )}
                                    </div>

                                    {/* Inline Add Form */}
                                    {isAddingVariant && (
                                        <VariantForm
                                            onSubmit={(data) => createVariantMutation.mutate(data)}
                                            onCancel={() => setIsAddingVariant(false)}
                                            isPending={createVariantMutation.isPending}
                                            submitLabel="Add Variant"
                                        />
                                    )}

                                    {/* Mapped Variants */}
                                    <div className="border border-border/40 rounded-xl overflow-hidden bg-background/30">
                                        {productDetails.variants.length === 0 ? (
                                            <div className="text-center py-12 text-xs text-muted-foreground font-medium flex flex-col items-center gap-1.5">
                                                <ShieldAlert className="size-5 text-muted-foreground" />
                                                No pricing variants configured. Add a variant above.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border/30">
                                                {productDetails.variants.map((v: IProductVariant) => {
                                                    const isEditingThis = editingVariantId === v.id;

                                                    if (isEditingThis) {
                                                        return (
                                                            <div key={v.id} className="p-3 bg-muted/10">
                                                                <VariantForm
                                                                    initialSku={v.sku}
                                                                    initialPrice={v.price}
                                                                    initialValueIds={v.attributes.map(
                                                                        (a: IVariantAttribute) => a.productAttributeValueId
                                                                    )}
                                                                    onSubmit={(data) => updateVariantMutation.mutate({ id: v.id, payload: data })}
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
                                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-2.5 hover:bg-muted/10 transition-colors"
                                                        >
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-semibold text-foreground/80">
                                                                        ₱{v.price.toFixed(2)}
                                                                    </span>
                                                                    {v.sku && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-xs py-0 px-1 font-mono uppercase bg-muted/50 border-muted text-muted-foreground"
                                                                        >
                                                                            {v.sku}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {renderAttributeBadges(v)}
                                                            </div>

                                                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                                                <RequirePermission module="Products Management" action="read">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="size-7 text-muted-foreground hover:text-primary transition-colors"
                                                                        title="Configure Recipe"
                                                                        onClick={() => {
                                                                            setSelectedVariantForRecipe(v);
                                                                            setRecipeOpen(true);
                                                                        }}
                                                                    >
                                                                        <ChefHat className="size-3.5" />
                                                                        <span className="sr-only">Configure Recipe</span>
                                                                    </Button>
                                                                </RequirePermission>
                                                                <RequirePermission module="Products Management" action="update">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="size-7 text-muted-foreground hover:text-primary transition-colors"
                                                                        onClick={() => setEditingVariantId(v.id)}
                                                                    >
                                                                        <Edit2 className="size-3.5" />
                                                                        <span className="sr-only">Edit Variant</span>
                                                                    </Button>
                                                                </RequirePermission>
                                                                <RequirePermission module="Products Management" action="delete">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="size-7 text-muted-foreground hover:text-destructive transition-colors"
                                                                        onClick={() => deleteVariantMutation.mutate(v.id)}
                                                                        disabled={deleteVariantMutation.isPending}
                                                                    >
                                                                        <Trash2 className="size-3.5" />
                                                                        <span className="sr-only">Delete Variant</span>
                                                                    </Button>
                                                                </RequirePermission>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* System Timestamps */}
                                <div className="space-y-2.5 pt-1">
                                    <div className="flex items-center border-b pb-1">
                                        <h3 className="text-xs font-bold text-foreground/75 flex items-center gap-1.5">
                                            <Calendar className="size-3.5 text-primary" />
                                            System Audit Logs
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/40">
                                        <div>
                                            <span className="font-semibold text-foreground/75 block">Date Configured</span>
                                            {format(new Date(productDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-foreground/75 block">Last Updated</span>
                                            {format(new Date(productDetails.updatedAt), 'MMMM dd, yyyy - hh:mm a')}
                                        </div>
                                        {productDetails.deletedAt && (
                                            <div className="sm:col-span-2 text-destructive font-semibold border-t pt-2 mt-1">
                                                <span>Archived / Soft Deleted At</span>:{' '}
                                                {format(new Date(productDetails.deletedAt), 'MMMM dd, yyyy - hh:mm a')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30 mt-4">
                    <Button type="button" onClick={() => onOpenChange(false)} className="h-9">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>

            <RecipeDialog
                open={recipeOpen}
                onOpenChange={setRecipeOpen}
                variant={selectedVariantForRecipe}
                productName={productDetails?.name || ''}
            />
        </Dialog>
    );
}
