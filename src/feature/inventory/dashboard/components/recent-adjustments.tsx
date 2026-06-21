import { useQuery } from '@tanstack/react-query';
import { getInventoryDashboardRecentAdjustments } from '#/api/inventory.api';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import type { IDashboardAdjustment, TAdjustmentType } from '../../inventory.types';

const ADJUSTMENT_LABEL: Record<TAdjustmentType, string> = {
    WASTE: 'Waste',
    SPOILED: 'Spoiled',
    EXPIRED: 'Expired',
    THEFT: 'Theft',
    PROMOTIONAL_USE: 'Promo',
    PHYSICAL_COUNT_DISCREPANCY: 'Discrepancy'
};

export default function RecentAdjustmentsWidget() {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['inventory:dashboard_adjustments'],
        queryFn: getInventoryDashboardRecentAdjustments
    });

    return (
        <Card className="border-border/40 bg-card shadow-sm flex flex-col h-full">
            <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ClipboardList className="size-4 text-rose-500" />
                    Recent Stock Changes & Waste
                </CardTitle>
                {isError && (
                    <button onClick={() => refetch()} className="text-xs text-red-600 underline flex items-center gap-1">
                        <RefreshCw className="size-3" /> Retry
                    </button>
                )}
            </CardHeader>
            <CardContent className="p-4 flex-1">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between border-b border-border/10 pb-2 last:border-b-0 animate-pulse">
                                <div className="space-y-1">
                                    <div className="h-3.5 w-24 bg-muted rounded"></div>
                                    <div className="h-3 w-16 bg-muted rounded"></div>
                                </div>
                                <div className="h-4 w-12 bg-muted rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : isError || !data ? (
                    <div className="text-xs text-muted-foreground py-8 text-center">Failed to load recent adjustments.</div>
                ) : data.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-12 text-center">No recent stock adjustments.</div>
                ) : (
                    <div className="space-y-3.5">
                        {data.map((adj: IDashboardAdjustment) => (
                            <div key={adj.id} className="flex items-center justify-between border-b border-border/10 pb-3 last:border-b-0 last:pb-0">
                                <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-sm font-bold text-foreground/80 truncate max-w-[150px]">{adj.ingredientName}</span>
                                        <Badge variant="outline" className="text-xs font-semibold py-0 px-1 capitalize leading-none bg-muted/30">
                                            {ADJUSTMENT_LABEL[adj.type] || adj.type}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground truncate block max-w-[200px]" title={adj.reason || ''}>
                                        {adj.reason || 'No reason provided'}
                                    </span>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                    <span
                                        className={`text-sm font-black block leading-tight ${
                                            adj.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'
                                        }`}
                                    >
                                        {adj.quantity > 0 ? '+' : ''}
                                        {adj.quantity.toLocaleString()} {adj.unitAbbreviation}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
