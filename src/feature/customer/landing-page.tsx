import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Coffee, ArrowRight, Star, Heart, ShieldCheck, Flame } from 'lucide-react';
import { buttonVariants } from '#/components/ui/button.tsx';
import { useStoreSettings } from '#/hooks/use-store-settings.ts';
import { getBestSellingProducts } from '#/api/menu.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IBestSellerProduct } from '#/feature/menu/menu.types.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import ProductCard from './components/product-card.tsx';

export default function LandingPage() {
    const { storeName } = useStoreSettings();

    // Query top best-selling products from the public menu API
    const { data: bestSellers = [], isLoading: isBestSellersLoading } = useQuery<IBestSellerProduct[]>({
        queryKey: [QUERY_KEY.MENU.BEST_SELLERS],
        queryFn: () => getBestSellingProducts({ limit: 8 })
    });

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-amber-950 via-amber-900 to-stone-950 text-white py-24 md:py-32">
                {/* Decorative background elements */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="absolute top-1/4 left-1/10 size-96 rounded-full bg-primary/10 blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/10 size-96 rounded-full bg-amber-500/10 blur-3xl"></div>

                <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-200 ring-1 ring-inset ring-amber-500/20 mb-6 animate-pulse">
                        <Flame className="size-4" />
                        <span>Freshly brewed daily</span>
                    </div>

                    <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl max-w-3xl leading-none">
                        Crafting Moments, <br />
                        <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">One Cup at a Time</span>
                    </h1>

                    <p className="mt-6 text-base md:text-lg text-amber-100/80 max-w-2xl font-light leading-relaxed">
                        Welcome to {storeName}. We combine ethically sourced premium beans with precise artisanal roasting to elevate your daily
                        coffee ritual.
                    </p>

                    <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
                        <Link
                            to="/products"
                            className={buttonVariants({
                                size: 'lg'
                            })}
                        >
                            Order Now
                            <ArrowRight className="size-4" />
                        </Link>
                        <Link
                            to="/products"
                            className={buttonVariants({
                                variant: 'secondary',
                                size: 'lg'
                            })}
                        >
                            Explore Menu
                        </Link>
                    </div>
                </div>
            </section>

            {/* Best Sellers Section */}
            {(isBestSellersLoading || bestSellers.length > 0) && (
                <section className="py-20 bg-muted/20 border-b border-border/40">
                    <div className="container mx-auto px-4">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                            <div>
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20 mb-3">
                                    <Flame className="size-3.5 fill-amber-500 text-amber-500" />
                                    <span>Community Favorites</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">Best Selling Items</h2>
                                <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-xl">
                                    Handcrafted with precision. Discover our top-selling drinks and treats ordered most by our coffee lovers.
                                </p>
                            </div>
                            <Link
                                to="/products"
                                className={buttonVariants({
                                    variant: 'outline',
                                    size: 'sm',
                                    className: 'self-start md:self-auto gap-2 group'
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
                                        index === 0
                                            ? '#1 Best Seller'
                                            : index === 1
                                              ? '#2 Best Seller'
                                              : index === 2
                                                ? '#3 Best Seller'
                                                : 'Best Seller';

                                    return (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            badge={
                                                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-amber-500 text-stone-950 font-bold px-2 py-0.5 text-xs shadow-xs">
                                                    <Flame className="size-3.5 fill-stone-950" />
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
            )}

            {/* Core Values / Features Grid */}
            <section className="py-20 bg-background">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground">The {storeName} Standards</h2>
                        <p className="mt-3 text-sm md:text-base text-muted-foreground">
                            We take pride in every single detail of your coffee experience.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="flex flex-col items-center text-center p-6 rounded-2xl border border-border/40 bg-card hover:shadow-md hover:border-primary/20 transition-all duration-300">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 mb-5">
                                <Star className="size-6" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">Premium Specialty Beans</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Sourced from single-origin farms, roasted in small batches to preserve natural tasting profiles and tasting notes.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex flex-col items-center text-center p-6 rounded-2xl border border-border/40 bg-card hover:shadow-md hover:border-primary/20 transition-all duration-300">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 mb-5">
                                <Heart className="size-6" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">Brewed with Love</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Our certified baristas master extraction times and temperatures to craft a perfectly balanced cup every time.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex flex-col items-center text-center p-6 rounded-2xl border border-border/40 bg-card hover:shadow-md hover:border-primary/20 transition-all duration-300">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 mb-5">
                                <ShieldCheck className="size-6" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">Seamless Experience</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Order online, customize your drinks just the way you like, and skip the queue. Fast, convenient, and satisfying.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Warm Callout Section */}
            <section className="bg-muted/30 py-16 border-y border-border/40">
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-4">
                        <Coffee className="size-5" />
                    </div>
                    <blockquote className="text-xl md:text-2xl font-medium text-foreground italic leading-relaxed">
                        "Coffee is not just a drink; it's a moment of clarity, a fuel for connection, and a craft we celebrate daily."
                    </blockquote>
                    <cite className="block mt-4 text-sm font-semibold text-muted-foreground not-italic uppercase">— {storeName} Roastery</cite>
                </div>
            </section>
        </div>
    );
}
