import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Search, Coffee, ChevronLeft, ChevronRight } from 'lucide-react';

import { getMenuCatalog, getMenuCategories } from '#/api/menu.api.ts';
import type { IMenuCategory, IMenuProduct, IMenuProductVariant } from '#/feature/menu/menu.types.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';

export default function ProductsPage() {
    const [search, setSearch] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
    const [page, setPage] = React.useState(1);
    const limit = 8;

    // Debounce search input
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch categories
    const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
        queryKey: [QUERY_KEY.MENU.CATEGORIES_LIST],
        queryFn: getMenuCategories
    });

    // Fetch products list
    const { data: menuData, isLoading: isProductsLoading } = useQuery({
        queryKey: [QUERY_KEY.MENU.CATALOG, page, debouncedSearch, selectedCategory],
        queryFn: () =>
            getMenuCatalog({
                page,
                limit,
                search: debouncedSearch || undefined,
                productCategoryId: selectedCategory || undefined
            })
    });

    const products = menuData?.data || [];
    const meta = menuData?.meta;

    const handleCategorySelect = (categoryId: string | null) => {
        setSelectedCategory(categoryId);
        setPage(1);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl min-h-screen">
            {/* Page Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Our Coffee Menu</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Explore our curated selection of hot brews, cold refreshers, and artisanal treats.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search drinks and foods..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 w-full rounded-xl bg-card border-border/60 focus-visible:ring-primary/20 focus-visible:border-primary/50 text-sm"
                    />
                </div>
            </div>

            {/* Category Filters */}
            <div className="mb-10 overflow-x-auto scrollbar-none pb-2">
                <div className="flex items-center gap-2 min-w-max">
                    <Button
                        variant={selectedCategory === null ? 'default' : 'outline'}
                        onClick={() => handleCategorySelect(null)}
                        className="rounded-full h-9 px-5 text-sm font-medium transition-all"
                    >
                        All Items
                    </Button>
                    {isCategoriesLoading
                        ? Array.from({ length: 4 }).map((_, idx) => <div key={idx} className="h-9 w-24 rounded-full bg-muted animate-pulse" />)
                        : categories.map((category: IMenuCategory) => (
                              <Button
                                  key={category.id}
                                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                                  onClick={() => handleCategorySelect(category.id)}
                                  className="rounded-full h-9 px-5 text-sm font-medium transition-all"
                              >
                                  {category.name}
                              </Button>
                          ))}
                </div>
            </div>

            {/* Products Grid */}
            {isProductsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="rounded-2xl border border-border/40 p-4 bg-card space-y-4">
                            <div className="aspect-square w-full rounded-xl bg-muted animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
                                <div className="h-5 w-2/3 bg-muted rounded animate-pulse" />
                                <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border/60 rounded-2xl bg-muted/10">
                    <Coffee className="size-12 text-muted-foreground/60 mb-4 animate-bounce" />
                    <h3 className="text-lg font-bold text-foreground">No items found</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">
                        We couldn't find any drinks or treats matching your search criteria. Try a different search term!
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                            setSearch('');
                            setSelectedCategory(null);
                        }}
                    >
                        Clear Filters
                    </Button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products.map((product: IMenuProduct) => {
                            // Calculate price range
                            const prices = product.variants.map((v: IMenuProductVariant) => v.price);
                            const minPrice = prices.length ? Math.min(...prices) : 0;
                            const maxPrice = prices.length ? Math.max(...prices) : 0;
                            const hasPriceRange = minPrice !== maxPrice;

                            return (
                                <Link
                                    key={product.id}
                                    to="/products/$id"
                                    params={{ id: product.id }}
                                    className="group flex flex-col rounded-2xl border border-border/40 bg-card p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                                >
                                    {/* Image with fallback */}
                                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300">
                                        {product.photo ? (
                                            <img src={product.photo} alt={product.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <Coffee className="size-16 text-muted-foreground/40" />
                                        )}
                                        {product.type && (
                                            <span className="absolute top-2 left-2 rounded-md bg-stone-900/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-stone-200">
                                                {product.type.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col pt-4">
                                        <div className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">
                                            {product.category?.name || 'Beverage'}
                                        </div>
                                        <h3 className="text-base font-bold text-foreground leading-tight group-hover:text-primary transition-colors duration-200">
                                            {product.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 flex-1 leading-relaxed">
                                            {product.description || 'No description available.'}
                                        </p>

                                        {/* Footer / Price info */}
                                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/30">
                                            <div className="text-sm font-extrabold text-foreground">
                                                {hasPriceRange ? `₱${minPrice} - ₱${maxPrice}` : `₱${minPrice}`}
                                            </div>
                                            <span className="text-[11px] font-bold text-primary group-hover:underline">Customize →</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {meta && meta.pageCount > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-12">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((prev) => prev - 1)}
                                className="h-9 w-9 p-0 rounded-xl"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <span className="text-xs font-semibold">
                                Page {meta.currentPage} of {meta.pageCount}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!meta.hasMore}
                                onClick={() => setPage((prev) => prev + 1)}
                                className="h-9 w-9 p-0 rounded-xl"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
