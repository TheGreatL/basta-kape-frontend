import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { BookOpen, Coffee, SlidersHorizontal, Search } from 'lucide-react';

import { Route } from '#/routes/admin/menu.tsx';
import { getMenuCatalog, getMenuCategories, getMenuTypes } from '#/api/menu.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IMenuCategory, IMenuProduct, IMenuProductType } from './menu.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import MenuProductCard from './components/menu-product-card.tsx';
import MenuProductDetailsDialog from './components/menu-product-details-dialog.tsx';

export default function MenuPage() {
    const navigate = useNavigate({ from: '/admin/menu' });
    const { page, pageSize, search, productCategoryId, productTypeId } = Route.useSearch();

    const [localSearch, setLocalSearch] = React.useState(search || '');
    const [selectedProduct, setSelectedProduct] = React.useState<IMenuProduct | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

    const setSearchParams = (updates: Partial<ReturnType<typeof Route.useSearch>>) => {
        navigate({
            search: (prev) => ({ ...prev, ...updates })
        });
    };

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

    // Query categories list
    const { data: categoriesData } = useQuery({
        queryKey: [QUERY_KEY.MENU.CATEGORIES_LIST],
        queryFn: getMenuCategories
    });

    // Query product types list
    const { data: typesData } = useQuery({
        queryKey: [QUERY_KEY.MENU.TYPES_LIST],
        queryFn: getMenuTypes
    });

    // Query menu items catalog
    const {
        data: menuData,
        isLoading: isMenuLoading,
        error
    } = useQuery({
        queryKey: [QUERY_KEY.MENU.CATALOG, { page, pageSize, search, productCategoryId, productTypeId }],
        queryFn: () =>
            getMenuCatalog({
                page,
                limit: pageSize,
                search,
                productCategoryId: productCategoryId || undefined,
                productTypeId: productTypeId || undefined
            })
    });

    const handleOpenDetails = (product: IMenuProduct) => {
        setSelectedProduct(product);
        setIsDetailsOpen(true);
    };

    return (
        <div>
            {/* Header section */}
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-border/20 pb-4">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <BookOpen className="size-5 text-primary" />
                        Customer Menu Catalog
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Browse active beverage profiles, size configurations, prices, and standard recipe builds.
                    </p>
                </div>
            </div>

            {/* Filter controls toolbar */}
            <div className="flex flex-col gap-4 bg-muted/10 p-4 border border-border/40 rounded-2xl">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Search Field */}
                    <div className="relative w-full sm:w-[260px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search drink menu..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="h-9 pl-9 bg-background"
                        />
                    </div>

                    {/* Product Type pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground mr-1.5 flex items-center gap-1">
                            <SlidersHorizontal className="size-3" /> Filters:
                        </span>
                        <button
                            type="button"
                            onClick={() => setSearchParams({ productTypeId: '', page: 1 })}
                            className={`text-xs font-semibold py-1 px-3 rounded-lg border transition-all cursor-pointer ${
                                !productTypeId
                                    ? 'bg-primary border-primary text-primary-foreground'
                                    : 'bg-background hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            All Types
                        </button>
                        {typesData?.map((type: IMenuProductType) => {
                            const isSelected = type.id === productTypeId;
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setSearchParams({ productTypeId: type.id, page: 1 })}
                                    className={`text-xs font-semibold py-1 px-3 rounded-lg border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : 'bg-background hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {type.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Category filtering tabs bar */}
                <div className="border-t border-border/20 pt-3 flex items-center min-w-0">
                    <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 w-full">
                        <button
                            type="button"
                            onClick={() => setSearchParams({ productCategoryId: '', page: 1 })}
                            className={`text-xs font-semibold py-1.5 px-3 rounded-lg border shrink-0 transition-all cursor-pointer ${
                                !productCategoryId
                                    ? 'bg-primary/10 border-primary/20 text-primary'
                                    : 'bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            All Categories
                        </button>
                        {categoriesData?.map((cat: IMenuCategory) => {
                            const isSelected = cat.id === productCategoryId;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSearchParams({ productCategoryId: cat.id, page: 1 })}
                                    className={`text-xs font-semibold py-1.5 px-3 rounded-lg border shrink-0 transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-primary/10 border-primary/20 text-primary'
                                            : 'bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

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
