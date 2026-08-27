import { cn } from '#/lib/utils.ts';

export interface ProductBadgeTarget {
    isBestSeller?: boolean | null;
    isMustTry?: boolean | null;
}

interface ProductBadgesProps {
    product: ProductBadgeTarget;
    variant?: 'floating' | 'inline' | 'compact';
    className?: string;
}

export function ProductBadges({ product, variant = 'floating', className }: ProductBadgesProps) {
    const hasBestSeller = !!product.isBestSeller;
    const hasMustTry = !!product.isMustTry;

    if (!hasBestSeller && !hasMustTry) {
        return null;
    }

    if (variant === 'floating') {
        return (
            <div className={cn('flex flex-col items-end gap-1 pointer-events-none z-10', className)}>
                {hasBestSeller && (
                    <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm uppercase">
                        ⭐ Best Seller
                    </span>
                )}
                {hasMustTry && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm uppercase">
                        🔥 Must Try
                    </span>
                )}
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <div className={cn('flex flex-wrap items-center gap-1', className)}>
                {hasBestSeller && (
                    <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shadow-2xs">
                        ⭐ Best Seller
                    </span>
                )}
                {hasMustTry && (
                    <span className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30 text-xs font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shadow-2xs">
                        🔥 Must Try
                    </span>
                )}
            </div>
        );
    }

    // Default inline
    return (
        <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
            {hasBestSeller && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    ⭐ Best Seller
                </span>
            )}
            {hasMustTry && (
                <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    🔥 Must Try
                </span>
            )}
        </div>
    );
}
