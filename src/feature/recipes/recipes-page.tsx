import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { ChefHat, Package, RotateCcw } from 'lucide-react';

import { Route } from '#/routes/admin/products/recipes.tsx';
import { getProductsList } from '#/api/products.api.ts';
import { getCategoriesList, getProductTypesList, getCategoryById, getProductTypeById } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IProduct, IProductVariant } from '../products/products.types.ts';
import type { ICategory, IProductType } from '#/feature/product-settings/product-settings-types.ts';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { getFileUrl } from '#/utils/helper.ts';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import RecipeDialog from '../products/components/recipe-dialog.tsx';
import React from 'react';

export default function RecipesPage() {
    const navigate = useNavigate({ from: '/admin/products/recipes' });
    const { page, pageSize, search, productCategoryId, productTypeId, recipeStatus, status } = Route.useSearch();

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    // Dialog states
    const [selectedVariant, setSelectedVariant] = React.useState<IProductVariant | null>(null);
    const [selectedProductName, setSelectedProductName] = React.useState('');
    const [recipeOpen, setRecipeOpen] = React.useState(false);

    const setSearchParams = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        setSearchParams({ search: debouncedSearch, page: 1 });
    }, [debouncedSearch]);

    // Fetch individual selected category/type details for InfiniteSelect display label
    const { data: selectedCategory } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.CATEGORIES_LIST, 'detail', productCategoryId],
        queryFn: () => getCategoryById(productCategoryId),
        enabled: !!productCategoryId
    });

    const { data: selectedType } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.TYPES_LIST, 'detail', productTypeId],
        queryFn: () => getProductTypeById(productTypeId),
        enabled: !!productTypeId
    });

    // Fetch Products catalog
    const { data: productsData, isLoading: isProductsLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST, { page, pageSize, search, status, productCategoryId, productTypeId }],
        queryFn: () =>
            getProductsList({
                page,
                limit: pageSize,
                search,
                status,
                productCategoryId: productCategoryId || undefined,
                productTypeId: productTypeId || undefined
            })
    });

    // Filter products client side based on recipe status
    const filteredProducts = React.useMemo(() => {
        if (!productsData?.data) return [];
        return productsData.data.filter((product: IProduct) => {
            const hasConfigured = product.variants.some((v) => !!v.recipe);
            const hasUnconfigured = product.variants.some((v) => !v.recipe);

            if (recipeStatus === 'configured') return hasConfigured;
            if (recipeStatus === 'not_configured') return hasUnconfigured;
            return true;
        });
    }, [productsData, recipeStatus]);

    const handleOpenRecipe = (variant: IProductVariant, productName: string) => {
        setSelectedVariant(variant);
        setSelectedProductName(productName);
        setRecipeOpen(true);
    };

    const handleClearFilters = () => {
        setLocalSearch('');
        setSearchParams({
            page: 1,
            search: '',
            productCategoryId: '',
            productTypeId: '',
            recipeStatus: 'all'
        });
    };

    const hasActiveFilters = !!search || !!productCategoryId || !!productTypeId || recipeStatus !== 'all';

    // Table Columns definition
    const columns = React.useMemo<ColumnDef<IProduct>[]>(
        () => [
            {
                id: 'product',
                header: 'Product',
                cell: ({ row }) => {
                    const product = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            <div className="size-12 rounded-lg overflow-hidden border border-border bg-muted/50 shrink-0 flex items-center justify-center">
                                {product.photo ? (
                                    <img
                                        src={product.photo.startsWith('http') ? product.photo : getFileUrl(product.photo)}
                                        alt={product.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <Package className="size-6 text-muted-foreground stroke-[1.5]" />
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-foreground/90 leading-tight truncate">{product.name}</span>
                                <span className="text-xs text-muted-foreground font-medium mt-1 truncate max-w-[250px]">
                                    {product.description || 'No description'}
                                </span>
                            </div>
                        </div>
                    );
                }
            },
            {
                id: 'category',
                header: 'Category / Type',
                cell: ({ row }) => {
                    const product = row.original;
                    return (
                        <div className="flex flex-col gap-1 items-start">
                            <Badge
                                variant="outline"
                                className="text-xs font-semibold bg-background py-0.5 px-1.5 leading-none shrink-0 border-border/80"
                            >
                                {product.category?.name || 'Unassigned'}
                            </Badge>
                            <span className="text-xs text-muted-foreground/80 font-semibold pl-1.5">Type: {product.type?.name || 'Unassigned'}</span>
                        </div>
                    );
                }
            },
            {
                id: 'variants',
                header: 'Variants & Recipe Specifications',
                cell: ({ row }) => {
                    const product = row.original;
                    return (
                        <div className="flex flex-col gap-2 min-w-[320px]">
                            {product.variants.map((v) => {
                                const attrString = v.attributes.map((a) => a.attributeValue.value).join(', ');
                                const hasRecipe = !!v.recipe;
                                return (
                                    <div
                                        key={v.id}
                                        className="flex items-center justify-between gap-4 p-2 rounded-lg border border-border/40 bg-background/50 hover:bg-background/80 transition-colors"
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-semibold text-foreground/90 truncate">
                                                {attrString || 'Standard / No Modifiers'}
                                            </span>
                                            <span className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5">
                                                SKU: {v.sku || '—'} | ₱{v.price.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge
                                                className={`text-[10px] font-semibold px-2 py-0.5 flex items-center gap-1 w-fit ${
                                                    hasRecipe
                                                        ? 'bg-emerald-100/95 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40'
                                                        : 'bg-amber-100/95 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40'
                                                }`}
                                            >
                                                <ChefHat className="size-3" />
                                                {hasRecipe ? 'Configured' : 'Not Configured'}
                                            </Badge>
                                            <RequirePermission module="Products Management" action="read">
                                                <Button
                                                    variant="outline"
                                                    size="xs"
                                                    className="h-7 text-xs font-semibold gap-1 px-2 border-border/70 hover:bg-muted"
                                                    onClick={() => handleOpenRecipe(v, product.name)}
                                                >
                                                    {hasRecipe ? 'Edit Recipe' : 'Configure'}
                                                </Button>
                                            </RequirePermission>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                }
            }
        ],
        []
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <ChefHat className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Recipes Configuration</h1>
                        <p className="text-xs text-muted-foreground">
                            Map product drink variants and sizes to raw stock ingredients and configure exact measurements for automatic inventory
                            deduction.
                        </p>
                    </div>
                </div>
            </div>

            {/* List Datatable */}
            <DataTable
                columns={columns as ColumnDef<any, any>[]}
                data={filteredProducts}
                pageCount={productsData?.meta.pageCount || 1}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(idx, size) => setSearchParams({ page: idx + 1, pageSize: size })}
                sorting={sorting}
                onSortingChange={setSorting}
                showColumnVisibilityToggle={true}
                isLoading={isProductsLoading}
                filterContent={
                    <>
                        {/* Search field */}
                        <Input
                            placeholder="Search variant name or SKU..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="h-9 w-full sm:w-[220px] bg-background/50"
                        />

                        {/* Category filter */}
                        <InfiniteSelect<ICategory>
                            queryKey={[QUERY_KEY.PRODUCT_SETTINGS.CATEGORIES_LIST, { status: 'active' }]}
                            fetchFn={({ pageParam, query }) =>
                                getCategoriesList({ page: pageParam as number, limit: 10, search: query, status: 'active' })
                            }
                            getItems={(resPage) => resPage.data}
                            getNextPageParam={(lastPage) => (lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined)}
                            initialPageParam={1}
                            value={productCategoryId || undefined}
                            onChange={(val) => setSearchParams({ productCategoryId: val || '', page: 1 })}
                            getOptionValue={(cat) => cat.id}
                            getOptionLabel={(cat) => cat.name}
                            selectedItem={selectedCategory}
                            placeholder="All Categories"
                            searchPlaceholder="Search categories..."
                            className="h-9 w-full sm:w-[180px] bg-background/50 text-xs"
                        />

                        {/* Product Type filter */}
                        <InfiniteSelect<IProductType>
                            queryKey={[QUERY_KEY.PRODUCT_SETTINGS.TYPES_LIST, { status: 'active' }]}
                            fetchFn={({ pageParam, query }) =>
                                getProductTypesList({ page: pageParam as number, limit: 10, search: query, status: 'active' })
                            }
                            getItems={(resPage) => resPage.data}
                            getNextPageParam={(lastPage) => (lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined)}
                            initialPageParam={1}
                            value={productTypeId || undefined}
                            onChange={(val) => setSearchParams({ productTypeId: val || '', page: 1 })}
                            getOptionValue={(type) => type.id}
                            getOptionLabel={(type) => type.name}
                            selectedItem={selectedType}
                            placeholder="All Types"
                            searchPlaceholder="Search product types..."
                            className="h-9 w-full sm:w-[180px] bg-background/50 text-xs"
                        />

                        {/* Recipe Status Filter */}
                        <Select value={recipeStatus} onValueChange={(val) => setSearchParams({ recipeStatus: val, page: 1 })}>
                            <SelectTrigger className="h-9 w-full sm:w-[160px] bg-background/50 text-xs">
                                <SelectValue placeholder="All Recipe Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">
                                    All Recipe Statuses
                                </SelectItem>
                                <SelectItem value="configured" className="text-xs">
                                    Configured
                                </SelectItem>
                                <SelectItem value="not_configured" className="text-xs">
                                    Not Configured
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-2 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                onClick={handleClearFilters}
                            >
                                <RotateCcw className="size-3" />
                                Clear
                            </Button>
                        )}
                    </>
                }
            />

            {/* Recipe Dialog */}
            <RecipeDialog open={recipeOpen} onOpenChange={setRecipeOpen} variant={selectedVariant} productName={selectedProductName} />
        </div>
    );
}
