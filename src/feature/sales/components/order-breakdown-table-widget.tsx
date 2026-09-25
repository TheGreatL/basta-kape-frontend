import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Search } from 'lucide-react';
import { format } from 'date-fns';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import { getFrontendReference } from '#/utils/helper';
import QUERY_KEY from '#/constants/query-keys.ts';
import DataTable from '#/components/data-table/data-table.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Button } from '#/components/ui/button.tsx';
import { cn } from '#/lib/utils.ts';
import type { TSalesOrder } from '../sales.types.ts';

interface OrderBreakdownTableWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

export default function OrderBreakdownTableWidget({ dateFrom, dateTo }: OrderBreakdownTableWidgetProps) {
    const globalNavigate = useNavigate();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [pageIndex, setPageIndex] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(10);

    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'orders', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'orders')
    });

    const orders = React.useMemo<TSalesOrder[]>(() => data?.orders || [], [data?.orders]);

    // Reset pagination when date filter or search query changes
    React.useEffect(() => {
        setPageIndex(0);
    }, [dateFrom, dateTo, searchQuery]);

    const filteredOrders = React.useMemo(() => {
        if (!searchQuery.trim()) return orders;
        const query = searchQuery.toLowerCase().trim();
        return orders.filter(
            (order) =>
                (order.queueNumber && order.queueNumber.toLowerCase().includes(query)) ||
                (order.customerName && order.customerName.toLowerCase().includes(query)) ||
                (order.orderType && order.orderType.toLowerCase().includes(query)) ||
                (order.orderSource && order.orderSource.toLowerCase().includes(query)) ||
                (order.id && order.id.toLowerCase().includes(query))
        );
    }, [orders, searchQuery]);

    const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

    // Clamp pageIndex if list shrunk due to search filter
    React.useEffect(() => {
        if (pageIndex >= pageCount) {
            setPageIndex(Math.max(0, pageCount - 1));
        }
    }, [pageCount, pageIndex]);

    const paginatedOrders = React.useMemo(() => {
        const start = pageIndex * pageSize;
        return filteredOrders.slice(start, start + pageSize);
    }, [filteredOrders, pageIndex, pageSize]);

    const columns = React.useMemo<ColumnDef<TSalesOrder>[]>(
        () => [
            {
                accessorKey: 'createdAt',
                id: 'createdAt',
                header: 'Date & Time',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">
                        {format(new Date(row.original.createdAt), 'MMM d, yyyy h:mm a')}
                    </span>
                )
            },
            {
                id: 'queueNumber',
                accessorFn: (row) => row.queueNumber || row.id,
                header: 'Queue #',
                cell: ({ row }) => {
                    const order = row.original;
                    const refNo = (order as any).referenceNumber || getFrontendReference(order.createdAt, order.queueNumber);
                    return (
                        <div className="flex flex-col gap-0.5 font-mono leading-tight">
                            <span className="text-muted-foreground">
                                <span className="font-semibold text-foreground/70">Ref:</span> {refNo}
                            </span>
                            <span className="text-muted-foreground">
                                <span className="font-semibold text-foreground/70">ID:</span> {order.id.slice(0, 8).toUpperCase()}
                            </span>
                        </div>
                    );
                }
            },
            {
                accessorKey: 'customerName',
                id: 'customerName',
                header: 'Customer',
                cell: ({ row }) => (
                    <span className="text-xs font-semibold text-foreground truncate max-w-[150px] block">
                        {row.original.customerName || 'Walk-in Customer'}
                    </span>
                )
            },
            {
                accessorKey: 'orderType',
                id: 'orderType',
                header: 'Dining Type',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {row.original.orderType ? row.original.orderType.replace(/_/g, ' ') : '—'}
                    </span>
                )
            },
            {
                accessorKey: 'orderSource',
                id: 'orderSource',
                header: 'Order Source',
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-xs font-bold px-1.5 py-0 uppercase">
                        {row.original.orderSource}
                    </Badge>
                )
            },
            {
                accessorKey: 'status',
                id: 'status',
                header: 'Order Status',
                cell: ({ row }) => {
                    const status = row.original.status;
                    return (
                        <Badge
                            variant="secondary"
                            className={cn(
                                'text-xs font-semibold px-2 py-0.5 rounded-md',
                                status === 'COMPLETED' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                                status === 'READY' && 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                status === 'PREPARING' && 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                                status === 'PENDING' && 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                            )}
                        >
                            {status}
                        </Badge>
                    );
                }
            },
            {
                id: 'paymentMethod',
                accessorFn: (row) =>
                    row.payments
                        .filter((p) => p.paymentStatus === 'PAID')
                        .map((p) => p.paymentMethod)
                        .join(', ') || 'UNPAID',
                header: 'Payment Method',
                cell: ({ row }) => {
                    const paymentMethods = row.original.payments
                        .filter((p) => p.paymentStatus === 'PAID')
                        .map((p) => p.paymentMethod)
                        .join(', ');
                    return <span className="text-xs font-medium text-foreground uppercase whitespace-nowrap">{paymentMethods || 'UNPAID'}</span>;
                }
            },
            {
                accessorKey: 'netTotal',
                id: 'netTotal',
                header: () => <div className="text-right">Net Total</div>,
                cell: ({ row }) => (
                    <div className="font-bold text-xs text-right text-foreground">
                        ₱{row.original.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                )
            },
            {
                id: 'actions',
                header: () => <div className="text-center">Actions</div>,
                enableHiding: false,
                cell: ({ row }) => {
                    const order = row.original;
                    return (
                        <div className="flex justify-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg hover:bg-muted"
                                onClick={() => globalNavigate({ to: `/admin/orders/${order.id}/edit` })}
                                title="View Details"
                            >
                                <Eye className="size-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                        </div>
                    );
                }
            }
        ],
        [globalNavigate]
    );

    if (isError) {
        return (
            <div className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-2xs flex flex-col items-center justify-center min-h-[300px] text-xs text-rose-500 font-bold">
                Failed to load transaction list data.
            </div>
        );
    }

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
            {/* @deprecated: Previously titled "Completed Orders List" when only COMPLETED orders were shown. */}
            <div>
                <h3 className="text-sm font-bold text-foreground">Sales Orders List</h3>
                <p className="text-xs text-muted-foreground">All confirmed paid customer orders in the selected period.</p>
            </div>

            <DataTable
                columns={columns}
                data={paginatedOrders}
                pageCount={pageCount}
                pageIndex={pageIndex}
                pageSize={pageSize}
                onPaginationChange={(idx, size) => {
                    setPageIndex(idx);
                    setPageSize(size);
                }}
                isLoading={isLoading}
                showColumnVisibilityToggle={true}
                filterContent={
                    <div className="relative w-full sm:w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/80" />
                        <Input
                            type="text"
                            placeholder="Search by queue, customer, type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 pr-4 text-xs bg-background/50 border-border/60 rounded-xl"
                        />
                    </div>
                }
            />
        </div>
    );
}
