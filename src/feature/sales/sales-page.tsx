import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { TrendingUp, Calendar as CalendarIcon, DollarSign, Percent, ShoppingBag, Coffee, X, RotateCcw, Eye, Search } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { format, subDays, parse } from 'date-fns';

import QUERY_KEY from '#/constants/query-keys.ts';
import { Route } from '#/routes/admin/sales.tsx';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import { cn } from '#/lib/utils.ts';
import { Button } from '#/components/ui/button.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';
import { Calendar } from '#/components/ui/calendar.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Input } from '#/components/ui/input.tsx';
import OrderDetailsDialog from '#/feature/order/components/order-details-dialog.tsx';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function SalesPage() {
    const navigate = useNavigate({ from: '/admin/sales' });
    const { dateFrom, dateTo } = Route.useSearch();

    const [startDate, setStartDate] = React.useState(dateFrom || '');
    const [endDate, setEndDate] = React.useState(dateTo || '');

    const [inspectedOrderId, setInspectedOrderId] = React.useState<string | null>(null);
    const [searchQuery, setSearchQuery] = React.useState('');

    const setSearchParams = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    // Query: Sales Analytics Data
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined)
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

    React.useEffect(() => {
        setStartDate(dateFrom || '');
        setEndDate(dateTo || '');
    }, [dateFrom, dateTo]);

    const handleApplyCustomDates = () => {
        setSearchParams({ dateFrom: startDate, dateTo: endDate });
    };

    const handlePresetRange = (days: number) => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const pastStr = format(subDays(new Date(), days), 'yyyy-MM-dd');
        setSearchParams({ dateFrom: pastStr, dateTo: todayStr });
    };

    const handleClearRange = () => {
        setSearchParams({ dateFrom: '', dateTo: '' });
        setStartDate('');
        setEndDate('');
    };

    // Format metrics
    const summary = data?.summary || {
        grossSales: 0,
        discountTotal: 0,
        netSales: 0,
        orderCount: 0,
        averageOrderValue: 0
    };

    const paymentData = React.useMemo(() => {
        if (!data?.paymentBreakdown) return [];
        return Object.entries(data.paymentBreakdown)
            .map(([name, val]: [string, any]) => ({
                name: name.toLowerCase().replace('_', ' '),
                value: val.revenue,
                count: val.count
            }))
            .filter((item) => item.value > 0);
    }, [data?.paymentBreakdown]);

    const orderTypeData = React.useMemo(() => {
        if (!data?.orderTypeBreakdown) return [];
        return Object.entries(data.orderTypeBreakdown)
            .map(([name, val]: [string, any]) => ({
                name: name.replace('_', ' '),
                value: val.revenue,
                count: val.count
            }))
            .filter((item) => item.value > 0);
    }, [data?.orderTypeBreakdown]);

    const topProducts = data?.topProducts || [];
    const dailyTrend = data?.dailyTrend || [];

    if (isLoading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Spinner className="size-8 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground font-semibold">Loading Sales Metrics Dashboard...</span>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-3">
                <p className="text-sm text-rose-500 font-bold">Failed to load sales analytics metrics.</p>
                <Button onClick={() => refetch()} variant="outline" size="sm" className="h-9 gap-1.5 font-bold">
                    <RotateCcw className="size-4" /> Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 min-h-screen pb-12">
            {/* Header / Filter Toolbar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Sales Performance Dashboard</h1>
                        <p className="text-xs text-muted-foreground">Analyze revenue growth, peak demand, payment streams, and top menu favorites.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs rounded-lg font-semibold hover:bg-muted"
                            onClick={() => handlePresetRange(0)}
                        >
                            Today
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs rounded-lg font-semibold hover:bg-muted"
                            onClick={() => handlePresetRange(7)}
                        >
                            7 Days
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs rounded-lg font-semibold hover:bg-muted"
                            onClick={() => handlePresetRange(30)}
                        >
                            30 Days
                        </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'h-9 justify-start text-left font-normal text-xs bg-background/50 border-border/60 rounded-xl px-3 min-w-[125px]',
                                        !startDate && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    {startDate ? format(parse(startDate, 'yyyy-MM-dd', new Date()), 'LLL dd, yyyy') : <span>Start date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : undefined}
                                    onSelect={(date) => {
                                        setStartDate(date ? format(date, 'yyyy-MM-dd') : '');
                                    }}
                                />
                            </PopoverContent>
                        </Popover>

                        <span className="text-muted-foreground text-xs font-semibold">to</span>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'h-9 justify-start text-left font-normal text-xs bg-background/50 border-border/60 rounded-xl px-3 min-w-[125px]',
                                        !endDate && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    {endDate ? format(parse(endDate, 'yyyy-MM-dd', new Date()), 'LLL dd, yyyy') : <span>End date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={endDate ? parse(endDate, 'yyyy-MM-dd', new Date()) : undefined}
                                    onSelect={(date) => {
                                        setEndDate(date ? format(date, 'yyyy-MM-dd') : '');
                                    }}
                                />
                            </PopoverContent>
                        </Popover>

                        <Button
                            size="sm"
                            onClick={handleApplyCustomDates}
                            disabled={!startDate || !endDate}
                            className="h-9 text-xs font-bold rounded-xl px-3 shadow-3xs"
                        >
                            Apply
                        </Button>
                    </div>

                    {(dateFrom || dateTo) && (
                        <Button variant="ghost" onClick={handleClearRange} className="h-9 text-xs px-2 gap-1">
                            <X className="size-3.5" /> Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Gross Sales */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-muted-foreground">
                        <span className="text-xs font-bold uppercase ">Gross Sales</span>
                        <DollarSign className="size-4 text-muted-foreground/80" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-bold text-foreground">
                            ₱{summary.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </h3>
                        <span className="text-xs text-muted-foreground font-semibold">Before discounts apply</span>
                    </div>
                </div>

                {/* Net Sales */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs bg-gradient-to-br from-primary/5 to-transparent space-y-2">
                    <div className="flex justify-between items-center text-primary">
                        <span className="text-xs font-bold uppercase ">Net Revenue</span>
                        <TrendingUp className="size-4 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-bold text-primary">
                            ₱{summary.netSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </h3>
                        <span className="text-xs text-primary/80 font-bold">Total earnings in register</span>
                    </div>
                </div>

                {/* Discounts */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-amber-600">
                        <span className="text-xs font-bold uppercase ">Discounts Deducted</span>
                        <Percent className="size-4 text-amber-600/80" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-bold text-amber-600">
                            ₱{summary.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </h3>
                        <span className="text-xs text-muted-foreground font-semibold">Senior Citizen & PWD discounts</span>
                    </div>
                </div>

                {/* Total Orders */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-muted-foreground">
                        <span className="text-xs font-bold uppercase ">Total Orders</span>
                        <ShoppingBag className="size-4 text-muted-foreground/80" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-bold text-foreground">{summary.orderCount}</h3>
                        <span className="text-xs text-muted-foreground font-semibold">Completed customer purchases</span>
                    </div>
                </div>

                {/* AOV */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-muted-foreground">
                        <span className="text-xs font-bold uppercase ">Average Order</span>
                        <Coffee className="size-4 text-muted-foreground/80" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-bold text-foreground">
                            ₱{summary.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </h3>
                        <span className="text-xs text-muted-foreground font-semibold">Average receipt ticket value</span>
                    </div>
                </div>
            </div>

            {/* Sales Trend Chart */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs">
                <h3 className="text-sm font-bold text-foreground mb-4">Daily Sales Trend</h3>
                <div className="h-[280px] w-full">
                    {dailyTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'semibold' }}
                                    tickFormatter={(str) => {
                                        try {
                                            return format(new Date(str), 'MMM d');
                                        } catch {
                                            return str;
                                        }
                                    }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'semibold' }}
                                    tickFormatter={(val) => `₱${val}`}
                                />
                                <Tooltip
                                    formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Net Sales']}
                                    labelFormatter={(label) => {
                                        try {
                                            return format(new Date(label), 'EEEE, MMMM dd, yyyy');
                                        } catch {
                                            return label;
                                        }
                                    }}
                                    contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '11px' }}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-semibold">
                            No sales records found within this timeframe.
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Breakdown Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel 1: Top Favorites list */}
                <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-foreground mb-4">Top 5 Best-Selling Favorites</h3>
                        <div className="space-y-4">
                            {topProducts.length > 0 ? (
                                topProducts.map((p: any, idx: number) => (
                                    <div key={p.name} className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary text-xs font-bold">
                                                #{idx + 1}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-foreground leading-tight">{p.name}</span>
                                                <span className="text-xs text-muted-foreground font-semibold">{p.quantity} cups sold</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-foreground">
                                            ₱{p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-xs text-muted-foreground font-semibold">No item sales data logged.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel 2: Order Dining Types breakdown */}
                <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs flex flex-col">
                    <h3 className="text-sm font-bold text-foreground mb-4">Dining Methods Distribution</h3>
                    <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6">
                        {orderTypeData.length > 0 ? (
                            <>
                                <div className="h-[140px] w-[140px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={orderTypeData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={60}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {orderTypeData.map((_entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="flex flex-col gap-2 shrink-0">
                                    {orderTypeData.map((item, index) => (
                                        <div key={item.name} className="flex items-center gap-2">
                                            <div className="size-3 rounded-xs shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-foreground uppercase">{item.name}</span>
                                                <span className="text-xs text-muted-foreground font-semibold">
                                                    ₱{item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({item.count} orders)
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-xs text-muted-foreground font-semibold">No dining method sales data.</div>
                        )}
                    </div>
                </div>

                {/* Panel 3: Payment breakdown chart */}
                <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs flex flex-col">
                    <h3 className="text-sm font-bold text-foreground mb-4">Payment Methods Revenue</h3>
                    <div className="flex-1 flex items-center justify-center">
                        {paymentData.length > 0 ? (
                            <div className="h-[180px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={paymentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            axisLine={false}
                                            style={{ fontSize: '9px', fill: '#64748b', fontWeight: 'semibold', textTransform: 'capitalize' }}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            style={{ fontSize: '9px', fill: '#64748b', fontWeight: 'semibold' }}
                                            tickFormatter={(val) => `₱${val}`}
                                        />
                                        <Tooltip
                                            formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Revenue']}
                                            contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '10px' }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {paymentData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-xs text-muted-foreground font-semibold">No payment methods revenue details.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Per Order Breakdown Table */}
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
                                        .filter((p: any) => p.paymentStatus === 'PAID')
                                        .map((p: any) => p.paymentMethod)
                                        .join(', ');

                                    return (
                                        <TableRow key={order.id} className="hover:bg-muted/10">
                                            <TableCell className="text-xs text-muted-foreground font-semibold">
                                                {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                                            </TableCell>
                                            <TableCell className="font-bold text-xs text-foreground">#{order.queueNumber}</TableCell>
                                            <TableCell className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                                                {order.customerName || 'Walk-in Customer'}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-medium">
                                                {order.orderType.replace('_', ' ')}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-medium">
                                                <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 uppercase">
                                                    {order.orderSource}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-foreground uppercase">
                                                {paymentMethods || 'UNPAID'}
                                            </TableCell>
                                            <TableCell className="font-bold text-xs text-right text-foreground">
                                                ₱{order.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 rounded-lg hover:bg-muted"
                                                    onClick={() => setInspectedOrderId(order.id)}
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

            {/* Order Details Modal Dialog */}
            <OrderDetailsDialog open={!!inspectedOrderId} onOpenChange={(open) => !open && setInspectedOrderId(null)} orderId={inspectedOrderId} />
        </div>
    );
}
