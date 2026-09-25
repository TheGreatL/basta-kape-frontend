import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Coffee, ChevronLeft, ChevronRight, Layers, RotateCcw, Utensils } from 'lucide-react';

import { getMenuCatalog, getMenuCategories, getMenuTypes } from '#/api/menu.api.ts';
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
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const limit = 8;

    // Reset to page 1 on search change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    // Fetch product types with nested categories
    const { data: types = [], isLoading: isTypesLoading } = useQuery({
        queryKey: [QUERY_KEY.MENU.TYPES_LIST],
        queryFn: getMenuTypes
    });

    // Fetch all categories
    const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
        queryKey: [QUERY_KEY.MENU.CATEGORIES_LIST],
        queryFn: () => getMenuCategories()
    });

    // Determine visible categories based on selected Type
    const visibleCategories = useMemo<IMenuCategory[]>(() => {
        if (!selectedTypeId) {
            return categories;
        }
        const activeType = types.find((t) => t.id === selectedTypeId);
        if (activeType?.categories && activeType.categories.length > 0) {
            return activeType.categories;
        }
        return categories.filter((c) => c.productTypeId === selectedTypeId || c.type?.id === selectedTypeId);
    }, [selectedTypeId, types, categories]);

    // Fetch products list
    const { data: menuData, isLoading: isProductsLoading } = useQuery({
        queryKey: [QUERY_KEY.MENU.CATALOG, page, debouncedSearch, selectedTypeId, selectedCategory],
        queryFn: () =>
            getMenuCatalog({
                page,
                limit,
                search: debouncedSearch || undefined,
                productTypeId: selectedTypeId || undefined,
                productCategoryId: selectedCategory || undefined
            })
    });

    const products = menuData?.data || [];
    const meta = menuData?.meta;

    const handleTypeSelect = (typeId: string | null) => {
        setSelectedTypeId(typeId);
        setSelectedCategory(null);
        setPage(1);
    };

    const handleCategorySelect = (categoryId: string | null) => {
        setSelectedCategory(categoryId);
        setPage(1);
    };

    const hasActiveFilters = selectedTypeId !== null || selectedCategory !== null || !!search;

    const handleClearFilters = () => {
        setSearch('');
        setSelectedTypeId(null);
        setSelectedCategory(null);
        setPage(1);
    };

    const activeType = types.find((t) => t.id === selectedTypeId);

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

            {/* Top-Level Two-Tier Navigation Filter */}
            <div className="space-y-4 mb-10">
                {/* Tier 1: Department & Highlight Pills */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2">
                        {/* All Items Button */}
                        <button
                            type="button"
                            onClick={() => {
                                handleTypeSelect(null);
                            }}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs',
                                selectedTypeId === null
                                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                    : 'bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Layers className="size-3.5" />
                            <span>All Items</span>
                        </button>

                        {/* Product Type Tabs (Beverage, Food, etc.) */}
                        {types.map((type) => {
                            const isBeverage = type.name.toLowerCase().includes('bev') || type.name.toLowerCase().includes('drink');
                            const isSelected = selectedTypeId === type.id;
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => {
                                        handleTypeSelect(type.id);
                                    }}
                                    className={cn(
                                        'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                            : 'bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {isBeverage ? <Coffee className="size-3.5" /> : <Utensils className="size-3.5" />}
                                    <span>{type.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-auto"
                        >
                            <RotateCcw className="size-3" />
                            Reset
                        </button>
                    )}
                </div>

                {/* Tier 2: Subcategory Cards Grid */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase text-muted-foreground">
                            {activeType ? `${activeType.name} Categories` : 'All Categories'}
                        </span>
                        {selectedCategory && (
                            <button
                                type="button"
                                onClick={() => handleCategorySelect(null)}
                                className="text-xs font-medium text-muted-foreground hover:text-foreground underline cursor-pointer"
                            >
                                View All {activeType ? activeType.name : 'Items'}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {/* All in Active Type Card */}
                        <button
                            type="button"
                            onClick={() => handleCategorySelect(null)}
                            className={cn(
                                'flex flex-col items-start p-3.5 rounded-2xl border transition-all duration-200 text-left group cursor-pointer relative overflow-hidden',
                                selectedCategory === null
                                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                    : 'bg-card hover:bg-muted/40 border-border/60 hover:border-primary/30'
                            )}
                        >
                            <div
                                className={cn(
                                    'size-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors',
                                    selectedCategory === null ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                                )}
                            >
                                <Layers className="size-4.5" />
                            </div>
                            <span className="text-xs font-bold leading-tight">{activeType ? `All ${activeType.name}` : 'All Categories'}</span>
                            <span
                                className={cn(
                                    'text-xs mt-0.5 font-medium',
                                    selectedCategory === null ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                )}
                            >
                                {visibleCategories.length} Categories
                            </span>
                        </button>

                        {/* Dynamic Subcategory Cards */}
                        {isCategoriesLoading || isTypesLoading
                            ? Array.from({ length: 5 }).map((_, idx) => (
                                  <div key={idx} className="h-24 rounded-2xl border border-border/40 bg-muted/30 animate-pulse p-3.5" />
                              ))
                            : visibleCategories.map((category: IMenuCategory) => {
                                  const isSelected = selectedCategory === category.id;
                                  return (
                                      <button
                                          key={category.id}
                                          type="button"
                                          onClick={() => handleCategorySelect(isSelected ? null : category.id)}
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
