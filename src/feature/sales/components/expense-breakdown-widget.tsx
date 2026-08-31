import { useQuery } from '@tanstack/react-query';
import { Truck, Flame, ChevronRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import type { TExpenseBreakdown } from '../sales.types';

interface ExpenseBreakdownWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

export default function ExpenseBreakdownWidget({ dateFrom, dateTo }: ExpenseBreakdownWidgetProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'expenses', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'expenses')
    });

    if (isLoading) {
        return (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                <Skeleton className="h-4 w-44" />
                <div className="space-y-3 pt-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-10 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-2xs flex flex-col items-center justify-center min-h-[260px] text-xs text-rose-500 font-bold">
                Failed to load procurement expenses.
            </div>
        );
    }

    const expenses: TExpenseBreakdown = data?.expenseBreakdown ||
        data?.expenses || {
            totalExpenses: 0,
            deliveryCount: 0,
            cogs: 0,
            topSuppliers: [],
            topIngredients: []
        };

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                        <Truck className="size-4" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">Stock Purchases & Costs</h3>
                </div>
                <Link to="/admin/inventory/transactions" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                    View Deliveries <ChevronRight className="size-3" />
                </Link>
            </div>

            {/* Split Metrics: Replenishment vs. COGS */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                            <Truck className="size-3.5" /> Deliveries
                        </span>
                        <span>{expenses.deliveryCount} deliveries</span>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                        ₱{expenses.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
                            <Flame className="size-3.5" /> Ingredients Used
                        </span>
                        <span>Used in orders</span>
                    </div>
                    <div className="text-sm font-bold text-foreground">₱{expenses.cogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
            </div>

            {/* Top Suppliers List */}
            <div className="space-y-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase block">Top Suppliers</span>

                {expenses.topSuppliers.length > 0 ? (
                    <div className="space-y-2">
                        {expenses.topSuppliers.slice(0, 4).map((sup, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                            >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                    <span className="text-xs font-semibold text-foreground truncate block max-w-[150px]">{sup.supplierName}</span>
                                    <span className="text-xs text-muted-foreground block">{sup.batchCount} delivery batch(es)</span>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                        ₱{sup.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground">No supplier deliveries recorded in this timeframe.</div>
                )}
            </div>
        </div>
    );
}
