import { Link } from '@tanstack/react-router';
import { ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Progress } from '#/components/ui/progress.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { cn } from '#/lib/utils.ts';
import type { DashboardLowStockItem, DashboardExpiringBatch } from '../dashboard.types';

interface DashboardStockAlertsProps {
    outOfStockCount: number;
    criticalCount: number;
    lowStockItems: DashboardLowStockItem[];
    expiringBatches?: DashboardExpiringBatch[];
}

export function DashboardStockAlerts({ outOfStockCount, criticalCount, lowStockItems, expiringBatches = [] }: DashboardStockAlertsProps) {
    const expiringCount = expiringBatches.length;

    const formatExpiry = (dateStr: string) => {
        try {
            return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
        } catch {
            return 'Soon';
        }
    };

    return (
        <Card className="shadow-2xs border-border/60 rounded-2xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-sm font-bold text-foreground">Live Stock & Shelf-Life Alerts</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        Ingredients to reorder and prepared items nearing expiration.
                    </CardDescription>
                </div>
                <Link to="/admin/inventory">
                    <Button variant="ghost" size="icon" className="size-7 rounded-lg">
                        <ChevronRight className="size-4 text-muted-foreground" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-2.5 flex flex-col items-center">
                        <span className="text-base sm:text-lg font-bold text-rose-500">{outOfStockCount}</span>
                        <span className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground text-center">Out of Stock</span>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-2.5 flex flex-col items-center">
                        <span className="text-base sm:text-lg font-bold text-amber-500">{criticalCount}</span>
                        <span className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground text-center">Critical</span>
                    </div>
                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-2.5 flex flex-col items-center">
                        <span className="text-base sm:text-lg font-bold text-orange-500">{expiringCount}</span>
                        <span className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground text-center">Expiring &lt;48h</span>
                    </div>
                </div>

                {/* Section 1: Raw Ingredient Bottlenecks */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Raw Ingredient Bottlenecks</h4>
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
                        <div className="text-center py-3 text-xs text-emerald-600 bg-emerald-500/5 rounded-xl border border-emerald-500/10 font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="size-4 text-emerald-500" />
                            All raw ingredients well-stocked!
                        </div>
                    )}
                </div>

                {/* Section 2: Shelf-Life / Prepared Food Batches Nearing Expiry */}
                {expiringBatches.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                <Clock className="size-3" /> Prepared Shelf Batches (&lt;48h)
                            </h4>
                            <Link to="/admin/food-prep" className="text-[10px] font-bold text-primary hover:underline">
                                Food Prep
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {expiringBatches.map((batch) => (
                                <div
                                    key={batch.id}
                                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/15 text-xs"
                                >
                                    <div className="space-y-0.5 min-w-0">
                                        <div className="font-bold text-foreground truncate">
                                            {batch.productName}{' '}
                                            {batch.variantTitle && (
                                                <span className="text-[10px] font-normal text-muted-foreground">({batch.variantTitle})</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-mono">
                                            #{batch.batchNumber} • {batch.currentQuantity} servings left
                                        </div>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="shrink-0 text-[10px] font-bold text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950 dark:text-orange-300"
                                    >
                                        Exp. {formatExpiry(batch.expiryDate)}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
