import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import { useAuth } from '#/context/AuthContext';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import { appModules, appPermissions } from '#/constants/rbac.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getDashboardSummary } from '#/api/dashboard.api.ts';
import { getSalesAnalytics } from '#/api/reports.api.ts';

// UI components
import { Button } from '#/components/ui/button.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

// Modular Dashboard Subcomponents
import { DashboardHeader } from './components/dashboard-header';
import { DashboardSalesMetricsCards } from './components/dashboard-sales-metrics';
import { DashboardProfitabilityCard } from './components/dashboard-profitability';
import { DashboardSalesTrend } from './components/dashboard-sales-trend';
import { DashboardTopProducts } from './components/dashboard-top-products';
import { DashboardBreakdown } from './components/dashboard-breakdown';
import { DashboardOrdersQueue } from './components/dashboard-orders-queue';
import { DashboardStockAlerts } from './components/dashboard-stock-alerts';
import { DashboardProcurementHealth } from './components/dashboard-procurement-health';
import { DashboardRecentActivities } from './components/dashboard-recent-activities';

import { getDashboardDateRange } from './dashboard.types';
import type { TDashboardDateFilter, DashboardSummary } from './dashboard.types';

export default function DashboardPage() {
    const { user } = useAuth();
    const permissions = React.useMemo(() => getUserPermissions(user), [user]);

    // Active date filter state: 'today' | 'this_week' | 'this_month'
    const [activeFilter, setActiveFilter] = React.useState<TDashboardDateFilter>('today');
    const dateRange = React.useMemo(() => getDashboardDateRange(activeFilter), [activeFilter]);

    // Dynamic Permission Checks for Modular Dashboard Sections
    const canReadSales = React.useMemo(
        () =>
            hasPermission(permissions, appModules.SALES_MANAGEMENT, appPermissions.READ) ||
            hasPermission(permissions, appModules.REPORTS_MANAGEMENT, appPermissions.READ),
        [permissions]
    );

    const canReadInventory = React.useMemo(() => hasPermission(permissions, appModules.INVENTORY_MANAGEMENT, appPermissions.READ), [permissions]);

    const canReadOrders = React.useMemo(
        () =>
            hasPermission(permissions, appModules.ORDERS_MANAGEMENT, appPermissions.READ) ||
            hasPermission(permissions, appModules.ORDER_QUEUE, appPermissions.READ),
        [permissions]
    );

    const canReadPO = React.useMemo(() => hasPermission(permissions, appModules.PURCHASE_ORDERS_MANAGEMENT, appPermissions.READ), [permissions]);

    const canReadCustomers = React.useMemo(() => hasPermission(permissions, appModules.CUSTOMERS_MANAGEMENT, appPermissions.READ), [permissions]);

    const canReadActivityLogs = React.useMemo(() => hasPermission(permissions, appModules.ACTIVITY_LOGS, appPermissions.READ), [permissions]);

    // Consolidated Dashboard Summary query (updates with selected date filter)
    const {
        data: summary,
        isLoading,
        isError,
        refetch
    } = useQuery<DashboardSummary>({
        queryKey: [QUERY_KEY.DASHBOARD.SUMMARY, { dateFrom: dateRange.dateFrom, dateTo: dateRange.dateTo }],
        queryFn: () => getDashboardSummary(dateRange.dateFrom, dateRange.dateTo)
    });

    // Sales Analytics (trend & top products) query for selected date filter
    const { data: salesAnalytics, isLoading: isSalesLoading } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'dashboard-analytics', { dateFrom: dateRange.dateFrom, dateTo: dateRange.dateTo }],
        queryFn: () => getSalesAnalytics(dateRange.dateFrom, dateRange.dateTo),
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

    // Resolved metrics for the selected period
    const salesMetrics = salesAnalytics?.summary || summary.salesOverview || summary.salesToday;
    const dailyTrend = salesAnalytics?.dailyTrend || [];
    const topProducts = salesAnalytics?.topProducts || [];

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* 1. Welcome Banner with Interactive Date Filter (Today, This Week, This Month) */}
            <DashboardHeader
                displayName={displayName}
                userRoles={userRoles}
                activeFilter={activeFilter}
                dateRange={dateRange}
                onFilterChange={setActiveFilter}
            />

            {/* 2. Key Sales Performance Cards (Filtered) */}
            {canReadSales && <DashboardSalesMetricsCards metrics={salesMetrics} isLoading={isSalesLoading} dateRange={dateRange} />}

            {/* 3. Profitability & Financial Health (Gross Margin, COGS, Wastage Loss, Net Profit) */}
            {canReadSales && summary.profitability && (
                <DashboardProfitabilityCard profitability={summary.profitability} isLoading={isLoading} dateRange={dateRange} />
            )}

            {/* 4. Sales Trend & Top 5 Best-Selling Favorites (Filtered) */}
            {canReadSales && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <DashboardSalesTrend dailyTrend={dailyTrend} isLoading={isSalesLoading} dateRange={dateRange} />
                    <DashboardTopProducts topProducts={topProducts} isLoading={isSalesLoading} dateRange={dateRange} />
                </div>
            )}

            {/* 5. Revenue Channels & Settlement Methods (Cash vs GCash & Dine-In vs Take-Out vs Delivery) */}
            {canReadSales && (summary.paymentBreakdown || summary.channelBreakdown) && (
                <DashboardBreakdown paymentBreakdown={summary.paymentBreakdown} channelBreakdown={summary.channelBreakdown} />
            )}

            {/* 6. Real-time Kitchen Operations: Order Queue & Live Stock Alerts */}
            {(canReadOrders || canReadInventory) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {canReadOrders && summary.ordersSummary && (
                        <DashboardOrdersQueue queueStats={summary.ordersSummary.queueStats} recentOrders={summary.ordersSummary.recentOrders} />
                    )}

                    {canReadInventory && summary.inventorySummary && (
                        <DashboardStockAlerts
                            outOfStockCount={summary.inventorySummary.outOfStockCount}
                            criticalCount={summary.inventorySummary.criticalCount}
                            lowStockItems={summary.inventorySummary.lowStockItems}
                            expiringBatches={summary.inventorySummary.expiringPreparedBatches}
                        />
                    )}
                </div>
            )}

            {/* 7. Procurement & Customer Growth Summary */}
            {(canReadPO || canReadCustomers) && (summary.procurementSummary || summary.customerMetrics) && (
                <DashboardProcurementHealth procurement={summary.procurementSummary} customers={summary.customerMetrics} dateRange={dateRange} />
            )}

            {/* 8. Recent System Activity & Staff Oversight (Audit Trail) */}
            {canReadActivityLogs && summary.recentActivities && <DashboardRecentActivities activities={summary.recentActivities} />}
        </div>
    );
}
