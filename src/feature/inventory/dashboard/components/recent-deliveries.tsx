import { useQuery } from '@tanstack/react-query';
import { getInventoryDashboardRecentDeliveries } from '#/api/inventory.api';
import { Truck, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card.tsx';
import type { IDashboardDelivery } from '../../inventory.types';

export default function RecentDeliveriesWidget() {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['inventory:dashboard_deliveries'],
        queryFn: getInventoryDashboardRecentDeliveries
    });

    return (
        <Card className="border-border/40 bg-card shadow-sm flex flex-col h-full">
            <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Truck className="size-4 text-indigo-500" />
                    Recent Replenishments
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
                    <div className="text-xs text-muted-foreground py-8 text-center">Failed to load recent deliveries.</div>
                ) : data.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-12 text-center">No recent deliveries logged.</div>
                ) : (
                    <div className="space-y-3.5">
                        {data.map((delivery: IDashboardDelivery) => (
                            <div
                                key={delivery.id}
                                className="flex items-center justify-between border-b border-border/10 pb-3 last:border-b-0 last:pb-0"
                            >
                                <div className="space-y-0.5 min-w-0 flex-1">
                                    <span className="text-sm font-bold text-foreground/80 leading-snug block truncate">
                                        {delivery.ingredientName}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        {delivery.supplierName || 'Self-delivery'}
                                    </span>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                    <span className="text-sm font-bold text-emerald-600 block leading-tight">
                                        +{delivery.quantityReceived.toLocaleString()} {delivery.unitAbbreviation}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-mono">₱{delivery.totalCost.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
