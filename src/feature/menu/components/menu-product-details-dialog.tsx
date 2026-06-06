import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Coffee, HelpCircle, ShieldAlert, Sparkles } from 'lucide-react';

import { getMenuProductById } from '#/api/menu.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { getFileUrl } from '#/utils/helper.ts';
import type { IMenuProduct, IMenuProductVariant } from '../menu.types';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface MenuProductDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: IMenuProduct | null;
}

export default function MenuProductDetailsDialog({ open, onOpenChange, product }: MenuProductDetailsDialogProps) {
    const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);

    // Query full details including variants and recipes
    const {
        data: menuProduct,
        isLoading,
        error
    } = useQuery({
        queryKey: [QUERY_KEY.MENU.PRODUCT_DETAILS, product?.id],
        queryFn: () => getMenuProductById(product!.id),
        enabled: open && !!product?.id
    });

    // Reset selected variant when product changes
    React.useEffect(() => {
        if (menuProduct && menuProduct.variants.length > 0) {
            setSelectedVariantId(menuProduct.variants[0].id);
        } else {
            setSelectedVariantId(null);
        }
    }, [menuProduct]);

    const activeVariant = React.useMemo(() => {
        if (!menuProduct || !selectedVariantId) return null;
        return menuProduct.variants.find((v) => v.id === selectedVariantId) || null;
    }, [menuProduct, selectedVariantId]);

    const getVariantLabel = (variant: IMenuProductVariant) => {
        if (variant.attributes.length === 0) return 'Standard Build';
        return variant.attributes.map((attr) => attr.attributeValue.value).join(', ');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <BookOpen className="size-5 text-primary" />
                        Recipe & Drink Specs
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Inspect available beverage size configurations and standardized preparation recipe details.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-28 gap-3">
                            <Spinner className="h-6 w-6 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-medium">Loading recipe details...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center gap-2">
                            <ShieldAlert className="size-8 text-destructive" />
                            <p className="text-sm font-semibold text-foreground">Failed to load details</p>
                            <p className="text-xs text-muted-foreground max-w-md">{getErrorMessage(error)}</p>
                        </div>
                    ) : (
                        menuProduct && (
                            <div className="space-y-6 pb-4">
                                {/* Product Summary Card */}
                                <div className="flex flex-col sm:flex-row gap-5 items-start bg-muted/20 p-4 rounded-xl border border-border/40">
                                    <div className="size-24 rounded-lg overflow-hidden border border-border shrink-0 bg-background/50 flex items-center justify-center">
                                        {menuProduct.photo ? (
                                            <img
                                                src={menuProduct.photo.startsWith('http') ? menuProduct.photo : getFileUrl(menuProduct.photo)}
                                                alt={menuProduct.name}
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <Coffee className="size-8 stroke-[1.5] text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="space-y-1.5 flex-1 min-w-0 w-full">
                                        <h3 className="text-lg font-bold text-foreground leading-tight truncate">{menuProduct.name}</h3>
                                        <div className="flex flex-wrap gap-2 pt-0.5">
                                            {menuProduct.category && (
                                                <Badge variant="outline" className="text-xs py-0.5 px-2 bg-background font-semibold">
                                                    Category: {menuProduct.category.name}
                                                </Badge>
                                            )}
                                            {menuProduct.type && (
                                                <Badge variant="outline" className="text-xs py-0.5 px-2 bg-background font-semibold">
                                                    Type: {menuProduct.type.name}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed pt-1.5">
                                            {menuProduct.description || 'No flavor descriptors or recipe notes entered.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Variant Selection */}
                                <div className="space-y-2.5">
                                    <h4 className="text-xs font-bold text-foreground/75 uppercase">Select Variant Option</h4>
                                    {menuProduct.variants.length === 0 ? (
                                        <div className="p-3 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                                            No variants configured for this product.
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {menuProduct.variants.map((v) => {
                                                const isActive = v.id === selectedVariantId;
                                                return (
                                                    <button
                                                        key={v.id}
                                                        type="button"
                                                        onClick={() => setSelectedVariantId(v.id)}
                                                        className={`text-xs font-semibold py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                                                            isActive
                                                                ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                                                                : 'bg-background border-border/80 hover:border-primary/20 text-foreground/80 hover:text-foreground'
                                                        }`}
                                                    >
                                                        {getVariantLabel(v)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Recipe Information section */}
                                {activeVariant && (
                                    <div className="space-y-4 pt-3 border-t border-border/30">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="space-y-0.5">
                                                <h4 className="text-xs font-bold text-foreground/75 uppercase flex items-center gap-1.5">
                                                    <Sparkles className="size-3.5 text-primary" />
                                                    Recipe Build
                                                </h4>
                                                {activeVariant.sku && (
                                                    <span className="text-xs text-muted-foreground block font-mono">SKU: {activeVariant.sku}</span>
                                                )}
                                            </div>
                                            <div className="text-right sm:text-right">
                                                <span className="text-xs text-muted-foreground block font-medium uppercase">Price</span>
                                                <span className="text-base font-bold text-primary">₱{activeVariant.price.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {activeVariant.recipe ? (
                                            <div className="space-y-3.5 bg-muted/20 p-4 border border-border/40 rounded-xl">
                                                <div className="space-y-1">
                                                    <h5 className="text-xs font-bold text-foreground leading-snug">{activeVariant.recipe.name}</h5>
                                                    {activeVariant.recipe.description && (
                                                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                                                            {activeVariant.recipe.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="space-y-2 pt-1.5 border-t border-border/20">
                                                    <span className="text-xs font-bold text-foreground/80 block">Ingredients List</span>
                                                    {activeVariant.recipe.ingredients.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground italic">
                                                            No ingredients registered for this build.
                                                        </p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {activeVariant.recipe.ingredients.map((ing) => (
                                                                <div
                                                                    key={ing.id}
                                                                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-background/50 text-xs shadow-2xs"
                                                                >
                                                                    <span className="font-semibold text-foreground/80">{ing.ingredient.name}</span>
                                                                    <Badge variant="secondary" className="font-mono text-xs font-medium">
                                                                        {ing.quantity.toFixed(1)} {ing.unit.abbreviation}
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border/60 rounded-xl text-center text-muted-foreground bg-muted/5 gap-2">
                                                <HelpCircle className="size-6 text-muted-foreground/80" />
                                                <p className="text-xs font-medium">No preparation recipe configured.</p>
                                                <p className="text-xs text-muted-foreground/80">
                                                    Recipes can be created and managed under Products configuration.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
