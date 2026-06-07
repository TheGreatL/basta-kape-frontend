import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Coffee, ChevronLeft, ChevronRight } from 'lucide-react';

import { getMenuCatalog, getMenuCategories } from '#/api/menu.api.ts';
import type { IMenuCategory, IMenuProduct } from '#/feature/menu/menu.types.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import ProductCard from './components/product-card.tsx';

export default function ProductsPage() {
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
                    <h1 className="text-3xl font-extrabold text-foreground">Our Coffee Menu</h1>
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
