import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Edit, Trash2, Eye, Users, Calendar, Phone, RotateCcw } from 'lucide-react';
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

import { getCustomers, restoreCustomer } from '#/api/customer.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { ICustomerResponse } from '#/feature/customer/customer.types.ts';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Avatar, AvatarFallback } from '#/components/ui/avatar.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';

import CustomerDeleteDialog from './components/customer-delete-dialog.tsx';

export default function CustomerManagementPage() {
    const navigate = useNavigate({ from: '/admin/customers/' });
    const queryClient = useQueryClient();
    const { page = 1, pageSize = 10, search = '', status = 'active' } = useSearch({ from: '/admin/customers/' });

    const restoreMutation = useMutation({
        mutationFn: restoreCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMERS_LIST] });
            toast.success('Customer profile successfully restored');
        },
        onError: (err) => {
            toast.error('Failed to restore customer profile', {
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
        if (debouncedSearch !== (search || '')) {
            setSearchParams({ search: debouncedSearch, page: 1 });
        }
    }, [debouncedSearch, search]);

    // Delete Confirmation states
    const [customerToDelete, setCustomerToDelete] = React.useState<ICustomerResponse | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

    // 1. Fetch Customers List
    const { data: customersData, isLoading: isCustomersLoading } = useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMERS_LIST, { page, pageSize, search, status }],
        queryFn: () =>
            getCustomers({
                page,
                limit: pageSize,
                search,
                status
            })
    });

    const handleOpenCreate = () => {
        navigate({ to: '/admin/customers/create' });
    };

    const handleOpenEdit = (customer: ICustomerResponse) => {
        navigate({ to: '/admin/customers/$slug', params: { slug: customer.user.username || customer.id } });
    };

    const handleOpenView = (customer: ICustomerResponse) => {
        navigate({ to: '/admin/customers/$slug', params: { slug: customer.user.username || customer.id } });
    };

    const handleOpenDelete = (customer: ICustomerResponse) => {
        setCustomerToDelete(customer);
        setIsDeleteOpen(true);
    };

    // Table Columns definition
    const columns = React.useMemo<ColumnDef<ICustomerResponse>[]>(
        () => [
            {
                id: 'Name',
                accessorFn: (row) => `${row.user.firstName} ${row.user.lastName}`,
                header: 'Customer Profile',
                cell: ({ row }) => {
                    const initials = `${row.original.user.firstName[0] || ''}${row.original.user.lastName[0] || ''}`.toUpperCase();
                    return (
                        <div className="flex items-center gap-3">
                            <Avatar className="size-9 border border-border/80 shadow-3xs">
                                <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary shadow-inner">
                                    {initials || 'CU'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-foreground/90 leading-tight truncate">
                                    {row.original.user.firstName} {row.original.user.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium truncate">
                                    @{row.original.user.username} • {row.original.user.email}
                                </span>
                            </div>
                        </div>
                    );
                }
            },
            {
                accessorKey: 'phoneNumber',
                header: 'Phone Number',
                cell: ({ row }) => (
                    <span className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
                        <Phone className="size-3.5 text-muted-foreground" />
                        {row.original.user.phoneNumber || '—'}
                    </span>
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
                id: 'status',
                header: 'Account Status',
                cell: ({ row }) => {
                    const isArchived = !!row.original.deletedAt;
                    return (
                        <Badge
                            variant="outline"
                            className={`text-xs font-semibold capitalize bg-background py-0.5 px-2 ${isArchived ? 'text-destructive border-destructive/20 bg-destructive/5' : 'text-emerald-600 border-emerald-500/20 bg-emerald-50/20'}`}
                        >
                            {isArchived ? 'Archived' : 'Active'}
                        </Badge>
                    );
                }
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        {row.original.deletedAt ? (
                            <RequirePermission module="Customers Management" action="delete">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-emerald-600 transition-colors rounded-lg border border-transparent hover:bg-muted"
                                            title="Restore Profile"
                                            disabled={restoreMutation.isPending}
                                        >
                                            <RotateCcw className="size-4" />
                                            <span className="sr-only">Restore Customer</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2 font-bold text-foreground">
                                                <RotateCcw className="size-5 text-emerald-600" />
                                                Restore Customer Account
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to restore the customer account for{' '}
                                                <strong>
                                                    "{row.original.user.firstName} {row.original.user.lastName}" (@{row.original.user.username})
                                                </strong>
                                                ? This will reactivate their profile, allowing them to place orders and participate in POS/loyalty
                                                flows.
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
                                <RequirePermission module="Customers Management" action="read">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-primary transition-colors rounded-lg border border-transparent hover:bg-muted"
                                        onClick={() => handleOpenView(row.original)}
                                        title="View Details & Cart"
                                    >
                                        <Eye className="size-4" />
                                        <span className="sr-only">View Customer</span>
                                    </Button>
                                </RequirePermission>
                                <RequirePermission module="Customers Management" action="update">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-primary transition-colors rounded-lg border border-transparent hover:bg-muted"
                                        onClick={() => handleOpenEdit(row.original)}
                                        title="Edit Profile"
                                    >
                                        <Edit className="size-4" />
                                        <span className="sr-only">Edit Customer</span>
                                    </Button>
                                </RequirePermission>
                                <RequirePermission module="Customers Management" action="delete">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-destructive transition-colors rounded-lg border border-transparent hover:bg-muted"
                                        onClick={() => handleOpenDelete(row.original)}
                                        title="Archive Profile"
                                    >
                                        <Trash2 className="size-4" />
                                        <span className="sr-only">Archive Customer</span>
                                    </Button>
                                </RequirePermission>
                            </>
                        )}
                    </div>
                )
            }
        ],
        []
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Header section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shadow-3xs">
                        <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Customer Profiles Directory</h1>
                        <p className="text-xs text-muted-foreground">
                            Manage coffee shop customer profiles, credentials, contact information, and review active shopping carts.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <RequirePermission module="Customers Management" action="create">
                        <Button onClick={handleOpenCreate} className="h-9 gap-1.5 shadow-sm self-start sm:self-auto">
                            <Plus className="size-4" />
                            Add Customer
                        </Button>
                    </RequirePermission>
                </div>
            </div>

            {/* List Datatable */}
            <DataTable
                columns={columns}
                data={customersData?.data || []}
                pageCount={customersData?.meta.pageCount || 1}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(idx, size) => setSearchParams({ page: idx + 1, pageSize: size })}
                sorting={sorting}
                onSortingChange={setSorting}
                showColumnVisibilityToggle={true}
                isLoading={isCustomersLoading}
                filterContent={
                    <>
                        {/* Search field */}
                        <Input
                            placeholder="Search customers..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="h-9 w-full sm:w-[250px] bg-background/50"
                        />

                        {/* Status Filter */}
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

            {/* DELETE CONFIRMATION DIALOG */}
            {isDeleteOpen && customerToDelete && <CustomerDeleteDialog open={true} onOpenChange={setIsDeleteOpen} customer={customerToDelete} />}
        </div>
    );
}
