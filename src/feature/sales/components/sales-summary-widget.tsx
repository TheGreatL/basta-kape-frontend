import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Percent, ShoppingBag, Coffee, Truck, AlertTriangle, Sparkles } from 'lucide-react';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import type { TFinancialSummary } from '../sales.types';
import { cn } from '#/lib/utils.ts';

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
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
        totalLoss: 0,
        rawIngredientLoss: 0,
        preparedFoodLoss: 0,
        totalWastedItemsCount: 0,
        lossRate: 0,
        grossProfit: 0,
        netProfit: 0,
        profitMargin: 0
    };

    const isPositiveProfit = summary.netProfit >= 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 1. Net Revenue */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs bg-gradient-to-br from-primary/5 to-transparent space-y-2">
                <div className="flex justify-between items-center text-primary">
                    <span className="text-xs font-bold uppercase">Net Sales</span>
                    <TrendingUp className="size-4 text-primary" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-primary">₱{summary.netSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    <span className="text-xs text-muted-foreground font-medium block truncate">
                        From {summary.orderCount.toLocaleString()} completed orders
                    </span>
                </div>
            </div>

            {/* 2. Procurement Expenses */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-amber-600">
                    <span className="text-xs font-bold uppercase">Stock Spending</span>
                    <Truck className="size-4 text-amber-600/80" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-amber-600">
                        ₱{summary.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-xs text-muted-foreground font-medium block truncate">{summary.deliveryCount} deliveries received</span>
                </div>
            </div>

            {/* 3. Losses & Spoilage */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-rose-600">
                    <span className="text-xs font-bold uppercase">Wasted & Expired</span>
                    <AlertTriangle className="size-4 text-rose-600/80" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-rose-600">₱{summary.totalLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    <span className="text-xs text-muted-foreground font-medium block truncate">Wasted: {summary.lossRate}% of sales</span>
                </div>
            </div>

            {/* 4. Net Operating Profit */}
            <div
                className={cn(
                    'bg-card border rounded-2xl p-4 shadow-2xs space-y-2',
                    isPositiveProfit
                        ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent'
                        : 'border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent'
                )}
            >
                <div className="flex justify-between items-center">
                    <span
                        className={cn(
                            'text-xs font-bold uppercase',
                            isPositiveProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                        )}
                    >
                        Net Profit
                    </span>
                    <Sparkles className={cn('size-4', isPositiveProfit ? 'text-emerald-600' : 'text-rose-600')} />
                </div>
                <div className="space-y-0.5">
                    <h3
                        className={cn(
                            'text-lg font-bold',
                            isPositiveProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}
                    >
                        ₱{summary.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-xs text-muted-foreground font-medium block truncate">Margin: {summary.profitMargin}%</span>
                </div>
            </div>

            {/* 5. Gross Sales */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-bold uppercase">Total Sales</span>
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

            {/* 6. Average Ticket Size */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-bold uppercase">Avg Order Spend</span>
                    <Coffee className="size-4 text-muted-foreground/80" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-foreground">
                        ₱{summary.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-xs text-muted-foreground font-medium block truncate">Across {summary.orderCount} orders</span>
                </div>
            </div>
        </div>
    );
}
