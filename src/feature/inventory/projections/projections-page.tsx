import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { TrendingUp, AlertTriangle, CheckCircle2, XCircle, Info, Search, PackageCheck, Coffee, Sparkles, AlertCircle, Layers } from 'lucide-react';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Route } from '#/routes/admin/inventory/projections.tsx';
import { getProductionForecast } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IForecast } from '../inventory.types';

export default function ProjectionsPage() {
    const navigate = useNavigate({ from: '/admin/inventory/projections' });
    const { search } = Route.useSearch();

    const setSearch = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);
    const [statusFilter, setStatusFilter] = React.useState<'all' | 'ready' | 'low' | 'out' | 'no_recipe'>('all');
    const [showHelpBanner, setShowHelpBanner] = React.useState(true);

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        setSearch({ search: debouncedSearch });
    }, [debouncedSearch]);

    // Query: Production Forecast
    const { data: forecastData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.FORECAST],
        queryFn: getProductionForecast
    });

    // Summary statistics
    const stats = React.useMemo(() => {
        if (!forecastData) return { total: 0, ready: 0, low: 0, out: 0, noRecipe: 0 };
        let ready = 0;
        let low = 0;
        let out = 0;
        let noRecipe = 0;

        forecastData.forEach((item: IForecast) => {
            if (!item.hasRecipe) {
                noRecipe++;
            } else if (item.maxProduceable === 0) {
                out++;
            } else if (typeof item.maxProduceable === 'number' && item.maxProduceable <= 20) {
                low++;
            } else {
                ready++;
            }
        });

        return {
            total: forecastData.length,
            ready,
            low,
            out,
            noRecipe
        };
    }, [forecastData]);

    // Filtered forecast list
    const filteredForecast = React.useMemo(() => {
        if (!forecastData) return [];
        return forecastData.filter((item: IForecast) => {
            // Search filter
            if (debouncedSearch) {
                const q = debouncedSearch.toLowerCase();
                const matchName = item.name.toLowerCase().includes(q);
                const matchSku = item.sku ? item.sku.toLowerCase().includes(q) : false;
                if (!matchName && !matchSku) return false;
            }

            // Status category filter
            if (statusFilter === 'ready') {
                return (
                    item.hasRecipe && (item.maxProduceable === 'Unlimited' || (typeof item.maxProduceable === 'number' && item.maxProduceable > 20))
                );
            }
            if (statusFilter === 'low') {
                return item.hasRecipe && typeof item.maxProduceable === 'number' && item.maxProduceable > 0 && item.maxProduceable <= 20;
            }
            if (statusFilter === 'out') {
                return item.hasRecipe && item.maxProduceable === 0;
            }
            if (statusFilter === 'no_recipe') {
                return !item.hasRecipe;
            }

            return true;
        });
    }, [forecastData, debouncedSearch, statusFilter]);

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Stock Capacity Forecasts</h1>
                        <p className="text-xs text-muted-foreground">
                            Estimated servings you can prepare right now from your live ingredient inventory.
                        </p>
                    </div>
                </div>
            </div>

            {/* Explanatory Help Card */}
            {showHelpBanner && (
                <div className="relative p-4 rounded-xl bg-card border border-border/60 text-xs text-foreground flex items-start gap-3 shadow-xs">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                        <Info className="size-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <p className="font-bold text-sm text-foreground">How Stock Forecasting Works</p>
                        <p className="text-muted-foreground leading-relaxed">
                            This module calculates how many servings of each menu drink or modifier you can make based on your current stock. The{' '}
                            <strong>limiting ingredient (bottleneck)</strong> determines the total servings available — once that single ingredient
                            runs out, you cannot prepare more servings of that product.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHelpBanner(false)}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Top Summary Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3.5 border-border/40 bg-card flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-semibold uppercase tracking-wider">Tracked Products</span>
                        <Layers className="size-4 text-primary" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">{stats.total}</span>
                        <span className="text-xs text-muted-foreground">items</span>
                    </div>
                </Card>

                <Card className="p-3.5 border-border/40 bg-card flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">High Stock (&gt;20)</span>
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.ready}</span>
                        <span className="text-xs text-muted-foreground">ready to serve</span>
                    </div>
                </Card>

                <Card className="p-3.5 border-border/40 bg-card flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Low Capacity (1–20)</span>
                        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.low}</span>
                        <span className="text-xs text-muted-foreground">restock soon</span>
                    </div>
                </Card>

                <Card className="p-3.5 border-border/40 bg-card flex flex-col justify-between shadow-2xs">
                    <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Out of Stock (0)</span>
                        <XCircle className="size-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-rose-700 dark:text-rose-400">{stats.out}</span>
                        <span className="text-xs text-muted-foreground">cannot produce</span>
                    </div>
                </Card>
            </div>

            {/* Filter Controls & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-[280px]">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search product name or SKU..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="h-9 pl-9 bg-card border-border/60 text-xs"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 bg-muted/30 p-1 rounded-xl border border-border/40">
                    <Button
                        variant={statusFilter === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setStatusFilter('all')}
                        className={`h-7 text-xs px-3 font-semibold rounded-lg ${
                            statusFilter === 'all' ? 'bg-primary text-primary-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        All ({stats.total})
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusFilter('ready')}
                        className={`h-7 text-xs px-3 font-semibold rounded-lg transition-colors ${
                            statusFilter === 'ready'
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                                : 'text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300'
                        }`}
                    >
                        High Stock ({stats.ready})
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusFilter('low')}
                        className={`h-7 text-xs px-3 font-semibold rounded-lg transition-colors ${
                            statusFilter === 'low'
                                ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30'
                                : 'text-muted-foreground hover:text-amber-800 dark:hover:text-amber-300'
                        }`}
                    >
                        Low Capacity ({stats.low})
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusFilter('out')}
                        className={`h-7 text-xs px-3 font-semibold rounded-lg transition-colors ${
                            statusFilter === 'out'
                                ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30'
                                : 'text-muted-foreground hover:text-rose-700 dark:hover:text-rose-300'
                        }`}
                    >
                        Out of Stock ({stats.out})
                    </Button>
                    {stats.noRecipe > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStatusFilter('no_recipe')}
                            className={`h-7 text-xs px-3 font-semibold rounded-lg transition-colors ${
                                statusFilter === 'no_recipe'
                                    ? 'bg-muted text-foreground border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            No Recipe ({stats.noRecipe})
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Forecast List / Cards Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground font-medium">Calculating stock capacity forecasts...</span>
                </div>
            ) : filteredForecast.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2 border border-dashed rounded-2xl bg-card">
                    <TrendingUp className="size-8 text-muted-foreground/60 stroke-[1.25]" />
                    <p className="text-sm font-bold text-foreground">No matching forecasts found</p>
                    <p className="text-xs text-muted-foreground">Try adjusting your search query or status category filter.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredForecast.map((item: IForecast) => {
                        const isModifier = item.name.startsWith('[Modifier]');
                        const isOutOfStock = item.hasRecipe && item.maxProduceable === 0;
                        const isLowStock =
                            item.hasRecipe && typeof item.maxProduceable === 'number' && item.maxProduceable > 0 && item.maxProduceable <= 20;

                        return (
                            <Card
                                key={item.variantId}
                                className="border border-border/40 bg-card hover:border-border/80 hover:shadow-md transition-all duration-200 flex flex-col gap-0 overflow-hidden"
                            >
                                {/* Card Header */}
                                <CardHeader className="p-4 flex flex-row items-start justify-between gap-3 border-b border-border/20 bg-muted/20">
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            {isModifier ? (
                                                <Sparkles className="size-3.5 text-primary shrink-0" />
                                            ) : (
                                                <Coffee className="size-3.5 text-primary shrink-0" />
                                            )}
                                            <CardTitle className="text-sm font-bold text-foreground truncate leading-tight">{item.name}</CardTitle>
                                        </div>
                                        {item.sku && (
                                            <CardDescription className="text-xs text-muted-foreground font-mono pl-5">
                                                SKU: {item.sku}
                                            </CardDescription>
                                        )}
                                    </div>

                                    {/* Production Capacity Badge */}
                                    <div className="shrink-0">
                                        {!item.hasRecipe ? (
                                            <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                                                No Recipe
                                            </Badge>
                                        ) : item.maxProduceable === 'Unlimited' ? (
                                            <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 font-bold text-xs gap-1">
                                                <PackageCheck className="size-3" /> Unlimited
                                            </Badge>
                                        ) : isOutOfStock ? (
                                            <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-bold text-xs gap-1">
                                                <XCircle className="size-3" /> 0 Servings
                                            </Badge>
                                        ) : isLowStock ? (
                                            <Badge className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-bold text-xs gap-1">
                                                <AlertTriangle className="size-3" /> {item.maxProduceable} Left
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 font-bold text-xs gap-1">
                                                <CheckCircle2 className="size-3" /> {item.maxProduceable} Servings
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>

                                {/* Card Content */}
                                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                                    {!item.hasRecipe ? (
                                        <div className="py-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                                            <AlertCircle className="size-5 text-muted-foreground/60" />
                                            <span>No recipe ingredients linked to this item yet.</span>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Bottleneck Alert Box */}
                                            {item.bottleneck && (
                                                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2.5">
                                                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                    <div className="text-xs space-y-0.5 leading-snug">
                                                        <span className="font-bold text-amber-900 dark:text-amber-200 block">
                                                            Limiting Ingredient: {item.bottleneck.name}
                                                        </span>
                                                        <span className="text-amber-800/90 dark:text-amber-300/90 block">
                                                            Stock: {item.bottleneck.currentQuantity} {item.bottleneck.unit} remaining (
                                                            {item.bottleneck.requiredQuantity} {item.bottleneck.unit}/serving)
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Ingredient List Breakdown */}
                                            <div className="space-y-2 pt-1">
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block border-b border-border/20 pb-1">
                                                    Recipe Ingredients Breakdown
                                                </span>
                                                <div className="space-y-1.5">
                                                    {item.ingredients.map((ing) => {
                                                        const isBottleneck = item.bottleneck?.ingredientId === ing.ingredientId;
                                                        const isUnlimited = typeof ing.canProduce === 'string' && ing.canProduce === 'Unlimited';
                                                        const isZero = ing.canProduce === 0;

                                                        return (
                                                            <div
                                                                key={ing.ingredientId}
                                                                className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${
                                                                    isBottleneck
                                                                        ? 'bg-amber-500/10 border-amber-500/25 text-foreground font-semibold'
                                                                        : 'bg-muted/20 border-border/20 text-foreground/90'
                                                                }`}
                                                            >
                                                                <div className="min-w-0 flex-1 truncate">
                                                                    <span className="truncate font-medium block text-foreground">{ing.name}</span>
                                                                    <span className="text-[10px] text-muted-foreground block font-normal">
                                                                        Needs {ing.requiredQuantity} {ing.unit} per serving (Stock:{' '}
                                                                        {ing.currentQuantity} {ing.unit})
                                                                    </span>
                                                                </div>

                                                                <span
                                                                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${
                                                                        isZero
                                                                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                                                            : isBottleneck
                                                                              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                                                                              : isUnlimited
                                                                                ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                                                                                : 'bg-muted text-muted-foreground'
                                                                    }`}
                                                                >
                                                                    {isUnlimited ? 'Unlimited' : `${ing.canProduce} servings`}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
