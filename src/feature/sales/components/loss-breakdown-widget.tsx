import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Cookie, Carrot, ChevronRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import type { TLossBreakdown } from '../sales.types';

interface LossBreakdownWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

export default function LossBreakdownWidget({ dateFrom, dateTo }: LossBreakdownWidgetProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'losses', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'losses')
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
                Failed to load loss and waste breakdown.
            </div>
        );
    }

    const losses: TLossBreakdown = data?.losses || {
        totalFinancialLoss: 0,
        preparedFoodLoss: 0,
        rawIngredientLoss: 0,
        preparedFoodWastedCount: 0,
        rawIngredientWastedCount: 0,
        totalWastedItemsCount: 0,
        reasonBreakdown: {},
        topWastedItems: []
    };

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                        <AlertTriangle className="size-4" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">Wasted & Expired Items</h3>
                </div>
                <Link to="/admin/inventory/waste-log" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                    View Waste Log <ChevronRight className="size-3" />
                </Link>
            </div>

            {/* Category Split Badges */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                            <Cookie className="size-3.5" /> Prepared Food
                        </span>
                        <span>{losses.preparedFoodWastedCount} items</span>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                        ₱{losses.preparedFoodLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
                            <Carrot className="size-3.5" /> Raw Ingredients
                        </span>
                        <span>{losses.rawIngredientWastedCount} items</span>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                        ₱{losses.rawIngredientLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Top Wasted Items List */}
            <div className="space-y-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase block">Most Costly Wasted Items</span>

                {losses.topWastedItems.length > 0 ? (
                    <div className="space-y-2">
                        {losses.topWastedItems.slice(0, 4).map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                            >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">{item.itemName}</span>
                                        <Badge variant="outline" className="text-xs px-1.5 py-0 border-muted-foreground/30 font-medium">
                                            {item.category === 'PREPARED_FOOD' ? 'Prepared' : 'Raw Ingredient'}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground block">
                                        Wasted: {item.totalQuantity} {item.unit}
                                    </span>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-xs font-bold text-rose-600">
                                        -₱{item.totalCostLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground">No spoiled or wasted items in this date range.</div>
                )}
            </div>
        </div>
    );
}
