import { CreditCard, Utensils, Banknote, Smartphone, ShoppingBag, Globe, Store } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';
import { Progress } from '#/components/ui/progress.tsx';
import type { DashboardPaymentBreakdown, DashboardChannelBreakdown } from '../dashboard.types';

interface DashboardBreakdownProps {
    paymentBreakdown?: DashboardPaymentBreakdown[];
    channelBreakdown?: DashboardChannelBreakdown[];
}

export function DashboardBreakdown({ paymentBreakdown = [], channelBreakdown = [] }: DashboardBreakdownProps) {
    const getPaymentIcon = (method: string) => {
        const lower = method.toLowerCase();
        if (lower.includes('cash')) return <Banknote className="size-4 text-emerald-600 dark:text-emerald-400" />;
        if (lower.includes('gcash') || lower.includes('online') || lower.includes('wallet')) {
            return <Smartphone className="size-4 text-blue-600 dark:text-blue-400" />;
        }
        return <CreditCard className="size-4 text-primary" />;
    };

    const getChannelIcon = (channel: string) => {
        const upper = channel.toUpperCase();
        if (upper === 'DINE_IN') return <Store className="size-4 text-amber-600 dark:text-amber-400" />;
        if (upper === 'TAKE_OUT') return <ShoppingBag className="size-4 text-primary" />;
        if (upper === 'DELIVERY' || upper === 'ONLINE') return <Globe className="size-4 text-indigo-600 dark:text-indigo-400" />;
        return <Utensils className="size-4 text-muted-foreground" />;
    };

    const formatChannelName = (channel: string) => {
        const upper = channel.toUpperCase();
        if (upper === 'DINE_IN') return 'Dine-In';
        if (upper === 'TAKE_OUT') return 'Take-Out';
        if (upper === 'DELIVERY') return 'Online / Delivery';
        return channel;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Methods Breakdown */}
            <Card className="shadow-2xs border-border/60 rounded-2xl">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                            <CreditCard className="size-4 text-primary" /> Payment Methods
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Revenue share by settlement method (Cash vs. E-Wallet)
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {paymentBreakdown.length > 0 ? (
                        <div className="space-y-3.5">
                            {paymentBreakdown.map((item) => (
                                <div key={item.paymentMethod} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-2 font-bold text-foreground">
                                            {getPaymentIcon(item.paymentMethod)}
                                            <span>{item.paymentMethod}</span>
                                            <span className="text-[11px] font-semibold text-muted-foreground">
                                                ({item.count} {item.count === 1 ? 'txn' : 'txns'})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-foreground">
                                                ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[11px] font-bold text-muted-foreground">{item.percentage}%</span>
                                        </div>
                                    </div>
                                    <Progress value={item.percentage} className="h-2 [&>[data-slot=progress-indicator]]:bg-primary" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-xs text-muted-foreground">No payment transactions recorded for this period.</div>
                    )}
                </CardContent>
            </Card>

            {/* Sales Channels Breakdown */}
            <Card className="shadow-2xs border-border/60 rounded-2xl">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Utensils className="size-4 text-primary" /> Sales Channels
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Volume distribution across Dine-In, Take-Out, and Online orders
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {channelBreakdown.length > 0 ? (
                        <div className="space-y-3.5">
                            {channelBreakdown.map((item) => (
                                <div key={item.channel} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-2 font-bold text-foreground">
                                            {getChannelIcon(item.channel)}
                                            <span>{formatChannelName(item.channel)}</span>
                                            <span className="text-[11px] font-semibold text-muted-foreground">
                                                ({item.count} {item.count === 1 ? 'order' : 'orders'})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-foreground">
                                                ₱{item.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[11px] font-bold text-muted-foreground">{item.percentage}%</span>
                                        </div>
                                    </div>
                                    <Progress
                                        value={item.percentage}
                                        className="h-2 [&>[data-slot=progress-indicator]]:bg-amber-600 dark:[&>[data-slot=progress-indicator]]:bg-amber-500"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-xs text-muted-foreground">No orders recorded for this period.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
