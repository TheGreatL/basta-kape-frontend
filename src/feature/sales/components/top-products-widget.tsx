import { useQuery } from '@tanstack/react-query';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';

interface TopProductsWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

export default function TopProductsWidget({ dateFrom, dateTo }: TopProductsWidgetProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'top-products', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'top-products')
    });

    if (isLoading) {
        return (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs flex flex-col justify-between min-h-[300px]">
                <div>
                    <Skeleton className="h-4 w-40 mb-5" />
                    <div className="space-y-4.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="size-8 rounded-lg" />
                                    <div className="space-y-1.5">
                                        <Skeleton className="h-3 w-28" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <Skeleton className="h-3.5 w-12" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-2xs flex flex-col items-center justify-center min-h-[300px] text-xs text-rose-500 font-bold text-center">
                Failed to load top favorites list.
            </div>
        );
    }

    const topProducts = data?.topProducts || [];

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
            <div>
                <h3 className="text-sm font-bold text-foreground mb-4">Top 5 Best-Selling Favorites</h3>
                <div className="space-y-4">
                    {topProducts.length > 0 ? (
                        topProducts.map((p: any, idx: number) => (
                            <div key={p.name} className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary text-xs font-bold">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-foreground leading-tight">{p.name}</span>
                                        <span className="text-xs text-muted-foreground font-semibold">{p.quantity} cups sold</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-foreground">
                                    ₱{p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-xs text-muted-foreground font-semibold">No item sales data logged.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
