import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Coffee, ArrowLeft, Plus, Minus, ShoppingBag, ShieldAlert } from 'lucide-react';

import { getMenuProductById } from '#/api/menu.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { useCart } from '#/feature/customer/use-cart.ts';
import { useAuthStore } from '#/store/auth-store.ts';
import type { IMenuProductVariant, IMenuRecipeIngredient } from '#/feature/menu/menu.types.ts';

interface ProductDetailPageProps {
    productId: string;
}

export default function ProductDetailPage({ productId }: ProductDetailPageProps) {
    const { addItem, isAdding } = useCart();
    const user = useAuthStore((state) => state.user);
    const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
    const [quantity, setQuantity] = React.useState(1);

    // Fetch product details
    const {
        data: product,
        isLoading,
        isError
    } = useQuery({
        queryKey: [QUERY_KEY.MENU.PRODUCT_DETAILS, productId],
        queryFn: () => getMenuProductById(productId),
        enabled: !!productId
    });

    // Automatically select first variant when product loads
    React.useEffect(() => {
        if (product?.variants && product.variants.length > 0) {
            setSelectedVariantId(product.variants[0].id);
        }
    }, [product]);

    if (isLoading) {
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

    if (isError || !product) {
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

    const selectedVariant = product.variants.find((v: IMenuProductVariant) => v.id === selectedVariantId);
    const price = selectedVariant ? selectedVariant.price : 0;

    const handleIncrement = () => setQuantity((q) => q + 1);
    const handleDecrement = () => setQuantity((q) => Math.max(1, q - 1));

    const handleAddToCart = async () => {
        if (!selectedVariantId) return;
        try {
            await addItem({
                productVariantId: selectedVariantId,
                quantity
            });
        } catch (error) {
            console.error('Failed to add item to cart:', error);
        }
    };

    const getVariantLabel = (variant: IMenuProductVariant) => {
        if (variant.attributes.length === 0) {
            return 'Regular';
        }
        return variant.attributes.map((attr) => attr.attributeValue.value).join(' / ');
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
                        <img src={product.photo} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                        <Coffee className="size-28 text-muted-foreground/30" />
                    )}
                </div>

                {/* Product Configuration details */}
                <div className="flex flex-col">
                    {/* Category Label */}
                    <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{product.category?.name || 'Beverage'}</div>

                    <h1 className="text-3xl font-extrabold text-foreground leading-tight">{product.name}</h1>

                    <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                        {product.description || 'No description available for this item.'}
                    </p>

                    {/* Recipe Ingredients Preview (if available) */}
                    {selectedVariant?.recipe?.ingredients && selectedVariant.recipe.ingredients.length > 0 && (
                        <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/40">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Key Ingredients</h3>
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

                    {/* Variant Selection */}
                    <div className="mt-8">
                        <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Select Option</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {product.variants.map((v: IMenuProductVariant) => {
                                const isSelected = v.id === selectedVariantId;
                                return (
                                    <button
                                        key={v.id}
                                        onClick={() => {
                                            setSelectedVariantId(v.id);
                                            setQuantity(1); // Reset quantity on variant change
                                        }}
                                        className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                                            isSelected
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-border/60 bg-card hover:border-border-hover hover:bg-muted/10'
                                        }`}
                                    >
                                        <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {getVariantLabel(v)}
                                        </span>
                                        <span className="text-sm font-bold text-foreground mt-1">₱{v.price.toFixed(2)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quantity and CTA */}
                    <div className="mt-8 pt-8 border-t border-border/40 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Price</span>
                                <div className="text-2xl font-black text-foreground mt-0.5">₱{(price * quantity).toFixed(2)}</div>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 border border-border/60 rounded-xl p-1 bg-card">
                                <Button variant="ghost" size="sm" onClick={handleDecrement} className="h-8 w-8 rounded-lg p-0">
                                    <Minus className="size-3.5" />
                                </Button>
                                <span className="w-8 text-center text-sm font-bold text-foreground">{quantity}</span>
                                <Button variant="ghost" size="sm" onClick={handleIncrement} className="h-8 w-8 rounded-lg p-0">
                                    <Plus className="size-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Add to Cart CTA / Sign In redirect */}
                        {!user ? (
                            <Link to="/login" className="block w-full">
                                <Button
                                    size="lg"
                                    className="w-full h-12 rounded-xl gap-2 font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                                >
                                    <ShoppingBag className="size-5" />
                                    Sign In to Order
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                size="lg"
                                onClick={handleAddToCart}
                                disabled={isAdding || !selectedVariantId}
                                className="w-full h-12 rounded-xl gap-2 font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                            >
                                <ShoppingBag className="size-5" />
                                {isAdding ? 'Adding to Cart...' : 'Add to Shopping Cart'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
