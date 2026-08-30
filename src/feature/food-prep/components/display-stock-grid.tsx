import { Card, CardContent } from '#/components/ui/card.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Cookie, Plus, Clock, Layers, AlertTriangle } from 'lucide-react';
import ExpiryStatusBadge from './expiry-status-badge.tsx';
import { getProductPhotoUrl, handleProductImageError } from '#/utils/helper.ts';
import type { IDisplayStockItemSummary } from '../food-prep.types';

interface DisplayStockGridProps {
    items: IDisplayStockItemSummary[];
    isLoading?: boolean;
    onBakeItem: (item: IDisplayStockItemSummary) => void;
    onViewItemBatches: (item: IDisplayStockItemSummary) => void;
}

export default function DisplayStockGrid({ items, isLoading, onBakeItem, onViewItemBatches }: DisplayStockGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="animate-pulse bg-muted/20 border-border/40 h-52" />
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-2xl bg-muted/5 space-y-3">
                <div className="size-12 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground">
                    <Cookie className="size-6" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-foreground">No Display Items Configured</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                        Products set to &quot;Prepared / Display Inventory&quot; will appear on this station once configured in Products settings.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
                const isOutOfStock = item.totalFreshQuantity === 0;
                const hasExpiringSoon = item.totalNearExpiryQuantity > 0;
                const hasExpired = item.totalExpiredQuantity > 0;

                return (
                    <Card
                        key={item.productVariantId}
                        className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-xs flex flex-col justify-between shadow-2xs hover:shadow-md transition-all group relative"
                    >
                        <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                            {/* Top row: Photo & Item info */}
                            <div className="flex items-start gap-3">
                                <div className="size-16 rounded-xl bg-muted/30 border border-border/40 overflow-hidden shrink-0 relative flex items-center justify-center">
                                    <img
                                        src={getProductPhotoUrl(item.photo)}
                                        onError={handleProductImageError}
                                        alt={item.productName}
                                        className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    {isOutOfStock && (
                                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                            <span className="text-xs font-bold text-destructive">OUT</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1 flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-foreground truncate leading-tight">{item.productName}</h4>
                                    <p className="text-xs text-muted-foreground truncate">{item.variantLabel || 'Standard Variant'}</p>
                                    <div className="flex items-center gap-2 pt-0.5">
                                        <span className="text-xs font-bold text-primary">₱{item.price.toFixed(2)}</span>
                                        {item.sku && <span className="text-xs text-muted-foreground/70 truncate font-mono">{item.sku}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Middle section: Stock Quantities & Status Breakdown */}
                            <div className="bg-muted/20 border border-border/30 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">Available On Shelf</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-xl font-bold ${isOutOfStock ? 'text-destructive' : 'text-foreground'}`}>
                                            {item.totalFreshQuantity}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-medium">units</span>
                                    </div>
                                </div>

                                {/* Earliest Expiry Countdown */}
                                <div className="flex items-center justify-between pt-1 border-t border-border/20 text-xs">
                                    <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                        <Clock className="size-3 text-muted-foreground/70" />
                                        Earliest Expiry:
                                    </span>
                                    <ExpiryStatusBadge expiresAt={item.earliestExpiry} currentQuantity={item.totalFreshQuantity} />
                                </div>

                                {/* Warning Badges for Near Expiry or Expired */}
                                {(hasExpiringSoon || hasExpired) && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {hasExpiringSoon && (
                                            <Badge
                                                variant="outline"
                                                className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs py-0"
                                            >
                                                <AlertTriangle className="size-3 mr-1 text-amber-600" />
                                                {item.totalNearExpiryQuantity} expiring soon
                                            </Badge>
                                        )}
                                        {hasExpired && (
                                            <Badge
                                                variant="destructive"
                                                className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs py-0"
                                            >
                                                {item.totalExpiredQuantity} expired (needs disposal)
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Bottom Card Actions */}
                            <div className="flex items-center gap-2 pt-1">
                                <Button size="sm" onClick={() => onBakeItem(item)} className="flex-1 h-8 text-xs font-bold gap-1 shadow-2xs">
                                    <Plus className="size-3.5" />
                                    Bake / Prep
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onViewItemBatches(item)}
                                    className="h-8 px-2.5 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                                    title="View Active Batches"
                                >
                                    <Layers className="size-3.5" />
                                    {item.activeBatchesCount} {item.activeBatchesCount === 1 ? 'Batch' : 'Batches'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
