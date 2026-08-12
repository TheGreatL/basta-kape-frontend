import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Scale, Plus, Edit, Trash2, RotateCcw, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Route } from '#/routes/admin/inventory/units.tsx';
import { getIngredientUnits, deleteIngredientUnit, restoreIngredientUnit } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IIngredientUnit, TUnitCategory } from '../inventory.types';

import DataTable from '#/components/data-table/data-table.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';

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

import { UnitCreateDialog, UnitEditDialog } from '../components/inventory-units-dialogs.tsx';

const UNIT_CATEGORY_CONFIG: Record<TUnitCategory, { label: string; className: string }> = {
    ALL: {
        label: 'Universal / All Items',
        className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20'
    },
    INGREDIENT: {
        label: 'Raw Ingredients',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
    },
    PACKAGING_MATERIAL: {
        label: 'Packaging Materials',
        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
    },
    SUPPLY: {
        label: 'General Supplies',
        className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20'
    }
};

export default function UnitsPage() {
    const navigate = useNavigate({ from: '/admin/inventory/units' });
    const queryClient = useQueryClient();
    const { page, pageSize, search, status, category } = Route.useSearch();

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

    // Dialog States
    const [unitCreateOpen, setUnitCreateOpen] = React.useState(false);
    const [unitEditOpen, setUnitEditOpen] = React.useState(false);
    const [selectedUnit, setSelectedUnit] = React.useState<IIngredientUnit | null>(null);

    // Query: Units
    const { data: unitsData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.UNITS_LIST, { page, pageSize, search, status, category }],
        queryFn: () => getIngredientUnits({ page, limit: pageSize, search, status, category: category || undefined })
    });

    // Delete & Restore Mutations
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

    const columns = React.useMemo<ColumnDef<IIngredientUnit>[]>(
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
                accessorKey: 'category',
                header: 'Applicable Category',
                cell: ({ row }) => {
                    const cat = row.original.category;
                    const config = UNIT_CATEGORY_CONFIG[cat];
                    return (
                        <Badge variant="outline" className={`font-medium ${config.className}`}>
                            {config.label}
                        </Badge>
                    );
                }
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
                        {status !== 'archive' ? (
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
        [status, restoreUnitMutation, deleteUnitMutation]
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Scale className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Units</h1>
                        <p className="text-xs text-muted-foreground">
                            Manage measurement unit definitions used across raw material and recipe configurations.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-muted-foreground font-medium">Configure measurement unit options.</p>
                    <RequirePermission module="Inventory Management" action="create">
                        <Button onClick={() => setUnitCreateOpen(true)} className="h-9 gap-1.5 shadow-sm" size="sm">
                            <Plus className="size-4" /> Create Unit
                        </Button>
                    </RequirePermission>
                </div>
                <DataTable
                    columns={columns}
                    data={unitsData?.data || []}
                    pageCount={unitsData?.meta.pageCount || 1}
                    pageIndex={page - 1}
                    pageSize={pageSize}
                    onPaginationChange={(idx, size) => setSearch({ page: idx + 1, pageSize: size })}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={isLoading}
                    showColumnVisibilityToggle={true}
                    filterContent={
                        <>
                            <Input
                                placeholder="Search units..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="h-9 w-full sm:w-[250px] bg-background/50"
                            />
                            <Select
                                value={category || 'ALL_CATEGORIES'}
                                onValueChange={(val) => setSearch({ category: val === 'ALL_CATEGORIES' ? '' : val, page: 1 })}
                            >
                                <SelectTrigger className="h-9 min-w-[170px] bg-background/50">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL_CATEGORIES">All Categories</SelectItem>
                                    <SelectItem value="ALL">Universal (All Items)</SelectItem>
                                    <SelectItem value="INGREDIENT">Raw Ingredients</SelectItem>
                                    <SelectItem value="PACKAGING_MATERIAL">Packaging Materials</SelectItem>
                                    <SelectItem value="SUPPLY">General Supplies</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={status} onValueChange={(val: any) => setSearch({ status: val, page: 1 })}>
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

            <UnitCreateDialog open={unitCreateOpen} onOpenChange={setUnitCreateOpen} />
            <UnitEditDialog open={unitEditOpen} onOpenChange={setUnitEditOpen} unit={selectedUnit} />
        </div>
    );
}
