import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Edit, Trash2, Eye, Truck, User, Phone, MapPin, Calendar, RotateCcw } from 'lucide-react';
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

import { Route } from '#/routes/admin/suppliers.tsx';
import { getSuppliersList, restoreSupplier } from '#/api/suppliers.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { ISupplierListItem } from './suppliers.types';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';

import SupplierCreateDialog from './components/supplier-create-dialog.tsx';
import SupplierEditDialog from './components/supplier-edit-dialog.tsx';
import SupplierViewDialog from './components/supplier-view-dialog.tsx';
import SupplierDeleteDialog from './components/supplier-delete-dialog.tsx';

export default function SuppliersPage() {
    const navigate = useNavigate({ from: '/admin/suppliers' });
    const queryClient = useQueryClient();
    const { page, pageSize, search, status } = Route.useSearch();

    const restoreMutation = useMutation({
        mutationFn: restoreSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.SUPPLIERS.SUPPLIERS_LIST] });
            toast.success('Supplier profile successfully restored');
        },
        onError: (err) => {
            toast.error('Failed to restore supplier profile', {
                description: getErrorMessage(err)
            });
        }
    });

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
    const [selectedSupplier, setSelectedSupplier] = React.useState<ISupplierListItem | null>(null);

    // Delete Confirmation states
    const [supplierToDelete, setSupplierToDelete] = React.useState<ISupplierListItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

    // 1. Fetch Suppliers List
    const { data: suppliersData, isLoading: isSuppliersLoading } = useQuery({
        queryKey: [QUERY_KEY.SUPPLIERS.SUPPLIERS_LIST, { page, pageSize, search, status }],
        queryFn: () =>
            getSuppliersList({
                page,
                limit: pageSize,
                search,
                status
            })
    });

    const handleOpenCreate = () => {
        setSelectedSupplier(null);
        setActionType('create');
    };

    const handleOpenEdit = (supplier: ISupplierListItem) => {
        setSelectedSupplier(supplier);
        setActionType('edit');
    };

    const handleOpenView = (supplier: ISupplierListItem) => {
        setSelectedSupplier(supplier);
        setActionType('view');
    };

    const handleOpenDelete = (supplier: ISupplierListItem) => {
        setSupplierToDelete(supplier);
        setIsDeleteOpen(true);
    };

    // Table Columns definition
    const columns = React.useMemo<ColumnDef<ISupplierListItem>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Supplier Name',
                cell: ({ row }) => (
                    <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground/90 leading-tight">{row.original.name}</span>
                        {row.original.address && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="size-2.5 inline-block shrink-0" />
                                {row.original.address}
                            </span>
                        )}
                    </div>
                )
            },
            {
                accessorKey: 'contactPerson',
                header: 'Contact Person',
                cell: ({ row }) => (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                            <User className="size-3 text-muted-foreground" />
                            {row.original.contactPerson || '—'}
                        </span>
                    </div>
                )
            },
            {
                accessorKey: 'contactNumber',
                header: 'Contact Number',
                cell: ({ row }) => (
                    <span className="text-xs font-medium text-foreground/80 flex items-center gap-1">
                        <Phone className="size-3 text-muted-foreground" />
                        {row.original.contactNumber || '—'}
                    </span>
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
                        <RequirePermission module="Suppliers Management" action="read">
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
                        {status === 'archive' ? (
                            <RequirePermission module="Suppliers Management" action="delete">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-emerald-600 transition-colors"
                                            title="Restore Supplier"
                                            disabled={restoreMutation.isPending}
                                        >
                                            <RotateCcw className="size-4" />
                                            <span className="sr-only">Restore Supplier</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2 font-bold text-foreground">
                                                <RotateCcw className="size-5 text-emerald-600" />
                                                Restore Supplier Profile
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to restore the supplier profile for <strong>"{row.original.name}"</strong>? This
                                                will restore their active listing, allowing staff to select them for purchase orders and delivery
                                                logs.
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
                                <RequirePermission module="Suppliers Management" action="update">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                        onClick={() => handleOpenEdit(row.original)}
                                    >
                                        <Edit className="size-4" />
                                        <span className="sr-only">Edit Supplier</span>
                                    </Button>
                                </RequirePermission>
                                <RequirePermission module="Suppliers Management" action="delete">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                        onClick={() => handleOpenDelete(row.original)}
                                    >
                                        <Trash2 className="size-4" />
                                        <span className="sr-only">Archive Supplier</span>
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
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                        <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground/90 leading-tight">Suppliers Directory</h2>
                        <p className="text-xs text-muted-foreground">
                            Configure supplier profiles, contact details, address records, and procurement channels.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <RequirePermission module="Suppliers Management" action="create">
                        <Button onClick={handleOpenCreate} className="h-9 gap-1.5 shadow-sm">
                            <Plus className="size-4" />
                            Create Supplier
                        </Button>
                    </RequirePermission>
                </div>
            </div>

            {/* Main Suppliers Table */}
            <DataTable
                columns={columns}
                data={suppliersData?.data || []}
                pageCount={suppliersData?.meta.pageCount || 1}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(idx, size) => setSearchParams({ page: idx + 1, pageSize: size })}
                sorting={sorting}
                onSortingChange={setSorting}
                showColumnVisibilityToggle={true}
                isLoading={isSuppliersLoading}
                filterContent={
                    <>
                        <Input
                            placeholder="Search suppliers..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="h-9 w-full sm:w-[250px] bg-background/50"
                        />
                        <Select value={status} onValueChange={(val) => setSearchParams({ status: val as 'active' | 'archive', page: 1 })}>
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
            <SupplierCreateDialog open={actionType === 'create'} onOpenChange={(val) => !val && setActionType(null)} />

            {/* EDIT DIALOG */}
            <SupplierEditDialog open={actionType === 'edit'} onOpenChange={(val) => !val && setActionType(null)} supplier={selectedSupplier} />

            {/* VIEW DIALOG */}
            <SupplierViewDialog open={actionType === 'view'} onOpenChange={(val) => !val && setActionType(null)} supplier={selectedSupplier} />

            {/* DELETE CONFIRMATION DIALOG */}
            <SupplierDeleteDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} supplier={supplierToDelete} />
        </div>
    );
}
