import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Beef, Plus, Edit, Trash2, RotateCcw, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Route } from '#/routes/admin/inventory/ingredients.tsx';
import { getIngredients, deleteIngredient, restoreIngredient } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IIngredient } from '../inventory.types';

import DataTable from '#/components/data-table/data-table.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
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

import { IngredientCreateDialog, IngredientEditDialog } from '../components/inventory-ingredients-dialogs.tsx';

export default function IngredientsPage() {
    const navigate = useNavigate({ from: '/admin/inventory/ingredients' });
    const queryClient = useQueryClient();
    const { page, pageSize, search, status } = Route.useSearch();

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
    const [ingredientCreateOpen, setIngredientCreateOpen] = React.useState(false);
    const [ingredientEditOpen, setIngredientEditOpen] = React.useState(false);
    const [selectedIngredient, setSelectedIngredient] = React.useState<IIngredient | null>(null);

    // Query: Ingredients
    const { data: ingredientsData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.INVENTORY.INGREDIENTS_LIST, { page, pageSize, search, status }],
        queryFn: () => getIngredients({ page, limit: pageSize, search, status })
    });

    // Delete & Restore Mutations
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

    const columns = React.useMemo<ColumnDef<IIngredient>[]>(
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
                        {status !== 'archive' ? (
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
        [status, restoreIngredientMutation, deleteIngredientMutation]
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Beef className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Ingredients</h1>
                        <p className="text-xs text-muted-foreground">
                            Manage raw material profiles, default measurement units, and alert thresholds.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-muted-foreground font-medium">Configure raw ingredient specifications.</p>
                    <RequirePermission module="Inventory Management" action="create">
                        <Button onClick={() => setIngredientCreateOpen(true)} className="h-9 gap-1.5 shadow-sm" size="sm">
                            <Plus className="size-4" /> Register Ingredient
                        </Button>
                    </RequirePermission>
                </div>
                <DataTable
                    columns={columns}
                    data={ingredientsData?.data || []}
                    pageCount={ingredientsData?.meta.pageCount || 1}
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
                                placeholder="Search ingredients..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="h-9 w-full sm:w-[250px] bg-background/50"
                            />
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

            <IngredientCreateDialog open={ingredientCreateOpen} onOpenChange={setIngredientCreateOpen} />
            <IngredientEditDialog open={ingredientEditOpen} onOpenChange={setIngredientEditOpen} ingredient={selectedIngredient} />
        </div>
    );
}
