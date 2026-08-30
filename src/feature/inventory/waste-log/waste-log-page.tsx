import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Trash2, Plus, Calendar as CalendarIcon, RotateCcw, X } from 'lucide-react';
import { format, isValid } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { Route } from '#/routes/admin/inventory/waste-log.tsx';
import { getDisposals, getDisposalSummary } from '#/api/disposal.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IDisposalItem, DisposalCategory, DisposalReason } from '#/feature/disposal/disposal.types.ts';

import DataTable from '#/components/data-table/data-table.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Calendar } from '#/components/ui/calendar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';

import DisposalSummaryCards from '#/feature/disposal/components/disposal-summary-cards.tsx';
import DisposalCategoryBadge from '#/feature/disposal/components/disposal-category-badge.tsx';
import UnifiedStockDialog from '../components/unified-stock-dialog.tsx';

const REASON_LABELS: Record<string, string> = {
    ALL: 'All Reasons',
    EXPIRED: 'Expired',
    SPOILED: 'Spoiled',
    WASTE: 'Waste / Spill',
    SAMPLING: 'Taste Sampling',
    THEFT: 'Loss / Theft',
    PROMOTIONAL_USE: 'Promotional Use',
    DISPOSED: 'Disposed',
    PHYSICAL_COUNT_CORRECTION: 'Count Correction',
    PHYSICAL_COUNT_DISCREPANCY: 'Count Discrepancy'
};

const REASON_BADGE_VARIANTS: Record<string, string> = {
    EXPIRED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    SPOILED: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    WASTE: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    SAMPLING: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    THEFT: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
    PROMOTIONAL_USE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    DISPOSED: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
    PHYSICAL_COUNT_CORRECTION: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    PHYSICAL_COUNT_DISCREPANCY: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
};

export default function WasteLogPage() {
    const navigate = useNavigate({ from: '/admin/inventory/waste-log' });
    const { page, pageSize, search, category, reason, startDate, endDate } = Route.useSearch();

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
        setSearch({ search: debouncedSearch, page: 1 });
    }, [debouncedSearch]);

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [unifiedOpen, setUnifiedOpen] = React.useState(false);

    // Date range state for UI Popover Calendar
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
        const from = startDate ? new Date(startDate) : undefined;
        const to = endDate ? new Date(endDate) : undefined;
        return from || to ? { from, to } : undefined;
    });

    React.useEffect(() => {
        const from = startDate ? new Date(startDate) : undefined;
        const to = endDate ? new Date(endDate) : undefined;
        setDateRange(from || to ? { from, to } : undefined);
    }, [startDate, endDate]);

    const dateRangeText = React.useMemo(() => {
        if (startDate && endDate) {
            return `${format(new Date(startDate), 'MMM d, yyyy')} – ${format(new Date(endDate), 'MMM d, yyyy')}`;
        }
        if (startDate) {
            return `From ${format(new Date(startDate), 'MMM d, yyyy')}`;
        }
        if (endDate) {
            return `Until ${format(new Date(endDate), 'MMM d, yyyy')}`;
        }
        return 'Filter by date range';
    }, [startDate, endDate]);

    const handleRangeSelect = (range: DateRange | undefined) => {
        setDateRange(range);
        if (range?.from) {
            setSearch({
                startDate: format(range.from, 'yyyy-MM-dd'),
                endDate: range.to ? format(range.to, 'yyyy-MM-dd') : '',
                page: 1
            });
        } else {
            setSearch({ startDate: '', endDate: '', page: 1 });
        }
    };

    // 1. Query: Financial Loss KPIs & Summary
    const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
        queryKey: [QUERY_KEY.DISPOSALS.SUMMARY, { category, reason, search: debouncedSearch, startDate, endDate }],
        queryFn: () =>
            getDisposalSummary({
                category: category === 'ALL' ? undefined : (category as DisposalCategory),
                reason: reason === 'ALL' ? undefined : (reason as DisposalReason),
                search: debouncedSearch || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            })
    });

    // 2. Query: Paginated Unified Disposals Audit Log
    const { data: disposalsData, isLoading: isDisposalsLoading } = useQuery({
        queryKey: [QUERY_KEY.DISPOSALS.LIST, { page, pageSize, category, reason, search: debouncedSearch, startDate, endDate }],
        queryFn: () =>
            getDisposals({
                page,
                limit: pageSize,
                category: category === 'ALL' ? undefined : (category as DisposalCategory),
                reason: reason === 'ALL' ? undefined : (reason as DisposalReason),
                search: debouncedSearch || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            })
    });

    const hasActiveFilters = Boolean(category !== 'ALL' || reason !== 'ALL' || startDate || endDate || localSearch);

    const handleResetFilters = () => {
        setLocalSearch('');
        setDateRange(undefined);
        setSearch({
            search: '',
            category: 'ALL',
            reason: 'ALL',
            startDate: '',
            endDate: '',
            page: 1
        });
    };

    const columns = React.useMemo<ColumnDef<IDisposalItem>[]>(
        () => [
            {
                id: 'item',
                header: 'Item & Category',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground text-xs">{item.itemName}</span>
                                <DisposalCategoryBadge category={item.category} />
                            </div>
                            {item.variantLabel && <span className="text-xs text-muted-foreground">{item.variantLabel}</span>}
                        </div>
                    );
                }
            },
            {
                accessorKey: 'batchNumber',
                header: 'Batch Number',
                cell: ({ row }) => {
                    const batch = row.original.batchNumber;
                    if (!batch) return <span className="text-xs text-muted-foreground/60">—</span>;
                    return <span className="font-mono text-xs font-bold text-foreground">{batch}</span>;
                }
            },
            {
                accessorKey: 'quantity',
                header: 'Quantity',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <span className="text-xs font-bold text-foreground">
                            {item.quantity.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                        </span>
                    );
                }
            },
            {
                accessorKey: 'estimatedCostLoss',
                header: 'Financial Loss',
                cell: ({ row }) => {
                    const loss = row.original.estimatedCostLoss;
                    return (
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                            ₱{loss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    );
                }
            },
            {
                accessorKey: 'reason',
                header: 'Reason',
                cell: ({ row }) => {
                    const reasonKey = row.original.reason;
                    const label = REASON_LABELS[reasonKey] || reasonKey;
                    const variantClass = REASON_BADGE_VARIANTS[reasonKey] || 'bg-muted/20 text-muted-foreground border-border/60';
                    return (
                        <Badge variant="outline" className={`text-xs font-semibold ${variantClass}`}>
                            {label}
                        </Badge>
                    );
                }
            },
            {
                accessorKey: 'notes',
                header: 'Notes',
                cell: ({ row }) => {
                    const notes = row.original.notes;
                    if (!notes) return <span className="text-xs text-muted-foreground/60">—</span>;
                    return (
                        <span className="text-xs text-muted-foreground max-w-[200px] truncate block" title={notes}>
                            {notes}
                        </span>
                    );
                }
            },
            {
                id: 'disposedBy',
                header: 'Logged By & Date',
                cell: ({ row }) => {
                    const item = row.original;
                    const user = item.disposedBy;
                    const date = new Date(item.disposedAt);
                    const formattedDate = isValid(date) ? format(date, 'MMM d, yyyy h:mm a') : '—';
                    return (
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground/85">{user?.name || user?.username || 'System / Staff'}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CalendarIcon className="size-2.5" />
                                {formattedDate}
                            </span>
                        </div>
                    );
                }
            }
        ],
        []
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600">
                        <Trash2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Unified Waste & Loss Log</h1>
                        <p className="text-xs text-muted-foreground">
                            Single source of truth tracking raw material shrinkage and prepared food disposals.
                        </p>
                    </div>
                </div>

                <RequirePermission module="Inventory Management" action="create">
                    <Button onClick={() => setUnifiedOpen(true)} className="h-9 gap-1.5 shadow-sm text-xs font-bold" size="sm">
                        <Plus className="size-4" /> Log Raw Stock Waste
                    </Button>
                </RequirePermission>
            </div>

            {/* Financial Loss KPIs */}
            <DisposalSummaryCards summary={summaryData} isLoading={isSummaryLoading} />

            {/* Audit Log Table */}
            <div className="space-y-4">
                <DataTable
                    columns={columns}
                    data={disposalsData?.data || []}
                    pageCount={disposalsData?.meta.pageCount || 1}
                    pageIndex={page - 1}
                    pageSize={pageSize}
                    onPaginationChange={(idx, size) => setSearch({ page: idx + 1, pageSize: size })}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={isDisposalsLoading}
                    showColumnVisibilityToggle={true}
                    filterContent={
                        <div className="flex flex-wrap items-center gap-2.5 w-full">
                            {/* Search Input */}
                            <Input
                                placeholder="Search item, batch #, notes..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="h-9 w-full sm:w-[220px] bg-background/50 text-xs rounded-xl"
                            />

                            {/* Category Filter */}
                            <Select value={category} onValueChange={(val) => setSearch({ category: val, page: 1 })}>
                                <SelectTrigger className="h-9 w-full sm:w-[170px] bg-background/50 text-xs font-semibold rounded-xl">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-xs">
                                        All Categories
                                    </SelectItem>
                                    <SelectItem value="PREPARED_FOOD" className="text-xs">
                                        🍪 Prepared Food
                                    </SelectItem>
                                    <SelectItem value="RAW_INGREDIENT" className="text-xs">
                                        🥛 Raw Material
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Reason Filter */}
                            <Select value={reason} onValueChange={(val) => setSearch({ reason: val, page: 1 })}>
                                <SelectTrigger className="h-9 w-full sm:w-[170px] bg-background/50 text-xs font-semibold rounded-xl">
                                    <SelectValue placeholder="All Reasons" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-xs">
                                        All Reasons
                                    </SelectItem>
                                    <SelectItem value="EXPIRED" className="text-xs">
                                        Expired
                                    </SelectItem>
                                    <SelectItem value="SPOILED" className="text-xs">
                                        Spoiled
                                    </SelectItem>
                                    <SelectItem value="WASTE" className="text-xs">
                                        Waste / Spilled
                                    </SelectItem>
                                    <SelectItem value="SAMPLING" className="text-xs">
                                        Taste Sampling
                                    </SelectItem>
                                    <SelectItem value="THEFT" className="text-xs">
                                        Loss / Theft
                                    </SelectItem>
                                    <SelectItem value="PROMOTIONAL_USE" className="text-xs">
                                        Promotional Use
                                    </SelectItem>
                                    <SelectItem value="DISPOSED" className="text-xs">
                                        Disposed
                                    </SelectItem>
                                    <SelectItem value="PHYSICAL_COUNT_CORRECTION" className="text-xs">
                                        Count Correction
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Date Range Picker Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-9 justify-start text-xs font-normal bg-background/50 border-border/60 gap-2 rounded-xl ${
                                            startDate || endDate ? 'border-primary/40 text-primary font-semibold' : 'text-muted-foreground'
                                        }`}
                                    >
                                        <CalendarIcon className="size-3.5 shrink-0" />
                                        <span>{dateRangeText}</span>
                                        {(startDate || endDate) && (
                                            <span
                                                role="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRangeSelect(undefined);
                                                }}
                                                className="ml-1 hover:text-foreground p-0.5 rounded-full"
                                            >
                                                <X className="size-3" />
                                            </span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="range"
                                        defaultMonth={dateRange?.from || new Date()}
                                        selected={dateRange}
                                        onSelect={handleRangeSelect}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Reset Filters Button */}
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetFilters}
                                    className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5 rounded-xl"
                                >
                                    <RotateCcw className="size-3.5" /> Reset
                                </Button>
                            )}
                        </div>
                    }
                />
            </div>

            {/* Unified Stock Action Dialog */}
            <UnifiedStockDialog open={unifiedOpen} onOpenChange={setUnifiedOpen} initialMode="LOG_WASTE" preselectedIngredient={null} />
        </div>
    );
}
