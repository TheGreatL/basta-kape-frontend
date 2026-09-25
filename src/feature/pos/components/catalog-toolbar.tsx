import * as React from 'react';
import { Search, X, RotateCcw, Coffee, Layers, ChevronDown } from 'lucide-react';
import { Input } from '#/components/ui/input.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#/components/ui/collapsible.tsx';
import { cn } from '#/lib/utils.ts';
import type { IMenuCategory, IMenuProductType } from '../../menu/menu.types';

interface CatalogToolbarProps {
    search: string;
    setSearch: (search: string) => void;
    productCategoryId: string;
    setProductCategoryId: (id: string) => void;
    productTypeId: string;
    setProductTypeId: (id: string) => void;
    categoriesData: IMenuCategory[] | undefined;
    typesData: IMenuProductType[] | undefined;
}

export default function CatalogToolbar({
    search,
    setSearch,
    productCategoryId,
    setProductCategoryId,
    productTypeId,
    setProductTypeId,
    categoriesData,
    typesData
}: CatalogToolbarProps) {
    const [isCategoriesOpen, setIsCategoriesOpen] = React.useState(true);

    const hasActiveFilters = !!search || !!productCategoryId || !!productTypeId;

    const filteredCategories = React.useMemo(() => {
        if (!categoriesData) return [];
        if (!productTypeId) return categoriesData;
        return categoriesData.filter((cat) => cat.productTypeId === productTypeId || cat.type?.id === productTypeId);
    }, [categoriesData, productTypeId]);

    const selectedCategoryName = React.useMemo(() => {
        if (productCategoryId) {
            return categoriesData?.find((c) => c.id === productCategoryId)?.name || 'Filtered';
        }
        return 'All Menu';
    }, [productCategoryId, categoriesData]);

    const handleProductTypeChange = (typeId: string) => {
        const nextTypeId = typeId === productTypeId ? '' : typeId;
        setProductTypeId(nextTypeId);
        if (nextTypeId && productCategoryId) {
            const currentCat = categoriesData?.find((c) => c.id === productCategoryId);
            if (currentCat && (currentCat.productTypeId || currentCat.type?.id) !== nextTypeId) {
                setProductCategoryId('');
            }
        }
    };

    const handleResetAll = () => {
        setSearch('');
        setProductCategoryId('');
        setProductTypeId('');
    };

    return (
        <Collapsible
            open={isCategoriesOpen}
            onOpenChange={setIsCategoriesOpen}
            className="flex flex-col gap-3 bg-card p-3.5 border border-border/60 rounded-2xl shadow-xs shrink-0"
        >
            {/* Top Toolbar: Search + Product Types + Categories Accordion Trigger + Reset */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search menu items (e.g. Latte, Matcha, Croissant)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 pl-9 pr-8 bg-muted/20 text-xs rounded-xl border-border/60 focus-visible:ring-primary/20"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>

                {/* Controls Group */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Product Types Filter */}
                    {typesData && typesData.length > 0 && (
                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/40 overflow-x-auto no-scrollbar">
                            <button
                                type="button"
                                onClick={() => handleProductTypeChange('')}
                                className={cn(
                                    'text-xs font-semibold py-1 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap',
                                    !productTypeId
                                        ? 'bg-background shadow-xs text-foreground font-bold border border-border/60'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                All Types
                            </button>
                            {typesData.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => handleProductTypeChange(type.id)}
                                    className={cn(
                                        'text-xs font-semibold py-1 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap',
                                        type.id === productTypeId
                                            ? 'bg-background shadow-xs text-foreground font-bold border border-border/60'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {type.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Categories Accordion Trigger Button */}
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                'text-xs font-semibold py-1.5 px-3 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-2xs',
                                isCategoriesOpen
                                    ? 'bg-muted/50 border-border/60 text-foreground'
                                    : productCategoryId
                                      ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                      : 'bg-background hover:bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Layers className="size-3.5" />
                            <span>
                                {!isCategoriesOpen && productCategoryId ? selectedCategoryName : `Categories (${filteredCategories.length + 1})`}
                            </span>
                            <ChevronDown className={cn('size-3.5 transition-transform duration-200', isCategoriesOpen && 'rotate-180')} />
                        </button>
                    </CollapsibleTrigger>

                    {/* Reset Button */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleResetAll}
                            className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer shrink-0"
                        >
                            <RotateCcw className="size-3.5" />
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Accordion Content: Category & Collection Filter Cards */}
            <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 border-t border-border/30 pt-3">
                    {/* All Menu Card */}
                    <button
                        type="button"
                        onClick={() => {
                            setProductCategoryId('');
                        }}
                        className={cn(
                            'flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-200 cursor-pointer whitespace-nowrap shadow-2xs',
                            !productCategoryId
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                                : 'bg-background hover:bg-muted/40 border-border/60 hover:border-primary/30 text-foreground'
                        )}
                    >
                        <div
                            className={cn(
                                'size-6 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                !productCategoryId ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                            )}
                        >
                            <Layers className="size-3.5" />
                        </div>
                        <span className="text-xs font-semibold">All Menu</span>
                    </button>

                    {/* Dynamic Category Cards */}
                    {filteredCategories.map((cat) => {
                        const isSelected = productCategoryId === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                    setProductCategoryId(cat.id === productCategoryId ? '' : cat.id);
                                }}
                                className={cn(
                                    'flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-200 cursor-pointer whitespace-nowrap shadow-2xs',
                                    isSelected
                                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                                        : 'bg-background hover:bg-muted/40 border-border/60 hover:border-primary/30 text-foreground'
                                )}
                            >
                                <div
                                    className={cn(
                                        'size-6 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                        isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground'
                                    )}
                                >
                                    <Coffee className="size-3.5" />
                                </div>
                                <span className="text-xs font-semibold">{cat.name}</span>
                            </button>
                        );
                    })}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
