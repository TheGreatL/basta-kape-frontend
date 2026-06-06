import { Coffee, ArrowRight } from 'lucide-react';
import type { IMenuProduct } from '../menu.types';
import { getFileUrl } from '#/utils/helper.ts';
import { Badge } from '#/components/ui/badge.tsx';
import { Button } from '#/components/ui/button.tsx';

interface MenuProductCardProps {
    product: IMenuProduct;
    onViewDetails: (product: IMenuProduct) => void;
}

export default function MenuProductCard({ product, onViewDetails }: MenuProductCardProps) {
    const prices = product.variants.map((v) => v.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const renderPrice = () => {
        if (prices.length === 0) {
            return <span className="text-xs text-muted-foreground italic">No pricing configured</span>;
        }

        if (minPrice === maxPrice) {
            return <span className="text-sm font-bold text-primary">₱{minPrice.toFixed(2)}</span>;
        }

        return (
            <span className="text-sm font-bold text-primary">
                ₱{minPrice.toFixed(2)} – ₱{maxPrice.toFixed(2)}
            </span>
        );
    };

    return (
        <div className="group relative flex flex-col bg-card hover:bg-card/80 border border-border/40 hover:border-primary/20 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 h-full">
            {/* Photo Preview Section */}
            <div className="relative aspect-video w-full overflow-hidden bg-muted/40 flex items-center justify-center border-b border-border/20">
                {product.photo ? (
                    <img
                        src={product.photo.startsWith('http') ? product.photo : getFileUrl(product.photo)}
                        alt={product.name}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <Coffee className="size-10 stroke-[1.25] text-muted-foreground/60 group-hover:scale-110 transition-transform duration-500" />
                )}

                {/* Categories & Type absolute tags */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                    {product.type && (
                        <Badge variant="secondary" className="text-xs capitalize py-0.5 px-2 bg-secondary/80 text-secondary-foreground shadow-xs">
                            {product.type.name}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Content Body Section */}
            <div className="flex-1 flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{product.name}</h4>
                </div>

                {product.category && <span className="text-xs text-muted-foreground font-medium pt-0.5">{product.category.name}</span>}

                <p className="text-xs text-muted-foreground/90 font-normal line-clamp-2 leading-relaxed mt-2 flex-1">
                    {product.description || 'No flavor descriptors or recipe notes entered.'}
                </p>

                {/* Footer Pricing & CTA */}
                <div className="flex items-center justify-between pt-4 mt-3 border-t border-border/20">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground uppercase font-semibold">Pricing</span>
                        {renderPrice()}
                    </div>
                    <Button
                        onClick={() => onViewDetails(product)}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/5 px-2.5 rounded-lg transition-all"
                    >
                        View Recipe
                        <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
