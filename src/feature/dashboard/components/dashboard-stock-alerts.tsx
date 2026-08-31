import { Link } from '@tanstack/react-router';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Progress } from '#/components/ui/progress.tsx';
import { cn } from '#/lib/utils.ts';
import type { DashboardLowStockItem } from '../dashboard.types';

interface DashboardStockAlertsProps {
    outOfStockCount: number;
    criticalCount: number;
    lowStockItems: DashboardLowStockItem[];
}

export function DashboardStockAlerts({ outOfStockCount, criticalCount, lowStockItems }: DashboardStockAlertsProps) {
    return (
        <Card className="shadow-2xs border-border/60 rounded-2xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-sm font-bold text-foreground">Live Stock Alerts</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Ingredients requiring immediate replenishment.</CardDescription>
                </div>
                <Link to="/admin/inventory">
                    <Button variant="ghost" size="icon" className="size-7 rounded-lg">
                        <ChevronRight className="size-4 text-muted-foreground" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-2.5 flex flex-col items-center">
                        <span className="text-lg font-bold text-rose-500">{outOfStockCount}</span>
                        <span className="text-[11px] uppercase font-bold text-muted-foreground">Out of Stock</span>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-2.5 flex flex-col items-center">
                        <span className="text-lg font-bold text-amber-500">{criticalCount}</span>
                        <span className="text-[11px] uppercase font-bold text-muted-foreground">Critical Stock</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Top Bottlenecks</h4>
                    {lowStockItems.length > 0 ? (
                        <div className="space-y-2.5">
                            {lowStockItems.map((item) => (
                                <div key={item.id} className="space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-foreground leading-tight">{item.name}</span>
                                        <span className={cn('font-bold', item.status === 'OUT_OF_STOCK' ? 'text-rose-500' : 'text-amber-500')}>
                                            {item.currentQuantity} {item.unit}
                                        </span>
                                    </div>
                                    <Progress
                                        value={item.status === 'OUT_OF_STOCK' ? 0 : 25}
                                        className={cn(
                                            'h-1.5',
                                            item.status === 'OUT_OF_STOCK'
                                                ? '[&>[data-slot=progress-indicator]]:bg-rose-500'
                                                : '[&>[data-slot=progress-indicator]]:bg-amber-500'
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-xs text-emerald-600 bg-emerald-500/5 rounded-xl border border-emerald-500/10 font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="size-4 text-emerald-500" />
                            All ingredients are well-stocked!
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
