import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Edit, Trash2, Eye, Folder, Calendar } from 'lucide-react';
import { format } from 'date-fns';

import { getCategoriesList } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { CategoryTabProps, ICategory } from '../product-settings-types';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';

import CategoryCreateDialog from '../components/category-create-dialog.tsx';
import CategoryEditDialog from '../components/category-edit-dialog.tsx';
import CategoryViewDialog from '../components/category-view-dialog.tsx';
import CategoryDeleteDialog from '../components/category-delete-dialog.tsx';

export default function CategoryTab({ page, pageSize, search, status, onPaginationChange, onSearchChange, onStatusChange }: CategoryTabProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        onSearchChange(debouncedSearch);
    }, [debouncedSearch, onSearchChange]);

    // Dialog States
    const [actionType, setActionType] = React.useState<'create' | 'edit' | 'view' | null>(null);
    const [selectedCategory, setSelectedCategory] = React.useState<ICategory | null>(null);

    // Delete Confirmation states
    const [categoryToDelete, setCategoryToDelete] = React.useState<ICategory | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

    // Fetch Categories
    const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.CATEGORIES_LIST, { page, pageSize, search, status }],
        queryFn: () =>
            getCategoriesList({
                page,
                limit: pageSize,
                search,
                status
            })
    });

    const handleOpenCreate = () => {
        setSelectedCategory(null);
        setActionType('create');
    };

    const handleOpenEdit = (category: ICategory) => {
        setSelectedCategory(category);
        setActionType('edit');
    };

    const handleOpenView = (category: ICategory) => {
        setSelectedCategory(category);
        setActionType('view');
    };

    const handleOpenDelete = (category: ICategory) => {
        setCategoryToDelete(category);
        setIsDeleteOpen(true);
    };

    const columns = React.useMemo<ColumnDef<ICategory>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Category Name',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Folder className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground/90">{row.original.name}</span>
                    </div>
                )
            },
            {
                accessorKey: 'description',
                header: 'Description',
                cell: ({ row }) => (
                    <span className="text-muted-foreground font-normal block max-w-sm truncate">{row.original.description || '—'}</span>
                )
            },
            {
                accessorKey: 'createdAt',
                header: 'Date Configured',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground" />
                        {format(new Date(row.original.createdAt), 'MMM d, yyyy')}
                    </span>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <RequirePermission module="Product Settings Management" action="read">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                onClick={() => handleOpenView(row.original)}
                            >
                                <Eye className="size-4" />
                                <span className="sr-only">View Details</span>
                            </Button>
                        </RequirePermission>
                        {status !== 'archive' && (
                            <>
                                <RequirePermission module="Product Settings Management" action="update">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                        onClick={() => handleOpenEdit(row.original)}
                                    >
                                        <Edit className="size-4" />
                                        <span className="sr-only">Edit Category</span>
                                    </Button>
                                </RequirePermission>
                                <RequirePermission module="Product Settings Management" action="delete">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                        onClick={() => handleOpenDelete(row.original)}
                                    >
                                        <Trash2 className="size-4" />
                                        <span className="sr-only">Archive Category</span>
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
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-foreground/90 leading-tight">Product Categories</h2>
                    <p className="text-xs text-muted-foreground">
                        Group your menu offerings into visual sections (e.g. Espresso, Milk Teas, Pastries).
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <RequirePermission module="Product Settings Management" action="create">
                        <Button onClick={handleOpenCreate} className="h-9 gap-1.5 shadow-sm">
                            <Plus className="size-4" />
                            Create Category
                        </Button>
                    </RequirePermission>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={categoriesData?.data || []}
                pageCount={categoriesData?.meta.pageCount || 1}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(idx, size) => onPaginationChange(idx + 1, size)}
                sorting={sorting}
                onSortingChange={setSorting}
                showColumnVisibilityToggle={true}
                isLoading={isCategoriesLoading}
                filterContent={
                    <>
                        <Input
                            placeholder="Search categories..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="h-9 w-full sm:w-[250px] bg-background/50"
                        />
                        <Select value={status} onValueChange={(val) => onStatusChange(val as 'active' | 'archive')}>
                            <SelectTrigger className="h-9 min-w-[130px] bg-background/50 hover:bg-background/80 capitalize">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent position="popper" align="start" className="capitalize">
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="archive">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                }
            />

            {/* CREATE DIALOG */}
            <CategoryCreateDialog open={actionType === 'create'} onOpenChange={(val) => !val && setActionType(null)} />

            {/* EDIT DIALOG */}
            <CategoryEditDialog open={actionType === 'edit'} onOpenChange={(val) => !val && setActionType(null)} category={selectedCategory} />

            {/* VIEW DIALOG */}
            <CategoryViewDialog open={actionType === 'view'} onOpenChange={(val) => !val && setActionType(null)} category={selectedCategory} />

            {/* DELETE CONFIRMATION DIALOG */}
            <CategoryDeleteDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} category={categoryToDelete} />
        </div>
    );
}
