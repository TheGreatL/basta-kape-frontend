import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Edit2, Trash2, Calculator, Search, Globe, Package } from 'lucide-react';
import { toast } from 'sonner';

import { getUnitConversions, deleteUnitConversion } from '#/api/unit-conversions.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IUnitConversion } from '#/feature/inventory/unit-conversions/unit-conversions.types.ts';

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

import { UnitConversionCreateDialog, UnitConversionEditDialog, UnitConversionCalculatorDialog } from './unit-conversions-dialogs.tsx';

export default function UnitConversionsTab() {
    const queryClient = useQueryClient();

    // Table state
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(10);
    const [search, setSearch] = React.useState('');
    const [scopeFilter, setScopeFilter] = React.useState<'ALL' | 'GLOBAL' | 'INGREDIENT'>('ALL');
    const debouncedSearch = useDebounce(search, 400);

    const [sorting, setSorting] = React.useState<SortingState>([]);

    // Dialog states
    const [createOpen, setCreateOpen] = React.useState(false);
    const [editOpen, setEditOpen] = React.useState(false);
    const [calculatorOpen, setCalculatorOpen] = React.useState(false);
    const [selectedConversion, setSelectedConversion] = React.useState<IUnitConversion | null>(null);

    // Query parameter for ingredientId
    const ingredientParam = scopeFilter === 'GLOBAL' ? 'global' : undefined;

    // Fetch conversions
    const { data: conversionsData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.UNIT_CONVERSIONS.LIST, { page, pageSize, search: debouncedSearch, scopeFilter }],
        queryFn: () =>
            getUnitConversions({
                page,
                limit: pageSize,
                search: debouncedSearch || undefined,
                ingredientId: ingredientParam
            })
    });

    // Client-side filter for ingredient-specific if requested
    const filteredData = React.useMemo(() => {
        if (!conversionsData?.data) return [];
        if (scopeFilter === 'INGREDIENT') {
            return conversionsData.data.filter((c) => !!c.ingredientId);
        }
        return conversionsData.data;
    }, [conversionsData, scopeFilter]);

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: deleteUnitConversion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.UNIT_CONVERSIONS.LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            toast.success('Unit conversion deleted successfully');
        },
        onError: (err) => {
            toast.error('Failed to delete conversion', { description: getErrorMessage(err) });
        }
    });

    const columns = React.useMemo<ColumnDef<IUnitConversion>[]>(
        () => [
            {
                id: 'rule',
                header: 'Conversion Formula',
                cell: ({ row }) => {
                    const c = row.original;
                    const fromAbbrev = c.fromUnit.abbreviation || c.fromUnit.name;
                    const toAbbrev = c.toUnit.abbreviation || c.toUnit.name;
                    return (
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground font-mono">1 {fromAbbrev}</span>
                            <span className="text-primary font-bold">=</span>
                            <span className="font-bold text-sm text-primary font-mono">
                                {c.factor.toLocaleString(undefined, { maximumFractionDigits: 4 })} {toAbbrev}
                            </span>
                        </div>
                    );
                }
            },
            {
                accessorKey: 'fromUnit.name',
                header: 'From Unit',
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-semibold text-foreground/90">{row.original.fromUnit.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{row.original.fromUnit.abbreviation || 'No abbreviation'}</span>
                    </div>
                )
            },
            {
                accessorKey: 'factor',
                header: 'Factor Ratio',
                cell: ({ row }) => (
                    <span className="text-xs font-bold text-foreground font-mono">
                        ×{row.original.factor.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                )
            },
            {
                accessorKey: 'toUnit.name',
                header: 'To Base Unit',
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-semibold text-foreground/90">{row.original.toUnit.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{row.original.toUnit.abbreviation || 'No abbreviation'}</span>
                    </div>
                )
            },
            {
                id: 'scope',
                header: 'Scope',
                cell: ({ row }) => {
                    const c = row.original;
                    if (c.ingredient) {
                        return (
                            <Badge variant="secondary" className="text-xs font-semibold gap-1 bg-muted/60 text-foreground">
                                <Package className="size-3 text-primary" />
                                {c.ingredient.name}
                            </Badge>
                        );
                    }
                    return (
                        <Badge variant="outline" className="text-xs font-semibold gap-1 text-primary border-primary/30 bg-primary/5">
                            <Globe className="size-3" />
                            Global
                        </Badge>
                    );
                }
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const c = row.original;
                    return (
                        <div className="flex items-center gap-1">
                            <RequirePermission module="Inventory Management" action="update">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setSelectedConversion(c);
                                        setEditOpen(true);
                                    }}
                                >
                                    <Edit2 className="size-4" />
                                    <span className="sr-only">Edit Factor</span>
                                </Button>
                            </RequirePermission>

                            <RequirePermission module="Inventory Management" action="delete">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive">
                                            <Trash2 className="size-4" />
                                            <span className="sr-only">Delete Conversion</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="font-bold text-foreground">Delete Unit Conversion</AlertDialogTitle>
                                            <AlertDialogDescription className="text-xs">
                                                Are you sure you want to delete the conversion from <strong>{c.fromUnit.name}</strong> to{' '}
                                                <strong>{c.toUnit.name}</strong>
                                                {c.ingredient ? ` for ${c.ingredient.name}` : ''}? This may affect automatic recipe deductions and
                                                multi-unit stock display.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="h-9 text-xs font-bold">Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => deleteMutation.mutate(c.id)}
                                                className="h-9 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Delete Conversion
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </RequirePermission>
                        </div>
                    );
                }
            }
        ],
        [deleteMutation]
    );

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20 p-3 rounded-2xl border border-border/40">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search unit or ingredient..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9 h-9 text-xs bg-background/50"
                        />
                    </div>

                    <Select
                        value={scopeFilter}
                        onValueChange={(val: 'ALL' | 'GLOBAL' | 'INGREDIENT') => {
                            setScopeFilter(val);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="h-9 text-xs w-[160px] bg-background/50">
                            <SelectValue placeholder="All Scopes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL" className="text-xs">
                                All Scopes
                            </SelectItem>
                            <SelectItem value="GLOBAL" className="text-xs">
                                Global Only
                            </SelectItem>
                            <SelectItem value="INGREDIENT" className="text-xs">
                                Ingredient Specific
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button type="button" variant="outline" onClick={() => setCalculatorOpen(true)} className="h-9 text-xs font-bold gap-1.5">
                        <Calculator className="size-4 text-primary" />
                        Calculator
                    </Button>

                    <RequirePermission module="Inventory Management" action="create">
                        <Button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="h-9 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm"
                        >
                            <Plus className="size-4" />
                            Add Conversion
                        </Button>
                    </RequirePermission>
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={filteredData}
                pageCount={conversionsData?.meta.pageCount || 1}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(newPageIndex, newPageSize) => {
                    setPage(newPageIndex + 1);
                    setPageSize(newPageSize);
                }}
                sorting={sorting}
                onSortingChange={setSorting}
                isLoading={isLoading}
            />

            {/* Dialogs */}
            <UnitConversionCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
            <UnitConversionEditDialog open={editOpen} onOpenChange={setEditOpen} conversion={selectedConversion} />
            <UnitConversionCalculatorDialog open={calculatorOpen} onOpenChange={setCalculatorOpen} />
        </div>
    );
}
