import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInventoryDashboardWasteSummary } from '#/api/inventory.api';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card.tsx';
import type { TAdjustmentType } from '../../inventory.types';

const ADJUSTMENT_LABEL: Record<TAdjustmentType, string> = {
    WASTE: 'Waste Logged',
    SPOILED: 'Spoiled Stock',
    EXPIRED: 'Expired Items',
    THEFT: 'Stolen/Theft',
    PROMOTIONAL_USE: 'Promo/Samples',
    PHYSICAL_COUNT_DISCREPANCY: 'Discrepancy'
};

const COLOR_MAP: Record<TAdjustmentType, string> = {
    WASTE: 'bg-amber-500',
    SPOILED: 'bg-orange-500',
    EXPIRED: 'bg-red-500',
    THEFT: 'bg-neutral-600',
    PROMOTIONAL_USE: 'bg-blue-500',
    PHYSICAL_COUNT_DISCREPANCY: 'bg-indigo-500'
};

export default function WasteBreakdownWidget() {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['inventory:dashboard_waste'],
        queryFn: getInventoryDashboardWasteSummary
    });

    const totalQuantitySum = React.useMemo(() => {
        if (!data) return 0;
        return data.reduce((acc, curr) => acc + curr.totalQuantity, 0);
    }, [data]);

    return (
        <Card className="border-border/40 bg-card shadow-sm flex flex-col h-full">
            <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle className="size-4 text-orange-500" />
                    30-Day Waste & Discrepancy Breakdown
                </CardTitle>
                {isError && (
                    <button onClick={() => refetch()} className="text-xs text-red-600 underline flex items-center gap-1">
                        <RefreshCw className="size-3" /> Retry
                    </button>
                )}
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-center">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-1 animate-pulse">
                                <div className="flex justify-between text-xs">
                                    <div className="h-3 w-20 bg-muted rounded"></div>
                                    <div className="h-3 w-10 bg-muted rounded"></div>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full"></div>
                            </div>
                        ))}
                    </div>
                ) : isError || !data ? (
                    <div className="text-xs text-muted-foreground py-8 text-center">Failed to load waste summary.</div>
                ) : data.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-12 text-center">No waste or adjustments logged in the last 30 days.</div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-center pb-2 border-b border-border/5">
                            <span className="text-xs text-muted-foreground uppercase  font-semibold block">Total Loss Quantity</span>
                            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block font-sans">
                                {totalQuantitySum.toLocaleString()} units
                            </span>
                        </div>
                        <div className="space-y-3.5">
                            {data.map((item) => {
                                const percentage = totalQuantitySum > 0 ? (item.totalQuantity / totalQuantitySum) * 100 : 0;
                                const barColor = COLOR_MAP[item.type] || 'bg-primary';

                                return (
                                    <div key={item.type} className="space-y-1.5">
                                        <div className="flex justify-between items-baseline text-xs">
                                            <span className="text-muted-foreground font-medium">{ADJUSTMENT_LABEL[item.type] || item.type}</span>
                                            <span className="font-bold text-foreground/80">
                                                {item.totalQuantity.toLocaleString()} ({item.count} {item.count === 1 ? 'event' : 'events'})
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden border border-border/10">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
