import { Link } from '@tanstack/react-router';
import { Coffee } from 'lucide-react';
import type { IMenuProduct, IMenuProductVariant } from '#/feature/menu/menu.types.ts';
import { getFileUrl } from '#/utils/helper';

interface ProductCardProps {
    product: IMenuProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
    // Calculate price range
    const prices = product.variants.map((v: IMenuProductVariant) => v.price);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const hasPriceRange = minPrice !== maxPrice;

    return (
        <Link
            to="/products/$id"
            params={{ id: product.id }}
            className="group flex flex-col rounded-2xl border border-border/40 bg-card p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
        >
            {/* Image with fallback */}
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300">
                {product.photo ? (
                    <img
                        src={product.photo.startsWith('http') ? product.photo : getFileUrl(product.photo)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <Coffee className="size-16 text-muted-foreground/40" />
                )}
                {product.type && (
                    <span className="absolute top-2 left-2 rounded-md bg-stone-900/80 backdrop-blur-xs px-2 py-0.5 text-xs font-semibold text-stone-200">
                        {product.type.name}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col pt-4">
                <div className="text-xs font-semibold text-primary uppercase mb-1">{product.category?.name || 'Beverage'}</div>
                <h3 className="text-base font-bold text-foreground leading-tight group-hover:text-primary transition-colors duration-200">
                    {product.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 flex-1 leading-relaxed">
                    {product.description || 'No description available.'}
                </p>

                {/* Footer / Price info */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/30">
                    <div className="text-sm font-extrabold text-foreground">{hasPriceRange ? `₱${minPrice} - ₱${maxPrice}` : `₱${minPrice}`}</div>
                    <span className="text-xs font-bold text-primary group-hover:underline">Customize →</span>
                </div>
            </div>
        </Link>
    );
}
