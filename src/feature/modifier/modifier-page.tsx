import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { SlidersHorizontal, Plus, Edit2, Trash2, ShoppingBag, Info, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Route } from '#/routes/admin/products/modifiers.tsx';
import { getModifierGroups, deleteModifierGroup, deleteModifierOption } from '#/api/modifiers.api.ts';
import { getProductsList, getProductById } from '#/api/products.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IModifierGroup, IModifierOption } from './modifier.types';
import type { IProduct } from '#/feature/products/products.types.ts';

import GroupDialog from './components/group-dialog';
import OptionDialog from './components/option-dialog';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card.tsx';

export default function ModifiersPage() {
    const navigate = useNavigate({ from: '/admin/products/modifiers' });
    const { page, pageSize, search, productId } = Route.useSearch();
    const queryClient = useQueryClient();

    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    // Dialog states
    const [groupDialogOpen, setGroupDialogOpen] = React.useState(false);
    const [selectedGroup, setSelectedGroup] = React.useState<IModifierGroup | null>(null);

    const [optionDialogOpen, setOptionDialogOpen] = React.useState(false);
    const [selectedGroupIdForOption, setSelectedGroupIdForOption] = React.useState<string>('');
    const [selectedOption, setSelectedOption] = React.useState<IModifierOption | null>(null);

    const setSearchParams = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        setSearchParams({ search: debouncedSearch, page: 1 });
    }, [debouncedSearch]);

    // Fetch individual selected product for display label in InfiniteSelect
    const { data: selectedProduct } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.PRODUCTS_LIST, 'detail', productId],
        queryFn: () => getProductById(productId),
        enabled: !!productId
    });

    // Query: Fetch modifier groups
    const { data: groupsData, isLoading: isGroupsLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS, { page, pageSize, search, productId }],
        queryFn: () =>
            getModifierGroups({
                page,
                limit: pageSize,
                search: search || undefined,
                productId: productId || undefined
            })
    });

    // Mutations: Deletes
    const deleteGroupMutation = useMutation({
        mutationFn: (id: string) => deleteModifierGroup(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS] });
            toast.success('Modifier group deleted successfully');
        },
        onError: (err) => {
            toast.error('Failed to delete modifier group', { description: getErrorMessage(err) });
        }
    });

    const deleteOptionMutation = useMutation({
        mutationFn: (id: string) => deleteModifierOption(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCTS.MODIFIER_GROUPS] });
            toast.success('Modifier option deleted successfully');
        },
        onError: (err) => {
            toast.error('Failed to delete modifier option', { description: getErrorMessage(err) });
        }
    });

    const handleOpenCreateGroup = () => {
        setSelectedGroup(null);
        setGroupDialogOpen(true);
    };

    const handleOpenEditGroup = (group: IModifierGroup) => {
        setSelectedGroup(group);
        setGroupDialogOpen(true);
    };

    const handleOpenCreateOption = (groupId: string) => {
        setSelectedGroupIdForOption(groupId);
        setSelectedOption(null);
        setOptionDialogOpen(true);
    };

    const handleOpenEditOption = (groupId: string, option: IModifierOption) => {
        setSelectedGroupIdForOption(groupId);
        setSelectedOption(option);
        setOptionDialogOpen(true);
    };

    const handleDeleteGroup = (group: IModifierGroup) => {
        if (confirm(`Are you sure you want to delete the modifier group "${group.name}"? This cascades and deletes all options in this group.`)) {
            deleteGroupMutation.mutate(group.id);
        }
    };

    const handleDeleteOption = (option: IModifierOption) => {
        if (confirm(`Are you sure you want to delete option "${option.name}"?`)) {
            deleteOptionMutation.mutate(option.id);
        }
    };

    const handleClearFilters = () => {
        setLocalSearch('');
        setSearchParams({
            page: 1,
            search: '',
            productId: ''
        });
    };

    const hasActiveFilters = !!search || !!productId;

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-xs">
                        <SlidersHorizontal className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground ">Product Modifiers & Customizations</h1>
                        <p className="text-xs text-muted-foreground">
                            Configure drink adjustments, milk alternatives, syrup additions, and map choices to inventory ingredients.
                        </p>
                    </div>
                </div>
                <RequirePermission module="Products Management" action="create">
                    <Button onClick={handleOpenCreateGroup} className="h-9 gap-1.5 shadow-sm text-xs font-semibold shrink-0">
                        <Plus className="size-4" /> Create Modifier Group
                    </Button>
                </RequirePermission>
            </div>

            {/* Filters Section */}
            <div className="flex flex-wrap items-center gap-3 bg-muted/10 p-3 rounded-xl border border-border/40">
                <Input
                    placeholder="Search group name..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="h-9 w-full sm:w-[240px] bg-background/50 text-xs"
                />

                <InfiniteSelect<IProduct>
                    queryKey={[QUERY_KEY.PRODUCTS.PRODUCTS_LIST, { status: 'active' }]}
                    fetchFn={({ pageParam, query }) => getProductsList({ page: pageParam as number, limit: 15, search: query, status: 'active' })}
                    getItems={(resPage) => resPage.data}
                    getNextPageParam={(lastPage) => (lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined)}
                    initialPageParam={1}
                    value={productId || undefined}
                    onChange={(val) => setSearchParams({ productId: val || '', page: 1 })}
                    getOptionValue={(prod) => prod.id}
                    getOptionLabel={(prod) => prod.name}
                    selectedItem={selectedProduct}
                    placeholder="Filter by linked Product"
                    searchPlaceholder="Search products..."
                    className="h-9 w-full sm:w-[220px] bg-background/50 text-xs"
                />

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground hover:bg-transparent"
                        onClick={handleClearFilters}
                    >
                        <RotateCcw className="size-3.5" />
                        Clear Filters
                    </Button>
                )}
            </div>

            {/* Dashboard Display */}
            {isGroupsLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Spinner className="h-8 w-8 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground font-semibold">Fetching modifier groups...</span>
                </div>
            ) : !groupsData?.data || groupsData.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-2xl bg-muted/5 gap-3">
                    <Info className="size-8 text-muted-foreground stroke-[1.5]" />
                    <div className="text-center">
                        <h3 className="font-bold text-foreground">No Modifier Groups</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {hasActiveFilters
                                ? 'No custom groups found matching your filter parameters.'
                                : 'Configure your first modifier group to allow customized drinks on Checkout.'}
                        </p>
                    </div>
                    {hasActiveFilters ? (
                        <Button onClick={handleClearFilters} variant="outline" size="sm" className="h-8 text-xs font-semibold">
                            Reset Search Filters
                        </Button>
                    ) : (
                        <RequirePermission module="Products Management" action="create">
                            <Button onClick={handleOpenCreateGroup} size="sm" className="h-8 text-xs font-semibold">
                                Create Group
                            </Button>
                        </RequirePermission>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupsData.data.map((group: IModifierGroup) => (
                            <Card
                                key={group.id}
                                className="overflow-hidden border border-border/50 hover:border-border/90 transition-all flex flex-col shadow-xs bg-card"
                            >
                                <CardHeader className="p-4 pb-3 border-b bg-muted/15 flex flex-col gap-1">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-sm font-bold text-foreground truncate max-w-[70%]">{group.name}</CardTitle>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <RequirePermission module="Products Management" action="update">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenEditGroup(group)}
                                                    className="size-7 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40"
                                                >
                                                    <Edit2 className="size-3.5" />
                                                </Button>
                                            </RequirePermission>
                                            <RequirePermission module="Products Management" action="delete">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteGroup(group)}
                                                    className="size-7 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </RequirePermission>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                        <Badge
                                            className={`text-xs font-semibold py-0.5 px-2 ${
                                                group.isRequired
                                                    ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40'
                                                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                                            }`}
                                        >
                                            {group.isRequired ? 'Required' : 'Optional'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-semibold">
                                            Limits: {group.minSelect} - {group.maxSelect} select
                                        </span>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-4 flex-1 flex flex-col gap-4">
                                    {/* Linked Products */}
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold text-foreground/50 flex items-center gap-1 uppercase">
                                            <ShoppingBag className="size-3 text-primary" /> Linked Products ({group.products.length})
                                        </span>
                                        {group.products.length === 0 ? (
                                            <span className="text-xs text-muted-foreground font-medium italic block pl-1">
                                                Not linked to any products yet.
                                            </span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto pr-1">
                                                {group.products.map((p) => (
                                                    <Badge
                                                        key={p.id}
                                                        variant="secondary"
                                                        className="text-xs bg-muted/40 text-foreground/80 hover:bg-muted py-0 px-2 font-medium"
                                                    >
                                                        {p.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Options List */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-center border-b pb-1.5">
                                            <span className="text-xs font-bold text-foreground/50 uppercase">
                                                Option Choices ({group.options.length})
                                            </span>
                                            <RequirePermission module="Products Management" action="create">
                                                <Button
                                                    variant="ghost"
                                                    size="xs"
                                                    onClick={() => handleOpenCreateOption(group.id)}
                                                    className="h-6 text-xs font-semibold gap-1 px-1.5 hover:bg-primary/5 hover:text-primary rounded-md"
                                                >
                                                    <Plus className="size-3" /> Add Choice
                                                </Button>
                                            </RequirePermission>
                                        </div>

                                        {group.options.length === 0 ? (
                                            <div className="text-center py-6 text-xs text-muted-foreground font-medium border border-dashed rounded-xl bg-muted/5 italic">
                                                No choices defined. Add one above.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border/30 max-h-[220px] overflow-y-auto pr-1 space-y-1.5">
                                                {group.options.map((opt) => (
                                                    <div key={opt.id} className="flex justify-between items-center pt-1.5 first:pt-0">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-xs font-semibold text-foreground/90 truncate">{opt.name}</span>
                                                            <span className="text-xs text-muted-foreground font-medium">
                                                                Price: ₱{opt.price.toFixed(2)}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                                            <RequirePermission module="Products Management" action="update">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleOpenEditOption(group.id, opt)}
                                                                    className="size-7 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40"
                                                                >
                                                                    <Edit2 className="size-3" />
                                                                </Button>
                                                            </RequirePermission>

                                                            <RequirePermission module="Products Management" action="delete">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDeleteOption(opt)}
                                                                    className="size-7 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                                                                >
                                                                    <Trash2 className="size-3" />
                                                                </Button>
                                                            </RequirePermission>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {groupsData.meta.pageCount > 1 && (
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setSearchParams({ page: page - 1 })}
                                className="h-8 w-8 p-0"
                            >
                                &lt;
                            </Button>
                            <span className="text-xs text-muted-foreground font-semibold px-2">
                                Page {page} of {groupsData.meta.pageCount}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!groupsData.meta.hasMore}
                                onClick={() => setSearchParams({ page: page + 1 })}
                                className="h-8 w-8 p-0"
                            >
                                &gt;
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Customizer dialog components */}
            <GroupDialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen} group={selectedGroup} />

            <OptionDialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen} groupId={selectedGroupIdForOption} option={selectedOption} />
        </div>
    );
}
