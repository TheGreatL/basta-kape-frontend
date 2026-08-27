import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Coffee, ChevronLeft, ChevronRight, Sparkles, Flame, Layers, RotateCcw } from 'lucide-react';

import { getMenuCatalog, getMenuCategories } from '#/api/menu.api.ts';
import type { IMenuCategory, IMenuProduct } from '#/feature/menu/menu.types.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { cn } from '#/lib/utils.ts';
import ProductCard from './components/product-card.tsx';

export default function ProductsPage() {
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [badgeFilter, setBadgeFilter] = useState<'all' | 'best_seller' | 'must_try'>('all');
    const [page, setPage] = useState(1);
    const limit = 8;

    // Reset to page 1 on search change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    // Fetch categories
    const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
        queryKey: [QUERY_KEY.MENU.CATEGORIES_LIST],
        queryFn: getMenuCategories
    });

    // Fetch products list
    const { data: menuData, isLoading: isProductsLoading } = useQuery({
        queryKey: [QUERY_KEY.MENU.CATALOG, page, debouncedSearch, selectedCategory, badgeFilter],
        queryFn: () =>
            getMenuCatalog({
                page,
                limit,
                search: debouncedSearch || undefined,
                productCategoryId: selectedCategory || undefined,
                isBestSeller: badgeFilter === 'best_seller' ? true : undefined,
                isMustTry: badgeFilter === 'must_try' ? true : undefined
            })
    });

    const products = menuData?.data || [];
    const meta = menuData?.meta;

    const handleCategorySelect = (categoryId: string | null) => {
        setSelectedCategory(categoryId);
        setPage(1);
    };

    const handleBadgeSelect = (filter: 'all' | 'best_seller' | 'must_try') => {
        setBadgeFilter(filter);
        setPage(1);
    };

    const hasActiveFilters = selectedCategory !== null || badgeFilter !== 'all' || !!search;

    const handleClearFilters = () => {
        setSearch('');
        setSelectedCategory(null);
        setBadgeFilter('all');
        setPage(1);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl min-h-screen">
            {/* Search Bar Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Our Menu & Specialties</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Explore freshly brewed drinks, handcrafted beverages, and tasty pairings.
                    </p>
                </div>

                <div className="relative w-full sm:w-80">
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

            {/* Category & Collection Filter Cards */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase text-muted-foreground">Select Category or Highlight</span>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <RotateCcw className="size-3" />
                            Reset
                        </button>
                    )}
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {/* All Items Card */}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedCategory(null);
                            setBadgeFilter('all');
                            setPage(1);
                        }}
                        className={cn(
                            'flex flex-col items-start p-3.5 rounded-2xl border transition-all duration-200 text-left group cursor-pointer relative overflow-hidden',
                            selectedCategory === null && badgeFilter === 'all'
                                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                : 'bg-card hover:bg-muted/40 border-border/60 hover:border-primary/30'
                        )}
                    >
                        <div
                            className={cn(
                                'size-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors',
                                selectedCategory === null && badgeFilter === 'all'
                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                    : 'bg-primary/10 text-primary'
                            )}
                        >
                            <Layers className="size-4.5" />
                        </div>
                        <span className="text-xs font-bold leading-tight">All Menu</span>
                        <span
                            className={cn(
                                'text-xs mt-0.5 font-medium',
                                selectedCategory === null && badgeFilter === 'all' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            )}
                        >
                            Full Catalog
                        </span>
                    </button>

                    {/* Best Sellers Card */}
                    <button
                        type="button"
                        onClick={() => {
                            handleBadgeSelect(badgeFilter === 'best_seller' ? 'all' : 'best_seller');
                            setSelectedCategory(null);
                        }}
                        className={cn(
                            'flex flex-col items-start p-3.5 rounded-2xl border transition-all duration-200 text-left group cursor-pointer relative overflow-hidden',
                            badgeFilter === 'best_seller'
                                ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
                                : 'bg-card hover:bg-amber-500/5 border-border/60 hover:border-amber-500/40'
                        )}
                    >
                        <div
                            className={cn(
                                'size-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors',
                                badgeFilter === 'best_seller' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            )}
                        >
                            <Sparkles className="size-4.5" />
                        </div>
                        <span className="text-xs font-bold leading-tight">⭐ Best Sellers</span>
                        <span className={cn('text-xs mt-0.5 font-medium', badgeFilter === 'best_seller' ? 'text-white/90' : 'text-muted-foreground')}>
                            Top Favorites
                        </span>
                    </button>

                    {/* Must Try Card */}
                    <button
                        type="button"
                        onClick={() => {
                            handleBadgeSelect(badgeFilter === 'must_try' ? 'all' : 'must_try');
                            setSelectedCategory(null);
                        }}
                        className={cn(
                            'flex flex-col items-start p-3.5 rounded-2xl border transition-all duration-200 text-left group cursor-pointer relative overflow-hidden',
                            badgeFilter === 'must_try'
                                ? 'bg-orange-500 text-white border-orange-500 shadow-md ring-2 ring-orange-500/20'
                                : 'bg-card hover:bg-orange-500/5 border-border/60 hover:border-orange-500/40'
                        )}
                    >
                        <div
                            className={cn(
                                'size-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors',
                                badgeFilter === 'must_try' ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            )}
                        >
                            <Flame className="size-4.5" />
                        </div>
                        <span className="text-xs font-bold leading-tight">🔥 Must Try</span>
                        <span className={cn('text-xs mt-0.5 font-medium', badgeFilter === 'must_try' ? 'text-white/90' : 'text-muted-foreground')}>
                            Special Picks
                        </span>
                    </button>

                    {/* Dynamic Category Cards */}
                    {isCategoriesLoading
                        ? Array.from({ length: 3 }).map((_, idx) => (
                              <div key={idx} className="h-24 rounded-2xl border border-border/40 bg-muted/30 animate-pulse p-3.5" />
                          ))
                        : categories.map((category: IMenuCategory) => {
                              const isSelected = selectedCategory === category.id && badgeFilter === 'all';
                              return (
                                  <button
                                      key={category.id}
                                      type="button"
                                      onClick={() => {
                                          handleCategorySelect(isSelected ? null : category.id);
                                          setBadgeFilter('all');
                                      }}
                                      className={cn(
                                          'flex flex-col items-start p-3.5 rounded-2xl border transition-all duration-200 text-left group cursor-pointer relative overflow-hidden',
                                          isSelected
                                              ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                              : 'bg-card hover:bg-muted/40 border-border/60 hover:border-primary/30'
                                      )}
                                  >
                                      <div
                                          className={cn(
                                              'size-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors',
                                              isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground'
                                          )}
                                      >
                                          <Coffee className="size-4.5" />
                                      </div>
                                      <span className="text-xs font-bold leading-tight line-clamp-1">{category.name}</span>
                                      <span
                                          className={cn(
                                              'text-xs mt-0.5 font-medium line-clamp-1',
                                              isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                          )}
                                      >
                                          {category.description || 'Category'}
                                      </span>
                                  </button>
                              );
                          })}
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
                        {products.map((product: IMenuProduct) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
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
