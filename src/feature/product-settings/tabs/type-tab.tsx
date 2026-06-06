import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Edit, Trash2, Eye, LayoutGrid, Calendar } from 'lucide-react';
import { format } from 'date-fns';

import { getProductTypesList } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { ProductTypeTabProps, IProductType } from '../product-settings-types';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';

import TypeCreateDialog from '../components/type-create-dialog.tsx';
import TypeEditDialog from '../components/type-edit-dialog.tsx';
import TypeViewDialog from '../components/type-view-dialog.tsx';
import TypeDeleteDialog from '../components/type-delete-dialog.tsx';

export default function TypeTab({ page, pageSize, search, status, onPaginationChange, onSearchChange, onStatusChange }: ProductTypeTabProps) {
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
    const [selectedType, setSelectedType] = React.useState<IProductType | null>(null);

    // Delete Confirmation states
    const [typeToDelete, setTypeToDelete] = React.useState<IProductType | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

    // Fetch Product Types
    const { data: typesData, isLoading: isTypesLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.TYPES_LIST, { page, pageSize, search, status }],
        queryFn: () =>
            getProductTypesList({
                page,
                limit: pageSize,
                search,
                status
            })
    });

    const handleOpenCreate = () => {
        setSelectedType(null);
        setActionType('create');
    };

    const handleOpenEdit = (type: IProductType) => {
        setSelectedType(type);
        setActionType('edit');
    };

    const handleOpenView = (type: IProductType) => {
        setSelectedType(type);
        setActionType('view');
    };

    const handleOpenDelete = (type: IProductType) => {
        setTypeToDelete(type);
        setIsDeleteOpen(true);
    };

    const columns = React.useMemo<ColumnDef<IProductType>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Type Name',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="size-4 text-muted-foreground shrink-0" />
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
                                        <span className="sr-only">Edit Product Type</span>
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
                                        <span className="sr-only">Archive Product Type</span>
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
                    <h2 className="text-lg font-bold text-foreground/90 leading-tight">Product Types</h2>
                    <p className="text-xs text-muted-foreground">
                        Define categories of products (e.g. Hot Beverage, Baked Goods) for preparation rules.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <RequirePermission module="Product Settings Management" action="create">
                        <Button onClick={handleOpenCreate} className="h-9 gap-1.5 shadow-sm">
                            <Plus className="size-4" />
                            Create Product Type
                        </Button>
                    </RequirePermission>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={typesData?.data || []}
                pageCount={typesData?.meta.pageCount || 1}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(idx, size) => onPaginationChange(idx + 1, size)}
                sorting={sorting}
                onSortingChange={setSorting}
                showColumnVisibilityToggle={true}
                isLoading={isTypesLoading}
                filterContent={
                    <>
                        <Input
                            placeholder="Search product types..."
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
            <TypeCreateDialog open={actionType === 'create'} onOpenChange={(val) => !val && setActionType(null)} />

            {/* EDIT DIALOG */}
            <TypeEditDialog open={actionType === 'edit'} onOpenChange={(val) => !val && setActionType(null)} productType={selectedType} />

            {/* VIEW DIALOG */}
            <TypeViewDialog open={actionType === 'view'} onOpenChange={(val) => !val && setActionType(null)} productType={selectedType} />

            {/* DELETE CONFIRMATION DIALOG */}
            <TypeDeleteDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} productType={typeToDelete} />
        </div>
    );
}
