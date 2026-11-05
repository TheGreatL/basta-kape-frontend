import { useQuery } from '@tanstack/react-query';
import { getInventoryDashboardOverview } from '#/api/inventory.api';
import QUERY_KEY from '#/constants/query-keys.ts';
import { Beef, AlertTriangle, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { Card, CardContent } from '#/components/ui/card.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Link, useNavigate } from '@tanstack/react-router';

export default function OverviewCardsWidget() {
    const navigate = useNavigate();
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.DASHBOARD_OVERVIEW],
        queryFn: getInventoryDashboardOverview
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="relative overflow-hidden border-border/40 bg-card shadow-sm animate-pulse h-24">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-2">
                                <div className="h-3 w-20 bg-muted rounded"></div>
                                <div className="h-6 w-12 bg-muted rounded"></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (isError || !data) {
        return (
            <Card className="border-red-200/50 bg-red-500/5 p-4 flex items-center justify-between">
                <span className="text-xs text-red-600 font-medium">Failed to load overview metrics.</span>
                <button onClick={() => refetch()} className="text-xs text-red-600 underline flex items-center gap-1">
                    <RefreshCw className="size-3" /> Retry
                </button>
            </Card>
        );
    }

    const cards = [
        {
            title: 'Active Ingredients',
            value: data.totalIngredients,
            icon: Beef,
            color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
            to: '/admin/inventory/ingredients' as any,
            search: { status: 'active' }
        },
        {
            title: 'Critical Stock Items',
            value: data.lowStockCount,
            icon: AlertTriangle,
            color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
            alert: data.lowStockCount > 0,
            to: '/admin/inventory/stock-levels' as any,
            search: { status: 'CRITICAL' }
        },
        {
            title: 'Out of Stock Items',
            value: data.outOfStockCount,
            icon: AlertCircle,
            color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
            alert: data.outOfStockCount > 0,
            to: '/admin/inventory/stock-levels' as any,
            search: { status: 'OUT_OF_STOCK' },
            showCreatePO: true
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                    <Link key={idx} to={card.to} search={card.search as any} className="block focus:outline-none">
                        <Card
                            className={`relative overflow-hidden border-border/40 bg-card hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer h-full ${
                                card.alert ? 'ring-1 ring-destructive/10' : ''
                            }`}
                        >
                            <CardContent className="p-4 flex items-center justify-between gap-3">
                                <div className="space-y-1.5 min-w-0">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase block">{card.title}</span>
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-2xl font-bold text-foreground/90 block font-sans">{card.value}</span>
                                        {card.showCreatePO && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2.5 text-xs font-bold gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/20"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    navigate({
                                                        to: '/admin/purchase-orders',
                                                        search: { create: true } as any
                                                    });
                                                }}
                                            >
                                                <Plus className="size-3.5" />
                                                Create PO
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className={`p-2.5 rounded-xl border shrink-0 ${card.color}`}>
                                    <Icon className="size-5" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
}
