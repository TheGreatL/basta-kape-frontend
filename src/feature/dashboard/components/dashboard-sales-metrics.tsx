import { TrendingUp, DollarSign, Percent, ShoppingBag, Coffee, ArrowUpRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import type { DashboardSalesMetrics, IDashboardDateRange } from '../dashboard.types';

interface DashboardSalesMetricsProps {
    metrics?: DashboardSalesMetrics;
    isLoading?: boolean;
    dateRange: IDashboardDateRange;
}

export function DashboardSalesMetricsCards({ metrics, isLoading, dateRange }: DashboardSalesMetricsProps) {
    const periodLabel = dateRange.label;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-card border border-border/60 rounded-2xl p-5 space-y-3">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-7 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const grossSales = metrics?.grossSales ?? 0;
    const netSales = metrics?.netSales ?? 0;
    const discountTotal = metrics?.discountTotal ?? 0;
    const orderCount = metrics?.orderCount ?? 0;
    const averageOrderValue = metrics?.averageOrderValue ?? 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">
                        {periodLabel === 'Today' ? "Today's Sales Performance" : `${periodLabel}'s Sales Performance`}
                    </h2>
                </div>
                <Link to="/admin/sales" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
                    View Full Performance <ArrowUpRight className="size-3.5" />
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Net Revenue (Key Highlighted Metric) */}
                <div className="bg-card border border-primary/20 rounded-2xl p-5 shadow-2xs bg-gradient-to-br from-primary/5 to-transparent space-y-2">
                    <div className="flex justify-between items-center text-primary">
                        <span className="text-xs font-bold uppercase">Net Revenue</span>
                        <TrendingUp className="size-4 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-xl font-bold text-primary">
                            ₱{netSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <span className="text-xs text-primary/80 font-bold">Total earnings ({periodLabel})</span>
                    </div>
                </div>

                {/* Gross Sales */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-muted-foreground">
                        <span className="text-xs font-bold uppercase">Gross Sales</span>
                        <DollarSign className="size-4 text-muted-foreground/80" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-bold text-foreground">
                            ₱{grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <span className="text-xs text-muted-foreground font-semibold">Before deductions</span>
                    </div>
                </div>

                {/* Total Orders */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-muted-foreground">
                        <span className="text-xs font-bold uppercase">Total Orders</span>
                        <ShoppingBag className="size-4 text-muted-foreground/80" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-bold text-foreground">{orderCount.toLocaleString()}</h3>
                        <span className="text-xs text-muted-foreground font-semibold">Completed order count</span>
                    </div>
                </div>

                {/* Average Receipt */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-muted-foreground">
                        <span className="text-xs font-bold uppercase">Average Order</span>
                        <Coffee className="size-4 text-muted-foreground/80" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-bold text-foreground">
                            ₱{averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <span className="text-xs text-muted-foreground font-semibold">Avg ticket size</span>
                    </div>
                </div>

                {/* Discounts Deducted */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-amber-600">
                        <span className="text-xs font-bold uppercase">Discounts</span>
                        <Percent className="size-4 text-amber-600/80" />
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-bold text-amber-600">
                            ₱{discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <span className="text-xs text-muted-foreground font-semibold">Deductions applied</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
