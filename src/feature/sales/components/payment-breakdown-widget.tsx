import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

interface PaymentBreakdownWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

export default function PaymentBreakdownWidget({ dateFrom, dateTo }: PaymentBreakdownWidgetProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'payment-breakdown', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'payment-breakdown')
    });

    const paymentData = React.useMemo(() => {
        if (!data?.paymentBreakdown) return [];
        return Object.entries(data.paymentBreakdown)
            .map(([name, val]: [string, any]) => ({
                name: name.toLowerCase().replace('_', ' '),
                value: val.revenue,
                count: val.count
            }))
            .filter((item) => item.value > 0);
    }, [data?.paymentBreakdown]);

    if (isLoading) {
        return (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs flex flex-col min-h-[300px]">
                <Skeleton className="h-4 w-44 mb-6" />
                <div className="flex-1 flex items-end justify-between gap-6 h-[180px] w-full pt-4">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                            <Skeleton className="w-full rounded-t-lg bg-accent/60" style={{ height: `${(idx + 1) * 35 + 20}px` }} />
                            <Skeleton className="h-3 w-12" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-2xs flex flex-col items-center justify-center min-h-[300px] text-xs text-rose-500 font-bold">
                Failed to load payment breakdown data.
            </div>
        );
    }

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs flex flex-col">
            <h3 className="text-sm font-bold text-foreground mb-4">Payment Methods Revenue</h3>
            <div className="flex-1 flex items-center justify-center">
                {paymentData.length > 0 ? (
                    <div className="h-[180px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={paymentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    style={{ fontSize: '9px', fill: '#64748b', fontWeight: 'semibold', textTransform: 'capitalize' }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    style={{ fontSize: '9px', fill: '#64748b', fontWeight: 'semibold' }}
                                    tickFormatter={(val) => `₱${val}`}
                                />
                                <Tooltip
                                    formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Revenue']}
                                    contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '10px' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {paymentData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="text-center py-12 text-xs text-muted-foreground font-semibold">No payment methods revenue details.</div>
                )}
            </div>
        </div>
    );
}
