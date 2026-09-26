import { DollarSign, TrendingUp, AlertTriangle, ArrowUpRight, Scale, ShieldAlert } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Skeleton } from '#/components/ui/skeleton.tsx';
import type { DashboardProfitability, IDashboardDateRange } from '../dashboard.types';

interface DashboardProfitabilityProps {
    profitability?: DashboardProfitability;
    isLoading?: boolean;
    dateRange: IDashboardDateRange;
}

export function DashboardProfitabilityCard({ profitability, isLoading, dateRange }: DashboardProfitabilityProps) {
    if (isLoading) {
        return (
            <Card className="shadow-2xs border-border/60 rounded-2xl">
                <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-52" />
                    <Skeleton className="h-4 w-72" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!profitability) return null;

    const { grossSales, netSales, discountTotal, cogs, grossProfit, grossProfitMargin, totalLoss, netProfit, netProfitMargin } = profitability;

    const isHealthyNet = netProfit >= 0;

    return (
        <Card className="shadow-2xs border-border/60 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20 border-b border-border/40">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Scale className="size-5 text-primary" />
                        <CardTitle className="text-base font-bold text-foreground">Profitability & Cost Analysis ({dateRange.label})</CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">
                        Real-time gross margin, Cost of Goods Sold (COGS), ingredient waste loss, and bottom-line net profit.
                    </CardDescription>
                </div>
                <Link to="/admin/reports" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0">
                    Detailed P&L Report <ArrowUpRight className="size-3.5" />
                </Link>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {/* 4 Core Financial Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Gross Profit */}
                    <div className="bg-card border border-emerald-500/20 rounded-2xl p-4.5 shadow-2xs space-y-2 bg-gradient-to-br from-emerald-500/5 to-transparent">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-muted-foreground">Gross Profit</span>
                            <Badge
                                variant="outline"
                                className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] font-bold dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                            >
                                {grossProfitMargin}% Margin
                            </Badge>
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                                ₱{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-semibold">Net Sales minus Ingredient COGS</p>
                        </div>
                    </div>

                    {/* Cost of Goods Sold (COGS) */}
                    <div className="bg-card border border-border/60 rounded-2xl p-4.5 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-bold uppercase">COGS (Usage)</span>
                            <DollarSign className="size-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-xl font-bold text-foreground">
                                ₱{cogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-semibold">Total cost of recipe ingredients consumed</p>
                        </div>
                    </div>

                    {/* Waste & Spoilage Loss */}
                    <div className="bg-card border border-rose-500/20 rounded-2xl p-4.5 shadow-2xs space-y-2 bg-gradient-to-br from-rose-500/5 to-transparent">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-rose-600 dark:text-rose-400">Spoilage & Waste</span>
                            <ShieldAlert className="size-4 text-rose-500" />
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400">
                                ₱{totalLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-semibold">Financial loss from spoiled/expired stock</p>
                        </div>
                    </div>

                    {/* Net Operating Profit */}
                    <div
                        className={`bg-card border rounded-2xl p-4.5 shadow-2xs space-y-2 bg-gradient-to-br ${
                            isHealthyNet ? 'border-primary/25 from-primary/5 to-transparent' : 'border-rose-500/30 from-rose-500/10 to-transparent'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-primary">Net Profit</span>
                            <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                    isHealthyNet
                                        ? 'text-primary border-primary/30 bg-primary/10'
                                        : 'text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                            >
                                {netProfitMargin}% Net
                            </Badge>
                        </div>
                        <div className="space-y-0.5">
                            <h3 className={`text-xl font-bold ${isHealthyNet ? 'text-primary' : 'text-rose-600'}`}>
                                ₱{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-semibold">After COGS and inventory waste</p>
                        </div>
                    </div>
                </div>

                {/* Financial Summary Flow Bar */}
                <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Gross Sales:</span>
                        <span className="font-bold text-foreground">₱{grossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <span className="text-muted-foreground/60 hidden md:inline">−</span>
                    <div className="flex items-center gap-2">
                        <span className="text-amber-600 dark:text-amber-400">Discounts:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                            ₱{discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <span className="text-muted-foreground/60 hidden md:inline">=</span>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Net Sales:</span>
                        <span className="font-bold text-foreground">₱{netSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <span className="text-muted-foreground/60 hidden md:inline">−</span>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">COGS + Waste:</span>
                        <span className="font-bold text-rose-500">₱{(cogs + totalLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <span className="text-muted-foreground/60 hidden md:inline">=</span>
                    <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-xl border border-border/60 shadow-2xs">
                        <span className="text-primary font-bold">Net Bottom Line:</span>
                        <span className="font-bold text-primary">₱{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
