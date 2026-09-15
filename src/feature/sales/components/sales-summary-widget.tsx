import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, ShoppingBag, Coffee } from 'lucide-react';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import type { TFinancialSummary } from '../sales.types';

interface SalesSummaryWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

export default function SalesSummaryWidget({ dateFrom, dateTo }: SalesSummaryWidgetProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'summary', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'summary')
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs space-y-3">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="size-4 rounded-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-28" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-4 shadow-2xs flex items-center justify-center text-xs text-rose-500 font-bold min-h-[105px]"
                    >
                        Failed to load metrics
                    </div>
                ))}
            </div>
        );
    }

    const summary: TFinancialSummary = data?.summary || {
        grossSales: 0,
        discountTotal: 0,
        netSales: 0,
        orderCount: 0,
        averageOrderValue: 0,
        totalExpenses: 0,
        deliveryCount: 0,
        cogs: 0,
        stockTransactionsCount: 0,
        totalLoss: 0,
        rawIngredientLoss: 0,
        preparedFoodLoss: 0,
        totalWastedItemsCount: 0,
        lossRate: 0,
        grossProfit: 0,
        netProfit: 0,
        profitMargin: 0
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Net Sales */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs bg-gradient-to-br from-primary/5 to-transparent space-y-2">
                <div className="flex justify-between items-center text-primary">
                    <span className="text-xs font-bold uppercase">Net Sales</span>
                    <TrendingUp className="size-4 text-primary" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-primary">₱{summary.netSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    <span className="text-xs text-muted-foreground font-medium block truncate">Revenue after discounts</span>
                </div>
            </div>

            {/* 2. Gross Sales */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-bold uppercase">Total / Gross Sales</span>
                    <DollarSign className="size-4 text-muted-foreground/80" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-foreground">
                        ₱{summary.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-xs text-muted-foreground font-medium block truncate">
                        Discounts: ₱{summary.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* 3. Completed Orders */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-bold uppercase">Orders Completed</span>
                    <ShoppingBag className="size-4 text-muted-foreground/80" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-foreground">{summary.orderCount.toLocaleString()}</h3>
                    <span className="text-xs text-muted-foreground font-medium block truncate">Total paid customer transactions</span>
                </div>
            </div>

            {/* 4. Average Ticket Size */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-bold uppercase">Avg Order Spend</span>
                    <Coffee className="size-4 text-muted-foreground/80" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-foreground">
                        ₱{summary.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-xs text-muted-foreground font-medium block truncate">Average customer ticket size</span>
                </div>
            </div>
        </div>
    );
}
