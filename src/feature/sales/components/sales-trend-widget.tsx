import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import type { TDailyFinancialTrend } from '../sales.types';
import { Button } from '#/components/ui/button.tsx';
import { cn } from '#/lib/utils.ts';

interface SalesTrendWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

type TSalesTrendMetric = 'revenue' | 'orders';

export default function SalesTrendWidget({ dateFrom, dateTo }: SalesTrendWidgetProps) {
    const [activeMetric, setActiveMetric] = React.useState<TSalesTrendMetric>('revenue');

    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'daily-trend', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'daily-trend')
    });

    if (isLoading) {
        return (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-7 w-36 rounded-lg" />
                </div>
                <Skeleton className="h-[280px] w-full rounded-xl" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-2xs flex flex-col items-center justify-center min-h-[340px] text-xs text-rose-500 font-bold">
                Failed to load daily sales trend chart.
            </div>
        );
    }

    const dailyTrend: TDailyFinancialTrend[] = data?.dailyTrend || [];

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-foreground">Daily Sales Revenue Trend</h3>
                    <p className="text-xs text-muted-foreground">Track daily sales earnings and order volume over time.</p>
                </div>

                {/* Metric Filter Tabs */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMetric('revenue')}
                        className={cn(
                            'h-7 px-3 text-xs font-semibold rounded-lg transition-all',
                            activeMetric === 'revenue' && 'bg-background shadow-xs text-primary font-bold'
                        )}
                    >
                        Sales Revenue (₱)
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMetric('orders')}
                        className={cn(
                            'h-7 px-3 text-xs font-semibold rounded-lg transition-all',
                            activeMetric === 'orders' && 'bg-background shadow-xs text-foreground font-bold'
                        )}
                    >
                        Order Volume (#)
                    </Button>
                </div>
            </div>

            <div className="h-[300px] w-full pt-2">
                {dailyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSalesRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.28} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="colorOrderCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.28} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                className="text-xs font-semibold fill-muted-foreground"
                                tickFormatter={(str) => {
                                    try {
                                        return format(new Date(str), 'MMM d');
                                    } catch {
                                        return str;
                                    }
                                }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                className="text-xs font-semibold fill-muted-foreground"
                                tickFormatter={(val) => (activeMetric === 'revenue' ? `₱${val}` : `${val}`)}
                            />
                            <Tooltip
                                formatter={(value: any, name: any) => {
                                    if (name === 'sales' || name === 'Revenue') {
                                        return [`₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Net Sales'];
                                    }
                                    return [`${Number(value).toLocaleString()} orders`, 'Completed Orders'];
                                }}
                                labelFormatter={(label) => {
                                    try {
                                        return format(new Date(label), 'EEEE, MMMM dd, yyyy');
                                    } catch {
                                        return label;
                                    }
                                }}
                                wrapperClassName="text-xs"
                                contentStyle={{
                                    borderRadius: '12px',
                                    borderColor: '#e2e8f0',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                }}
                            />
                            {activeMetric === 'revenue' ? (
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorSalesRevenue)"
                                    name="sales"
                                />
                            ) : (
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#0ea5e9"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorOrderCount)"
                                    name="count"
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-semibold">
                        No sales records found within this timeframe.
                    </div>
                )}
            </div>
        </div>
    );
}
