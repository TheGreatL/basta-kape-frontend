import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Plus, Minus, ShoppingBag, ShieldAlert, ArrowRight } from 'lucide-react';
import { useCheckoutStore } from '#/store/checkout-store.ts';

import { getMenuProductById } from '#/api/menu.api.ts';
import { getModifierGroups } from '#/api/modifiers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { useCart } from '#/feature/customer/use-cart.ts';
import { useAuth } from '#/context/AuthContext';
import type { IMenuProductVariant, IMenuRecipeIngredient, IMenuVariantAttribute } from '#/feature/menu/menu.types.ts';
import type { IModifierGroup, IModifierOption } from '#/feature/modifier/modifier.types.ts';
import { getProductPhotoUrl, handleProductImageError } from '#/utils/helper';
import { toast } from 'sonner';
import { Badge } from '#/components/ui/badge';

interface ProductDetailPageProps {
    productId: string;
}

export default function ProductDetailPage({ productId }: ProductDetailPageProps) {
    const { addItem, isAdding } = useCart();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);

    const [selectedAttributes, setSelectedAttributes] = useState<{ [name: string]: string }>({});
    const [selectedModifierOptionIds, setSelectedModifierOptionIds] = useState<string[]>([]);

    // Fetch product details
    const {
        data: product,
        isLoading: isProductLoading,
        isError: isProductError
    } = useQuery({
        queryKey: [QUERY_KEY.MENU.PRODUCT_DETAILS, productId],
        queryFn: () => getMenuProductById(productId),
        enabled: !!productId
    });

    // Fetch modifier groups for this product
    const { data: modifierGroupsRes, isLoading: isModifiersLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS, productId],
        queryFn: () => getModifierGroups({ productId, limit: 50 }),
        enabled: !!productId
    });
    const modifierGroups = modifierGroupsRes?.data || [];

    // Automatically select first variant and attributes when product loads
    useEffect(() => {
        if (product?.variants && product.variants.length > 0) {
            const firstVariant = product.variants[0];
            setSelectedVariantId(firstVariant.id);
            const initialSelected: { [name: string]: string } = {};
            firstVariant.attributes.forEach((attr: IMenuVariantAttribute) => {
                initialSelected[attr.attributeValue.attribute.name] = attr.attributeValue.value;
            });
            setSelectedAttributes(initialSelected);
        }
    }, [product]);

    // Automatically select first available option for required modifier groups
    useEffect(() => {
        if (modifierGroups.length > 0) {
            setSelectedModifierOptionIds((prev) => {
                const next = [...prev];
                modifierGroups.forEach((group: IModifierGroup) => {
                    const groupOptionIds = group.options.map((opt: IModifierOption) => opt.id);
                    const hasSelection = groupOptionIds.some((id: string) => next.includes(id));
                    if (group.isRequired && !hasSelection && group.options.length > 0) {
                        const firstAvailable = group.options.find((opt: IModifierOption) => opt.maxProduceable !== 0);
                        if (firstAvailable) {
                            next.push(firstAvailable.id);
                        }
                    }
                });
                return next;
            });
        }
    }, [modifierGroups]);

    const selectedVariant = product?.variants.find((v: IMenuProductVariant) => v.id === selectedVariantId);

    const getOutOfStockIngredients = () => {
        if (!selectedVariant?.recipe?.ingredients) return [];
        return selectedVariant.recipe.ingredients.filter((ri: IMenuRecipeIngredient) => {
            const currentQty = ri.ingredient.inventories?.[0]?.currentQuantity ?? 0;
            return currentQty < ri.quantity;
        });
    };
    const outOfStockIngredients = getOutOfStockIngredients();

    // Calculate price of selected modifiers
    const selectedModifiersPrice = selectedModifierOptionIds.reduce((sum: number, optId: string) => {
        for (const group of modifierGroups) {
            const opt = group.options.find((o: IModifierOption) => o.id === optId);
            if (opt) return sum + opt.price;
        }
        return sum;
    }, 0);

    const price = selectedVariant ? selectedVariant.price : 0;
    const singleItemPrice = price + selectedModifiersPrice;
    const totalPrice = singleItemPrice * quantity;

    const isAnySelectedModifierOutOfStock = selectedModifierOptionIds.some((id: string) => {
        for (const group of modifierGroups) {
            const opt = group.options.find((o) => o.id === id);
            if (opt && opt.maxProduceable === 0) return true;
        }
        return false;
    });

    const hasUnfulfilledRequiredGroup = modifierGroups.some((group: IModifierGroup) => {
        if (!group.isRequired) return false;
        const groupOptionIds = group.options.map((opt) => opt.id);
        const hasSelection = groupOptionIds.some((id) => selectedModifierOptionIds.includes(id));
        return !hasSelection;
    });

    // Map of ingredientId -> currentQuantity
    const ingredientInventoryMap = React.useMemo(() => {
        const inventoryMap: { [ingredientId: string]: number } = {};

        // 1. Load from base variant recipe
        if (selectedVariant?.recipe?.ingredients) {
            selectedVariant.recipe.ingredients.forEach((ri: any) => {
                const currentQty = ri.ingredient?.inventories?.[0]?.currentQuantity ?? 0;
                inventoryMap[ri.ingredientId] = currentQty;
            });
        }

        // 2. Load from all modifier options
        modifierGroups.forEach((group: any) => {
            group.options.forEach((opt: any) => {
                if (opt.recipe?.ingredients) {
                    opt.recipe.ingredients.forEach((ri: any) => {
                        const currentQty = ri.ingredient?.inventories?.[0]?.currentQuantity ?? 0;
                        inventoryMap[ri.ingredientId] = currentQty;
                    });
                }
            });
        });

        return inventoryMap;
    }, [selectedVariant, modifierGroups]);

    // Map of ingredientId -> quantity required by base + selected modifiers (per single product unit)
    const selectedRequirements = React.useMemo(() => {
        const reqMap: { [ingredientId: string]: number } = {};

        // 1. Add base variant requirements
        if (selectedVariant?.recipe?.ingredients) {
            selectedVariant.recipe.ingredients.forEach((ri: any) => {
                reqMap[ri.ingredientId] = (reqMap[ri.ingredientId] || 0) + ri.quantity;
            });
        }

        // 2. Add currently selected modifiers requirements
        selectedModifierOptionIds.forEach((optId) => {
            for (const group of modifierGroups) {
                const opt = group.options.find((o: IModifierOption) => o.id === optId);
                if (opt?.recipe?.ingredients) {
                    opt.recipe.ingredients.forEach((ri: any) => {
                        reqMap[ri.ingredientId] = (reqMap[ri.ingredientId] || 0) + ri.quantity;
                    });
                }
            }
        });

        return reqMap;
    }, [selectedVariant, selectedModifierOptionIds, modifierGroups]);

    const isCurrentConfigExceeded = React.useMemo(() => {
        for (const ingredientId in selectedRequirements) {
            const required = selectedRequirements[ingredientId] * quantity;
            const available = ingredientInventoryMap[ingredientId] || 0;
            if (required > available) {
                return true;
            }
        }
        return false;
    }, [selectedRequirements, quantity, ingredientInventoryMap]);

    const checkOptionAvailability = (opt: any) => {
        // If option has no recipe or no ingredients, it's available
        if (!opt.recipe?.ingredients || opt.recipe.ingredients.length === 0) {
            return true;
        }

        // If the option is already selected, it is available (so we can unselect it)
        const isSelected = selectedModifierOptionIds.includes(opt.id);
        if (isSelected) {
            return true;
        }

        // Check if adding this option would exceed the available inventory for any ingredient
        for (const ri of opt.recipe.ingredients) {
            const currentTotal = selectedRequirements[ri.ingredientId] || 0;
            const projectedTotal = (currentTotal + ri.quantity) * quantity;
            const availableInventory = ingredientInventoryMap[ri.ingredientId] || 0;

            if (projectedTotal > availableInventory) {
                return false;
            }
        }

        return true;
    };

    useEffect(() => {
        if (!selectedVariantId) return;

        setSelectedModifierOptionIds((prev) => {
            const updated: string[] = [];
            const reqMap: { [ingredientId: string]: number } = {};

            if (selectedVariant?.recipe?.ingredients) {
                selectedVariant.recipe.ingredients.forEach((ri: any) => {
                    reqMap[ri.ingredientId] = ri.quantity;
                });
            }

            prev.forEach((optId) => {
                let foundOpt: IModifierOption | null = null;
                for (const group of modifierGroups) {
                    const opt = group.options.find((o) => o.id === optId);
                    if (opt) {
                        foundOpt = opt;
                        break;
                    }
                }

                if (!foundOpt || foundOpt.maxProduceable === 0) {
                    return;
                }

                let fits = true;
                if (foundOpt.recipe?.ingredients) {
                    for (const ri of foundOpt.recipe.ingredients) {
                        const currentTotal = reqMap[ri.ingredientId] || 0;
                        const projectedTotal = (currentTotal + ri.quantity) * quantity;
                        const availableInventory = ingredientInventoryMap[ri.ingredientId] || 0;
                        if (projectedTotal > availableInventory) {
                            fits = false;
                            break;
                        }
                    }
                }

                if (fits) {
                    updated.push(optId);
                    if (foundOpt.recipe?.ingredients) {
                        foundOpt.recipe.ingredients.forEach((ri) => {
                            reqMap[ri.ingredientId] = (reqMap[ri.ingredientId] || 0) + ri.quantity;
                        });
                    }
                }
            });

            return updated;
        });
    }, [selectedVariantId, quantity, modifierGroups, ingredientInventoryMap]);

    useEffect(() => {
        if (selectedVariant) {
            const stock = selectedVariant.maxProduceable;
            if (stock === 0) {
                setQuantity(0);
            } else {
                setQuantity(1);
            }
        }
    }, [selectedVariantId, selectedVariant]);

    if (isProductLoading || isModifiersLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-5xl animate-pulse space-y-8">
                <div className="h-6 w-24 bg-muted rounded" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="aspect-square bg-muted rounded-2xl" />
                    <div className="space-y-6">
                        <div className="h-4 w-20 bg-muted rounded" />
                        <div className="h-10 w-2/3 bg-muted rounded" />
                        <div className="h-24 w-full bg-muted rounded" />
                        <div className="h-12 w-1/3 bg-muted rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (isProductError || !product) {
        return (
            <div className="container mx-auto px-4 py-16 max-w-md text-center">
                <ShieldAlert className="size-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground">Failed to load product</h3>
                <p className="text-sm text-muted-foreground mt-1">The item you are looking for may have been removed or is currently unavailable.</p>
                <Link to="/products">
                    <Button variant="outline" className="mt-6">
                        Back to Menu
                    </Button>
                </Link>
            </div>
        );
    }

    // Logic moved to top to follow Rules of Hooks

    const handleIncrement = () => {
        setQuantity((q: number) => {
            const stock = selectedVariant?.maxProduceable;
            if (stock !== null && stock !== undefined && stock !== 'Unlimited') {
                return Math.min(stock, q + 1);
            }
            return q + 1;
        });
    };

    const handleDecrement = () => {
        setQuantity((q: number) => {
            const stock = selectedVariant?.maxProduceable;
            if (stock === 0) return 0;
            return Math.max(1, q - 1);
        });
    };

    const handleAddToCart = async () => {
        if (!selectedVariantId) return;
        try {
            await addItem({
                productVariantId: selectedVariantId,
                quantity,
                modifierOptionIds: selectedModifierOptionIds
            });
        } catch {
            toast.error('Failed to add item to cart. Please try again.');
        }
    };

    const handleDirectCheckout = () => {
        if (!selectedVariantId || !selectedVariant) return;

        let modifierPrice = 0;
        const modifierNames: string[] = [];
        modifierGroups.forEach((group: IModifierGroup) => {
            group.options.forEach((opt: IModifierOption) => {
                if (selectedModifierOptionIds.includes(opt.id)) {
                    modifierPrice += opt.price;
                    modifierNames.push(opt.name);
                }
            });
        });

        const checkoutItem = {
            productVariantId: selectedVariantId,
            quantity,
            unitPrice: selectedVariant.price,
            productVariant: {
                product: {
                    name: product.name,
                    photo: product.photo,
                    category: product.category
                },
                attributes: selectedVariant.attributes.map((attr: IMenuVariantAttribute) => ({
                    attributeValue: {
                        value: attr.attributeValue.value
                    }
                }))
            },
            modifierOptionIds: selectedModifierOptionIds,
            selectedModifiersInfo: {
                ids: selectedModifierOptionIds,
                price: modifierPrice,
                names: modifierNames
            }
        };

        useCheckoutStore.getState().setDirectCheckoutState(checkoutItem, true);
        navigate({ to: '/checkout' });
    };

    // Find all unique attributes (like "Milk Type", "Size") on the variants
    const attributeNames = Array.from(
        new Set<string>(
            product.variants.flatMap((v: IMenuProductVariant) =>
                v.attributes.map((attr: IMenuVariantAttribute) => attr.attributeValue.attribute.name)
            )
        )
    );

    // Group all unique attribute values by attribute name
    const attributeValuesByName: { [name: string]: string[] } = {};
    attributeNames.forEach((name: string) => {
        const values = new Set<string>();
        product.variants.forEach((v: IMenuProductVariant) => {
            const attr = v.attributes.find((a: IMenuVariantAttribute) => a.attributeValue.attribute.name === name);
            if (attr) {
                values.add(attr.attributeValue.value);
            }
        });
        attributeValuesByName[name] = Array.from(values);
    });

    // Get available values for a given attribute name based on preceding selections
    const getAvailableValues = (name: string, index: number) => {
        // If it's the first attribute, all values are available
        if (index === 0) return attributeValuesByName[name];

        // Otherwise, filter variants to those that match the selected values of all preceding attributes
        const precedingNames = attributeNames.slice(0, index);
        const validVariants = product.variants.filter((v: IMenuProductVariant) =>
            precedingNames.every((pName: string) => {
                const attr = v.attributes.find((a: IMenuVariantAttribute) => a.attributeValue.attribute.name === pName);
                return attr && attr.attributeValue.value === selectedAttributes[pName];
            })
        );

        // Get unique values of the current attribute from these valid variants
        const validValues = new Set<string>();
        validVariants.forEach((v: IMenuProductVariant) => {
            const attr = v.attributes.find((a: IMenuVariantAttribute) => a.attributeValue.attribute.name === name);
            if (attr) {
                validValues.add(attr.attributeValue.value);
            }
        });
        return Array.from(validValues);
    };

    const checkAttributeValueInStock = (attrName: string, val: string) => {
        const hypotheticalSelected = { ...selectedAttributes, [attrName]: val };

        let matchingVariant = product.variants.find((v: IMenuProductVariant) =>
            v.attributes.every(
                (attr: IMenuVariantAttribute) => hypotheticalSelected[attr.attributeValue.attribute.name] === attr.attributeValue.value
            )
        );

        if (!matchingVariant) {
            matchingVariant = product.variants.find((v: IMenuProductVariant) =>
                v.attributes.some(
                    (attr: IMenuVariantAttribute) => attr.attributeValue.attribute.name === attrName && attr.attributeValue.value === val
                )
            );
        }

        if (matchingVariant) {
            return matchingVariant.maxProduceable !== 0;
        }

        return false;
    };

    const handleAttributeSelect = (attributeName: string, value: string) => {
        setSelectedAttributes((prev: { [name: string]: string }) => {
            const updated = { ...prev, [attributeName]: value };

            let matchingVariant = product.variants.find((v: IMenuProductVariant) =>
                v.attributes.every((attr: IMenuVariantAttribute) => updated[attr.attributeValue.attribute.name] === attr.attributeValue.value)
            );

            if (!matchingVariant) {
                matchingVariant = product.variants.find((v: IMenuProductVariant) =>
                    v.attributes.some(
                        (attr: IMenuVariantAttribute) => attr.attributeValue.attribute.name === attributeName && attr.attributeValue.value === value
                    )
                );
            }

            if (matchingVariant) {
                setSelectedVariantId(matchingVariant.id);
                const newSelected: { [name: string]: string } = {};
                matchingVariant.attributes.forEach((attr: IMenuVariantAttribute) => {
                    newSelected[attr.attributeValue.attribute.name] = attr.attributeValue.value;
                });
                return newSelected;
            }

            return updated;
        });
    };

    const handleToggleModifierOption = (groupId: string, optionId: string, maxSelect: number, isRequired: boolean, groupName: string) => {
        setSelectedModifierOptionIds((prev: string[]) => {
            const group = modifierGroups.find((g: IModifierGroup) => g.id === groupId);
            if (!group) return prev;
            const groupOptionIds = group.options.map((opt: IModifierOption) => opt.id);

            if (maxSelect === 1) {
                const filtered = prev.filter((id: string) => !groupOptionIds.includes(id));
                if (prev.includes(optionId)) {
                    return isRequired ? prev : filtered;
                } else {
                    return [...filtered, optionId];
                }
            } else {
                if (prev.includes(optionId)) {
                    return prev.filter((id: string) => id !== optionId);
                } else {
                    const currentSelectedFromGroup = prev.filter((id: string) => groupOptionIds.includes(id));
                    if (currentSelectedFromGroup.length >= maxSelect) {
                        toast.warning(`You can select at most ${maxSelect} option(s) for ${groupName}.`);
                        return prev;
                    }
                    return [...prev, optionId];
                }
            }
        });
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl min-h-screen">
            {/* Back Button */}
            <Link
                to="/products"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
                <ArrowLeft className="size-4" />
                <span>Back to Menu</span>
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                {/* Product Photo */}
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted border border-border/40 flex items-center justify-center">
                    <img
                        src={getProductPhotoUrl(product.photo)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={handleProductImageError}
                    />
                </div>

                {/* Product Configuration details */}
                <div className="flex flex-col">
                    {/* Category Label */}
                    <div className="flex gap-3">
                        <Badge variant={'outline'}>{product.category?.name || 'Beverage'}</Badge>
                        <Badge variant={'outline'}>{product.type?.name || 'Beverage'}</Badge>
                    </div>

                    <h1 className="text-3xl font-bold text-foreground leading-tight">{product.name}</h1>

                    <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                        {product.description || 'No description available for this item.'}
                    </p>

                    {/* Recipe Ingredients Preview (if available) */}
                    {(() => {
                        const keyIngredients = (selectedVariant?.recipe?.ingredients || []).filter(
                            (ing: IMenuRecipeIngredient) => !ing.ingredient.type || ing.ingredient.type === 'INGREDIENT'
                        );
                        if (keyIngredients.length === 0) return null;
                        return (
                            <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/40">
                                <h3 className="text-xs font-bold text-foreground uppercase mb-2">Key Ingredients</h3>
                                <div className="flex flex-wrap gap-2">
                                    {keyIngredients.map((ing: IMenuRecipeIngredient) => {
                                        const currentQty = ing.ingredient.inventories?.[0]?.currentQuantity ?? 0;
                                        const requiredQty = ing.quantity;
                                        const isOutOfStock = currentQty < requiredQty;
                                        const isLowStock = !isOutOfStock && (requiredQty > 0 ? currentQty / requiredQty <= 10 : false);

                                        let badgeStyle = 'bg-background border-border text-muted-foreground';
                                        if (isOutOfStock) {
                                            badgeStyle =
                                                'bg-rose-50 dark:bg-rose-950/20 border-rose-250 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-bold';
                                        } else if (isLowStock) {
                                            badgeStyle =
                                                'bg-amber-50 dark:bg-amber-950/20 border-amber-250 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 font-semibold';
                                        }

                                        return (
                                            <span
                                                key={ing.id}
                                                className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all duration-200 ${badgeStyle}`}
                                            >
                                                {ing.ingredient.name}
                                                {isOutOfStock && (
                                                    <span className="text-xs font-bold text-rose-500/90 tracking-wide uppercase scale-95">
                                                        (Out of stock)
                                                    </span>
                                                )}
                                                {isLowStock && (
                                                    <span className="text-xs font-semibold text-amber-500/90 tracking-wide uppercase scale-95">
                                                        (Low stock)
                                                    </span>
                                                )}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Attribute Selectors */}
                    {attributeNames.length > 0 && (
                        <div className="mt-8 space-y-6">
                            {attributeNames.map((attrName: string, idx: number) => {
                                const availableValues = getAvailableValues(attrName, idx);
                                const currentValue = selectedAttributes[attrName];
                                return (
                                    <div key={attrName} className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-xs font-bold text-foreground uppercase">{attrName}</h3>
                                            {currentValue && (
                                                <span className="text-xs font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md">
                                                    {currentValue}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {attributeValuesByName[attrName].map((val: string) => {
                                                const isSelected = currentValue === val;
                                                const isAvailable = availableValues.includes(val) && checkAttributeValueInStock(attrName, val);
                                                return (
                                                    <button
                                                        key={val}
                                                        disabled={!isAvailable}
                                                        onClick={() => handleAttributeSelect(attrName, val)}
                                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                                                            isSelected
                                                                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary font-bold shadow-xs'
                                                                : isAvailable
                                                                  ? 'border-border/60 bg-card hover:border-border-hover hover:bg-muted/10 text-foreground font-medium'
                                                                  : 'border-border/70 bg-muted/70 text-muted-foreground/70 cursor-not-allowed opacity-70'
                                                        }`}
                                                    >
                                                        <span className="text-xs">{val}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add-ons Selection */}
                    {modifierGroups.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-border/40 space-y-6">
                            <div>
                                <h3 className="text-xs font-bold text-foreground uppercase">Customize Your Drink</h3>
                                <p className="text-xs text-muted-foreground mt-1">Select optional add-ons or customize details.</p>
                            </div>

                            {modifierGroups.map((group: IModifierGroup) => {
                                const groupOptionIds = group.options.map((opt: IModifierOption) => opt.id);
                                const currentSelectedCount = selectedModifierOptionIds.filter((id: string) => groupOptionIds.includes(id)).length;
                                return (
                                    <div key={group.id} className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-foreground">{group.name}</span>
                                                {group.isRequired ? (
                                                    <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-500/10">
                                                        Required
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-semibold text-muted-foreground bg-muted border border-border/40 px-1.5 py-0.5 rounded-md">
                                                        Optional
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {group.maxSelect === 1 ? 'Choose 1' : `Choose up to ${group.maxSelect}`}
                                                {currentSelectedCount > 0 && ` (${currentSelectedCount} selected)`}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {group.options.map((opt: IModifierOption) => {
                                                const isSelected = selectedModifierOptionIds.includes(opt.id);
                                                const isStockAvailable = opt.maxProduceable !== 0;
                                                const isSelectionAllowed = checkOptionAvailability(opt);
                                                const isAvailable = isStockAvailable && isSelectionAllowed;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        disabled={!isAvailable && !isSelected}
                                                        onClick={() =>
                                                            handleToggleModifierOption(
                                                                group.id,
                                                                opt.id,
                                                                group.maxSelect,
                                                                group.isRequired,
                                                                group.name
                                                            )
                                                        }
                                                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                                            isSelected
                                                                ? 'border-primary bg-primary/5 text-primary font-bold shadow-xs'
                                                                : isAvailable
                                                                  ? 'border-border/60 bg-card hover:border-border-hover hover:bg-muted/10 text-foreground font-medium'
                                                                  : 'border-border/20 bg-muted/5 text-muted-foreground/30 cursor-not-allowed opacity-40'
                                                        }`}
                                                    >
                                                        <span className="text-xs truncate mr-2">{opt.name}</span>
                                                        <span className="text-xs font-bold shrink-0">
                                                            {isAvailable
                                                                ? opt.price > 0
                                                                    ? `+₱${opt.price.toFixed(2)}`
                                                                    : 'Free'
                                                                : !isStockAvailable
                                                                  ? 'Out of Stock'
                                                                  : 'Exceeds Stock'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Stock status indicator */}
                    {selectedVariant && (
                        <div className="mt-6 flex items-center gap-2">
                            {selectedVariant.maxProduceable === 0 ? (
                                <div className="w-full p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col gap-1.5 animate-in fade-in duration-200">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                                        <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
                                        Temporarily Out of Stock
                                    </span>
                                    {outOfStockIngredients.length > 0 ? (
                                        <p className="text-xs text-muted-foreground leading-normal">
                                            We cannot prepare this item right now due to insufficient stock of:{' '}
                                            <strong className="text-rose-600/90 dark:text-rose-400/90 font-bold">
                                                {outOfStockIngredients.map((i) => i.ingredient.name).join(', ')}
                                            </strong>
                                            .
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground leading-normal">This variant is currently unavailable.</p>
                                    )}
                                </div>
                            ) : selectedVariant.maxProduceable === 'Unlimited' ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                    In Stock (Unlimited)
                                </span>
                            ) : selectedVariant.maxProduceable !== null &&
                              selectedVariant.maxProduceable !== undefined &&
                              selectedVariant.maxProduceable <= 10 ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Only {selectedVariant.maxProduceable} left in stock!
                                </span>
                            ) : selectedVariant.maxProduceable !== null && selectedVariant.maxProduceable !== undefined ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                    In Stock ({selectedVariant.maxProduceable} available)
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                    In Stock
                                </span>
                            )}
                        </div>
                    )}

                    {/* Quantity and CTA */}
                    <div className="mt-8 pt-8 border-t border-border/40 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs text-muted-foreground font-medium uppercase">Total Price</span>
                                <div className="text-2xl font-bold text-foreground mt-0.5">₱{totalPrice.toFixed(2)}</div>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 border border-border/60 rounded-xl p-1 bg-card">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDecrement}
                                    disabled={selectedVariant?.maxProduceable === 0}
                                    className="h-8 w-8 rounded-lg p-0"
                                >
                                    <Minus className="size-3.5" />
                                </Button>
                                <span className="w-8 text-center text-sm font-bold text-foreground">{quantity}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleIncrement}
                                    disabled={
                                        selectedVariant?.maxProduceable === 0 ||
                                        (selectedVariant &&
                                            typeof selectedVariant.maxProduceable === 'number' &&
                                            quantity >= selectedVariant.maxProduceable)
                                    }
                                    className="h-8 w-8 rounded-lg p-0"
                                >
                                    <Plus className="size-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Add to Cart CTA / Sign In redirect */}
                        {!user ? (
                            <Link to="/login" className="block w-full">
                                <Button
                                    size="lg"
                                    disabled={
                                        selectedVariant?.maxProduceable === 0 ||
                                        isAnySelectedModifierOutOfStock ||
                                        hasUnfulfilledRequiredGroup ||
                                        isCurrentConfigExceeded
                                    }
                                    className="w-full h-12 rounded-xl gap-2 font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                                >
                                    <ShoppingBag className="size-5" />
                                    {selectedVariant?.maxProduceable === 0
                                        ? 'Out of Stock'
                                        : isAnySelectedModifierOutOfStock
                                          ? 'Customization Out of Stock'
                                          : isCurrentConfigExceeded
                                            ? 'Exceeds Stock Limit'
                                            : 'Sign In to Order'}
                                </Button>
                            </Link>
                        ) : (
                            <div className="grid grid-cols-2 gap-3.5">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={handleAddToCart}
                                    disabled={
                                        isAdding ||
                                        !selectedVariantId ||
                                        selectedVariant?.maxProduceable === 0 ||
                                        quantity === 0 ||
                                        isAnySelectedModifierOutOfStock ||
                                        hasUnfulfilledRequiredGroup ||
                                        isCurrentConfigExceeded
                                    }
                                    className="w-full h-12 rounded-xl gap-2 font-bold shadow-3xs hover:bg-accent transition-all border-border/80"
                                >
                                    <ShoppingBag className="size-5" />
                                    {isAdding ? 'Adding...' : isCurrentConfigExceeded ? 'Exceeds Stock' : 'Add to Cart'}
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={handleDirectCheckout}
                                    disabled={
                                        isAdding ||
                                        !selectedVariantId ||
                                        selectedVariant?.maxProduceable === 0 ||
                                        quantity === 0 ||
                                        isAnySelectedModifierOutOfStock ||
                                        hasUnfulfilledRequiredGroup ||
                                        isCurrentConfigExceeded
                                    }
                                    className="w-full h-12 rounded-xl gap-2 font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                                >
                                    <ArrowRight className="size-5" />
                                    {isCurrentConfigExceeded ? 'Exceeds Stock' : 'Buy Now'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
