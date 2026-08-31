import { Shield, Coffee, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { cn } from '#/lib/utils.ts';
import type { TDashboardDateFilter, IDashboardDateRange } from '../dashboard.types';

interface DashboardHeaderProps {
    displayName: string;
    userRoles: string;
    activeFilter: TDashboardDateFilter;
    dateRange: IDashboardDateRange;
    onFilterChange: (filter: TDashboardDateFilter) => void;
}

export function DashboardHeader({ displayName, userRoles, activeFilter, dateRange, onFilterChange }: DashboardHeaderProps) {
    const filters: { id: TDashboardDateFilter; label: string }[] = [
        { id: 'today', label: 'Today' },
        { id: 'this_week', label: 'This Week' },
        { id: 'this_month', label: 'This Month' }
    ];

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary-foreground p-6 text-primary-foreground shadow-lg md:p-8">
            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2.5 max-w-xl">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase backdrop-blur-sm">
                        <Shield className="size-3.5" /> {userRoles}
                    </span>
                    <h1 className="text-2xl font-bold md:text-3xl leading-tight">Welcome back, {displayName}!</h1>
                    <p className="text-xs text-primary-foreground/85 font-semibold leading-relaxed">
                        Here is an overview of Basta Kape's essential operations and sales for{' '}
                        <span className="font-bold underline underline-offset-2">{dateRange.displayPeriod}</span>.
                    </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-black/15 p-2 rounded-2xl backdrop-blur-md border border-white/10 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold px-2 text-primary-foreground/90">
                        <CalendarIcon className="size-3.5" />
                        <span>Filter Period:</span>
                    </div>
                    <div className="inline-flex items-center rounded-xl bg-black/20 p-1 border border-white/10">
                        {filters.map((f) => {
                            const isActive = activeFilter === f.id;
                            return (
                                <Button
                                    key={f.id}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onFilterChange(f.id)}
                                    className={cn(
                                        'h-8 px-3 text-xs font-bold rounded-lg transition-all text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10',
                                        isActive && 'bg-white text-primary hover:bg-white/95 hover:text-primary shadow-xs'
                                    )}
                                >
                                    {f.label}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
                <Coffee className="size-48 stroke-[1.5]" />
            </div>
        </div>
    );
}
