import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Percent, ShoppingBag, Coffee } from 'lucide-react';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-3.5">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="size-4 rounded-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-28" />
                            <Skeleton className="h-3.5 w-32" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-5 shadow-2xs flex items-center justify-center text-xs text-rose-500 font-bold min-h-[110px]"
                    >
                        Failed to load metrics
                    </div>
                ))}
            </div>
        );
    }

    const summary = data?.summary || {
        grossSales: 0,
        discountTotal: 0,
        netSales: 0,
        orderCount: 0,
        averageOrderValue: 0
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Gross Sales */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-bold uppercase ">Gross Sales</span>
                    <DollarSign className="size-4 text-muted-foreground/80" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-foreground">
                        ₱{summary.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-xs text-muted-foreground font-semibold">Before discounts apply</span>
                </div>
            </div>

            {/* Net Sales */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs bg-gradient-to-br from-primary/5 to-transparent space-y-2">
                <div className="flex justify-between items-center text-primary">
                    <span className="text-xs font-bold uppercase ">Net Revenue</span>
                    <TrendingUp className="size-4 text-primary" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-primary">₱{summary.netSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    <span className="text-xs text-primary/80 font-bold">Total earnings in register</span>
                </div>
            </div>

            {/* Discounts */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-amber-600">
                    <span className="text-xs font-bold uppercase ">Discounts Deducted</span>
                    <Percent className="size-4 text-amber-600/80" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-amber-600">
                        ₱{summary.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-xs text-muted-foreground font-semibold">Senior Citizen & PWD discounts</span>
                </div>
            </div>

            {/* Total Orders */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-bold uppercase ">Total Orders</span>
                    <ShoppingBag className="size-4 text-muted-foreground/80" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-foreground">{summary.orderCount}</h3>
                    <span className="text-xs text-muted-foreground font-semibold">Completed customer purchases</span>
                </div>
            </div>

            {/* AOV */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-xs font-bold uppercase ">Average Order</span>
                    <Coffee className="size-4 text-muted-foreground/80" />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-foreground">
                        ₱{summary.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-xs text-muted-foreground font-semibold">Average receipt ticket value</span>
                </div>
            </div>
        </div>
    );
}
