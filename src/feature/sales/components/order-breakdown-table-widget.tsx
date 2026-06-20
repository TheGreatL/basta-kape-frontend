import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Eye, Search } from 'lucide-react';
import { format } from 'date-fns';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import { getFrontendReference } from '#/utils/helper';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Skeleton } from '#/components/ui/skeleton.tsx';

interface OrderBreakdownTableWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

export default function OrderBreakdownTableWidget({ dateFrom, dateTo }: OrderBreakdownTableWidgetProps) {
    const globalNavigate = useNavigate();
    const [searchQuery, setSearchQuery] = React.useState('');

    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'orders', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'orders')
    });

    const orders = React.useMemo(() => data?.orders || [], [data?.orders]);

    const filteredOrders = React.useMemo(() => {
        if (!searchQuery) return orders;
        const query = searchQuery.toLowerCase();
        return orders.filter(
            (order: any) =>
                (order.queueNumber && order.queueNumber.toLowerCase().includes(query)) ||
                (order.customerName && order.customerName.toLowerCase().includes(query)) ||
                (order.orderType && order.orderType.toLowerCase().includes(query)) ||
                (order.orderSource && order.orderSource.toLowerCase().includes(query))
        );
    }, [orders, searchQuery]);

    if (isLoading) {
        return (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="h-9 w-full sm:w-[300px] rounded-xl" />
                </div>
                <div className="border border-border/50 rounded-xl overflow-hidden">
                    <div className="bg-muted/30 p-4 flex justify-between border-b border-border/50">
                        {Array.from({ length: 7 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-3.5 w-16" />
                        ))}
                    </div>
                    <div className="p-4 space-y-4">
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <Skeleton className="h-3.5 w-24" />
                                <Skeleton className="h-3.5 w-12" />
                                <Skeleton className="h-3.5 w-24" />
                                <Skeleton className="h-3.5 w-16" />
                                <Skeleton className="h-3.5 w-16" />
                                <Skeleton className="h-3.5 w-14" />
                                <Skeleton className="h-7 w-7 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-2xs flex flex-col items-center justify-center min-h-[300px] text-xs text-rose-500 font-bold">
                Failed to load transaction list data.
            </div>
        );
    }

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-bold text-foreground">Per Order Breakdown</h3>
                    <p className="text-xs text-muted-foreground">List of all completed transactions within the selected timeframe.</p>
                </div>

                {/* Local Search Input */}
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
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-border/50 rounded-xl">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="font-bold text-xs uppercase">Date & Time</TableHead>
                            <TableHead className="font-bold text-xs uppercase">Queue #</TableHead>
                            <TableHead className="font-bold text-xs uppercase">Customer</TableHead>
                            <TableHead className="font-bold text-xs uppercase">Dining Type</TableHead>
                            <TableHead className="font-bold text-xs uppercase">Order Source</TableHead>
                            <TableHead className="font-bold text-xs uppercase">Payment Method</TableHead>
                            <TableHead className="font-bold text-xs uppercase text-right">Net Total</TableHead>
                            <TableHead className="font-bold text-xs uppercase text-center w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map((order: any) => {
                                const paymentMethods = order.payments
                                    ?.filter((p: any) => p.paymentStatus === 'PAID')
                                    .map((p: any) => p.paymentMethod)
                                    .join(', ');

                                return (
                                    <TableRow key={order.id} className="hover:bg-muted/10">
                                        <TableCell className="text-xs text-muted-foreground font-semibold">
                                            {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5 font-mono leading-tight">
                                                <span className="text-muted-foreground">
                                                    <span className="font-semibold text-foreground/70">Ref:</span>{' '}
                                                    {order.referenceNumber || getFrontendReference(order.createdAt, order.queueNumber)}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    <span className="font-semibold text-foreground/70">ID:</span> {order.id.slice(0, 8).toUpperCase()}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                                            {order.customerName || 'Walk-in Customer'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-medium">
                                            {order.orderType.replace('_', ' ')}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-medium">
                                            <Badge variant="outline" className="text-xs font-bold px-1.5 py-0 uppercase">
                                                {order.orderSource}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-foreground uppercase">{paymentMethods || 'UNPAID'}</TableCell>
                                        <TableCell className="font-bold text-xs text-right text-foreground">
                                            ₱{order.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 rounded-lg hover:bg-muted"
                                                onClick={() => globalNavigate({ to: `/admin/orders/${order.id}/edit` })}
                                                title="View Details"
                                            >
                                                <Eye className="size-3.5 text-muted-foreground hover:text-foreground" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground font-semibold">
                                    No transactions found within this timeframe.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
