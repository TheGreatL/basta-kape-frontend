import { Card, CardContent } from '#/components/ui/card.tsx';
import { Sparkles, Clock, AlertOctagon, PackageCheck } from 'lucide-react';
import type { IDisplayStockSummaryResponse } from '../food-prep.types';

interface DisplaySummaryCardsProps {
    summary?: IDisplayStockSummaryResponse;
    isLoading?: boolean;
}

export default function DisplaySummaryCards({ summary, isLoading }: DisplaySummaryCardsProps) {
    const totalFresh = summary?.totalFreshUnits ?? 0;
    const totalExpiringSoon = summary?.totalExpiringSoonUnits ?? 0;
    const totalExpired = summary?.totalExpiredUnits ?? 0;
    const totalDisplayItems = summary?.items.length ?? 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Fresh Ready-to-Serve Units */}
            <Card className="bg-card/70 border-emerald-500/20 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 right-0 h-full w-1.5 bg-emerald-500" />
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Fresh Display Units</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{isLoading ? '—' : totalFresh}</span>
                            <span className="text-xs text-muted-foreground font-medium">ready to serve</span>
                        </div>
                    </div>
                    <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="size-5" />
                    </div>
                </CardContent>
            </Card>

            {/* Card 2: Expiring Soon (< 2 Hours) */}
            <Card className="bg-card/70 border-amber-500/20 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 right-0 h-full w-1.5 bg-amber-500" />
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Expiring Soon (&le; 2h)</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{isLoading ? '—' : totalExpiringSoon}</span>
                            <span className="text-xs text-muted-foreground font-medium">units alert</span>
                        </div>
                    </div>
                    <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Clock className="size-5" />
                    </div>
                </CardContent>
            </Card>

            {/* Card 3: Expired / Spoilage Pending Disposal */}
            <Card className="bg-card/70 border-rose-500/20 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 right-0 h-full w-1.5 bg-rose-500" />
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Expired / Discard</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{isLoading ? '—' : totalExpired}</span>
                            <span className="text-xs text-muted-foreground font-medium">units write-off</span>
                        </div>
                    </div>
                    <div className="size-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                        <AlertOctagon className="size-5" />
                    </div>
                </CardContent>
            </Card>

            {/* Card 4: Active Display SKUs */}
            <Card className="bg-card/70 border-border/60 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 right-0 h-full w-1.5 bg-primary" />
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Tracked Pastries & Foods</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">{isLoading ? '—' : totalDisplayItems}</span>
                            <span className="text-xs text-muted-foreground font-medium">display varieties</span>
                        </div>
                    </div>
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <PackageCheck className="size-5" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
