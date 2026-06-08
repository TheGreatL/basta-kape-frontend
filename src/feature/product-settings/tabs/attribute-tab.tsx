import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Edit, Trash2, Eye, Sparkles, Calendar, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '#/components/ui/alert-dialog.tsx';

import { getAttributesList, restoreAttribute } from '#/api/product-settings.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { AttributeTabProps, IAttribute } from '../product-settings-types';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';

import AttributeCreateDialog from '../components/attribute-create-dialog.tsx';
import AttributeEditDialog from '../components/attribute-edit-dialog.tsx';
import AttributeViewDialog from '../components/attribute-view-dialog.tsx';
import AttributeDeleteDialog from '../components/attribute-delete-dialog.tsx';

export default function AttributeTab({ page, pageSize, search, status, onPaginationChange, onSearchChange, onStatusChange }: AttributeTabProps) {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const restoreMutation = useMutation({
        mutationFn: restoreAttribute,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTES_LIST] });
            toast.success('Attribute successfully restored');
        },
        onError: (err) => {
            toast.error('Failed to restore attribute', {
                description: getErrorMessage(err)
            });
        }
    });
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
    const [selectedAttribute, setSelectedAttribute] = React.useState<IAttribute | null>(null);

    // Delete Confirmation states
    const [attributeToDelete, setAttributeToDelete] = React.useState<IAttribute | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

    // Fetch Attributes
    const { data: attributesData, isLoading: isAttributesLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTES_LIST, { page, pageSize, search, status }],
        queryFn: () =>
            getAttributesList({
                page,
                limit: pageSize,
                search,
                status
            })
    });

    const handleOpenCreate = () => {
        setSelectedAttribute(null);
        setActionType('create');
    };

    const handleOpenEdit = (attribute: IAttribute) => {
        setSelectedAttribute(attribute);
        setActionType('edit');
    };

    const handleOpenView = (attribute: IAttribute) => {
        setSelectedAttribute(attribute);
        setActionType('view');
    };

    const handleOpenDelete = (attribute: IAttribute) => {
        setAttributeToDelete(attribute);
        setIsDeleteOpen(true);
    };

    const columns = React.useMemo<ColumnDef<IAttribute>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Option Name',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-muted-foreground shrink-0" />
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
                                <span className="sr-only">View Details / Values</span>
                            </Button>
                        </RequirePermission>
                        {status === 'archive' ? (
                            <RequirePermission module="Product Settings Management" action="delete">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-emerald-600 transition-colors"
                                            title="Restore Attribute"
                                            disabled={restoreMutation.isPending}
                                        >
                                            <RotateCcw className="size-4" />
                                            <span className="sr-only">Restore Attribute</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2 font-bold text-foreground">
                                                <RotateCcw className="size-5 text-emerald-600" />
                                                Restore Product Attribute
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to restore the product attribute option <strong>"{row.original.name}"</strong>?
                                                This will restore it to the active product configuration options.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => restoreMutation.mutate(row.original.id)}
                                                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                            >
                                                Confirm Restore
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </RequirePermission>
                        ) : (
                            <>
                                <RequirePermission module="Product Settings Management" action="update">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                        onClick={() => handleOpenEdit(row.original)}
                                    >
                                        <Edit className="size-4" />
                                        <span className="sr-only">Edit Attribute</span>
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
                                        <span className="sr-only">Archive Attribute</span>
                                    </Button>
                                </RequirePermission>
                            </>
                        )}
                    </div>
                )
            }
        ],
        [status, restoreMutation]
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-foreground/90 leading-tight">Product Attributes</h2>
                    <p className="text-xs text-muted-foreground">Configure custom options (e.g. Size, Milk Option) and assign modifiers.</p>
                </div>

                <div className="flex items-center gap-2">
                    <RequirePermission module="Product Settings Management" action="create">
                        <Button onClick={handleOpenCreate} className="h-9 gap-1.5 shadow-sm">
                            <Plus className="size-4" />
                            Create Attribute
                        </Button>
                    </RequirePermission>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={attributesData?.data || []}
                pageCount={attributesData?.meta.pageCount || 1}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(idx, size) => onPaginationChange(idx + 1, size)}
                sorting={sorting}
                onSortingChange={setSorting}
                showColumnVisibilityToggle={true}
                isLoading={isAttributesLoading}
                filterContent={
                    <>
                        <Input
                            placeholder="Search attributes..."
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
            <AttributeCreateDialog open={actionType === 'create'} onOpenChange={(val) => !val && setActionType(null)} />

            {/* EDIT DIALOG */}
            <AttributeEditDialog open={actionType === 'edit'} onOpenChange={(val) => !val && setActionType(null)} attribute={selectedAttribute} />

            {/* VIEW DIALOG */}
            <AttributeViewDialog open={actionType === 'view'} onOpenChange={(val) => !val && setActionType(null)} attribute={selectedAttribute} />

            {/* DELETE CONFIRMATION DIALOG */}
            <AttributeDeleteDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} attribute={attributeToDelete} />
        </div>
    );
}
