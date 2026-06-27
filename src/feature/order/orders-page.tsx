import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { ShoppingCart, Eye, Calendar, Search, X, Store, Laptop, User, Plus, Printer, FileText, Download, Volume2, Pencil } from 'lucide-react';
import { format } from 'date-fns';

import { Route } from '#/routes/admin/orders/index.tsx';
import { getOrders } from '#/api/orders.api.ts';
import { getFrontendReference } from '#/utils/helper';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IOrder, TOrderStatus, TOrderSource } from './order.types';
import DataTable from '#/components/data-table/data-table.tsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu.tsx';
import { printReceiptHtml, openReceiptPdf, downloadReceiptPdf } from '#/utils/receipt.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { CopyButton } from '#/components/ui/copy-button.tsx';
import { useAuth } from '#/context/AuthContext.tsx';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import { appModules, appPermissions } from '#/constants/rbac.ts';

export default function OrdersPage() {
    const { user } = useAuth();
    const permissions = React.useMemo(() => getUserPermissions(user), [user]);
    const canUpdateOrders = React.useMemo(() => hasPermission(permissions, appModules.ORDERS_MANAGEMENT, appPermissions.UPDATE), [permissions]);

    const navigate = useNavigate({ from: '/admin/orders/' });
    const globalNavigate = useNavigate();
    const { page, pageSize, search, status, orderType, orderSource } = Route.useSearch();

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    const setSearchParams = (updates: Partial<ReturnType<typeof Route.useSearch>>) => {
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

    // Query: Orders List
    const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST, { page, pageSize, search, status, orderType, orderSource }],
        queryFn: () =>
            getOrders({
                page,
                limit: pageSize,
                search,
                status: status || undefined,
                orderType: orderType || undefined,
                orderSource: orderSource || undefined
            })
    });

    const handleClearFilters = () => {
        setLocalSearch('');
        setSearchParams({
            page: 1,
            search: '',
            status: '',
            orderType: '',
            orderSource: ''
        });
    };

    const getStatusBadgeClass = (s: TOrderStatus) => {
        switch (s) {
            case 'PENDING':
                return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40';
            case 'PREPARING':
                return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40';
            case 'READY':
                return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/40';
            case 'COMPLETED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40';
            case 'CANCELLED':
                return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400';
        }
    };

    const getSourceIcon = (src: TOrderSource) => {
        switch (src) {
            case 'POS':
                return <Store className="size-3.5 shrink-0" />;
            case 'MOBILE_APP':
            case 'WEBSITE':
                return <Laptop className="size-3.5 shrink-0" />;
            default:
                return <ShoppingCart className="size-3.5 shrink-0" />;
        }
    };

    const columns = React.useMemo<ColumnDef<IOrder>[]>(
        () => [
            {
                accessorKey: 'queueNumber',
                header: 'Order IDs',
                cell: ({ row }) => {
                    const receiptId = row.original.id.slice(0, 8).toUpperCase();
                    const referenceNumber = row.original.referenceNumber || getFrontendReference(row.original.createdAt, row.original.queueNumber);
                    return (
                        <div className="flex flex-col gap-0.5 min-w-[100px]">
                            <div className="flex items-center gap-1">
                                <span className="font-mono text-sm font-bold text-foreground">{row.original.queueNumber}</span>
                                <CopyButton value={row.original.queueNumber} description={`Queue number #${row.original.queueNumber} copied`} />
                            </div>
                            <div className="flex flex-col text-muted-foreground font-mono leading-none">
                                <span className="flex items-center gap-0.5">
                                    <span className="font-semibold text-xs text-foreground/70">Ref:</span> {referenceNumber}
                                    <CopyButton
                                        value={referenceNumber}
                                        className="h-3 w-3 p-0"
                                        description={`Reference number ${referenceNumber} copied`}
                                    />
                                </span>
                                <span className="flex items-center gap-0.5">
                                    <span className="font-semibold text-xs text-foreground/70">ID:</span> {receiptId}
                                    <CopyButton value={receiptId} className="h-3 w-3 p-0" description={`Receipt ID ${receiptId} copied`} />
                                </span>
                            </div>
                        </div>
                    );
                }
            },
            {
                accessorKey: 'customerName',
                header: 'Customer Details',
                cell: ({ row }) => (
                    <div className="flex flex-col gap-0.5 min-w-[120px]">
                        <span className="font-semibold text-foreground/90 leading-tight">{row.original.customerName || 'Walk-in Customer'}</span>
                        {row.original.customerId && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                                <User className="size-3" /> Member Profile
                            </span>
                        )}
                        {row.original.buzzerId && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold mt-0.5">
                                <Volume2 className="size-3 animate-pulse text-amber-500" /> Buzzer: #{row.original.buzzerId}
                            </span>
                        )}
                    </div>
                )
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <Badge variant="outline" className={`text-xs font-semibold py-0.5 px-2 capitalize ${getStatusBadgeClass(row.original.status)}`}>
                        {row.original.status.toLowerCase()}
                    </Badge>
                )
            },
            {
                accessorKey: 'netTotal',
                header: 'Net Total',
                cell: ({ row }) => (
                    <span className="font-bold text-foreground/90">
                        ₱{row.original.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                )
            },
            {
                id: 'typeAndSource',
                header: 'Type & Source',
                cell: ({ row }) => (
                    <div className="flex flex-wrap gap-1 items-center">
                        <Badge
                            variant="secondary"
                            className="text-xs font-semibold  py-0 px-1.5 uppercase bg-primary/5 text-primary border border-primary/10"
                        >
                            {row.original.orderType.replace('_', ' ')}
                        </Badge>
                        <Badge
                            variant="outline"
                            className="text-xs font-semibold py-0 px-1.5 gap-1 capitalize bg-background/50 border-border/70 text-muted-foreground"
                        >
                            {getSourceIcon(row.original.orderSource)}
                            {row.original.orderSource.toLowerCase().replace('_', ' ')}
                        </Badge>
                    </div>
                )
            },
            {
                id: 'Payment',
                header: 'Payment Details',
                cell: ({ row }) => (
                    <div className="flex flex-wrap gap-1 items-center">
                        {row.original.payments?.map((payment) => (
                            <Badge
                                key={payment.id}
                                variant="secondary"
                                className="text-xs font-semibold  py-0 px-1.5 uppercase bg-primary/5 text-primary border border-primary/10"
                            >
                                {payment.paymentMethod.replace('_', ' ')}
                                {payment.amount}
                                {payment.paymentStatus}
                            </Badge>
                        ))}
                    </div>
                )
            },
            {
                accessorKey: 'createdAt',
                header: 'Placed At',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        {format(new Date(row.original.createdAt), 'MMM dd, yyyy hh:mm a')}
                    </span>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => globalNavigate({ to: `/admin/orders/${row.original.id}` })}
                            title="Inspect details"
                        >
                            <Eye className="size-4" />
                            <span className="sr-only">Inspect details</span>
                        </Button>
                        {canUpdateOrders && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                onClick={() => globalNavigate({ to: `/admin/orders/${row.original.id}/edit` })}
                                title="Edit order"
                            >
                                <Pencil className="size-4" />
                                <span className="sr-only">Edit order</span>
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                    title="Receipt options"
                                >
                                    <Printer className="size-4" />
                                    <span className="sr-only">Receipt options</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="rounded-xl" align="end">
                                <DropdownMenuItem onClick={() => printReceiptHtml(row.original.id)} className="text-xs gap-2 font-semibold">
                                    <Printer className="size-3.5 text-muted-foreground" />
                                    Print Thermal (HTML)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openReceiptPdf(row.original.id)} className="text-xs gap-2 font-semibold">
                                    <FileText className="size-3.5 text-muted-foreground" />
                                    Open PDF Receipt
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => downloadReceiptPdf(row.original.id, row.original.queueNumber)}
                                    className="text-xs gap-2 font-semibold"
                                >
                                    <Download className="size-3.5 text-muted-foreground" />
                                    Download PDF Receipt
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            }
        ],
        [canUpdateOrders, globalNavigate]
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Orders Log Tracker</h1>
                        <p className="text-xs text-muted-foreground">
                            Audit trails and paginated history logs for registered cashier checkout sessions.
                        </p>
                    </div>
                </div>

                <RequirePermission module="Orders Management" action="create">
                    <Button onClick={() => globalNavigate({ to: '/admin/orders/create' })} className="h-9 gap-1.5 font-bold shadow-sm">
                        <Plus className="size-4" />
                        Create POS Order
                    </Button>
                </RequirePermission>
            </div>

            {/* Datatable */}
            <div className="space-y-4">
                <DataTable
                    columns={columns}
                    data={ordersData?.data || []}
                    pageCount={ordersData?.meta.pageCount || 1}
                    pageIndex={page - 1}
                    pageSize={pageSize}
                    onPaginationChange={(idx, size) => setSearchParams({ page: idx + 1, pageSize: size })}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={isOrdersLoading}
                    showColumnVisibilityToggle={true}
                    filterContent={
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-[220px]">
                                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search queue number or customer..."
                                    value={localSearch}
                                    onChange={(e) => setLocalSearch(e.target.value)}
                                    className="h-9 pl-8.5 bg-background/50 text-xs"
                                />
                            </div>

                            <Select value={status || 'all'} onValueChange={(val) => setSearchParams({ status: val === 'all' ? '' : val, page: 1 })}>
                                <SelectTrigger className="h-9 min-w-[130px] bg-background/50 text-xs capitalize">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">
                                        All Statuses
                                    </SelectItem>
                                    <SelectItem value="PENDING" className="text-xs">
                                        Pending
                                    </SelectItem>
                                    <SelectItem value="PREPARING" className="text-xs">
                                        Preparing
                                    </SelectItem>
                                    <SelectItem value="READY" className="text-xs">
                                        Ready
                                    </SelectItem>
                                    <SelectItem value="COMPLETED" className="text-xs">
                                        Completed
                                    </SelectItem>
                                    <SelectItem value="CANCELLED" className="text-xs">
                                        Cancelled
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={orderType || 'all'}
                                onValueChange={(val) => setSearchParams({ orderType: val === 'all' ? '' : val, page: 1 })}
                            >
                                <SelectTrigger className="h-9 min-w-[130px] bg-background/50 text-xs capitalize">
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">
                                        All Types
                                    </SelectItem>
                                    <SelectItem value="DINE_IN" className="text-xs">
                                        Dine In
                                    </SelectItem>
                                    <SelectItem value="TAKE_OUT" className="text-xs">
                                        Take Out
                                    </SelectItem>
                                    <SelectItem value="DELIVERY" className="text-xs">
                                        Delivery
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={orderSource || 'all'}
                                onValueChange={(val) => setSearchParams({ orderSource: val === 'all' ? '' : val, page: 1 })}
                            >
                                <SelectTrigger className="h-9 min-w-[130px] bg-background/50 text-xs capitalize">
                                    <SelectValue placeholder="All Sources" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">
                                        All Sources
                                    </SelectItem>
                                    <SelectItem value="POS" className="text-xs">
                                        POS Terminal
                                    </SelectItem>
                                    <SelectItem value="MOBILE_APP" className="text-xs">
                                        Mobile App
                                    </SelectItem>
                                    <SelectItem value="WEBSITE" className="text-xs">
                                        Website
                                    </SelectItem>
                                    <SelectItem value="DELIVERY_PARTNER" className="text-xs">
                                        Delivery Partner
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {(search || status || orderType || orderSource) && (
                                <Button variant="ghost" onClick={handleClearFilters} className="h-9 text-xs px-2.5 gap-1.5">
                                    <X className="size-3.5" /> Clear Filters
                                </Button>
                            )}
                        </div>
                    }
                />
            </div>
        </div>
    );
}
