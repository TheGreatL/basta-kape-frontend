import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { BookOpen, Coffee, Search, X, Sparkles, Flame, Layers, RotateCcw, ChevronDown } from 'lucide-react';

import { Route } from '#/routes/admin/menu.tsx';
import { getMenuCatalog, getMenuCategories, getMenuTypes } from '#/api/menu.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IMenuCategory, IMenuProduct, IMenuProductType } from './menu.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#/components/ui/collapsible.tsx';
import { cn } from '#/lib/utils.ts';
import MenuProductCard from './components/menu-product-card.tsx';
import MenuProductDetailsDialog from './components/menu-product-details-dialog.tsx';

export default function MenuPage() {
    const navigate = useNavigate({ from: '/admin/menu' });
    const { page, pageSize, search, productCategoryId, productTypeId, isMustTry, isBestSeller } = Route.useSearch();

    const [localSearch, setLocalSearch] = React.useState(search || '');
    const [selectedProduct, setSelectedProduct] = React.useState<IMenuProduct | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
    const [isCategoriesOpen, setIsCategoriesOpen] = React.useState(true);

    const setSearchParams = (updates: Partial<ReturnType<typeof Route.useSearch>>) => {
        navigate({
            search: (prev) => ({ ...prev, ...updates })
        });
    };

    // Query categories list
    const { data: categoriesData = [] } = useQuery<IMenuCategory[]>({
        queryKey: [QUERY_KEY.MENU.CATEGORIES_LIST],
        queryFn: () => getMenuCategories()
    });

    // Query product types list
    const { data: typesData = [] } = useQuery<IMenuProductType[]>({
        queryKey: [QUERY_KEY.MENU.TYPES_LIST],
        queryFn: () => getMenuTypes()
    });

    const hasActiveFilters = !!localSearch || !!productCategoryId || !!productTypeId || isMustTry !== undefined || isBestSeller !== undefined;

    // Debounce query search input
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== (search || '')) {
                setSearchParams({ search: localSearch, page: 1 });
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [localSearch, search]);

    // Handle initial route searches
    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    // Query menu items catalog
    const {
        data: menuData,
        isLoading: isMenuLoading,
        error
    } = useQuery({
        queryKey: [QUERY_KEY.MENU.CATALOG, { page, pageSize, search, productCategoryId, productTypeId, isMustTry, isBestSeller }],
        queryFn: () =>
            getMenuCatalog({
                page,
                limit: pageSize,
                search,
                productCategoryId: productCategoryId || undefined,
                productTypeId: productTypeId || undefined,
                isMustTry: isMustTry !== undefined ? isMustTry : undefined,
                isBestSeller: isBestSeller !== undefined ? isBestSeller : undefined
            })
    });

    const filteredCategories = React.useMemo(() => {
        if (!productTypeId) return categoriesData;
        return categoriesData.filter((cat) => cat.productTypeId === productTypeId || cat.type?.id === productTypeId);
    }, [categoriesData, productTypeId]);

    const selectedCategoryName = React.useMemo(() => {
        if (isBestSeller) return '⭐ Best Sellers';
        if (isMustTry) return '🔥 Must Try';
        if (productCategoryId) {
            return categoriesData.find((c) => c.id === productCategoryId)?.name || 'Filtered';
        }
        return 'All Menu';
    }, [isBestSeller, isMustTry, productCategoryId, categoriesData]);

    const handleProductTypeChange = (typeId: string) => {
        const nextTypeId = typeId === productTypeId ? '' : typeId;
        let nextCategoryId = productCategoryId;
        if (nextTypeId && productCategoryId) {
            const currentCat = categoriesData.find((c) => c.id === productCategoryId);
            if (currentCat && (currentCat.productTypeId || currentCat.type?.id) !== nextTypeId) {
                nextCategoryId = '';
            }
        }
        setSearchParams({ productTypeId: nextTypeId, productCategoryId: nextCategoryId, page: 1 });
    };

    const handleOpenDetails = (product: IMenuProduct) => {
        setSelectedProduct(product);
        setIsDetailsOpen(true);
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                        <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Customer Menu Catalog</h1>
                        <p className="text-xs text-muted-foreground">
                            Browse active beverage profiles, size configurations, prices, and standard recipe builds.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter controls toolbar */}
            <Collapsible
                open={isCategoriesOpen}
                onOpenChange={setIsCategoriesOpen}
                className="flex flex-col gap-3 bg-card p-4 border border-border/60 rounded-2xl shadow-xs"
            >
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    {/* Search Field */}
                    <div className="relative w-full sm:w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search drink menu..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="h-9 pl-9 pr-8 bg-muted/20 text-xs rounded-xl border-border/60 focus-visible:ring-primary/20"
                        />
                        {localSearch && (
                            <button
                                type="button"
                                onClick={() => setLocalSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Controls Group */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Types Filter */}
                        {typesData.length > 0 && (
                            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/40 overflow-x-auto no-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => handleProductTypeChange('')}
                                    className={cn(
                                        'text-xs font-semibold py-1 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap',
                                        !productTypeId
                                            ? 'bg-background shadow-xs text-foreground font-bold border border-border/60'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    All Types
                                </button>
                                {typesData.map((type: IMenuProductType) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => handleProductTypeChange(type.id)}
                                        className={cn(
                                            'text-xs font-semibold py-1 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap',
                                            type.id === productTypeId
                                                ? 'bg-background shadow-xs text-foreground font-bold border border-border/60'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {type.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Categories Accordion Trigger Button */}
                        <CollapsibleTrigger asChild>
                            <button
                                type="button"
                                className={cn(
                                    'text-xs font-semibold py-1.5 px-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-2xs',
                                    isCategoriesOpen
                                        ? 'bg-muted/50 border-border/60 text-foreground'
                                        : productCategoryId || isBestSeller || isMustTry
                                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                          : 'bg-background hover:bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Layers className="size-3.5" />
                                <span>
                                    {!isCategoriesOpen && (productCategoryId || isBestSeller || isMustTry)
                                        ? selectedCategoryName
                                        : `Categories (${filteredCategories.length + 3})`}
                                </span>
                                <ChevronDown className={cn('size-3.5 transition-transform duration-200', isCategoriesOpen && 'rotate-180')} />
                            </button>
                        </CollapsibleTrigger>

                        {/* Reset Button */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLocalSearch('');
                                    setSearchParams({
                                        search: '',
                                        productCategoryId: '',
                                        productTypeId: '',
                                        isMustTry: undefined,
                                        isBestSeller: undefined,
                                        page: 1
                                    });
                                }}
                                className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer shrink-0"
                            >
                                <RotateCcw className="size-3.5" />
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Accordion Content: Category & Collection Filter Cards */}
                <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 border-t border-border/30 pt-3">
                        {/* All Menu Card */}
                        <button
                            type="button"
                            onClick={() => setSearchParams({ productCategoryId: '', isBestSeller: undefined, isMustTry: undefined, page: 1 })}
                            className={cn(
                                'flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-200 cursor-pointer whitespace-nowrap shadow-2xs',
                                !productCategoryId && !isBestSeller && !isMustTry
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                                    : 'bg-background hover:bg-muted/40 border-border/60 hover:border-primary/30 text-foreground'
                            )}
                        >
                            <div
                                className={cn(
                                    'size-6 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                    !productCategoryId && !isBestSeller && !isMustTry
                                        ? 'bg-primary-foreground/20 text-primary-foreground'
                                        : 'bg-primary/10 text-primary'
                                )}
                            >
                                <Layers className="size-3.5" />
                            </div>
                            <span className="text-xs font-semibold">All Menu</span>
                        </button>

                        {/* Best Sellers Card */}
                        <button
                            type="button"
                            onClick={() =>
                                setSearchParams({
                                    isBestSeller: isBestSeller ? undefined : true,
                                    isMustTry: undefined,
                                    productCategoryId: '',
                                    page: 1
                                })
                            }
                            className={cn(
                                'flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-200 cursor-pointer whitespace-nowrap shadow-2xs',
                                isBestSeller
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs font-bold'
                                    : 'bg-background hover:bg-amber-500/5 border-border/60 hover:border-amber-500/40 text-foreground'
                            )}
                        >
                            <div
                                className={cn(
                                    'size-6 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                    isBestSeller ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                )}
                            >
                                <Sparkles className="size-3.5" />
                            </div>
                            <span className="text-xs font-semibold">⭐ Best Sellers</span>
                        </button>

                        {/* Must Try Card */}
                        <button
                            type="button"
                            onClick={() =>
                                setSearchParams({ isMustTry: isMustTry ? undefined : true, isBestSeller: undefined, productCategoryId: '', page: 1 })
                            }
                            className={cn(
                                'flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-200 cursor-pointer whitespace-nowrap shadow-2xs',
                                isMustTry
                                    ? 'bg-orange-500 text-white border-orange-500 shadow-xs font-bold'
                                    : 'bg-background hover:bg-orange-500/5 border-border/60 hover:border-orange-500/40 text-foreground'
                            )}
                        >
                            <div
                                className={cn(
                                    'size-6 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                    isMustTry ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                )}
                            >
                                <Flame className="size-3.5" />
                            </div>
                            <span className="text-xs font-semibold">🔥 Must Try</span>
                        </button>

                        {/* Dynamic Category Cards */}
                        {filteredCategories.map((cat: IMenuCategory) => {
                            const isSelected = cat.id === productCategoryId && !isBestSeller && !isMustTry;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() =>
                                        setSearchParams({
                                            productCategoryId: cat.id === productCategoryId ? '' : cat.id,
                                            isBestSeller: undefined,
                                            isMustTry: undefined,
                                            page: 1
                                        })
                                    }
                                    className={cn(
                                        'flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-200 cursor-pointer whitespace-nowrap shadow-2xs',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                                            : 'bg-background hover:bg-muted/40 border-border/60 hover:border-primary/30 text-foreground'
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'size-6 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                            isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground'
                                        )}
                                    >
                                        <Coffee className="size-3.5" />
                                    </div>
                                    <span className="text-xs font-semibold">{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* Menu Grid and Catalog Results */}
            <div className="flex-1 min-h-0 flex flex-col justify-between">
                {isMenuLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-3 flex-1">
                        <Spinner className="h-6 w-6 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground font-medium">Loading catalog items...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-28 text-center gap-2 flex-1">
                        <Coffee className="size-10 text-muted-foreground/80 stroke-[1.25]" />
                        <p className="text-sm font-semibold text-foreground">Menu catalog unavailable</p>
                        <p className="text-xs text-muted-foreground max-w-sm">Failed to connect with active menu servers.</p>
                    </div>
                ) : menuData && menuData.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-28 text-center gap-2 flex-1 border border-dashed rounded-2xl bg-muted/5">
                        <Coffee className="size-8 text-muted-foreground/60 stroke-[1.25]" />
                        <p className="text-xs font-bold text-foreground">No menu items found</p>
                        <p className="text-xs text-muted-foreground">Adjust filters or search parameters and check again.</p>
                    </div>
                ) : (
                    menuData && (
                        <div className="flex-1 flex flex-col justify-between">
                            {/* Product Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {menuData.data.map((product: IMenuProduct) => (
                                    <div key={product.id} className="h-full">
                                        <MenuProductCard product={product} onViewDetails={handleOpenDetails} />
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/20 pt-4 mt-6">
                                <span className="text-xs text-muted-foreground">
                                    Showing page {page} of {menuData.meta.pageCount || 1} ({menuData.meta.total || 0} total items)
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSearchParams({ page: page - 1 })}
                                        disabled={page <= 1}
                                        className="h-8 text-xs font-semibold"
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSearchParams({ page: page + 1 })}
                                        disabled={!menuData.meta.hasMore}
                                        className="h-8 text-xs font-semibold"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* View Details Dialog */}
            <MenuProductDetailsDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen} product={selectedProduct} />
        </div>
    );
}
