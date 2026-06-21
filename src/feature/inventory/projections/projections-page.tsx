import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';

import { Route } from '#/routes/admin/inventory/projections.tsx';
import { getProductionForecast } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IForecast } from '../inventory.types';

import { Input } from '#/components/ui/input.tsx';

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

    const filteredForecast = React.useMemo(() => {
        if (!forecastData) return [];
        if (!debouncedSearch) return forecastData;
        const q = debouncedSearch.toLowerCase();
        return forecastData.filter((f: IForecast) => f.name.toLowerCase().includes(q) || (f.sku && f.sku.toLowerCase().includes(q)));
    }, [forecastData, debouncedSearch]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Projections</h1>
                        <p className="text-xs text-muted-foreground">Real-time estimates of maximum units you can produce from current stock.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-muted-foreground font-medium">
                        Expected product yield projections based on current raw ingredient availability.
                    </p>
                </div>
                <Input
                    placeholder="Filter forecasts by name or SKU..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="h-9 w-full sm:w-[300px] bg-background/50"
                />

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Spinner className="h-6 w-6 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground font-medium">Computing production capacity...</span>
                    </div>
                ) : filteredForecast.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 border border-dashed rounded-2xl bg-muted/5">
                        <TrendingUp className="size-8 text-muted-foreground/60 stroke-[1.25]" />
                        <p className="text-sm font-bold text-foreground">No forecast data available</p>
                        <p className="text-xs text-muted-foreground">Ensure products have recipe configurations to see projections.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredForecast.map((item: IForecast) => (
                            <Card
                                key={item.variantId}
                                className="border border-border/40 bg-card hover:shadow-md transition-all duration-200 flex flex-col gap-0 py-0"
                            >
                                <CardHeader className="p-4 flex flex-row items-start justify-between gap-2 border-b border-border/20">
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <CardTitle className="text-sm font-bold text-foreground truncate leading-tight">{item.name}</CardTitle>
                                        {item.sku && (
                                            <CardDescription className="text-xs text-muted-foreground font-mono">SKU: {item.sku}</CardDescription>
                                        )}
                                    </div>
                                    <span className="text-lg font-bold text-primary shrink-0 leading-none">{item.maxProduceable}</span>
                                </CardHeader>
                                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                                    {!item.hasRecipe ? (
                                        <p className="text-xs text-muted-foreground italic py-1">No recipe configured.</p>
                                    ) : (
                                        <>
                                            {item.bottleneck && (
                                                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                                    <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                                                    <span className="text-xs text-amber-700 font-medium truncate">
                                                        Bottleneck: {item.bottleneck.name} ({item.bottleneck.currentQuantity} {item.bottleneck.unit})
                                                    </span>
                                                </div>
                                            )}
                                            <div className="space-y-1.5 pt-1">
                                                {item.ingredients.map((ing) => (
                                                    <div key={ing.ingredientId} className="flex items-center justify-between text-xs">
                                                        <span className="text-muted-foreground truncate flex-1 mr-2">{ing.name}</span>
                                                        <span className="text-foreground/70 font-bold shrink-0">
                                                            {ing.currentQuantity}/{ing.requiredQuantity} {ing.unit} → {ing.canProduce}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
