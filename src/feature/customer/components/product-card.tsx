import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { IMenuProduct, IMenuProductVariant } from '#/feature/menu/menu.types.ts';
import { getProductPhotoUrl, handleProductImageError } from '#/utils/helper';

interface ProductCardProps {
    product: IMenuProduct;
    badge?: React.ReactNode;
}

export default function ProductCard({ product, badge }: ProductCardProps) {
    // Calculate price range
    const prices = product.variants.map((v: IMenuProductVariant) => v.price);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const hasPriceRange = minPrice !== maxPrice;

    return (
        <Link
            to="/products/$id"
            params={{ id: product.id }}
            className="group flex flex-col rounded-2xl border border-border/60 bg-card p-4 hover:shadow-md hover:border-foreground/25 transition-all duration-300"
        >
            {/* Image with fallback */}
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                <img
                    src={getProductPhotoUrl(product.photo)}
                    onError={handleProductImageError}
                    alt={product.name}
                    className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
                {product.type && (
                    <span className="absolute top-2.5 left-2.5 rounded-md bg-stone-950/80 px-2 py-0.5 text-[11px] font-medium text-stone-100">
                        {product.type.name}
                    </span>
                )}
                {badge}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col pt-4">
                <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">
                    {product.category?.name || 'Beverage'}
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors duration-200">
                    {product.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 flex-1 leading-relaxed">
                    {product.description || 'Freshly prepared to order.'}
                </p>

                {/* Footer / Price info */}
                <div className="flex items-center justify-between pt-3.5 mt-4 border-t border-border/40">
                    <div className="text-sm font-bold text-foreground tabular-nums">
                        {hasPriceRange ? `₱${minPrice} – ₱${maxPrice}` : `₱${minPrice}`}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                        <span>Order</span>
                        <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                </div>
            </div>
        </Link>
    );
}
