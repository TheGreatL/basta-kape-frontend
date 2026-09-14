import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import {
    Coffee,
    TrendingUp,
    DollarSign,
    Percent,
    ShoppingBag,
    Clock,
    CheckCircle2,
    ChevronRight,
    Shield,
    ArrowUpRight,
    RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { useAuth } from '#/context/AuthContext';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import { appModules, appPermissions } from '#/constants/rbac.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getDashboardSummary } from '#/api/dashboard.api.ts';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import { cn } from '#/lib/utils.ts';

// UI components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '#/components/ui/table.tsx';
import { Progress } from '#/components/ui/progress.tsx';

interface DashboardSummary {
    user: {
        username: string;
        firstName: string;
        lastName: string;
    };
    salesToday?: {
        grossSales: number;
        discountTotal: number;
        netSales: number;
        orderCount: number;
        averageOrderValue: number;
    };
    inventorySummary?: {
        totalItems: number;
        criticalCount: number;
        outOfStockCount: number;
        lowStockItems: Array<{
            id: string;
            name: string;
            currentQuantity: number;
            status: 'SAFE' | 'CRITICAL' | 'OUT_OF_STOCK';
            unit: string;
        }>;
    };
    ordersSummary?: {
        queueStats: {
            pending: number;
            preparing: number;
            ready: number;
        };
        recentOrders: Array<{
            id: string;
            queueNumber: string;
            status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
            orderType: 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY';
            netTotal: number;
            customerName: string | null;
            createdAt: string;
        }>;
    };
}

export default function DashboardPage() {
    const { user } = useAuth();
    const permissions = React.useMemo(() => getUserPermissions(user), [user]);

    // Period filter state
    const [period, setPeriod] = React.useState<'today' | 'this_week' | 'this_month'>('today');

    // String paths as escape hatch for TanStack Router Link strict search params checking
    const salesPath = '/admin/sales' as string;
    const ordersPath = '/admin/orders' as string;
    const inventoryPath = '/admin/inventory' as string;

    // Check permissions dynamically
    const canReadSales = React.useMemo(
        () =>
            hasPermission(permissions, appModules.SALES_MANAGEMENT, appPermissions.READ) ||
            hasPermission(permissions, appModules.REPORTS_MANAGEMENT, appPermissions.READ),
        [permissions]
    );

    const canReadInventory = React.useMemo(() => hasPermission(permissions, appModules.INVENTORY_MANAGEMENT, appPermissions.READ), [permissions]);

    const canReadOrders = React.useMemo(() => hasPermission(permissions, appModules.ORDERS_MANAGEMENT, appPermissions.READ), [permissions]);

    // Calculate dates dynamically based on selected period
    const { dateFrom, dateTo } = React.useMemo(() => {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        if (period === 'this_week') {
            return {
                dateFrom: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                dateTo: todayStr
            };
        }
        if (period === 'this_month') {
            return {
                dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'),
                dateTo: todayStr
            };
        }
        return {
            dateFrom: todayStr,
            dateTo: todayStr
        };
    }, [period]);

    // Consolidated Dashboard Summary query
    const {
        data: summary,
        isLoading,
        isError,
        refetch
    } = useQuery<DashboardSummary>({
        queryKey: [QUERY_KEY.DASHBOARD.SUMMARY],
        queryFn: getDashboardSummary
    });

    // Sales Analytics query driven by the selected time period
    const { data: salesAnalytics, isLoading: isSalesLoading } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'dashboard', period, dateFrom, dateTo],
        queryFn: () => getSalesAnalytics(dateFrom, dateTo),
        enabled: !!canReadSales
    });

    if (isLoading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Spinner className="size-8 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground font-semibold">Loading dashboard summary...</span>
                </div>
            </div>
        );
    }

    if (isError || !summary) {
        return (
            <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-3">
                <p className="text-sm text-rose-500 font-bold">Failed to load dashboard metrics.</p>
                <Button onClick={() => refetch()} variant="outline" size="sm" className="h-9 gap-1.5 font-bold">
                    <RefreshCw className="size-4 animate-spin" /> Retry
                </Button>
            </div>
        );
    }

    const displayName = user?.firstName ? `${user.firstName} ${user.lastName}` : summary.user.username;
    const userRoles = user?.roles.map((r) => r.name).join(', ') || 'Staff';
    const dailyTrend = salesAnalytics?.dailyTrend || [];

    const periodLabel = period === 'today' ? "Today's" : period === 'this_week' ? "This Week's" : "This Month's";
    const periodSuffix = period === 'today' ? 'today' : period === 'this_week' ? 'this week' : 'this month';
    const trendLabel = period === 'today' ? 'Today' : period === 'this_week' ? 'This Week' : 'This Month';

    const salesMetrics =
        salesAnalytics?.summary ||
        (period === 'today' && summary.salesToday
            ? summary.salesToday
            : {
                  grossSales: 0,
                  discountTotal: 0,
                  netSales: 0,
                  orderCount: 0,
                  averageOrderValue: 0
              });

    return (
        <div className="flex flex-col gap-8 min-h-screen pb-12">
            {/* Elegant Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary-foreground p-6 text-primary-foreground shadow-lg md:p-8">
                <div className="relative z-10 space-y-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase backdrop-blur-sm">
                        <Shield className="size-3.5" /> {userRoles}
                    </span>
                    <h1 className="text-2xl font-bold md:text-3xl leading-tight">Welcome back, {displayName}!</h1>
                    <p className="max-w-md text-xs text-primary-foreground/80 font-semibold">
                        Here is a summary of Basta Kape's operations and analytics for today, {format(new Date(), 'EEEE, MMMM dd, yyyy')}.
                    </p>
                </div>
                <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
                    <Coffee className="size-48 stroke-[1.5]" />
                </div>
            </div>

            {/* Manager Perspective: Sales Overview */}
            {canReadSales && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-bold text-foreground">{periodLabel} Sales Performance</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Record filter for Today, This Week, This Month */}
                            <div className="inline-flex items-center p-1 bg-muted/60 border border-border/50 rounded-xl gap-1">
                                <Button
                                    type="button"
                                    variant={period === 'today' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setPeriod('today')}
                                    className={cn(
                                        'h-7 text-xs font-semibold rounded-lg px-2.5 transition-all',
                                        period === 'today' ? 'shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    Today
                                </Button>
                                <Button
                                    type="button"
                                    variant={period === 'this_week' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setPeriod('this_week')}
                                    className={cn(
                                        'h-7 text-xs font-semibold rounded-lg px-2.5 transition-all',
                                        period === 'this_week' ? 'shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    This Week
                                </Button>
                                <Button
                                    type="button"
                                    variant={period === 'this_month' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setPeriod('this_month')}
                                    className={cn(
                                        'h-7 text-xs font-semibold rounded-lg px-2.5 transition-all',
                                        period === 'this_month' ? 'shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    This Month
                                </Button>
                            </div>
                            <Link to={salesPath} className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 ml-1">
                                View Full Performance <ArrowUpRight className="size-3.5" />
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Gross Sales */}
                        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span className="text-xs font-bold uppercase">Gross Sales</span>
                                <DollarSign className="size-4 text-muted-foreground/80" />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-lg font-bold text-foreground">
                                    ₱{salesMetrics.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </h3>
                                <span className="text-xs text-muted-foreground font-semibold">Before deductions</span>
                            </div>
                        </div>

                        {/* Net Revenue */}
                        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs bg-gradient-to-br from-primary/5 to-transparent space-y-2">
                            <div className="flex justify-between items-center text-primary">
                                <span className="text-xs font-bold uppercase">Net Revenue</span>
                                <TrendingUp className="size-4 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-lg font-bold text-primary">
                                    ₱{salesMetrics.netSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </h3>
                                <span className="text-xs text-primary/80 font-bold">Total earnings {periodSuffix}</span>
                            </div>
                        </div>

                        {/* Discounts */}
                        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                            <div className="flex justify-between items-center text-amber-600">
                                <span className="text-xs font-bold uppercase">Discounts Deducted</span>
                                <Percent className="size-4 text-amber-600/80" />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-lg font-bold text-amber-600">
                                    ₱{salesMetrics.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </h3>
                                <span className="text-xs text-muted-foreground font-semibold">Total discounts applied</span>
                            </div>
                        </div>

                        {/* Total Orders */}
                        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span className="text-xs font-bold uppercase">Total Orders</span>
                                <ShoppingBag className="size-4 text-muted-foreground/80" />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-lg font-bold text-foreground">{salesMetrics.orderCount}</h3>
                                <span className="text-xs text-muted-foreground font-semibold">Completed orders</span>
                            </div>
                        </div>

                        {/* Average Receipt */}
                        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span className="text-xs font-bold uppercase">Average Receipt</span>
                                <Coffee className="size-4 text-muted-foreground/80" />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-lg font-bold text-foreground">
                                    ₱{salesMetrics.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </h3>
                                <span className="text-xs text-muted-foreground font-semibold">Avg ticket size</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manager Perspective: Sales Trend & Top Selling Products */}
            {canReadSales && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 shadow-2xs border-border/60 rounded-2xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-foreground">Sales Trend ({trendLabel})</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Historical view of net daily sales revenue for {periodSuffix}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[260px] pt-4">
                            {isSalesLoading ? (
                                <div className="flex h-full items-center justify-center">
                                    <Spinner className="size-6 text-primary animate-spin" />
                                </div>
                            ) : dailyTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dailyTrend} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
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
                                        <Area
                                            type="monotone"
                                            dataKey="sales"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorSales)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground font-semibold">
                                    No sales trend data available.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Favorites */}
                    <Card className="shadow-2xs border-border/60 rounded-2xl flex flex-col justify-between">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-foreground">Top 5 Best-Selling Favorites</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Most popular items based on sales volume {periodSuffix}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-center">
                            {salesAnalytics?.topProducts && salesAnalytics.topProducts.length > 0 ? (
                                <div className="space-y-4 w-full">
                                    {salesAnalytics.topProducts.map((p: any, idx: number) => (
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
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-xs text-muted-foreground font-semibold">
                                    No best-selling favorites available.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Split Layout: Orders Queue, Cash Drawer Shift, and Stock Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Orders Queue & Transactions (accessible if user can read orders) */}
                {canReadOrders && summary.ordersSummary && (
                    <Card className="lg:col-span-2 shadow-2xs border-border/60 rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-sm font-bold text-foreground">Order Queue & Recent Transactions</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">
                                    Monitor real-time status of orders in preparation.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Link to={ordersPath}>
                                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold px-3">
                                        All Orders
                                    </Button>
                                </Link>
                                <Link to="/admin/order-queue">
                                    <Button size="sm" className="h-8 text-xs font-bold px-3">
                                        Order Queue
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Queue stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex flex-col items-center justify-center">
                                    <Clock className="size-4 text-amber-500 mb-1" />
                                    <span className="text-xl font-bold text-amber-500">{summary.ordersSummary.queueStats.pending}</span>
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Pending</span>
                                </div>
                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 flex flex-col items-center justify-center">
                                    <Coffee className="size-4 text-blue-500 mb-1" />
                                    <span className="text-xl font-bold text-blue-500">{summary.ordersSummary.queueStats.preparing}</span>
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Preparing</span>
                                </div>
                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex flex-col items-center justify-center">
                                    <CheckCircle2 className="size-4 text-emerald-500 mb-1" />
                                    <span className="text-xl font-bold text-emerald-500">{summary.ordersSummary.queueStats.ready}</span>
                                    <span className="text-xs uppercase font-bold text-muted-foreground">Ready</span>
                                </div>
                            </div>

                            {/* Recent Transactions List */}
                            <div className="space-y-2.5">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground ">Recent Transactions</h4>
                                {summary.ordersSummary.recentOrders.length > 0 ? (
                                    <div className="overflow-hidden border border-border/50 rounded-xl">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/30">
                                                    <TableHead className="font-bold text-xs uppercase">Queue #</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase">Customer</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase">Type</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {summary.ordersSummary.recentOrders.map((order: any) => (
                                                    <TableRow key={order.id} className="hover:bg-muted/10">
                                                        <TableCell className="font-bold text-xs text-foreground">#{order.queueNumber}</TableCell>
                                                        <TableCell className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                                                            {order.customerName || 'Walk-in Customer'}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground font-medium">
                                                            {order.orderType.replace('_', ' ')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    order.status === 'COMPLETED'
                                                                        ? 'default'
                                                                        : order.status === 'PENDING'
                                                                          ? 'secondary'
                                                                          : order.status === 'PREPARING'
                                                                            ? 'outline'
                                                                            : order.status === 'READY'
                                                                              ? 'secondary'
                                                                              : 'destructive'
                                                                }
                                                                className={cn(
                                                                    'text-xs font-bold uppercase px-2 py-0.5 rounded-sm',
                                                                    order.status === 'COMPLETED' &&
                                                                        'bg-emerald-500/10 text-emerald-600 border-transparent',
                                                                    order.status === 'PREPARING' && 'bg-blue-500/10 text-blue-600 border-transparent',
                                                                    order.status === 'READY' && 'bg-indigo-500/10 text-indigo-600 border-transparent',
                                                                    order.status === 'PENDING' && 'bg-amber-500/10 text-amber-600 border-transparent'
                                                                )}
                                                            >
                                                                {order.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-bold text-xs text-right">
                                                            ₱{order.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-xs text-muted-foreground font-semibold">No recent orders found.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Stock Alerts Sidebar */}
                <div className="space-y-6">
                    {canReadInventory && summary.inventorySummary && (
                        <Card className="shadow-2xs border-border/60 rounded-2xl">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold text-foreground">Live Stock Alerts</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Monitors ingredients near or below reorder levels.
                                    </CardDescription>
                                </div>
                                <Link to={inventoryPath}>
                                    <Button variant="ghost" size="icon" className="size-7 rounded-lg">
                                        <ChevronRight className="size-4 text-muted-foreground" />
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-2.5 flex flex-col items-center">
                                        <span className="text-lg font-bold text-rose-500">{summary.inventorySummary.outOfStockCount}</span>
                                        <span className="text-xs uppercase font-bold text-muted-foreground">Out of Stock</span>
                                    </div>
                                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-2.5 flex flex-col items-center">
                                        <span className="text-lg font-bold text-amber-500">{summary.inventorySummary.criticalCount}</span>
                                        <span className="text-xs uppercase font-bold text-muted-foreground">Critical Stock</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-muted-foreground ">Top Bottlenecks</h4>
                                    {summary.inventorySummary.lowStockItems.length > 0 ? (
                                        <div className="space-y-2.5">
                                            {summary.inventorySummary.lowStockItems.map((item: any) => (
                                                <div key={item.id} className="space-y-1">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-foreground leading-tight">{item.name}</span>
                                                        <span
                                                            className={cn(
                                                                'font-bold',
                                                                item.status === 'OUT_OF_STOCK' ? 'text-rose-500' : 'text-amber-500'
                                                            )}
                                                        >
                                                            {item.currentQuantity} {item.unit}
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={item.status === 'OUT_OF_STOCK' ? 0 : 25}
                                                        className={cn(
                                                            'h-1.5',
                                                            item.status === 'OUT_OF_STOCK'
                                                                ? '[&>[data-slot=progress-indicator]]:bg-rose-500'
                                                                : '[&>[data-slot=progress-indicator]]:bg-amber-500'
                                                        )}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-xs text-emerald-600 bg-emerald-500/5 rounded-xl border border-emerald-500/10 font-bold flex items-center justify-center gap-1.5">
                                            <CheckCircle2 className="size-4 text-emerald-500" />
                                            All ingredients are well-stocked!
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
