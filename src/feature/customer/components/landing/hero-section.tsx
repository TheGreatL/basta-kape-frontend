import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { buttonVariants } from '#/components/ui/button.tsx';
import { useStoreSettings } from '#/hooks/use-store-settings.ts';
import { getBestSellingProducts } from '#/api/menu.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IBestSellerProduct, IMenuProductVariant } from '#/feature/menu/menu.types.ts';
import { getStoreStatus } from '#/utils/store-hours.ts';
import { getProductPhotoUrl, handleProductImageError } from '#/utils/helper.ts';
import logo from '#/assets/logo.png';
import { cn } from '#/lib/utils.ts';

export default function HeroSection() {
    const { storeName, address, settings } = useStoreSettings();
    const { isOpen, statusText, formattedHours } = getStoreStatus(settings.openingTime, settings.closingTime);

    const { data: bestSellers = [] } = useQuery<IBestSellerProduct[]>({
        queryKey: [QUERY_KEY.MENU.BEST_SELLERS],
        queryFn: () => getBestSellingProducts({ limit: 8 })
    });

    const featuredProduct = bestSellers.at(0);
    const featuredPrices = featuredProduct ? featuredProduct.variants.map((v: IMenuProductVariant) => v.price) : [];
    const minPrice = featuredPrices.length ? Math.min(...featuredPrices) : 0;
    const maxPrice = featuredPrices.length ? Math.max(...featuredPrices) : 0;

    return (
        <section className="relative bg-[#1C1511] text-[#F7F1E5] border-b border-[#332720]">
            {/* Top Architectural Bar: Live Store Hours & Address */}
            <div className="border-b border-[#2E221B]">
                <div className="container mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#D6C7B2]">
                    <div className="flex items-center gap-2.5">
                        <span className={cn('inline-block size-2 rounded-full', isOpen ? 'bg-emerald-400' : 'bg-amber-400')} aria-hidden="true" />
                        <span className="font-semibold text-[#F7F1E5]">{statusText}</span>
                        {formattedHours !== 'Hours not set' && (
                            <>
                                <span className="text-[#6E5A4B]">/</span>
                                <span className="inline-flex items-center gap-1.5 tabular-nums">
                                    <Clock className="size-3.5 text-[#C89D66]" />
                                    {formattedHours}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-[#C4B299]">
                        <MapPin className="size-3.5 text-[#C89D66]" />
                        <span>{address || '50 K-1st, Quezon City, Metro Manila'}</span>
                    </div>
                </div>
            </div>

            {/* Main Editorial Split */}
            <div className="container mx-auto px-4 py-16 md:py-24 lg:py-28">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-center">
                    {/* Left Column: Typography & Direct Action */}
                    <div className="lg:col-span-7 space-y-8">
                        <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.65rem] font-bold tracking-[-0.025em] leading-[1.06] text-[#FBF7F0] text-balance max-w-2xl">
                            Good coffee, roasted with care &amp; brewed for the neighborhood.
                        </h1>

                        <p className="text-base sm:text-lg text-[#D6C7B2] max-w-[60ch] leading-relaxed font-normal">
                            Welcome to <strong className="font-semibold text-[#FBF7F0]">{storeName}</strong>. Every cup is pulled fresh and dialed to
                            your taste—choose your size, milk, sweetness, and extra espresso shots online, then walk in for counter pickup or book
                            your courier when it&apos;s ready.
                        </p>

                        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                            <Link
                                to="/products"
                                className={cn(
                                    buttonVariants({ size: 'lg' }),
                                    'h-12 px-7 text-sm font-bold bg-[#D48C46] hover:bg-[#C37B35] text-[#18110D] rounded-xl shadow-md transition-colors gap-2.5 group'
                                )}
                            >
                                <span>Order From the Menu</span>
                                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>

                            <Link
                                to="/orders"
                                className={cn(
                                    buttonVariants({ variant: 'outline', size: 'lg' }),
                                    'h-12 px-6 text-sm font-semibold rounded-xl border-[#3D2E24] bg-[#251C16] text-[#EADBC8] hover:bg-[#31251D] hover:text-white transition-colors'
                                )}
                            >
                                Track an Order
                            </Link>
                        </div>

                        {/* Grounded Storefront Facts — Editorial Hairline Row */}
                        <dl className="pt-8 border-t border-[#2E221B] grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-[#B59E82]">Made to Order</dt>
                                <dd className="mt-1 text-sm text-[#EDE2D2] leading-snug">
                                    Custom milk, sweetness &amp; extra espresso shots on every drink.
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-[#B59E82]">Direct Payment</dt>
                                <dd className="mt-1 text-sm text-[#EDE2D2] leading-snug">Pay with GCash, Maya receipt upload, or cash at the bar.</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wider text-[#B59E82]">Two-Way Fulfillment</dt>
                                <dd className="mt-1 text-sm text-[#EDE2D2] leading-snug">
                                    Walk-up counter pickup or customer-booked courier handoff.
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Right Column: Live Featured Counter Ticket */}
                    <div className="lg:col-span-5">
                        {featuredProduct ? (
                            <Link
                                to="/products/$id"
                                params={{ id: featuredProduct.id }}
                                className="group block rounded-2xl border border-[#3A2C22] bg-[#241B15] p-5 sm:p-6 shadow-xl hover:border-[#D48C46]/60 transition-colors"
                            >
                                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#35281F] text-xs">
                                    <span className="font-semibold uppercase tracking-wider text-[#D48C46]">Featured at the Bar</span>
                                    <span className="font-mono text-[#B59E82] tabular-nums">
                                        {featuredProduct.category?.name || 'House Signature'}
                                    </span>
                                </div>

                                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#18120E]">
                                    <img
                                        src={getProductPhotoUrl(featuredProduct.photo)}
                                        onError={handleProductImageError}
                                        alt={featuredProduct.name}
                                        className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                    />
                                </div>

                                <div className="mt-5 flex items-baseline justify-between gap-4">
                                    <h2 className="font-serif text-2xl font-bold text-[#FBF7F0] group-hover:text-[#D48C46] transition-colors">
                                        {featuredProduct.name}
                                    </h2>
                                    <span className="text-base font-bold text-[#FBF7F0] tabular-nums shrink-0">
                                        {minPrice !== maxPrice ? `₱${minPrice}–₱${maxPrice}` : `₱${minPrice}`}
                                    </span>
                                </div>

                                <p className="mt-2 text-sm text-[#C4B299] line-clamp-2 leading-relaxed">
                                    {featuredProduct.description || 'Freshly prepared to order with our house-roasted espresso blend.'}
                                </p>

                                <div className="mt-5 pt-4 border-t border-[#35281F] flex items-center justify-between text-xs font-semibold text-[#D48C46]">
                                    <span>Customize &amp; Order This Drink</span>
                                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ) : (
                            <div className="rounded-2xl border border-[#3A2C22] bg-[#241B15] p-6 sm:p-8 shadow-xl">
                                <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#35281F]">
                                    <div className="flex items-center gap-3">
                                        <img src={logo} alt={storeName} className="size-9 rounded-lg object-contain bg-[#FBF7F0] p-1" />
                                        <div>
                                            <div className="font-serif text-lg font-bold text-[#FBF7F0]">{storeName}</div>
                                            <div className="text-xs text-[#B59E82]">Daily Espresso &amp; Brew Bar</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono uppercase tracking-wider text-[#D48C46]">Freshly Pulled</span>
                                </div>

                                <dl className="space-y-4 text-sm">
                                    <div className="flex justify-between py-2 border-b border-[#2E221B]">
                                        <dt className="text-[#B59E82]">Roast Profile</dt>
                                        <dd className="font-semibold text-[#FBF7F0]">Medium-Dark Chocolate &amp; Nut</dd>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-[#2E221B]">
                                        <dt className="text-[#B59E82]">Milk Options</dt>
                                        <dd className="font-semibold text-[#FBF7F0]">Full Cream · Oat · Soy</dd>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-[#2E221B]">
                                        <dt className="text-[#B59E82]">Order Ahead</dt>
                                        <dd className="font-semibold text-[#FBF7F0]">Counter Pickup &amp; Courier</dd>
                                    </div>
                                </dl>

                                <div className="mt-6">
                                    <Link
                                        to="/products"
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2E221B] hover:bg-[#3A2C22] py-3 text-xs font-bold uppercase tracking-wider text-[#FBF7F0] transition-colors"
                                    >
                                        <span>Browse Full Drink List</span>
                                        <ArrowRight className="size-3.5" />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
