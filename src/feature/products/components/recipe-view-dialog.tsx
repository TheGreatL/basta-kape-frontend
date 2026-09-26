import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChefHat, BookOpen, Calendar, AlertTriangle, RotateCcw, Edit2 } from 'lucide-react';

import { getVariantRecipe } from '#/api/products.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { ApiError, getErrorMessage } from '#/utils/error-handler.ts';
import type { IProductVariant, IRecipe, IRecipeIngredient, IVariantAttribute, ILocalRecipe, ILocalRecipeIngredient } from '../products.types';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';

export interface RecipeViewVariant {
    id?: string;
    sku?: string | null;
    price?: number;
    attributes?: IVariantAttribute[];
    attributeValueLabels?: string[];
}

interface RecipeViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    variant: RecipeViewVariant | IProductVariant | null;
    productName: string;
    onEdit?: () => void;
    localRecipe?: ILocalRecipe | null;
}

export default function RecipeViewDialog({ open, onOpenChange, variant, productName, onEdit, localRecipe }: RecipeViewDialogProps) {
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open]);

    // Query: Recipe Details using standard QUERY_KEY
    const {
        data: recipe,
        isLoading: isRecipeLoading,
        isError,
        error,
        refetch
    } = useQuery<IRecipe>({
        queryKey: [QUERY_KEY.PRODUCTS.VARIANT_RECIPE, variant?.id],
        queryFn: () => getVariantRecipe(variant!.id!),
        enabled: open && !!variant?.id && !localRecipe,
        retry: false
    });

    const effectiveRecipe: IRecipe | null | undefined = React.useMemo(() => {
        if (localRecipe) {
            return {
                id: 'local',
                name: localRecipe.name,
                description: localRecipe.description || null,
                productVariantId: variant?.id || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null,
                ingredients: localRecipe.ingredients.map(
                    (ing: ILocalRecipeIngredient, idx: number): IRecipeIngredient => ({
                        id: `local-ing-${idx}`,
                        recipeId: 'local',
                        ingredientId: ing.ingredientId,
                        ingredientUnitId: ing.ingredientUnitId,
                        quantity: ing.quantity,
                        ingredient: {
                            id: ing.ingredientId,
                            name: ing._ingredientName || ing.ingredient?.name || 'Raw Ingredient'
                        },
                        unit: {
                            id: ing.ingredientUnitId,
                            name: ing._unitName || ing.unit?.name || 'Unit',
                            abbreviation: ing._unitName || ing.unit?.abbreviation || null
                        },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        deletedAt: null
                    })
                )
            };
        }
        return recipe;
    }, [localRecipe, recipe, variant?.id]);

    const isNotFound = !localRecipe && isError && error instanceof ApiError && error.status === 404;
    const isDataLoading = localRecipe ? !isRendering : !isRendering || (isRecipeLoading && !isNotFound);

    const attributeLabels = React.useMemo(() => {
        if (!variant) return [];
        if ('attributeValueLabels' in variant && Array.isArray(variant.attributeValueLabels) && variant.attributeValueLabels.length > 0) {
            return variant.attributeValueLabels;
        }
        if ('attributes' in variant && Array.isArray(variant.attributes) && variant.attributes.length > 0) {
            return variant.attributes.map((a) => a.attributeValue.value).filter(Boolean);
        }
        return [];
    }, [variant]);

    const comboText = attributeLabels.length > 0 ? attributeLabels.join(' • ') : 'Standard Item';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <ChefHat className="size-5 text-primary" />
                        Recipe Build Specifications
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Detailed ingredient bill of materials and preparation specifications for this drink variation.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                    {isDataLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Spinner className="size-6 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-semibold">Loading recipe specifications...</span>
                        </div>
                    ) : isNotFound || (!localRecipe && !variant?.id) || (!effectiveRecipe && !isRecipeLoading) ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="size-12 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center mb-3">
                                <ChefHat className="size-6 text-muted-foreground stroke-[1.5]" />
                            </div>
                            <h4 className="text-sm font-bold text-foreground">No Recipe Configured</h4>
                            <p className="text-xs text-muted-foreground max-w-xs mt-1 leading-relaxed">
                                There are no ingredient build specifications configured for{' '}
                                <span className="font-semibold text-foreground/80">
                                    {productName} ({comboText})
                                </span>
                                .
                            </p>
                            {onEdit && (
                                <RequirePermission module="Products Management" action="update">
                                    <Button type="button" onClick={onEdit} size="sm" className="h-8 gap-1.5 font-semibold text-xs mt-4 shadow-2xs">
                                        <ChefHat className="size-3.5" /> Setup Recipe Now
                                    </Button>
                                </RequirePermission>
                            )}
                        </div>
                    ) : isError && !localRecipe ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="size-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-3">
                                <AlertTriangle className="size-6 text-destructive" />
                            </div>
                            <h4 className="text-sm font-bold text-foreground">Failed to Load Recipe</h4>
                            <p className="text-xs text-muted-foreground max-w-xs mt-1">{getErrorMessage(error)}</p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                                className="h-8 gap-1.5 text-xs font-semibold mt-4"
                            >
                                <RotateCcw className="size-3.5" /> Try Again
                            </Button>
                        </div>
                    ) : (
                        effectiveRecipe && (
                            <>
                                {effectiveRecipe.deletedAt && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                                        <AlertTriangle className="size-4 shrink-0" />
                                        <span>This recipe build is archived / soft-deleted and currently inactive.</span>
                                    </div>
                                )}

                                {/* Target Product & Variant Details */}
                                <div className="bg-muted/20 border border-border/50 rounded-xl p-4 space-y-2.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-0.5 min-w-0">
                                            <span className="text-xs font-bold text-muted-foreground uppercase">Target Drink</span>
                                            <h3 className="text-base font-bold text-foreground leading-snug truncate">{productName}</h3>
                                        </div>
                                        {variant?.price !== undefined && (
                                            <div className="text-right shrink-0">
                                                <span className="text-xs font-bold text-muted-foreground uppercase block">Fulfillment Price</span>
                                                <span className="text-sm font-bold text-foreground font-mono">
                                                    ₱{Number(variant.price).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/30">
                                        <span className="text-xs font-semibold text-muted-foreground">Attributes:</span>
                                        {attributeLabels.length > 0 ? (
                                            attributeLabels.map((lbl, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-xs font-bold px-2 py-0.5">
                                                    {lbl}
                                                </Badge>
                                            ))
                                        ) : (
                                            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
                                                Standard Item
                                            </Badge>
                                        )}
                                        {effectiveRecipe.deletedAt && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs font-bold px-2 py-0.5 bg-rose-500/10 text-rose-700 border-rose-500/30"
                                            >
                                                Archived
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Recipe Profile Info */}
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Recipe Name</span>
                                        <div className="text-xs font-semibold text-foreground bg-muted/20 border border-border/40 p-2.5 rounded-lg">
                                            {effectiveRecipe.name}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Preparation Notes / Description</span>
                                        <div className="text-xs font-medium text-foreground bg-muted/20 border border-border/40 p-2.5 rounded-lg min-h-[44px] whitespace-pre-wrap">
                                            {effectiveRecipe.description || (
                                                <span className="text-muted-foreground italic">
                                                    No special instructions or brewing notes entered.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Ingredients Bill of Materials List */}
                                <div className="space-y-2.5 pt-1">
                                    <div className="flex items-center justify-between border-b pb-1.5 border-border/40">
                                        <h4 className="text-xs font-bold text-foreground/80 uppercase flex items-center gap-1.5">
                                            <BookOpen className="size-3.5 text-primary" />
                                            Raw Ingredients Bill of Materials
                                        </h4>
                                        <Badge
                                            variant="outline"
                                            className="text-xs font-bold px-2 py-0.5 bg-primary/5 text-primary border-primary/20"
                                        >
                                            {effectiveRecipe.ingredients.length}{' '}
                                            {effectiveRecipe.ingredients.length === 1 ? 'Ingredient' : 'Ingredients'}
                                        </Badge>
                                    </div>

                                    {effectiveRecipe.ingredients.length === 0 ? (
                                        <div className="text-center py-6 text-xs text-muted-foreground italic border border-dashed rounded-xl bg-muted/10">
                                            No ingredients mapped to this recipe.
                                        </div>
                                    ) : (
                                        <div className="border border-border/40 rounded-xl overflow-hidden bg-background/50 shadow-3xs max-h-[220px] overflow-y-auto">
                                            <Table className="text-xs">
                                                <TableHeader className="bg-muted/20 font-bold sticky top-0 z-10 backdrop-blur-xs">
                                                    <TableRow>
                                                        <TableHead className="font-bold text-foreground/80">Raw Ingredient</TableHead>
                                                        <TableHead className="font-bold text-foreground/80 text-right pr-4">
                                                            Required Quantity
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody className="divide-y divide-border/20 font-medium">
                                                    {effectiveRecipe.ingredients.map((ing: IRecipeIngredient) => (
                                                        <TableRow key={ing.id} className="hover:bg-muted/10">
                                                            <TableCell className="font-semibold text-foreground/90">
                                                                {ing.ingredient.name || 'Unknown Ingredient'}
                                                            </TableCell>
                                                            <TableCell className="text-right pr-4">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="font-bold text-xs px-2.5 py-0.5 bg-background font-mono border-border/60"
                                                                >
                                                                    {ing.quantity} {ing.unit.abbreviation || ing.unit.name || ''}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>

                                {/* System Audit Logs (only when persisted on server) */}
                                {effectiveRecipe.id !== 'local' && (
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center border-b pb-1 border-border/40">
                                            <h4 className="text-xs font-bold text-foreground/75 flex items-center gap-1.5 uppercase">
                                                <Calendar className="size-3 text-primary" />
                                                System Audit Logs
                                            </h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/40">
                                            <div>
                                                <span className="font-semibold text-foreground/75 block">Created Date</span>
                                                {format(new Date(effectiveRecipe.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                                {effectiveRecipe.createdBy && (
                                                    <span className="block mt-0.5 text-muted-foreground/80">
                                                        by {effectiveRecipe.createdBy.firstName} {effectiveRecipe.createdBy.lastName}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="font-semibold text-foreground/75 block">Last Updated</span>
                                                {format(new Date(effectiveRecipe.updatedAt), 'MMMM dd, yyyy - hh:mm a')}
                                                {effectiveRecipe.updatedBy && (
                                                    <span className="block mt-0.5 text-muted-foreground/80">
                                                        by {effectiveRecipe.updatedBy.firstName} {effectiveRecipe.updatedBy.lastName}
                                                    </span>
                                                )}
                                            </div>
                                            {effectiveRecipe.deletedAt && (
                                                <div className="sm:col-span-2 text-destructive font-semibold border-t pt-2 mt-1">
                                                    <span>Archived At</span>: {format(new Date(effectiveRecipe.deletedAt), 'MMMM dd, yyyy - hh:mm a')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )
                    )}
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-muted/30 mt-4 flex items-center justify-between sm:justify-between w-full">
                    <div>
                        {onEdit && (
                            <RequirePermission module="Products Management" action="update">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onEdit}
                                    className="h-8 gap-1.5 text-xs font-semibold shadow-2xs border-border/60 hover:bg-muted"
                                >
                                    <Edit2 className="size-3.5" /> Edit Recipe
                                </Button>
                            </RequirePermission>
                        )}
                    </div>
                    <Button type="button" onClick={() => onOpenChange(false)} className="h-8 text-xs font-semibold px-4">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
