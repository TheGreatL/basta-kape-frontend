import { useQuery } from '@tanstack/react-query';
import { getInventoryDashboardExpiringSoon } from '#/api/inventory.api';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card.tsx';
import { format, differenceInDays } from 'date-fns';
import type { IDashboardExpiringSoon } from '../../inventory.types';

export default function ExpiringSoonWidget() {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['inventory:dashboard_expiring'],
        queryFn: getInventoryDashboardExpiringSoon
    });

    return (
        <Card className="border-border/40 bg-card shadow-sm flex flex-col h-full">
            <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <AlertCircle className="size-4 text-amber-500" />
                    Expiring Soon (Next 30 Days)
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
                        {[1, 2, 3].map((i) => (
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
                    <div className="text-xs text-muted-foreground py-8 text-center">Failed to load expiring batches.</div>
                ) : data.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-12 text-center">No expiring batches detected.</div>
                ) : (
                    <div className="space-y-3.5">
                        {data.map((batch: IDashboardExpiringSoon) => {
                            const daysDiff = differenceInDays(new Date(batch.expiryDate), new Date());
                            let alertColor = 'bg-muted/10 text-muted-foreground';
                            if (daysDiff <= 3) {
                                alertColor = 'text-rose-600 dark:text-rose-400 bg-rose-500/5 border border-rose-500/20';
                            } else if (daysDiff <= 7) {
                                alertColor = 'text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/20';
                            }

                            return (
                                <div
                                    key={batch.id}
                                    className="flex items-center justify-between border-b border-border/10 pb-3 last:border-b-0 last:pb-0"
                                >
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <span className="text-sm font-bold text-foreground/80 leading-snug block truncate">
                                            {batch.ingredientName}
                                        </span>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {batch.batchNumber && (
                                                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">
                                                    Batch: {batch.batchNumber}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                Remaining: {batch.currentQuantity} {batch.unitAbbreviation}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block leading-normal ${alertColor}`}>
                                            {daysDiff <= 0 ? 'Expired' : `${daysDiff} ${daysDiff === 1 ? 'day' : 'days'} left`}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                                            {format(new Date(batch.expiryDate), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
