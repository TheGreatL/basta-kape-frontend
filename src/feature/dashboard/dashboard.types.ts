import { format, startOfWeek, startOfMonth } from 'date-fns';

export type TDashboardDateFilter = 'today' | 'this_week' | 'this_month';

export interface IDashboardDateRange {
    filter: TDashboardDateFilter;
    label: string;
    dateFrom: string;
    dateTo: string;
    displayPeriod: string;
}

export interface DashboardSalesMetrics {
    grossSales: number;
    discountTotal: number;
    netSales: number;
    orderCount: number;
    averageOrderValue: number;
}

export interface DashboardProfitability {
    grossSales: number;
    netSales: number;
    discountTotal: number;
    cogs: number;
    grossProfit: number;
    grossProfitMargin: number;
    totalLoss: number;
    netProfit: number;
    netProfitMargin: number;
}

export interface DashboardPaymentBreakdown {
    paymentMethod: string;
    amount: number;
    count: number;
    percentage: number;
}

export interface DashboardChannelBreakdown {
    channel: string;
    netTotal: number;
    count: number;
    percentage: number;
}

export interface DashboardProcurementSummary {
    openPOCount: number;
    openPOAmount: number;
    procurementSpend: number;
}

export interface DashboardCustomerMetrics {
    totalCustomers: number;
    newCustomersInPeriod: number;
}

export interface DashboardRecentActivity {
    id: string;
    title: string;
    details: string | null;
    createdAt: string;
    actorName: string;
}

export interface DashboardExpiringBatch {
    id: string;
    batchNumber: string;
    productName: string;
    variantTitle?: string | null;
    currentQuantity: number;
    expiryDate: string;
}

export interface DashboardLowStockItem {
    id: string;
    name: string;
    currentQuantity: number;
    status: 'SAFE' | 'CRITICAL' | 'OUT_OF_STOCK';
    unit: string;
}

export interface DashboardRecentOrder {
    id: string;
    queueNumber: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    orderType: 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY';
    netTotal: number;
    customerName: string | null;
    createdAt: string;
}

export interface DashboardSummary {
    user: {
        username: string;
        firstName: string;
        lastName: string;
    };
    salesToday?: DashboardSalesMetrics;
    salesOverview?: DashboardSalesMetrics;
    profitability?: DashboardProfitability;
    paymentBreakdown?: DashboardPaymentBreakdown[];
    channelBreakdown?: DashboardChannelBreakdown[];
    procurementSummary?: DashboardProcurementSummary;
    customerMetrics?: DashboardCustomerMetrics;
    recentActivities?: DashboardRecentActivity[];
    inventorySummary?: {
        totalItems: number;
        criticalCount: number;
        outOfStockCount: number;
        lowStockItems: DashboardLowStockItem[];
        expiringPreparedBatches?: DashboardExpiringBatch[];
    };
    ordersSummary?: {
        queueStats: {
            pending: number;
            preparing: number;
            ready: number;
        };
        recentOrders: DashboardRecentOrder[];
    };
    activeShift?: any;
}

export const getDashboardDateRange = (filter: TDashboardDateFilter): IDashboardDateRange => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    switch (filter) {
        case 'this_week': {
            const weekStart = startOfWeek(now, { weekStartsOn: 1 });
            const weekStartStr = format(weekStart, 'yyyy-MM-dd');
            return {
                filter: 'this_week',
                label: 'This Week',
                dateFrom: weekStartStr,
                dateTo: todayStr,
                displayPeriod: `${format(weekStart, 'MMM d')} - ${format(now, 'MMM d, yyyy')}`
            };
        }
        case 'this_month': {
            const monthStart = startOfMonth(now);
            const monthStartStr = format(monthStart, 'yyyy-MM-dd');
            return {
                filter: 'this_month',
                label: 'This Month',
                dateFrom: monthStartStr,
                dateTo: todayStr,
                displayPeriod: `${format(now, 'MMMM yyyy')} (Month to Date)`
            };
        }
        case 'today':
        default:
            return {
                filter: 'today',
                label: 'Today',
                dateFrom: todayStr,
                dateTo: todayStr,
                displayPeriod: format(now, 'EEEE, MMMM dd, yyyy')
            };
    }
};
