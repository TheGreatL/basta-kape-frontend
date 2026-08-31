import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Package, Flame, AlertCircle, Sparkles, Scale, RefreshCw, ShoppingCart } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { getSalesAnalytics } from '#/api/reports.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import type { TStockTransactionCostSummary } from '../sales.types';
import { cn } from '#/lib/utils.ts';

interface InventoryStockCostingWidgetProps {
    dateFrom?: string;
    dateTo?: string;
}

const TRANSACTION_CONFIG: Record<string, { label: string; description: string; icon: React.ElementType; colorClass: string; bgClass: string }> = {
    DELIVERY: {
        label: 'Deliveries Received',
        description: 'New supplies from suppliers',
        icon: ShoppingCart,
        colorClass: 'text-amber-700 dark:text-amber-400',
        bgClass: 'bg-amber-500/10 border-amber-500/20'
    },
    SALE: {
        label: 'Used for Orders',
        description: 'Ingredients used for food & drinks',
        icon: Flame,
        colorClass: 'text-indigo-700 dark:text-indigo-400',
        bgClass: 'bg-indigo-500/10 border-indigo-500/20'
    },
    WASTE: {
        label: 'Kitchen Prep Waste',
        description: 'Spills and barista prep waste',
        icon: AlertCircle,
        colorClass: 'text-rose-700 dark:text-rose-400',
        bgClass: 'bg-rose-500/10 border-rose-500/20'
    },
    SPOILED: {
        label: 'Spoiled Ingredients',
        description: 'Spoiled or bad ingredients',
        icon: AlertCircle,
        colorClass: 'text-rose-700 dark:text-rose-400',
        bgClass: 'bg-rose-500/10 border-rose-500/20'
    },
    EXPIRED: {
        label: 'Expired Stock',
        description: 'Expired shelf stock',
        icon: AlertCircle,
        colorClass: 'text-red-700 dark:text-red-400',
        bgClass: 'bg-red-500/10 border-red-500/20'
    },
    THEFT: {
        label: 'Missing Stock',
        description: 'Unaccounted physical losses',
        icon: AlertCircle,
        colorClass: 'text-orange-700 dark:text-orange-400',
        bgClass: 'bg-orange-500/10 border-orange-500/20'
    },
    PROMOTIONAL_USE: {
        label: 'Free Samples & Tastings',
        description: 'Customer tastings and promo drinks',
        icon: Sparkles,
        colorClass: 'text-purple-700 dark:text-purple-400',
        bgClass: 'bg-purple-500/10 border-purple-500/20'
    },
    PHYSICAL_COUNT_CORRECTION: {
        label: 'Count Adjustments',
        description: 'Manual stock count updates',
        icon: Scale,
        colorClass: 'text-sky-700 dark:text-sky-400',
        bgClass: 'bg-sky-500/10 border-sky-500/20'
    }
};

export default function InventoryStockCostingWidget({ dateFrom, dateTo }: InventoryStockCostingWidgetProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: [QUERY_KEY.SALES.SALES_ANALYTICS, 'stock-transactions', { dateFrom, dateTo }],
        queryFn: () => getSalesAnalytics(dateFrom || undefined, dateTo || undefined, 'stock-transactions')
    });

    if (isLoading) {
        return (
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-4">
                <Skeleton className="h-4 w-60" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-20 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-card border border-destructive/20 bg-destructive/5 rounded-2xl p-6 shadow-2xs flex flex-col items-center justify-center min-h-[260px] text-xs text-rose-500 font-bold">
                Failed to load stock transaction costing data.
            </div>
        );
    }

    const summary: TStockTransactionCostSummary = data?.stockTransactionsSummary || {
        totalStockTransactionsCount: 0,
        totalCogs: 0,
        totalProcurement: 0,
        totalWastage: 0,
        totalCorrections: 0,
        transactionsByType: {},
        topConsumedIngredients: []
    };

    const typeEntries = Object.entries(summary.transactionsByType).filter(([_, val]) => val.count > 0 || val.totalCost > 0);

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-6">
            {/* Header & Quick Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                        <ArrowLeftRight className="size-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Stock Activity & Ingredient Costs</h3>
                        <p className="text-xs text-muted-foreground">Cost of ingredients used, supplies bought, and items wasted.</p>
                    </div>
                </div>
                <Link
                    to="/admin/inventory/transactions"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
                >
                    View Stock Log <Package className="size-3" />
                </Link>
            </div>

            {/* High-Level Cost Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. COGS (Raw Usage) */}
                <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                        <span>Ingredients Used (Orders)</span>
                        <Flame className="size-3.5" />
                    </div>
                    <div className="text-base font-bold text-foreground">
                        ₱{summary.totalCogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-muted-foreground block">Used to make food & drinks</span>
                </div>

                {/* 2. Total Inward Procurement */}
                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold text-amber-700 dark:text-amber-400">
                        <span>Deliveries Received</span>
                        <ShoppingCart className="size-3.5" />
                    </div>
                    <div className="text-base font-bold text-foreground">
                        ₱{summary.totalProcurement.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-muted-foreground block">New stock bought from suppliers</span>
                </div>

                {/* 3. Total Stock Wastage */}
                <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold text-rose-700 dark:text-rose-400">
                        <span>Wasted Ingredients</span>
                        <AlertCircle className="size-3.5" />
                    </div>
                    <div className="text-base font-bold text-foreground">
                        ₱{summary.totalWastage.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-muted-foreground block">Spills, expired & spoiled items</span>
                </div>

                {/* 4. Total Logged Movements */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                        <span>Stock Activities</span>
                        <RefreshCw className="size-3.5" />
                    </div>
                    <div className="text-base font-bold text-foreground">{summary.totalStockTransactionsCount.toLocaleString()} activities</div>
                    <span className="text-xs text-muted-foreground block">Total stock entries recorded</span>
                </div>
            </div>

            {/* Two-Column Grid: Transaction Type Breakdown + Top Consumed Ingredients */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Transaction Type Valuation Breakdown */}
                <div className="space-y-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase block">Stock Activity by Type</span>

                    {typeEntries.length > 0 ? (
                        <div className="space-y-2">
                            {typeEntries.map(([typeKey, dataVal]) => {
                                const cfg = TRANSACTION_CONFIG[typeKey];
                                const IconComponent = cfg.icon;

                                return (
                                    <div
                                        key={typeKey}
                                        className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                            <div
                                                className={cn(
                                                    'flex size-7 items-center justify-center rounded-lg border shrink-0',
                                                    cfg.bgClass,
                                                    cfg.colorClass
                                                )}
                                            >
                                                <IconComponent className="size-3.5" />
                                            </div>
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-semibold text-foreground truncate">{cfg.label}</span>
                                                    <Badge variant="secondary" className="text-xs px-1.5 py-0 font-medium text-muted-foreground">
                                                        {dataVal.count} time(s)
                                                    </Badge>
                                                </div>
                                                <span className="text-xs text-muted-foreground block truncate">
                                                    Quantity: {dataVal.totalQuantity.toLocaleString()} units
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span
                                                className={cn(
                                                    'text-xs font-bold',
                                                    typeKey === 'SALE' || typeKey === 'DELIVERY'
                                                        ? 'text-foreground'
                                                        : 'text-rose-600 dark:text-rose-400'
                                                )}
                                            >
                                                ₱{dataVal.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-xs text-muted-foreground">No stock activities recorded within this timeframe.</div>
                    )}
                </div>

                {/* 2. Top Consumed Ingredients by Cost (COGS Leaders) */}
                <div className="space-y-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase block">Top Used Ingredients by Cost</span>

                    {summary.topConsumedIngredients.length > 0 ? (
                        <div className="space-y-2">
                            {summary.topConsumedIngredients.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors"
                                >
                                    <div className="space-y-0.5 min-w-0 pr-2">
                                        <span className="text-xs font-semibold text-foreground truncate block max-w-[180px]">
                                            {item.ingredientName}
                                        </span>
                                        <span className="text-xs text-muted-foreground block">
                                            Used: {item.totalQuantity.toLocaleString()} {item.unit}
                                        </span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            ₱{item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-xs text-muted-foreground">No ingredient usage found for completed orders.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
