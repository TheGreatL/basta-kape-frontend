import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '#/components/ui/button.tsx';
import { getBestSellingProducts } from '#/api/menu.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IBestSellerProduct } from '#/feature/menu/menu.types.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import ProductCard from '../product-card.tsx';

export default function BestSellersSection() {
    const { data: bestSellers = [], isLoading: isBestSellersLoading } = useQuery<IBestSellerProduct[]>({
        queryKey: [QUERY_KEY.MENU.BEST_SELLERS],
        queryFn: () => getBestSellingProducts({ limit: 8 })
    });

    if (!isBestSellersLoading && bestSellers.length === 0) {
        return null;
    }

    return (
        <section className="py-20 md:py-28 bg-muted/25 border-b border-border/60">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                    <div>
                        <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-[-0.02em]">Most Ordered at the Bar</h2>
                        <p className="mt-2.5 text-sm sm:text-base text-muted-foreground max-w-[58ch] leading-relaxed">
                            The drinks and bakes our regulars come back for—pulled fresh and available for online customization.
                        </p>
                    </div>
                    <Link
                        to="/products"
                        className={buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                            className: 'self-start md:self-auto gap-2 group h-10 px-5 rounded-xl font-semibold'
                        })}
                    >
                        <span>View Full Menu</span>
                        <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>

                {isBestSellersLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex flex-col rounded-2xl border border-border/40 bg-card p-4 space-y-3">
                                <Skeleton className="aspect-square w-full rounded-xl" />
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <div className="pt-4 border-t border-border/30 flex justify-between items-center">
                                    <Skeleton className="h-5 w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {bestSellers.map((product, index) => {
                            const badgeText =
                                index === 0 ? 'No. 1 Favorite' : index === 1 ? 'No. 2 Favorite' : index === 2 ? 'No. 3 Favorite' : 'Bar Favorite';

                            return (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    badge={
                                        <span className="absolute top-2.5 right-2.5 inline-flex items-center rounded-md bg-[#1C1511]/90 text-[#F7F1E5] font-semibold px-2.5 py-0.5 text-[11px] tracking-wide shadow-xs">
                                            {badgeText}
                                        </span>
                                    }
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
