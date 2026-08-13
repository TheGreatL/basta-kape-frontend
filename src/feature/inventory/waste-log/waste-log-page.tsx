import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Trash2, Plus, Calendar as CalendarIcon, RotateCcw, X } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { Route } from '#/routes/admin/inventory/waste-log.tsx';
import { getAdjustments } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IAdjustment, IIngredient, TAdjustmentType } from '../inventory.types';

import DataTable from '#/components/data-table/data-table.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Calendar } from '#/components/ui/calendar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';

import AdjustmentDialog from '../components/inventory-adjustment-dialog.tsx';

const ADJUSTMENT_LABEL: Record<TAdjustmentType, string> = {
    WASTE: 'Waste',
    SPOILED: 'Spoiled',
    EXPIRED: 'Expired',
    THEFT: 'Theft',
    PROMOTIONAL_USE: 'Promotional Use',
    PHYSICAL_COUNT_DISCREPANCY: 'Count Difference'
};

const TYPE_FILTER_OPTIONS: { value: TAdjustmentType | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Adjustment Types' },
    { value: 'WASTE', label: 'Waste' },
    { value: 'SPOILED', label: 'Spoiled' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'THEFT', label: 'Theft' },
    { value: 'PROMOTIONAL_USE', label: 'Promotional Use' },
    { value: 'PHYSICAL_COUNT_DISCREPANCY', label: 'Count Difference' }
];

export default function WasteLogPage() {
    const navigate = useNavigate({ from: '/admin/inventory/waste-log' });
    const { page, pageSize, search, type, startDate, endDate } = Route.useSearch();

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
    const [adjustmentOpen, setAdjustmentOpen] = React.useState(false);
    const [selectedIngredient, setSelectedIngredient] = React.useState<IIngredient | null>(null);

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

    // Query: Adjustments with type and date range filters
    const { data: adjustmentsData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.ADJUSTMENTS_LIST, { page, pageSize, search, type, startDate, endDate }],
        queryFn: () =>
            getAdjustments({
                page,
                limit: pageSize,
                search,
                type: type === 'ALL' ? undefined : type,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            })
    });

    const hasActiveFilters = Boolean(type !== 'ALL' || startDate || endDate || localSearch);

    const handleResetFilters = () => {
        setLocalSearch('');
        setDateRange(undefined);
        setSearch({
            search: '',
            type: 'ALL',
            startDate: '',
            endDate: '',
            page: 1
        });
    };

    const columns = React.useMemo<ColumnDef<IAdjustment>[]>(
        () => [
            {
                accessorKey: 'ingredient.name',
                header: 'Ingredient',
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-semibold text-foreground/90 text-sm">{row.original.ingredient?.name || '—'}</span>
                        {row.original.ingredient?.defaultUnit && (
                            <span className="text-[10px] text-muted-foreground">
                                Unit: {row.original.ingredient.defaultUnit.abbreviation || row.original.ingredient.defaultUnit.name}
                            </span>
                        )}
                    </div>
                )
            },
            {
                accessorKey: 'type',
                header: 'Type',
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-xs font-semibold bg-muted/20 border-border/60">
                        {ADJUSTMENT_LABEL[row.original.type]}
                    </Badge>
                )
            },
            {
                accessorKey: 'quantity',
                header: 'Quantity',
                cell: ({ row }) => {
                    const unitStr = row.original.ingredient?.defaultUnit
                        ? ` ${row.original.ingredient.defaultUnit.abbreviation || row.original.ingredient.defaultUnit.name}`
                        : '';
                    return (
                        <span className={`text-sm font-bold ${row.original.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {row.original.quantity > 0 ? '+' : ''}
                            {row.original.quantity.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground">{unitStr}</span>
                        </span>
                    );
                }
            },
            {
                accessorKey: 'reason',
                header: 'Reason',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground max-w-[200px] truncate block" title={row.original.reason || undefined}>
                        {row.original.reason || '—'}
                    </span>
                )
            },
            {
                id: 'createdBy',
                header: 'Logged By',
                cell: ({ row }) => {
                    const user = row.original.createdBy;
                    if (!user) return <span className="text-xs text-muted-foreground">—</span>;
                    return (
                        <span className="text-xs font-semibold text-foreground/85" title={user.email}>
                            {user.firstName} {user.lastName}
                        </span>
                    );
                }
            },
            {
                accessorKey: 'createdAt',
                header: 'Logged At',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="size-3" />
                        {format(new Date(row.original.createdAt), 'MMM d, yyyy HH:mm')}
                    </span>
                )
            }
        ],
        []
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Trash2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Spoiled Items Log</h1>
                        <p className="text-xs text-muted-foreground">Track wasted, spoiled, lost, or corrected items.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-muted-foreground font-medium">Log and track adjustments, waste and spoilage incidents.</p>
                    <RequirePermission module="Inventory Management" action="create">
                        <Button
                            onClick={() => {
                                setSelectedIngredient(null);
                                setAdjustmentOpen(true);
                            }}
                            className="h-9 gap-1.5 shadow-sm"
                            size="sm"
                        >
                            <Plus className="size-4" /> Log Adjustment
                        </Button>
                    </RequirePermission>
                </div>

                <DataTable
                    columns={columns}
                    data={adjustmentsData?.data || []}
                    pageCount={adjustmentsData?.meta.pageCount || 1}
                    pageIndex={page - 1}
                    pageSize={pageSize}
                    onPaginationChange={(idx, size) => setSearch({ page: idx + 1, pageSize: size })}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={isLoading}
                    showColumnVisibilityToggle={true}
                    filterContent={
                        <div className="flex flex-wrap items-center gap-2.5 w-full">
                            {/* Search Input */}
                            <Input
                                placeholder="Search ingredient or reason..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="h-9 w-full sm:w-[200px] bg-background/50 text-xs"
                            />

                            {/* Adjustment Type Filter */}
                            <Select value={type} onValueChange={(val) => setSearch({ type: val, page: 1 })}>
                                <SelectTrigger className="h-9 w-full sm:w-[180px] bg-background/50 text-xs">
                                    <SelectValue placeholder="All Adjustment Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TYPE_FILTER_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Date Range Picker Popover using UI Calendar */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-9 justify-start text-xs font-normal bg-background/50 border-border/60 gap-2 ${
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
                                    className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5"
                                >
                                    <RotateCcw className="size-3.5" /> Reset
                                </Button>
                            )}
                        </div>
                    }
                />
            </div>

            <AdjustmentDialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen} preselectedIngredient={selectedIngredient} />
        </div>
    );
}
