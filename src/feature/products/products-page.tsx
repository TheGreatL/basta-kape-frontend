import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Edit, Trash2, Eye, Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';

import { Route } from '#/routes/admin/products.tsx';
import { getProductsList } from '#/api/products.api.ts';
import { getCategoriesList, getProductTypesList, getCategoryById, getProductTypeById } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IProduct } from './products.types';
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

import ProductCreateDialog from './components/product-create-dialog.tsx';
import ProductEditDialog from './components/product-edit-dialog.tsx';
import ProductViewDialog from './components/product-view-dialog.tsx';
import ProductDeleteDialog from './components/product-delete-dialog.tsx';

export default function ProductsPage() {
    const navigate = useNavigate({ from: '/admin/products' });
    const { page, pageSize, search, status, productCategoryId, productTypeId } = Route.useSearch();

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

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

    // Dialog States
    const [actionType, setActionType] = React.useState<'create' | 'edit' | 'view' | null>(null);
    const [selectedProduct, setSelectedProduct] = React.useState<IProduct | null>(null);

    // Delete Confirmation states
    const [productToDelete, setProductToDelete] = React.useState<IProduct | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

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

    // 2. Fetch Products Catalog List
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

    const handleOpenCreate = () => {
        setSelectedProduct(null);
        setActionType('create');
    };

    const handleOpenEdit = (product: IProduct) => {
        setSelectedProduct(product);
        setActionType('edit');
    };

    const handleOpenView = (product: IProduct) => {
        setSelectedProduct(product);
        setActionType('view');
    };

    const handleOpenDelete = (product: IProduct) => {
        setProductToDelete(product);
        setIsDeleteOpen(true);
    };

    // Calculate price range text
    const getPriceRange = (product: IProduct) => {
        if (product.variants.length === 0) {
            return <span className="text-muted-foreground italic font-normal">No configured variants</span>;
        }
        const prices = product.variants.map((v) => v.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        if (minPrice === maxPrice) {
            return <span className="font-semibold text-foreground/80">₱{minPrice.toFixed(2)}</span>;
        }
        return (
            <span className="font-semibold text-foreground/80">
                ₱{minPrice.toFixed(2)} – ₱{maxPrice.toFixed(2)}
            </span>
        );
    };
    console.log(productsData);
    // Table Columns definition
    const columns = React.useMemo<ColumnDef<IProduct>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Product Info',
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        <div className="size-11 rounded-lg overflow-hidden border border-border/80 bg-muted shrink-0 flex items-center justify-center">
                            {row.original.photo ? (
                                <img
                                    src={row.original.photo.startsWith('http') ? row.original.photo : getFileUrl(row.original.photo)}
                                    alt={row.original.name}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <Package className="size-5 text-muted-foreground stroke-[1.5]" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground/90 leading-tight truncate">{row.original.name}</span>
                            <span className="text-xs text-muted-foreground font-normal line-clamp-1 max-w-xs pt-0.5">
                                {row.original.description || '—'}
                            </span>
                        </div>
                    </div>
                )
            },
            {
                accessorKey: 'category',
                header: 'Category',
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-xs font-semibold bg-background py-0.5 px-2">
                        {row.original.category?.name || '—'}
                    </Badge>
                )
            },
            {
                accessorKey: 'type',
                header: 'Product Type',
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-xs font-semibold bg-background py-0.5 px-2">
                        {row.original.type?.name || '—'}
                    </Badge>
                )
            },
            {
                id: 'variantsPrice',
                header: 'Pricing & Variants',
                cell: ({ row }) => (
                    <div className="flex flex-col gap-0.5">
                        {getPriceRange(row.original)}
                        {row.original.variants.length > 0 && (
                            <span className="text-xs text-muted-foreground font-medium">
                                {row.original.variants.length} variant{row.original.variants.length === 1 ? '' : 's'} configured
                            </span>
                        )}
                    </div>
                )
            },
            {
                accessorKey: 'createdAt',
                header: 'Date Configured',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        {format(new Date(row.original.createdAt), 'MMM d, yyyy')}
                    </span>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <RequirePermission module="Products Management" action="read">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                onClick={() => handleOpenView(row.original)}
                            >
                                <Eye className="size-4" />
                                <span className="sr-only">View Details / Variants</span>
                            </Button>
                        </RequirePermission>
                        {status !== 'archive' && (
                            <>
                                <RequirePermission module="Products Management" action="update">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                        onClick={() => handleOpenEdit(row.original)}
                                    >
                                        <Edit className="size-4" />
                                        <span className="sr-only">Edit Product</span>
                                    </Button>
                                </RequirePermission>
                                <RequirePermission module="Products Management" action="delete">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                        onClick={() => handleOpenDelete(row.original)}
                                    >
                                        <Trash2 className="size-4" />
                                        <span className="sr-only">Archive Product</span>
                                    </Button>
                                </RequirePermission>
                            </>
                        )}
                    </div>
                )
            }
        ],
        [status]
    );

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Menu Products Directory</h1>
                        <p className="text-xs text-muted-foreground">
                            Configure coffee recipes, beverages profiles, pricing modifiers, and custom attributes.
                        </p>
                    </div>
                </div>

                <RequirePermission module="Products Management" action="create">
                    <Button onClick={handleOpenCreate} className="h-9 gap-1.5 shadow-sm self-start sm:self-auto">
                        <Plus className="size-4" />
                        Add Product
                    </Button>
                </RequirePermission>
            </div>

            {/* List Datatable */}
            <DataTable
                columns={columns}
                data={productsData?.data || []}
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
                            placeholder="Search products..."
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

                        {/* Status Filter */}
                        <Select value={status} onValueChange={(val) => setSearchParams({ status: val as 'active' | 'archive', page: 1 })}>
                            <SelectTrigger className="h-9 min-w-[120px] bg-background/50 capitalize">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="archive">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                }
            />

            {/* CREATE DIALOG */}
            <ProductCreateDialog open={actionType === 'create'} onOpenChange={(val) => !val && setActionType(null)} />

            {/* EDIT DIALOG */}
            <ProductEditDialog open={actionType === 'edit'} onOpenChange={(val) => !val && setActionType(null)} product={selectedProduct} />

            {/* VIEW DIALOG */}
            <ProductViewDialog open={actionType === 'view'} onOpenChange={(val) => !val && setActionType(null)} product={selectedProduct} />

            {/* DELETE CONFIRMATION DIALOG */}
            <ProductDeleteDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} product={productToDelete} />
        </div>
    );
}
