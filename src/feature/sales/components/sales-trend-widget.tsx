import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';

interface SalesTrendWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

export default function SalesTrendWidget({ dateFrom, dateTo }: SalesTrendWidgetProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'daily-trend', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'daily-trend')
    });

    if (isLoading) {
        return (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                <Skeleton className="h-4 w-32" />
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

    const dailyTrend = data?.dailyTrend || [];

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-foreground mb-4">Daily Sales Trend</h3>
            <div className="h-[280px] w-full">
                {dailyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'semibold' }}
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
                                style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'semibold' }}
                                tickFormatter={(val) => `₱${val}`}
                            />
                            <Tooltip
                                formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Net Sales']}
                                labelFormatter={(label) => {
                                    try {
                                        return format(new Date(label), 'EEEE, MMMM dd, yyyy');
                                    } catch {
                                        return label;
                                    }
                                }}
                                contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '11px' }}
                            />
                            <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
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
