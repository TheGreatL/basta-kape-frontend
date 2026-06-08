import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
    Package,
    Plus,
    Edit,
    Trash2,
    Truck,
    Scale,
    Beef,
    ClipboardList,
    TrendingUp,
    AlertTriangle,
    BarChart3,
    Calendar,
    ArrowDownCircle,
    RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Route } from '#/routes/admin/inventory.tsx';
import {
    getInventoryLevels,
    getIngredientUnits,
    getIngredients,
    getDeliveries,
    getAdjustments,
    getProductionForecast,
    deleteIngredientUnit,
    deleteIngredient,
    restoreIngredientUnit,
    restoreIngredient
} from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type {
    IIngredientInventory,
    IIngredientUnit,
    IIngredient,
    IDelivery,
    IAdjustment,
    IForecast,
    TInventoryStatus,
    TAdjustmentType
} from './inventory.types';

import DataTable from '#/components/data-table/data-table.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '#/components/ui/alert-dialog.tsx';

import { UnitCreateDialog, UnitEditDialog } from './components/inventory-units-dialogs.tsx';
import { IngredientCreateDialog, IngredientEditDialog } from './components/inventory-ingredients-dialogs.tsx';
import PhysicalCountDialog from './components/inventory-physical-count-dialog.tsx';
import DeliveryDialog from './components/inventory-delivery-dialog.tsx';
import AdjustmentDialog from './components/inventory-adjustment-dialog.tsx';

// =============================================================================
// Helpers
// =============================================================================

const STATUS_BADGE_MAP: Record<TInventoryStatus, { label: string; className: string }> = {
    SAFE: { label: 'Safe', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
    CRITICAL: { label: 'Critical', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
    OUT_OF_STOCK: { label: 'Out of Stock', className: 'bg-red-500/10 text-red-600 border-red-500/30' }
};

const ADJUSTMENT_LABEL: Record<TAdjustmentType, string> = {
    WASTE: 'Waste',
    SPOILED: 'Spoiled',
    EXPIRED: 'Expired',
    THEFT: 'Theft',
    PROMOTIONAL_USE: 'Promotional Use',
    PHYSICAL_COUNT_DISCREPANCY: 'Count Discrepancy'
};

// =============================================================================
// Main Page Component
// =============================================================================

export default function InventoryPage() {
    const navigate = useNavigate({ from: '/admin/inventory' });
    const queryClient = useQueryClient();

    const {
        tab,
        lPage,
        lPageSize,
        lSearch,
        lStatus,
        fSearch,
        dPage,
        dPageSize,
        dSearch,
        adjPage,
        adjPageSize,
        adjSearch,
        iPage,
        iPageSize,
        iSearch,
        iStatus,
        uPage,
        uPageSize,
        uSearch,
        uStatus
    } = Route.useSearch();

    const setSearch = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    // =========================================================================
    // Local Search State & Debounce
    // =========================================================================
    const [localLSearch, setLocalLSearch] = React.useState(lSearch || '');
    const [localDSearch, setLocalDSearch] = React.useState(dSearch || '');
    const [localAdjSearch, setLocalAdjSearch] = React.useState(adjSearch || '');
    const [localISearch, setLocalISearch] = React.useState(iSearch || '');
    const [localUSearch, setLocalUSearch] = React.useState(uSearch || '');
    const [localFSearch, setLocalFSearch] = React.useState(fSearch || '');

    const debouncedLSearch = useDebounce(localLSearch, 400);
    const debouncedDSearch = useDebounce(localDSearch, 400);
    const debouncedAdjSearch = useDebounce(localAdjSearch, 400);
    const debouncedISearch = useDebounce(localISearch, 400);
    const debouncedUSearch = useDebounce(localUSearch, 400);
    const debouncedFSearch = useDebounce(localFSearch, 400);

    React.useEffect(() => {
        setLocalLSearch(lSearch || '');
    }, [lSearch]);
    React.useEffect(() => {
        setLocalDSearch(dSearch || '');
    }, [dSearch]);
    React.useEffect(() => {
        setLocalAdjSearch(adjSearch || '');
    }, [adjSearch]);
    React.useEffect(() => {
        setLocalISearch(iSearch || '');
    }, [iSearch]);
    React.useEffect(() => {
        setLocalUSearch(uSearch || '');
    }, [uSearch]);
    React.useEffect(() => {
        setLocalFSearch(fSearch || '');
    }, [fSearch]);

    React.useEffect(() => {
        setSearch({ lSearch: debouncedLSearch, lPage: 1 });
    }, [debouncedLSearch]);
    React.useEffect(() => {
        setSearch({ dSearch: debouncedDSearch, dPage: 1 });
    }, [debouncedDSearch]);
    React.useEffect(() => {
        setSearch({ adjSearch: debouncedAdjSearch, adjPage: 1 });
    }, [debouncedAdjSearch]);
    React.useEffect(() => {
        setSearch({ iSearch: debouncedISearch, iPage: 1 });
    }, [debouncedISearch]);
    React.useEffect(() => {
        setSearch({ uSearch: debouncedUSearch, uPage: 1 });
    }, [debouncedUSearch]);

    // =========================================================================
    // Sorting State
    // =========================================================================
    const [lSorting, setLSorting] = React.useState<SortingState>([]);
    const [dSorting, setDSorting] = React.useState<SortingState>([]);
    const [adjSorting, setAdjSorting] = React.useState<SortingState>([]);
    const [iSorting, setISorting] = React.useState<SortingState>([]);
    const [uSorting, setUSorting] = React.useState<SortingState>([]);

    // =========================================================================
    // Dialog State
    // =========================================================================
    const [unitCreateOpen, setUnitCreateOpen] = React.useState(false);
    const [unitEditOpen, setUnitEditOpen] = React.useState(false);
    const [selectedUnit, setSelectedUnit] = React.useState<IIngredientUnit | null>(null);

    const [ingredientCreateOpen, setIngredientCreateOpen] = React.useState(false);
    const [ingredientEditOpen, setIngredientEditOpen] = React.useState(false);
    const [selectedIngredient, setSelectedIngredient] = React.useState<IIngredient | null>(null);

    const [physicalCountOpen, setPhysicalCountOpen] = React.useState(false);
    const [selectedInventory, setSelectedInventory] = React.useState<IIngredientInventory | null>(null);

    const [deliveryOpen, setDeliveryOpen] = React.useState(false);
    const [adjustmentOpen, setAdjustmentOpen] = React.useState(false);

    // =========================================================================
    // Query: Stock Levels
    // =========================================================================
    const { data: levelsData, isLoading: isLevelsLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST, { lPage, lPageSize, lSearch, lStatus, recordStatus: 'active' }],
        queryFn: () => getInventoryLevels({ page: lPage, limit: lPageSize, search: lSearch, status: lStatus, recordStatus: 'active' }),
        enabled: tab === 'levels'
    });

    // =========================================================================
    // Query: Production Forecast
    // =========================================================================
    const { data: forecastData, isLoading: isForecastLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.FORECAST],
        queryFn: getProductionForecast,
        enabled: tab === 'forecast'
    });

    const filteredForecast = React.useMemo(() => {
        if (!forecastData) return [];
        if (!debouncedFSearch) return forecastData;
        const q = debouncedFSearch.toLowerCase();
        return forecastData.filter((f: IForecast) => f.name.toLowerCase().includes(q) || (f.sku && f.sku.toLowerCase().includes(q)));
    }, [forecastData, debouncedFSearch]);

    // =========================================================================
    // Query: Deliveries
    // =========================================================================
    const { data: deliveriesData, isLoading: isDeliveriesLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.DELIVERIES_LIST, { dPage, dPageSize, dSearch }],
        queryFn: () => getDeliveries({ page: dPage, limit: dPageSize, search: dSearch }),
        enabled: tab === 'deliveries'
    });

    // =========================================================================
    // Query: Adjustments
    // =========================================================================
    const { data: adjustmentsData, isLoading: isAdjustmentsLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.ADJUSTMENTS_LIST, { adjPage, adjPageSize, adjSearch }],
        queryFn: () => getAdjustments({ page: adjPage, limit: adjPageSize, search: adjSearch }),
        enabled: tab === 'adjustments'
    });

    // =========================================================================
    // Query: Ingredients
    // =========================================================================
    const { data: ingredientsData, isLoading: isIngredientsLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.INGREDIENTS_LIST, { iPage, iPageSize, iSearch, iStatus }],
        queryFn: () => getIngredients({ page: iPage, limit: iPageSize, search: iSearch, status: iStatus }),
        enabled: tab === 'ingredients'
    });

    // =========================================================================
    // Query: Units
    // =========================================================================
    const { data: unitsData, isLoading: isUnitsLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.UNITS_LIST, { uPage, uPageSize, uSearch, uStatus }],
        queryFn: () => getIngredientUnits({ page: uPage, limit: uPageSize, search: uSearch, status: uStatus }),
        enabled: tab === 'units'
    });

    // =========================================================================
    // Delete & Restore Mutations
    // =========================================================================
    const deleteUnitMutation = useMutation({
        mutationFn: deleteIngredientUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.UNITS_LIST] });
            toast.success('Measurement Unit Archived');
        },
        onError: (err) => toast.error('Failed to archive unit', { description: getErrorMessage(err) })
    });

    const restoreUnitMutation = useMutation({
        mutationFn: restoreIngredientUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.UNITS_LIST] });
            toast.success('Measurement Unit Restored');
        },
        onError: (err) => toast.error('Failed to restore unit', { description: getErrorMessage(err) })
    });

    const deleteIngredientMutation = useMutation({
        mutationFn: deleteIngredient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.INGREDIENTS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            toast.success('Ingredient Archived');
        },
        onError: (err) => toast.error('Failed to archive ingredient', { description: getErrorMessage(err) })
    });

    const restoreIngredientMutation = useMutation({
        mutationFn: restoreIngredient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.INGREDIENTS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            toast.success('Ingredient Restored');
        },
        onError: (err) => toast.error('Failed to restore ingredient', { description: getErrorMessage(err) })
    });

    // =========================================================================
    // Column Definitions
    // =========================================================================

    // --- Stock Levels Columns ---
    const levelsColumns = React.useMemo<ColumnDef<IIngredientInventory>[]>(
        () => [
            {
                accessorKey: 'ingredient.name',
                header: 'Ingredient',
                cell: ({ row }) => (
                    <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground/90 leading-tight">{row.original.ingredient.name}</span>
                        <span className="text-xs text-muted-foreground">
                            Unit: {row.original.ingredient.defaultUnit.name} ({row.original.ingredient.defaultUnit.abbreviation})
                        </span>
                    </div>
                )
            },
            {
                accessorKey: 'currentQuantity',
                header: 'Current Stock',
                cell: ({ row }) => (
                    <span className="text-sm font-bold text-foreground/90">
                        {row.original.currentQuantity} {row.original.ingredient.defaultUnit.abbreviation}
                    </span>
                )
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const badge = STATUS_BADGE_MAP[row.original.status];
                    return (
                        <Badge variant="outline" className={`text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                        </Badge>
                    );
                }
            },
            {
                accessorKey: 'ingredient.reorderPoint',
                header: 'Reorder Point',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground font-medium">
                        {row.original.ingredient.reorderPoint} {row.original.ingredient.defaultUnit.abbreviation}
                    </span>
                )
            },
            {
                accessorKey: 'lastPhysicalCount',
                header: 'Last Counted',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground">
                        {row.original.lastPhysicalCount ? format(new Date(row.original.lastPhysicalCount), 'MMM d, yyyy HH:mm') : '—'}
                    </span>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        <RequirePermission module="Inventory Management" action="update">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                title="Physical Count"
                                onClick={() => {
                                    setSelectedInventory(row.original);
                                    setPhysicalCountOpen(true);
                                }}
                            >
                                <ClipboardList className="size-4" />
                            </Button>
                        </RequirePermission>
                        <RequirePermission module="Inventory Management" action="create">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                title="Log Delivery"
                                onClick={() => {
                                    setSelectedIngredient(row.original.ingredient);
                                    setDeliveryOpen(true);
                                }}
                            >
                                <Truck className="size-4" />
                            </Button>
                        </RequirePermission>
                        <RequirePermission module="Inventory Management" action="create">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                title="Log Waste"
                                onClick={() => {
                                    setSelectedIngredient(row.original.ingredient);
                                    setAdjustmentOpen(true);
                                }}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </RequirePermission>
                    </div>
                )
            }
        ],
        []
    );

    // --- Deliveries Columns ---
    const deliveryColumns = React.useMemo<ColumnDef<IDelivery>[]>(
        () => [
            {
                accessorKey: 'ingredient.name',
                header: 'Ingredient',
                cell: ({ row }) => <span className="font-semibold text-foreground/90 text-sm">{row.original.ingredient?.name || '—'}</span>
            },
            {
                accessorKey: 'supplier.name',
                header: 'Supplier',
                cell: ({ row }) => <span className="text-xs text-muted-foreground font-medium">{row.original.supplier?.name || '—'}</span>
            },
            {
                accessorKey: 'batchNumber',
                header: 'Batch / Lot',
                cell: ({ row }) => <span className="text-xs font-mono font-medium text-foreground/75">{row.original.batchNumber || '—'}</span>
            },
            {
                accessorKey: 'expiryDate',
                header: 'Expiration Date',
                cell: ({ row }) => {
                    const expiryDate = row.original.expiryDate;
                    if (!expiryDate) return <span className="text-xs text-muted-foreground">—</span>;

                    const expiry = new Date(expiryDate);
                    const now = new Date();
                    const isExpired = expiry < now;
                    const isExpiringSoon = expiry.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 && !isExpired;

                    if (isExpired) {
                        return (
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="size-3.5 shrink-0" />
                                {format(expiry, 'MMM d, yyyy')} (Expired)
                            </span>
                        );
                    }
                    if (isExpiringSoon) {
                        return (
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="size-3.5 shrink-0" />
                                {format(expiry, 'MMM d, yyyy')} (Soon)
                            </span>
                        );
                    }
                    return <span className="text-xs text-foreground/80 font-medium">{format(expiry, 'MMM d, yyyy')}</span>;
                }
            },
            {
                accessorKey: 'quantityReceived',
                header: 'Qty Received',
                cell: ({ row }) => <span className="text-sm font-bold text-emerald-600">+{row.original.quantityReceived.toLocaleString()}</span>
            },
            {
                accessorKey: 'unitCost',
                header: 'Unit Cost',
                cell: ({ row }) => <span className="text-xs font-medium text-foreground/80">₱{row.original.unitCost.toFixed(2)}</span>
            },
            {
                accessorKey: 'totalCost',
                header: 'Total Cost',
                cell: ({ row }) => <span className="text-sm font-bold text-foreground/90">₱{row.original.totalCost.toFixed(2)}</span>
            },
            {
                accessorKey: 'receivedAt',
                header: 'Received At',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" />
                        {format(new Date(row.original.receivedAt), 'MMM d, yyyy HH:mm')}
                    </span>
                )
            }
        ],
        []
    );

    // --- Adjustments Columns ---
    const adjustmentColumns = React.useMemo<ColumnDef<IAdjustment>[]>(
        () => [
            {
                accessorKey: 'ingredient.name',
                header: 'Ingredient',
                cell: ({ row }) => <span className="font-semibold text-foreground/90 text-sm">{row.original.ingredient?.name || '—'}</span>
            },
            {
                accessorKey: 'type',
                header: 'Type',
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-xs font-semibold bg-muted/20">
                        {ADJUSTMENT_LABEL[row.original.type]}
                    </Badge>
                )
            },
            {
                accessorKey: 'quantity',
                header: 'Quantity',
                cell: ({ row }) => (
                    <span className={`text-sm font-bold ${row.original.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {row.original.quantity > 0 ? '+' : ''}
                        {row.original.quantity.toLocaleString()}
                    </span>
                )
            },
            {
                accessorKey: 'reason',
                header: 'Reason',
                cell: ({ row }) => <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{row.original.reason || '—'}</span>
            },
            {
                accessorKey: 'createdAt',
                header: 'Logged At',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" />
                        {format(new Date(row.original.createdAt), 'MMM d, yyyy HH:mm')}
                    </span>
                )
            }
        ],
        []
    );

    // --- Ingredients Columns ---
    const ingredientColumns = React.useMemo<ColumnDef<IIngredient>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Ingredient Name',
                cell: ({ row }) => (
                    <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground/90">{row.original.name}</span>
                        {row.original.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{row.original.description}</span>
                        )}
                    </div>
                )
            },
            {
                accessorKey: 'defaultUnit.name',
                header: 'Default Unit',
                cell: ({ row }) => (
                    <span className="text-xs font-medium text-foreground/80">
                        {row.original.defaultUnit ? `${row.original.defaultUnit.name} (${row.original.defaultUnit.abbreviation})` : '—'}
                    </span>
                )
            },
            {
                accessorKey: 'reorderPoint',
                header: 'Reorder Point',
                cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.original.reorderPoint}</span>
            },
            {
                accessorKey: 'createdAt',
                header: 'Registered',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" />
                        {format(new Date(row.original.createdAt), 'MMM d, yyyy')}
                    </span>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        {iStatus !== 'archive' ? (
                            <>
                                <RequirePermission module="Inventory Management" action="update">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                        onClick={() => {
                                            setSelectedIngredient(row.original);
                                            setIngredientEditOpen(true);
                                        }}
                                    >
                                        <Edit className="size-4" />
                                    </Button>
                                </RequirePermission>
                                <RequirePermission module="Inventory Management" action="delete">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                        onClick={() => deleteIngredientMutation.mutate(row.original.id)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </RequirePermission>
                            </>
                        ) : (
                            <RequirePermission module="Inventory Management" action="delete">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                            disabled={restoreIngredientMutation.isPending}
                                        >
                                            <RotateCcw className="size-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2 font-bold text-foreground">
                                                <RotateCcw className="size-5 text-emerald-600" />
                                                Restore Raw Ingredient
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to restore the raw ingredient <strong>"{row.original.name}"</strong>? This will
                                                make it active, enabling stock tracking and recipe mapping.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => restoreIngredientMutation.mutate(row.original.id)}
                                                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                            >
                                                Confirm Restore
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </RequirePermission>
                        )}
                    </div>
                )
            }
        ],
        [iStatus, restoreIngredientMutation]
    );

    // --- Units Columns ---
    const unitColumns = React.useMemo<ColumnDef<IIngredientUnit>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Unit Name',
                cell: ({ row }) => <span className="font-semibold text-foreground/90">{row.original.name}</span>
            },
            {
                accessorKey: 'abbreviation',
                header: 'Abbreviation',
                cell: ({ row }) => (
                    <Badge variant="secondary" className="text-xs font-mono font-medium">
                        {row.original.abbreviation}
                    </Badge>
                )
            },
            {
                accessorKey: 'createdAt',
                header: 'Registered',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" />
                        {format(new Date(row.original.createdAt), 'MMM d, yyyy')}
                    </span>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        {uStatus !== 'archive' ? (
                            <>
                                <RequirePermission module="Inventory Management" action="update">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                        onClick={() => {
                                            setSelectedUnit(row.original);
                                            setUnitEditOpen(true);
                                        }}
                                    >
                                        <Edit className="size-4" />
                                    </Button>
                                </RequirePermission>
                                <RequirePermission module="Inventory Management" action="delete">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                        onClick={() => deleteUnitMutation.mutate(row.original.id)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </RequirePermission>
                            </>
                        ) : (
                            <RequirePermission module="Inventory Management" action="delete">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                            disabled={restoreUnitMutation.isPending}
                                        >
                                            <RotateCcw className="size-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2 font-bold text-foreground">
                                                <RotateCcw className="size-5 text-emerald-600" />
                                                Restore Measurement Unit
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to restore the measurement unit{' '}
                                                <strong>
                                                    "{row.original.name}" ({row.original.abbreviation})
                                                </strong>
                                                ? This will restore it to the active measurement unit options.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => restoreUnitMutation.mutate(row.original.id)}
                                                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                            >
                                                Confirm Restore
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </RequirePermission>
                        )}
                    </div>
                )
            }
        ],
        [uStatus, restoreUnitMutation]
    );

    // =========================================================================
    // Render
    // =========================================================================
    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
                        <p className="text-xs text-muted-foreground">
                            Track raw materials, stock levels, deliveries, waste logs, and production forecasts.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabbed Content */}
            <Tabs value={tab} onValueChange={(val) => setSearch({ tab: val })} className="w-full">
                <TabsList className="w-full sm:w-auto flex-wrap">
                    <TabsTrigger value="levels" className="gap-1.5">
                        <BarChart3 className="size-3.5" />
                        Stock Levels
                    </TabsTrigger>
                    <TabsTrigger value="forecast" className="gap-1.5">
                        <TrendingUp className="size-3.5" />
                        Projections
                    </TabsTrigger>
                    <TabsTrigger value="deliveries" className="gap-1.5">
                        <Truck className="size-3.5" />
                        Deliveries
                    </TabsTrigger>
                    <TabsTrigger value="adjustments" className="gap-1.5">
                        <ArrowDownCircle className="size-3.5" />
                        Waste Log
                    </TabsTrigger>
                    <TabsTrigger value="ingredients" className="gap-1.5">
                        <Beef className="size-3.5" />
                        Ingredients
                    </TabsTrigger>
                    <TabsTrigger value="units" className="gap-1.5">
                        <Scale className="size-3.5" />
                        Units
                    </TabsTrigger>
                </TabsList>

                {/* ============================================================ */}
                {/* STOCK LEVELS TAB */}
                {/* ============================================================ */}
                <TabsContent value="levels" className="mt-4">
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-xs text-muted-foreground font-medium">
                                Live inventory stock readings with alert statuses ranked by criticality.
                            </p>
                            <div className="flex items-center gap-2">
                                <RequirePermission module="Inventory Management" action="create">
                                    <Button
                                        onClick={() => {
                                            setSelectedIngredient(null);
                                            setDeliveryOpen(true);
                                        }}
                                        className="h-9 gap-1.5 shadow-sm"
                                        size="sm"
                                    >
                                        <Truck className="size-4" /> Log Delivery
                                    </Button>
                                </RequirePermission>
                                <RequirePermission module="Inventory Management" action="create">
                                    <Button
                                        onClick={() => {
                                            setSelectedIngredient(null);
                                            setAdjustmentOpen(true);
                                        }}
                                        variant="outline"
                                        className="h-9 gap-1.5"
                                        size="sm"
                                    >
                                        <Trash2 className="size-4" /> Log Waste
                                    </Button>
                                </RequirePermission>
                            </div>
                        </div>
                        <DataTable
                            columns={levelsColumns}
                            data={levelsData?.data || []}
                            pageCount={levelsData?.meta.pageCount || 1}
                            pageIndex={lPage - 1}
                            pageSize={lPageSize}
                            onPaginationChange={(idx, size) => setSearch({ lPage: idx + 1, lPageSize: size })}
                            sorting={lSorting}
                            onSortingChange={setLSorting}
                            isLoading={isLevelsLoading}
                            showColumnVisibilityToggle={true}
                            filterContent={
                                <>
                                    <Input
                                        placeholder="Search ingredients..."
                                        value={localLSearch}
                                        onChange={(e) => setLocalLSearch(e.target.value)}
                                        className="h-9 w-full sm:w-[250px] bg-background/50"
                                    />
                                    <Select
                                        value={lStatus || 'all'}
                                        onValueChange={(val) => setSearch({ lStatus: val === 'all' ? '' : val, lPage: 1 })}
                                    >
                                        <SelectTrigger className="h-9 min-w-[160px] bg-background/50 capitalize">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="SAFE">Safe</SelectItem>
                                            <SelectItem value="CRITICAL">Critical</SelectItem>
                                            <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </>
                            }
                        />
                    </div>
                </TabsContent>

                {/* ============================================================ */}
                {/* FORECAST TAB */}
                {/* ============================================================ */}
                <TabsContent value="forecast" className="mt-4">
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-xs text-muted-foreground font-medium">
                                Real-time estimates of maximum units you can produce from current stock.
                            </p>
                        </div>
                        <Input
                            placeholder="Filter forecasts by name or SKU..."
                            value={localFSearch}
                            onChange={(e) => setLocalFSearch(e.target.value)}
                            className="h-9 w-full sm:w-[300px] bg-background/50"
                        />

                        {isForecastLoading ? (
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
                                    <div
                                        key={item.variantId}
                                        className="border border-border/40 rounded-xl p-4 bg-background hover:shadow-sm transition-shadow space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-0.5 min-w-0 flex-1">
                                                <h4 className="text-sm font-bold text-foreground leading-tight truncate">{item.name}</h4>
                                                {item.sku && <span className="text-xs text-muted-foreground font-mono">SKU: {item.sku}</span>}
                                            </div>
                                            <span className="text-lg font-bold text-primary shrink-0">{item.maxProduceable}</span>
                                        </div>

                                        {!item.hasRecipe ? (
                                            <p className="text-xs text-muted-foreground italic">No recipe configured.</p>
                                        ) : (
                                            <>
                                                {item.bottleneck && (
                                                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                                        <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                                                        <span className="text-xs text-amber-700 font-medium truncate">
                                                            Bottleneck: {item.bottleneck.name} ({item.bottleneck.currentQuantity}{' '}
                                                            {item.bottleneck.unit})
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="space-y-1">
                                                    {item.ingredients.map((ing) => (
                                                        <div key={ing.ingredientId} className="flex items-center justify-between text-xs">
                                                            <span className="text-muted-foreground truncate flex-1 mr-2">{ing.name}</span>
                                                            <span className="text-foreground/70 font-medium shrink-0">
                                                                {ing.currentQuantity}/{ing.requiredQuantity} {ing.unit} → {ing.canProduce}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ============================================================ */}
                {/* DELIVERIES TAB */}
                {/* ============================================================ */}
                <TabsContent value="deliveries" className="mt-4">
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-xs text-muted-foreground font-medium">
                                All logged supplier replenishment receipts and material intake records.
                            </p>
                            <RequirePermission module="Inventory Management" action="create">
                                <Button
                                    onClick={() => {
                                        setSelectedIngredient(null);
                                        setDeliveryOpen(true);
                                    }}
                                    className="h-9 gap-1.5 shadow-sm"
                                    size="sm"
                                >
                                    <Plus className="size-4" /> Log Delivery
                                </Button>
                            </RequirePermission>
                        </div>
                        <DataTable
                            columns={deliveryColumns}
                            data={deliveriesData?.data || []}
                            pageCount={deliveriesData?.meta.pageCount || 1}
                            pageIndex={dPage - 1}
                            pageSize={dPageSize}
                            onPaginationChange={(idx, size) => setSearch({ dPage: idx + 1, dPageSize: size })}
                            sorting={dSorting}
                            onSortingChange={setDSorting}
                            isLoading={isDeliveriesLoading}
                            showColumnVisibilityToggle={true}
                            filterContent={
                                <Input
                                    placeholder="Search deliveries..."
                                    value={localDSearch}
                                    onChange={(e) => setLocalDSearch(e.target.value)}
                                    className="h-9 w-full sm:w-[250px] bg-background/50"
                                />
                            }
                        />
                    </div>
                </TabsContent>

                {/* ============================================================ */}
                {/* ADJUSTMENTS / WASTE TAB */}
                {/* ============================================================ */}
                <TabsContent value="adjustments" className="mt-4">
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-xs text-muted-foreground font-medium">
                                Track waste, spoilage, theft, and manual stock correction events.
                            </p>
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
                            columns={adjustmentColumns}
                            data={adjustmentsData?.data || []}
                            pageCount={adjustmentsData?.meta.pageCount || 1}
                            pageIndex={adjPage - 1}
                            pageSize={adjPageSize}
                            onPaginationChange={(idx, size) => setSearch({ adjPage: idx + 1, adjPageSize: size })}
                            sorting={adjSorting}
                            onSortingChange={setAdjSorting}
                            isLoading={isAdjustmentsLoading}
                            showColumnVisibilityToggle={true}
                            filterContent={
                                <Input
                                    placeholder="Search adjustments..."
                                    value={localAdjSearch}
                                    onChange={(e) => setLocalAdjSearch(e.target.value)}
                                    className="h-9 w-full sm:w-[250px] bg-background/50"
                                />
                            }
                        />
                    </div>
                </TabsContent>

                {/* ============================================================ */}
                {/* INGREDIENTS CONFIG TAB */}
                {/* ============================================================ */}
                <TabsContent value="ingredients" className="mt-4">
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-xs text-muted-foreground font-medium">
                                Manage raw material profiles, default measurement units, and alert thresholds.
                            </p>
                            <RequirePermission module="Inventory Management" action="create">
                                <Button onClick={() => setIngredientCreateOpen(true)} className="h-9 gap-1.5 shadow-sm" size="sm">
                                    <Plus className="size-4" /> Register Ingredient
                                </Button>
                            </RequirePermission>
                        </div>
                        <DataTable
                            columns={ingredientColumns}
                            data={ingredientsData?.data || []}
                            pageCount={ingredientsData?.meta.pageCount || 1}
                            pageIndex={iPage - 1}
                            pageSize={iPageSize}
                            onPaginationChange={(idx, size) => setSearch({ iPage: idx + 1, iPageSize: size })}
                            sorting={iSorting}
                            onSortingChange={setISorting}
                            isLoading={isIngredientsLoading}
                            showColumnVisibilityToggle={true}
                            filterContent={
                                <>
                                    <Input
                                        placeholder="Search ingredients..."
                                        value={localISearch}
                                        onChange={(e) => setLocalISearch(e.target.value)}
                                        className="h-9 w-full sm:w-[250px] bg-background/50"
                                    />
                                    <Select value={iStatus} onValueChange={(val) => setSearch({ iStatus: val, iPage: 1 })}>
                                        <SelectTrigger className="h-9 min-w-[130px] bg-background/50 capitalize">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="capitalize">
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="archive">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </>
                            }
                        />
                    </div>
                </TabsContent>

                {/* ============================================================ */}
                {/* UNITS CONFIG TAB */}
                {/* ============================================================ */}
                <TabsContent value="units" className="mt-4">
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-xs text-muted-foreground font-medium">
                                Manage measurement unit definitions used across raw material and recipe configurations.
                            </p>
                            <RequirePermission module="Inventory Management" action="create">
                                <Button onClick={() => setUnitCreateOpen(true)} className="h-9 gap-1.5 shadow-sm" size="sm">
                                    <Plus className="size-4" /> Create Unit
                                </Button>
                            </RequirePermission>
                        </div>
                        <DataTable
                            columns={unitColumns}
                            data={unitsData?.data || []}
                            pageCount={unitsData?.meta.pageCount || 1}
                            pageIndex={uPage - 1}
                            pageSize={uPageSize}
                            onPaginationChange={(idx, size) => setSearch({ uPage: idx + 1, uPageSize: size })}
                            sorting={uSorting}
                            onSortingChange={setUSorting}
                            isLoading={isUnitsLoading}
                            showColumnVisibilityToggle={true}
                            filterContent={
                                <>
                                    <Input
                                        placeholder="Search units..."
                                        value={localUSearch}
                                        onChange={(e) => setLocalUSearch(e.target.value)}
                                        className="h-9 w-full sm:w-[250px] bg-background/50"
                                    />
                                    <Select value={uStatus} onValueChange={(val) => setSearch({ uStatus: val, uPage: 1 })}>
                                        <SelectTrigger className="h-9 min-w-[130px] bg-background/50 capitalize">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="capitalize">
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="archive">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </>
                            }
                        />
                    </div>
                </TabsContent>
            </Tabs>

            {/* ================================================================ */}
            {/* All Dialogs */}
            {/* ================================================================ */}
            <UnitCreateDialog open={unitCreateOpen} onOpenChange={setUnitCreateOpen} />
            <UnitEditDialog open={unitEditOpen} onOpenChange={setUnitEditOpen} unit={selectedUnit} />
            <IngredientCreateDialog open={ingredientCreateOpen} onOpenChange={setIngredientCreateOpen} />
            <IngredientEditDialog open={ingredientEditOpen} onOpenChange={setIngredientEditOpen} ingredient={selectedIngredient} />
            <PhysicalCountDialog open={physicalCountOpen} onOpenChange={setPhysicalCountOpen} inventory={selectedInventory} />
            <DeliveryDialog open={deliveryOpen} onOpenChange={setDeliveryOpen} preselectedIngredient={selectedIngredient} />
            <AdjustmentDialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen} preselectedIngredient={selectedIngredient} />
        </div>
    );
}
