import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, Layers, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import type { TPnLOverview } from '../sales.types';
import { cn } from '#/lib/utils.ts';

interface FinancialPnLWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

export default function FinancialPnLWidget({ dateFrom, dateTo }: FinancialPnLWidgetProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'financials', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'financials')
    });

    if (isLoading) {
        return (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                <Skeleton className="h-4 w-40" />
                <div className="space-y-3 pt-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-12 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-2xs flex flex-col items-center justify-center min-h-[260px] text-xs text-rose-500 font-bold">
                Failed to load Profit & Loss statement.
            </div>
        );
    }

    const pnl: TPnLOverview = data?.pnl || {
        revenue: { grossSales: 0, discounts: 0, netSales: 0 },
        expenses: { procurementDeliveries: 0, totalExpenses: 0 },
        losses: { rawIngredientWaste: 0, preparedFoodExpirations: 0, totalLoss: 0, lossBreakdownByReason: {} },
        profitability: { grossProfit: 0, netProfit: 0, grossProfitMargin: 0, netProfitMargin: 0 }
    };

    const isPositive = pnl.profitability.netProfit >= 0;

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileSpreadsheet className="size-4" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">Earnings & Costs Summary</h3>
                </div>
                <span className="text-xs text-muted-foreground font-semibold">Cashflow Overview</span>
            </div>

            <div className="space-y-3 text-xs">
                {/* 1. Inflow Revenue */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                    <div className="flex items-center justify-between font-bold text-foreground">
                        <span className="flex items-center gap-1.5 text-primary">
                            <TrendingUp className="size-3.5" /> Total Earnings (Net Sales)
                        </span>
                        <span className="text-sm font-bold text-primary">
                            ₱{pnl.revenue.netSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground text-xs pt-1 border-t border-border/20">
                        <span>Customer sales: ₱{pnl.revenue.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span>Discounts: -₱{pnl.revenue.discounts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* 2. Procurement Outflow */}
                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                    <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-400">
                        <span className="flex items-center gap-1.5">
                            <TrendingDown className="size-3.5" /> Less: Stocks & Supplies Bought
                        </span>
                        <span className="text-sm font-bold">
                            -₱{pnl.expenses.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground text-xs pt-1 border-t border-amber-500/10">
                        <span>Supplier delivery batches</span>
                        <span className="font-semibold text-amber-700/90 dark:text-amber-400/90">
                            Gross Profit: ₱{pnl.profitability.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* 3. Losses & Spoilage Outflow */}
                <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                    <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-400">
                        <span className="flex items-center gap-1.5">
                            <TrendingDown className="size-3.5" /> Less: Wasted & Expired Items
                        </span>
                        <span className="text-sm font-bold">-₱{pnl.losses.totalLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground text-xs pt-1 border-t border-rose-500/10">
                        <span>Wasted ingredients: ₱{pnl.losses.rawIngredientWaste.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span>
                            Expired display food: ₱{pnl.losses.preparedFoodExpirations.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* 4. Bottom Line Net Operating Profit */}
                <div
                    className={cn(
                        'p-4 rounded-xl border flex items-center justify-between',
                        isPositive
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-300'
                    )}
                >
                    <div className="space-y-0.5">
                        <span className="text-xs font-bold uppercase block">Take-Home Net Profit</span>
                        <span className="text-xs text-muted-foreground font-medium">
                            Profit Margin:{' '}
                            <strong className={isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                                {pnl.profitability.netProfitMargin}%
                            </strong>
                        </span>
                    </div>
                    <div className="text-right">
                        <span
                            className={cn(
                                'text-lg font-extrabold',
                                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            )}
                        >
                            ₱{pnl.profitability.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
