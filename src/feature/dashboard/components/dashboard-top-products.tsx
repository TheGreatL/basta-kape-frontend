import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import type { IDashboardDateRange } from '../dashboard.types';

interface DashboardTopProductsProps {
    topProducts?: Array<{
        name: string;
        quantity: number;
        revenue: number;
    }>;
    isLoading?: boolean;
    dateRange: IDashboardDateRange;
}

export function DashboardTopProducts({ topProducts, isLoading, dateRange }: DashboardTopProductsProps) {
    const periodLabel = dateRange.label;

    return (
        <Card className="shadow-2xs border-border/60 rounded-2xl flex flex-col justify-between">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Top 5 Best-Sellers ({periodLabel})</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Most ordered items by sales volume.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
                {isLoading ? (
                    <div className="flex h-32 items-center justify-center">
                        <Spinner className="size-6 text-primary animate-spin" />
                    </div>
                ) : topProducts && topProducts.length > 0 ? (
                    <div className="space-y-3.5 w-full">
                        {topProducts.map((p, idx) => (
                            <div key={p.name} className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-foreground truncate max-w-[140px] sm:max-w-[180px]">{p.name}</span>
                                        <span className="text-xs text-muted-foreground font-semibold">
                                            {p.quantity} {p.quantity === 1 ? 'cup' : 'cups'} sold
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-foreground whitespace-nowrap">
                                    ₱{p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-xs text-muted-foreground font-semibold">No orders recorded for this period.</div>
                )}
            </CardContent>
        </Card>
    );
}
