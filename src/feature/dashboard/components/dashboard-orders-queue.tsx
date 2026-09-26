import { Link } from '@tanstack/react-router';
import { Clock, Coffee, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '#/components/ui/table.tsx';
import { cn } from '#/lib/utils.ts';
import type { DashboardRecentOrder } from '../dashboard.types';

interface DashboardOrdersQueueProps {
    queueStats: {
        pending: number;
        preparing: number;
        ready: number;
    };
    recentOrders: DashboardRecentOrder[];
}

export function DashboardOrdersQueue({ queueStats, recentOrders }: DashboardOrdersQueueProps) {
    return (
        <Card className="lg:col-span-2 shadow-2xs border-border/60 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-sm font-bold text-foreground">Order Queue & Recent Orders</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Live barista queue and latest orders.</CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                    <Link to="/admin/orders" search={{} as any}>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-bold px-3">
                            All Orders
                        </Button>
                    </Link>
                    <Link to="/admin/order-queue">
                        <Button size="sm" className="h-8 text-xs font-bold px-3">
                            Order Queue
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Real-time Queue Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex flex-col items-center justify-center">
                        <Clock className="size-4 text-amber-500 mb-1" />
                        <span className="text-xl font-bold text-amber-500">{queueStats.pending}</span>
                        <span className="text-xs uppercase font-bold text-muted-foreground">Pending</span>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 flex flex-col items-center justify-center">
                        <Coffee className="size-4 text-blue-500 mb-1" />
                        <span className="text-xl font-bold text-blue-500">{queueStats.preparing}</span>
                        <span className="text-xs uppercase font-bold text-muted-foreground">Preparing</span>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex flex-col items-center justify-center">
                        <CheckCircle2 className="size-4 text-emerald-500 mb-1" />
                        <span className="text-xl font-bold text-emerald-500">{queueStats.ready}</span>
                        <span className="text-xs uppercase font-bold text-muted-foreground">Ready</span>
                    </div>
                </div>

                {/* Recent Orders List */}
                <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Recent Orders</h4>
                    {recentOrders.length > 0 ? (
                        <div className="overflow-hidden border border-border/50 rounded-xl">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="font-bold text-xs uppercase">Queue #</TableHead>
                                        <TableHead className="font-bold text-xs uppercase">Customer</TableHead>
                                        <TableHead className="font-bold text-xs uppercase">Type</TableHead>
                                        <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                                        <TableHead className="font-bold text-xs uppercase text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentOrders.map((order) => (
                                        <TableRow key={order.id} className="hover:bg-muted/10">
                                            <TableCell className="font-bold text-xs text-foreground">#{order.queueNumber}</TableCell>
                                            <TableCell className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                                                {order.customerName || 'Walk-in'}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-medium">
                                                {order.orderType.replace('_', ' ')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        order.status === 'COMPLETED'
                                                            ? 'default'
                                                            : order.status === 'PENDING'
                                                              ? 'secondary'
                                                              : order.status === 'PREPARING'
                                                                ? 'outline'
                                                                : order.status === 'READY'
                                                                  ? 'secondary'
                                                                  : 'destructive'
                                                    }
                                                    className={cn(
                                                        'text-xs font-bold uppercase px-2 py-0.5 rounded-sm',
                                                        order.status === 'COMPLETED' && 'bg-emerald-500/10 text-emerald-600 border-transparent',
                                                        order.status === 'PREPARING' && 'bg-blue-500/10 text-blue-600 border-transparent',
                                                        order.status === 'READY' && 'bg-indigo-500/10 text-indigo-600 border-transparent',
                                                        order.status === 'PENDING' && 'bg-amber-500/10 text-amber-600 border-transparent'
                                                    )}
                                                >
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-bold text-xs text-right">
                                                ₱{order.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-xs text-muted-foreground font-semibold">No recent orders found.</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
