import { TrendingDown, Cookie, Package, Layers, AlertOctagon } from 'lucide-react';
import { Card } from '#/components/ui/card.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import type { IDisposalSummary } from '../disposal.types';

interface DisposalSummaryCardsProps {
    summary: IDisposalSummary | undefined;
    isLoading: boolean;
}

export default function DisposalSummaryCards({ summary, isLoading }: DisposalSummaryCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-4 bg-card/60 border-border/60">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-7 w-32 mb-1" />
                        <Skeleton className="h-3 w-40" />
                    </Card>
                ))}
            </div>
        );
    }

    const totalLoss = summary?.totalFinancialLoss || 0;
    const prepLoss = summary?.preparedFoodLoss || 0;
    const rawLoss = summary?.rawIngredientLoss || 0;
    const totalCount = summary?.totalWastedItemsCount || 0;
    const topWasted = summary?.topWastedItems || [];

    return (
        <div className="space-y-4">
            {/* Top 4 KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Financial Loss */}
                <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Total Loss Value</span>
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            <TrendingDown className="size-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                            ₱{totalLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Combined raw material & prepared waste</p>
                    </div>
                </Card>

                {/* Prepared Food Loss */}
                <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Prepared Food Loss</span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <Cookie className="size-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            ₱{prepLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Expired/spoiled display & baked batches</p>
                    </div>
                </Card>

                {/* Raw Material Loss */}
                <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Raw Material Loss</span>
                        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20">
                            <Package className="size-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                            ₱{rawLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Inventory ingredient shrinkage & spoilage</p>
                    </div>
                </Card>

                {/* Total Wasted Units */}
                <Card className="p-4 border-border/60 bg-card/60 backdrop-blur-xs relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Total Items Discarded</span>
                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Layers className="size-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-foreground">{totalCount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-0.5">Total quantity of units/ingredients logged</p>
                    </div>
                </Card>
            </div>

            {/* Top Wasted Items Ranking Snippet */}
            {topWasted.length > 0 && (
                <Card className="p-4 border-border/60 bg-card/40 backdrop-blur-xs">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <AlertOctagon className="size-4 text-amber-500" />
                            <span className="text-xs font-bold text-foreground uppercase">Top Loss Contributors</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Ranked by total monetary cost</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                        {topWasted.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col p-2.5 rounded-xl bg-background/60 border border-border/50 hover:border-border transition-colors justify-between"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-bold text-foreground truncate max-w-[120px]" title={item.name}>
                                            {item.name}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={`text-xs py-0 px-1 font-bold ${
                                                item.category === 'PREPARED_FOOD'
                                                    ? 'text-amber-600 bg-amber-500/10 border-amber-500/20'
                                                    : 'text-sky-600 bg-sky-500/10 border-sky-500/20'
                                            }`}
                                        >
                                            {item.category === 'PREPARED_FOOD' ? 'Pastry' : 'Raw'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {item.totalQuantity.toLocaleString()} {item.unit}
                                    </p>
                                </div>
                                <div className="mt-2 pt-1 border-t border-border/40 flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Cost Loss</span>
                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">₱{item.totalCostLoss.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
