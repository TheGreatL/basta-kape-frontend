import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import type { IDashboardDateRange } from '../dashboard.types';

interface DashboardSalesTrendProps {
    dailyTrend: Array<{
        date: string;
        sales: number;
        count?: number;
    }>;
    isLoading?: boolean;
    dateRange: IDashboardDateRange;
}

export function DashboardSalesTrend({ dailyTrend, isLoading, dateRange }: DashboardSalesTrendProps) {
    const periodLabel = dateRange.label;

    return (
        <Card className="lg:col-span-2 shadow-2xs border-border/60 rounded-2xl">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Sales Trend ({periodLabel})</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Net revenue trend for {dateRange.displayPeriod}.</CardDescription>
            </CardHeader>
            <CardContent className="h-[260px] pt-4">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <Spinner className="size-6 text-primary animate-spin" />
                    </div>
                ) : dailyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorDashboardSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                style={{ fontSize: '10px', fill: '#64748b', fontWeight: 600 }}
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
                                style={{ fontSize: '10px', fill: '#64748b', fontWeight: 600 }}
                                tickFormatter={(val) => `₱${val.toLocaleString()}`}
                            />
                            <Tooltip
                                formatter={(value: any) => [
                                    `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                    'Net Sales'
                                ]}
                                labelFormatter={(label) => {
                                    try {
                                        return format(new Date(label), 'EEEE, MMMM dd, yyyy');
                                    } catch {
                                        return label;
                                    }
                                }}
                                contentStyle={{
                                    borderRadius: '12px',
                                    borderColor: '#e2e8f0',
                                    fontSize: '11px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="sales"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorDashboardSales)"
                                dot={{ r: 4, fill: '#6366f1' }}
                                activeDot={{ r: 6 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground font-semibold">
                        No sales recorded for this period.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
