import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { getCategoriesList, getProductTypesList, getCategoryById, getProductTypeById } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { ICategory, IProductType } from '#/feature/product-settings/product-settings-types.ts';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';
import type { IReportFilterField, IReportModuleDefinition, ReportFilters } from '../reports.types';
import type { TReportsSearchSchema } from '#/routes/admin/reports';
import { DatePicker } from '#/feature/activity-log/components/date-picker.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';

interface ReportFiltersProps {
    moduleDefinition: IReportModuleDefinition;
    searchParams: TReportsSearchSchema;
    onSearchParamsChange: (updates: Partial<TReportsSearchSchema>) => void;
    onPreview: () => void;
    isPreviewLoading: boolean;
}

const INVENTORY_STATUS_OPTIONS = [
    { value: 'SAFE', label: 'Safe' },
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock' }
];

const ORDER_STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'PREPARING', label: 'Preparing' },
    { value: 'READY', label: 'Ready' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
];

const ORDER_TYPE_OPTIONS = [
    { value: 'DINE_IN', label: 'Dine In' },
    { value: 'TAKE_OUT', label: 'Take Out' },
    { value: 'DELIVERY', label: 'Delivery' }
];

function getSelectOptions(filter: IReportFilterField) {
    if (filter.options?.length) {
        return filter.options;
    }

    if (filter.key === 'inventoryStatus') {
        return INVENTORY_STATUS_OPTIONS;
    }

    if (filter.key === 'orderStatus') {
        return ORDER_STATUS_OPTIONS;
    }

    if (filter.key === 'orderType') {
        return ORDER_TYPE_OPTIONS;
    }

    if (filter.key === 'productCategoryId' || filter.key === 'productTypeId') {
        return [];
    }

    return filter.options ?? [];
}

export function buildReportFilters(searchParams: TReportsSearchSchema): ReportFilters {
    const filters: ReportFilters = {};

    if (searchParams.search) filters.search = searchParams.search;
    filters.status = searchParams.status;
    if (searchParams.dateFrom) filters.dateFrom = searchParams.dateFrom;
    if (searchParams.dateTo) filters.dateTo = searchParams.dateTo;
    if (searchParams.productCategoryId) filters.productCategoryId = searchParams.productCategoryId;
    if (searchParams.productTypeId) filters.productTypeId = searchParams.productTypeId;
    if (searchParams.inventoryStatus) filters.inventoryStatus = searchParams.inventoryStatus;
    if (searchParams.orderStatus) filters.orderStatus = searchParams.orderStatus;
    if (searchParams.orderType) filters.orderType = searchParams.orderType;

    return filters;
}

export default function ReportFiltersBar({ moduleDefinition, searchParams, onSearchParamsChange, onPreview, isPreviewLoading }: ReportFiltersProps) {
    const productCategoryId = searchParams.productCategoryId || '';
    const productTypeId = searchParams.productTypeId || '';

    // Fetch individual selected category/type details for InfiniteSelect display label
    const { data: selectedCategory } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.CATEGORIES_LIST, 'detail', productCategoryId],
        queryFn: () => getCategoryById(productCategoryId),
        enabled: !!productCategoryId
    });

    const { data: selectedType } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.TYPES_LIST, 'detail', productTypeId],
        queryFn: () => getProductTypeById(productTypeId),
        enabled: !!productTypeId
    });

    const [localFilters, setLocalFilters] = React.useState<Record<string, string>>(() => {
        const initialTextFilters: Record<string, string> = {};
        moduleDefinition.filters.forEach((filter) => {
            if (filter.type === 'text' && filter.key !== 'productCategoryId' && filter.key !== 'productTypeId') {
                initialTextFilters[filter.key] = (searchParams[filter.key as keyof TReportsSearchSchema] as string) || '';
            }
        });
        return initialTextFilters;
    });

    const debouncedFilters = useDebounce(localFilters, 400);

    React.useEffect(() => {
        setLocalFilters((prev) => {
            const next: Record<string, string> = {};
            let changed = false;
            moduleDefinition.filters.forEach((filter) => {
                if (filter.type === 'text' && filter.key !== 'productCategoryId' && filter.key !== 'productTypeId') {
                    const val = (searchParams[filter.key as keyof TReportsSearchSchema] as string) || '';
                    next[filter.key] = val;
                    if (prev[filter.key] !== val) {
                        changed = true;
                    }
                }
            });
            const prevKeys = Object.keys(prev);
            const nextKeys = Object.keys(next);
            if (prevKeys.length !== nextKeys.length || prevKeys.some((k) => !(k in next))) {
                changed = true;
            }
            return changed ? next : prev;
        });
    }, [searchParams, moduleDefinition]);

    React.useEffect(() => {
        const updates: Partial<TReportsSearchSchema> = {};
        let hasUpdates = false;

        for (const [key, val] of Object.entries(debouncedFilters)) {
            const currentVal = (searchParams[key as keyof TReportsSearchSchema] as string) || '';
            if (val !== currentVal) {
                updates[key as keyof TReportsSearchSchema] = val as any;
                hasUpdates = true;
            }
        }

        if (hasUpdates) {
            onSearchParamsChange({ ...updates, page: 1 });
        }
    }, [debouncedFilters, searchParams, onSearchParamsChange]);

    const hasActiveFilters = moduleDefinition.filters.some((filter) => {
        const value = searchParams[filter.key as keyof TReportsSearchSchema];
        if (filter.key === 'status') {
            return value !== 'active';
        }
        return Boolean(value);
    });

    const handleClearFilters = () => {
        onSearchParamsChange({
            search: '',
            status: 'active',
            dateFrom: '',
            dateTo: '',
            productCategoryId: '',
            productTypeId: '',
            inventoryStatus: '',
            orderStatus: '',
            orderType: '',
            page: 1
        });
    };

    const renderFilter = (filter: IReportFilterField) => {
        if (filter.key === 'productCategoryId') {
            return (
                <InfiniteSelect<ICategory>
                    key={filter.key}
                    queryKey={[QUERY_KEY.PRODUCT_SETTINGS.CATEGORIES_LIST, { status: 'active' }]}
                    fetchFn={({ pageParam, query }) => getCategoriesList({ page: pageParam as number, limit: 10, search: query, status: 'active' })}
                    getItems={(resPage) => resPage.data}
                    getNextPageParam={(lastPage) => (lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined)}
                    initialPageParam={1}
                    value={searchParams.productCategoryId || undefined}
                    onChange={(val) => onSearchParamsChange({ productCategoryId: val || '', page: 1 })}
                    getOptionValue={(cat) => cat.id}
                    getOptionLabel={(cat) => cat.name}
                    selectedItem={selectedCategory}
                    placeholder="All Categories"
                    searchPlaceholder="Search categories..."
                    className="h-9 w-full sm:w-[250px] bg-background/50 text-sm font-normal"
                />
            );
        }

        if (filter.key === 'productTypeId') {
            return (
                <InfiniteSelect<IProductType>
                    key={filter.key}
                    queryKey={[QUERY_KEY.PRODUCT_SETTINGS.TYPES_LIST, { status: 'active' }]}
                    fetchFn={({ pageParam, query }) => getProductTypesList({ page: pageParam as number, limit: 10, search: query, status: 'active' })}
                    getItems={(resPage) => resPage.data}
                    getNextPageParam={(lastPage) => (lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined)}
                    initialPageParam={1}
                    value={searchParams.productTypeId || undefined}
                    onChange={(val) => onSearchParamsChange({ productTypeId: val || '', page: 1 })}
                    getOptionValue={(type) => type.id}
                    getOptionLabel={(type) => type.name}
                    selectedItem={selectedType}
                    placeholder="All Types"
                    searchPlaceholder="Search product types..."
                    className="h-9 w-full sm:w-[250px] bg-background/50 text-sm font-normal"
                />
            );
        }

        if (filter.type === 'text') {
            const placeholder = filter.key === 'search' ? `Search ${moduleDefinition.label.toLowerCase()}...` : filter.label;
            return (
                <Input
                    key={filter.key}
                    placeholder={placeholder}
                    value={localFilters[filter.key] || ''}
                    onChange={(event) => {
                        const val = event.target.value;
                        setLocalFilters((prev) => ({
                            ...prev,
                            [filter.key]: val
                        }));
                    }}
                    className="h-9 w-full sm:w-[250px] bg-background/50"
                />
            );
        }

        if (filter.type === 'date') {
            const value = searchParams[filter.key as 'dateFrom' | 'dateTo'] || '';
            return (
                <DatePicker
                    key={filter.key}
                    label={`${filter.label}:`}
                    value={value}
                    placeholder={filter.label}
                    onChange={(dateValue) => onSearchParamsChange({ [filter.key]: dateValue, page: 1 })}
                />
            );
        }

        const rawValue = searchParams[filter.key as keyof TReportsSearchSchema];
        const value = typeof rawValue === 'string' ? rawValue : '';

        const options = getSelectOptions(filter);

        return (
            <Select
                key={filter.key}
                value={value || 'all'}
                onValueChange={(nextValue) =>
                    onSearchParamsChange({
                        [filter.key]: nextValue === 'all' ? (filter.key === 'status' ? 'active' : '') : nextValue,
                        page: 1
                    })
                }
            >
                <SelectTrigger className="h-9 w-full sm:w-[160px] bg-background/50">
                    <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                    {filter.key !== 'status' && <SelectItem value="all">All</SelectItem>}
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    };

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/30 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
                {moduleDefinition.filters.map((filter) => renderFilter(filter))}

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-9 px-2 text-muted-foreground hover:text-foreground shrink-0"
                    >
                        <X className="size-4 mr-1.5" /> Clear Filters
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-between border-t border-border/40 pt-3">
                <p className="text-xs text-muted-foreground max-w-2xl">{moduleDefinition.description}</p>
                <Button onClick={onPreview} disabled={isPreviewLoading} className="h-9 shrink-0">
                    <Search className="size-4 mr-2" />
                    {isPreviewLoading ? 'Generating Preview...' : 'Preview Report'}
                </Button>
            </div>
        </div>
    );
}
