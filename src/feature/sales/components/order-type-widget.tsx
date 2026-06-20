import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

interface OrderTypeWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

export default function OrderTypeWidget({ dateFrom, dateTo }: OrderTypeWidgetProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'order-type-breakdown', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'order-type-breakdown')
    });

    const orderTypeData = React.useMemo(() => {
        if (!data?.orderTypeBreakdown) return [];
        return Object.entries(data.orderTypeBreakdown)
            .map(([name, val]: [string, any]) => ({
                name: name.replace('_', ' '),
                value: val.revenue,
                count: val.count
            }))
            .filter((item) => item.value > 0);
    }, [data?.orderTypeBreakdown]);

    if (isLoading) {
        return (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs flex flex-col min-h-[300px]">
                <Skeleton className="h-4 w-44 mb-6" />
                <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6">
                    <Skeleton className="size-[140px] rounded-full" />
                    <div className="flex flex-col gap-2 shrink-0">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <Skeleton className="size-3 rounded-xs shrink-0" />
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-2.5 w-28" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-2xs flex flex-col items-center justify-center min-h-[300px] text-xs text-rose-500 font-bold">
                Failed to load dining methods data.
            </div>
        );
    }

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs flex flex-col">
            <h3 className="text-sm font-bold text-foreground mb-4">Dining Methods Distribution</h3>
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6">
                {orderTypeData.length > 0 ? (
                    <>
                        <div className="h-[140px] w-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={orderTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={3} dataKey="value">
                                        {orderTypeData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                            {orderTypeData.map((item, index) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div className="size-3 rounded-xs shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-foreground uppercase">{item.name}</span>
                                        <span className="text-xs text-muted-foreground font-semibold">
                                            ₱{item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({item.count} orders)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-xs text-muted-foreground font-semibold">No dining method sales data.</div>
                )}
            </div>
        </div>
    );
}
