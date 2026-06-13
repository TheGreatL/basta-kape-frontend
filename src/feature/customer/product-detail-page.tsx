import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Coffee, ArrowLeft, Plus, Minus, ShoppingBag, ShieldAlert, ArrowRight } from 'lucide-react';
import { useCheckoutStore } from '#/store/checkout-store.ts';

import { getMenuProductById } from '#/api/menu.api.ts';
import { getModifierGroups } from '#/api/modifiers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { useCart } from '#/feature/customer/use-cart.ts';
import { useAuthStore } from '#/store/auth-store.ts';
import type { IMenuProductVariant, IMenuRecipeIngredient, IMenuVariantAttribute } from '#/feature/menu/menu.types.ts';
import type { IModifierGroup, IModifierOption } from '#/feature/modifier/modifier.types.ts';
import { getFileUrl } from '#/utils/helper';
import { toast } from 'sonner';

interface ProductDetailPageProps {
    productId: string;
}

export default function ProductDetailPage({ productId }: ProductDetailPageProps) {
    const { addItem, isAdding } = useCart();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
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

    // Automatically select first option for required modifier groups
    useEffect(() => {
        if (modifierGroups.length > 0) {
            setSelectedModifierOptionIds((prev) => {
                const next = [...prev];
                modifierGroups.forEach((group: IModifierGroup) => {
                    const groupOptionIds = group.options.map((opt: IModifierOption) => opt.id);
                    const hasSelection = groupOptionIds.some((id: string) => next.includes(id));
                    if (group.isRequired && !hasSelection && group.options.length > 0) {
                        next.push(group.options[0].id);
                    }
                });
                return next;
            });
        }
    }, [modifierGroups]);

    const selectedVariant = product?.variants.find((v: IMenuProductVariant) => v.id === selectedVariantId);

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
                    {product.photo ? (
                        <img
                            src={product.photo.startsWith('http') ? product.photo : getFileUrl(product.photo)}
                            alt={product.name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <Coffee className="size-28 text-muted-foreground/30" />
                    )}
                </div>

                {/* Product Configuration details */}
                <div className="flex flex-col">
                    {/* Category Label */}
                    <div className="text-xs font-semibold text-primary uppercase mb-2">{product.category?.name || 'Beverage'}</div>

                    <h1 className="text-3xl font-extrabold text-foreground leading-tight">{product.name}</h1>

                    <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                        {product.description || 'No description available for this item.'}
                    </p>

                    {/* Recipe Ingredients Preview (if available) */}
                    {selectedVariant?.recipe?.ingredients && selectedVariant.recipe.ingredients.length > 0 && (
                        <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/40">
                            <h3 className="text-xs font-bold text-foreground uppercase mb-2">Key Ingredients</h3>
                            <div className="flex flex-wrap gap-2">
                                {selectedVariant.recipe.ingredients.map((ing: IMenuRecipeIngredient) => (
                                    <span
                                        key={ing.id}
                                        className="text-xs px-2.5 py-1 rounded-md bg-background border border-border text-muted-foreground"
                                    >
                                        {ing.ingredient.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

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
                                                const isAvailable = availableValues.includes(val);
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
                                                                  : 'border-border/20 bg-muted/5 text-muted-foreground/30 cursor-not-allowed opacity-30'
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
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
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
                                                                : 'border-border/60 bg-card hover:border-border-hover hover:bg-muted/10 text-foreground'
                                                        }`}
                                                    >
                                                        <span className="text-xs truncate mr-2">{opt.name}</span>
                                                        <span className="text-xs font-bold shrink-0">
                                                            {opt.price > 0 ? `+₱${opt.price.toFixed(2)}` : 'Free'}
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
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                                    <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    Out of Stock
                                </span>
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
                                    disabled={selectedVariant?.maxProduceable === 0}
                                    className="w-full h-12 rounded-xl gap-2 font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                                >
                                    <ShoppingBag className="size-5" />
                                    {selectedVariant?.maxProduceable === 0 ? 'Out of Stock' : 'Sign In to Order'}
                                </Button>
                            </Link>
                        ) : (
                            <div className="grid grid-cols-2 gap-3.5">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={handleAddToCart}
                                    disabled={isAdding || !selectedVariantId || selectedVariant?.maxProduceable === 0 || quantity === 0}
                                    className="w-full h-12 rounded-xl gap-2 font-bold shadow-3xs hover:bg-accent transition-all border-border/80"
                                >
                                    <ShoppingBag className="size-5" />
                                    {isAdding ? 'Adding...' : 'Add to Cart'}
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={handleDirectCheckout}
                                    disabled={isAdding || !selectedVariantId || selectedVariant?.maxProduceable === 0 || quantity === 0}
                                    className="w-full h-12 rounded-xl gap-2 font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                                >
                                    <ArrowRight className="size-5" />
                                    Buy Now
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
