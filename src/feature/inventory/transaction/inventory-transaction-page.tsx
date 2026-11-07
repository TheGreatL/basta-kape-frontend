import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Calendar as CalendarIcon, RotateCcw, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { Route } from '#/routes/admin/inventory/transactions.tsx';
import { getStockTransactions } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IStockTransaction, TStockTransactionType, IIngredient } from '../inventory.types.ts';
import { cn } from '#/lib/utils.ts';

import DataTable from '#/components/data-table/data-table.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Calendar } from '#/components/ui/calendar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';

import UnifiedStockDialog from '../components/unified-stock-dialog.tsx';
import type { TStockActionMode } from '../components/unified-stock-dialog.tsx';

function renderTransactionTypeBadge(type: TStockTransactionType) {
    switch (type) {
        case 'DELIVERY':
            return (
                <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                    Delivery / Stock In
                </Badge>
            );
        case 'SALE':
            return (
                <Badge variant="outline" className="border-sky-500/30 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    Order Sale
                </Badge>
            );
        case 'WASTE':
            return (
                <Badge variant="outline" className="border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    Waste
                </Badge>
            );
        case 'SPOILED':
            return (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    Spoiled
                </Badge>
            );
        case 'EXPIRED':
            return (
                <Badge variant="outline" className="border-orange-500/30 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                    Expired
                </Badge>
            );
        case 'THEFT':
            return (
                <Badge variant="outline" className="border-purple-500/30 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                    Theft
                </Badge>
            );
        case 'PROMOTIONAL_USE':
            return (
                <Badge variant="outline" className="border-indigo-500/30 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                    Promo
                </Badge>
            );
        case 'PHYSICAL_COUNT_CORRECTION':
            return (
                <Badge variant="outline" className="border-slate-500/30 bg-slate-50 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                    Count Correction
                </Badge>
            );
        default:
            return <Badge variant="outline">{type}</Badge>;
    }
}

export default function InventoryTransactionPage() {
    const navigate = useNavigate({ from: '/admin/inventory/transactions' });
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
        if (debouncedSearch !== (search || '')) {
            setSearch({ search: debouncedSearch, page: 1 });
        }
    }, [debouncedSearch, search]);

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [unifiedOpen, setUnifiedOpen] = React.useState(false);
    const [unifiedMode, setUnifiedMode] = React.useState<TStockActionMode>('ADD_STOCK');
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

    // Query: Stock Transactions with filters (both additions and deductions)
    const { data: txData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.TRANSACTIONS_LIST, { page, pageSize, search, type, startDate, endDate }],
        queryFn: () =>
            getStockTransactions({
                page,
                limit: pageSize,
                search: search || undefined,
                type: type && type !== 'ALL' ? type : undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            })
    });

    const hasActiveFilters = Boolean(type || startDate || endDate || localSearch);

    const handleResetFilters = () => {
        setLocalSearch('');
        setDateRange(undefined);
        setSearch({
            search: '',
            type: '',
            startDate: '',
            endDate: '',
            page: 1
        });
    };

    // Streamlined Essential Columns
    const columns = React.useMemo<ColumnDef<IStockTransaction>[]>(
        () => [
            {
                accessorKey: 'createdAt',
                header: 'Date & Time',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                        <CalendarIcon className="size-3 text-muted-foreground/70" />
                        {format(new Date(row.original.createdAt), 'MMM d, yyyy HH:mm')}
                    </span>
                )
            },
            {
                accessorKey: 'batch.ingredient.name',
                header: 'Ingredient',
                cell: ({ row }) => {
                    const ingredient = row.original.batch?.ingredient;
                    const defaultUnit = ingredient?.defaultUnit;
                    return (
                        <div className="flex flex-col">
                            <span className="font-semibold text-foreground/90 text-sm">{ingredient?.name || '—'}</span>
                            {defaultUnit && (
                                <span className="text-xs text-muted-foreground">Base Unit: {defaultUnit.abbreviation || defaultUnit.name}</span>
                            )}
                        </div>
                    );
                }
            },
            {
                accessorKey: 'type',
                header: 'Type',
                cell: ({ row }) => renderTransactionTypeBadge(row.original.type)
            },
            {
                accessorKey: 'quantityChange',
                header: 'Quantity Change',
                cell: ({ row }) => {
                    const qty = row.original.quantityChange;
                    const defaultUnit = row.original.batch?.ingredient?.defaultUnit;
                    const unitStr = defaultUnit ? ` ${defaultUnit.abbreviation || defaultUnit.name}` : '';
                    const isPositive = qty > 0;
                    return (
                        <span
                            className={cn(
                                'text-sm font-bold whitespace-nowrap',
                                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            )}
                        >
                            {isPositive ? `+${qty.toLocaleString()}` : qty.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground">{unitStr}</span>
                        </span>
                    );
                }
            },
            {
                accessorKey: 'batch.batchNumber',
                header: 'Batch / Lot',
                cell: ({ row }) => {
                    const batchNum = row.original.batch?.batchNumber;
                    if (!batchNum) return <span className="text-xs text-muted-foreground">—</span>;
                    return <span className="text-xs font-mono font-medium text-foreground/80">{batchNum}</span>;
                }
            },
            {
                accessorKey: 'reason',
                header: 'Reference / Reason',
                cell: ({ row }) => {
                    const reason = row.original.reason;
                    const po = row.original.batch?.purchaseOrder;
                    const supplier = row.original.batch?.supplier;

                    return (
                        <div className="flex flex-col gap-1 max-w-[280px]">
                            <span className="text-xs text-foreground/80 leading-snug line-clamp-2">{reason || 'No description provided'}</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {po && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate({
                                                to: '/admin/purchase-orders' as any,
                                                search: { search: po.poNumber } as any
                                            })
                                        }
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        title={`View Purchase Order ${po.poNumber}`}
                                    >
                                        <FileText className="size-2.5" />
                                        {po.poNumber}
                                    </button>
                                )}
                                {supplier && (
                                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                        Supplier: {supplier.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                }
            },
            {
                accessorKey: 'createdBy',
                header: 'Logged By',
                cell: ({ row }) => {
                    const user = row.original.createdBy;
                    if (!user) return <span className="text-xs text-muted-foreground italic">System / Auto</span>;
                    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
                    return <span className="text-xs text-foreground/80 font-medium">{fullName || user.username || 'Staff'}</span>;
                }
            }
        ],
        [navigate]
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Inventory Transactions</h1>
                        <p className="text-xs text-muted-foreground">
                            Complete audit ledger of raw material replenishments, order sales deductions, and stock adjustments.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <RequirePermission module="Inventory Management" action="create">
                        <Button
                            onClick={() => {
                                setSelectedIngredient(null);
                                setUnifiedMode('ADD_STOCK');
                                setUnifiedOpen(true);
                            }}
                            className="h-9 gap-1.5 shadow-sm"
                        >
                            <Plus className="size-4" /> Record Transaction
                        </Button>
                    </RequirePermission>
                </div>
            </div>

            <div className="space-y-4">
                <DataTable
                    columns={columns}
                    data={txData?.data || []}
                    pageCount={txData?.meta.pageCount || 1}
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
                                placeholder="Search ingredient, reason, batch #, PO #..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="h-9 w-full sm:w-[240px] bg-background/50 text-xs"
                            />

                            {/* Transaction Type Filter */}
                            <div className="w-full sm:w-[200px]">
                                <Select value={type || 'ALL'} onValueChange={(val) => setSearch({ type: val === 'ALL' ? '' : val, page: 1 })}>
                                    <SelectTrigger className="h-9 bg-background/50 text-xs">
                                        <SelectValue placeholder="All Transaction Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Transaction Types</SelectItem>
                                        <SelectItem value="DELIVERY">Deliveries / Stock In (+)</SelectItem>
                                        <SelectItem value="SALE">Order Sales (-)</SelectItem>
                                        <SelectItem value="WASTE">Waste (-)</SelectItem>
                                        <SelectItem value="SPOILED">Spoiled (-)</SelectItem>
                                        <SelectItem value="EXPIRED">Expired (-)</SelectItem>
                                        <SelectItem value="THEFT">Theft (-)</SelectItem>
                                        <SelectItem value="PROMOTIONAL_USE">Promo Use (-)</SelectItem>
                                        <SelectItem value="PHYSICAL_COUNT_CORRECTION">Count Corrections (±)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

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
                                                className="ml-auto hover:text-foreground p-0.5 rounded-full hover:bg-muted"
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

            {/* Unified Stock Action Dialog */}
            <UnifiedStockDialog
                open={unifiedOpen}
                onOpenChange={setUnifiedOpen}
                initialMode={unifiedMode}
                preselectedIngredient={selectedIngredient}
            />
        </div>
    );
}
