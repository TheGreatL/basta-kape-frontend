import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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

type TMetricKey = 'all' | 'sales' | 'expenses' | 'losses' | 'netProfit';

export default function SalesTrendWidget({ dateFrom, dateTo }: SalesTrendWidgetProps) {
    const [activeMetric, setActiveMetric] = React.useState<TMetricKey>('all');

    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'daily-trend', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'daily-trend')
    });

    if (isLoading) {
        return (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-7 w-48 rounded-lg" />
                </div>
                <Skeleton className="h-[280px] w-full rounded-xl" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-2xs flex flex-col items-center justify-center min-h-[340px] text-xs text-rose-500 font-bold">
                Failed to load daily financial trend chart.
            </div>
        );
    }

    const dailyTrend: TDailyFinancialTrend[] = data?.dailyTrend || [];

    const showSales = activeMetric === 'all' || activeMetric === 'sales';
    const showExpenses = activeMetric === 'all' || activeMetric === 'expenses';
    const showLosses = activeMetric === 'all' || activeMetric === 'losses';
    const showNetProfit = activeMetric === 'all' || activeMetric === 'netProfit';

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-foreground">Daily Sales & Spending Trend</h3>
                    <p className="text-xs text-muted-foreground">Compare daily earnings against stock purchases and wasted items.</p>
                </div>

                {/* Metric Filter Tabs */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMetric('all')}
                        className={cn(
                            'h-7 px-2.5 text-xs font-semibold rounded-lg transition-all',
                            activeMetric === 'all' && 'bg-background shadow-xs text-foreground font-bold'
                        )}
                    >
                        All
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMetric('sales')}
                        className={cn(
                            'h-7 px-2 text-xs font-semibold rounded-lg text-primary transition-all',
                            activeMetric === 'sales' && 'bg-background shadow-xs text-primary font-bold'
                        )}
                    >
                        Sales
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMetric('expenses')}
                        className={cn(
                            'h-7 px-2 text-xs font-semibold rounded-lg text-amber-600 transition-all',
                            activeMetric === 'expenses' && 'bg-background shadow-xs text-amber-600 font-bold'
                        )}
                    >
                        Stock Spending
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMetric('losses')}
                        className={cn(
                            'h-7 px-2 text-xs font-semibold rounded-lg text-rose-600 transition-all',
                            activeMetric === 'losses' && 'bg-background shadow-xs text-rose-600 font-bold'
                        )}
                    >
                        Wasted
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMetric('netProfit')}
                        className={cn(
                            'h-7 px-2 text-xs font-semibold rounded-lg text-emerald-600 transition-all',
                            activeMetric === 'netProfit' && 'bg-background shadow-xs text-emerald-600 font-bold'
                        )}
                    >
                        Profit
                    </Button>
                </div>
            </div>

            <div className="h-[280px] w-full pt-2">
                {dailyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorLosses" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorNetProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
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
                                tickFormatter={(val) => `₱${val}`}
                            />
                            <Tooltip
                                formatter={(value: any, name: any) => {
                                    const labels: Record<string, string> = {
                                        sales: 'Net Sales',
                                        expenses: 'Stock Purchases',
                                        losses: 'Wasted & Expired',
                                        netProfit: 'Net Profit'
                                    };
                                    return [`₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, labels[name] || name];
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
                            {showSales && (
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                    name="sales"
                                />
                            )}
                            {showExpenses && (
                                <Area
                                    type="monotone"
                                    dataKey="expenses"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorExpenses)"
                                    name="expenses"
                                />
                            )}
                            {showLosses && (
                                <Area
                                    type="monotone"
                                    dataKey="losses"
                                    stroke="#f43f5e"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorLosses)"
                                    name="losses"
                                />
                            )}
                            {showNetProfit && (
                                <Area
                                    type="monotone"
                                    dataKey="netProfit"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorProfit)"
                                    name="netProfit"
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-semibold">
                        No financial records found within this timeframe.
                    </div>
                )}
            </div>
        </div>
    );
}
