import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { getMenuTypes } from '#/api/menu.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IMenuProductType } from '#/feature/menu/menu.types.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';

const FALLBACK_CATEGORIES: Array<{ id: string; name: string; description: string; subItems: string[] }> = [
    {
        id: '',
        name: 'Espresso & Hot Classics',
        description: 'Double-shot lattes, flat whites, americanos, and rich spanish lattes pulled to order.',
        subItems: ['Spanish Latte', 'Americano', 'Cappuccino']
    },
    {
        id: '',
        name: 'Iced & Cold Brews',
        description: 'Slow-steeped cold brews, sea salt cream lattes, and refreshing iced signatures.',
        subItems: ['Sea Salt Latte', 'Cold Brew', 'Iced Mocha']
    },
    {
        id: '',
        name: 'Non-Coffee & Matcha',
        description: 'Whisked ceremonial matcha, artisanal chocolate drinks, and fruit-forward coolers.',
        subItems: ['Dirty Matcha', 'Signature Chocolate', 'Refreshers']
    },
    {
        id: '',
        name: 'Fresh Pastries & Bites',
        description: 'Warm baked croissants, cookies, and savory companions paired for your cup.',
        subItems: ['Croissants', 'Cookies', 'Toasted Sandwiches']
    }
];

export default function CategoryExplorer() {
    const { data: types = [], isLoading } = useQuery<IMenuProductType[]>({
        queryKey: [QUERY_KEY.MENU.TYPES_LIST],
        queryFn: getMenuTypes
    });

    const displayCategories =
        types.length > 0
            ? types.map((t) => ({
                  id: t.id,
                  name: t.name,
                  description:
                      t.description ||
                      (t.categories && t.categories.length > 0
                          ? `Featuring ${t.categories.map((c) => c.name).join(', ')}.`
                          : `Freshly prepared ${t.name.toLowerCase()} selections available daily.`),
                  subItems: t.categories?.map((c) => c.name).slice(0, 4) || []
              }))
            : FALLBACK_CATEGORIES;

    return (
        <section className="py-20 md:py-28 bg-background border-b border-border/60">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Left Column: Section Lead */}
                    <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
                        <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-[-0.02em] leading-tight">
                            Browse by Counter
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-[46ch]">
                            Our menu is organized by how we prepare your order—from espresso bar classics to whisked matcha and warm pastries. Select
                            a counter to filter the menu.
                        </p>
                        <div className="pt-2">
                            <Link
                                to="/products"
                                className="inline-flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary underline underline-offset-4 decoration-border hover:decoration-primary transition-colors group"
                            >
                                <span>Open Complete Menu</span>
                                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Architectural Menu Ledger */}
                    <div className="lg:col-span-8">
                        {isLoading ? (
                            <div className="divide-y divide-border border-y border-border">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="py-6 flex items-center justify-between gap-4">
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-7 w-1/3" />
                                            <Skeleton className="h-4 w-2/3" />
                                        </div>
                                        <Skeleton className="size-9 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="divide-y divide-border/70 border-y border-border/70">
                                {displayCategories.map((cat) => (
                                    <Link
                                        key={cat.id || cat.name}
                                        to="/products"
                                        search={(cat.id ? { productTypeId: cat.id } : undefined) as any}
                                        className="group py-6 sm:py-7 px-3 -mx-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="space-y-1.5 max-w-xl">
                                            <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                                {cat.name}
                                            </h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{cat.description}</p>
                                            {cat.subItems.length > 0 && (
                                                <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                                                    {cat.subItems.map((sub) => (
                                                        <span
                                                            key={sub}
                                                            className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                                                        >
                                                            {sub}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                                                View
                                            </span>
                                            <span className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <ArrowUpRight className="size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
