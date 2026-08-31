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
    inventorySummary?: {
        totalItems: number;
        criticalCount: number;
        outOfStockCount: number;
        lowStockItems: DashboardLowStockItem[];
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
