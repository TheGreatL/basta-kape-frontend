'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Search, AlertCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { ScrollArea } from '#/components/ui/scroll-area.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { cn } from '#/lib/utils.ts';

/**
 * Custom hook for debouncing search input
 */
export function useDebounce<T>(value: T, delay = 300): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export interface InfiniteSelectProps<TItem, TValue = string, TPage = any> {
    /** TanStack Query key prefix */
    queryKey: unknown[];
    /** The paginated data fetching function */
    fetchFn: (params: { pageParam: any; query: string; signal: AbortSignal }) => Promise<TPage>;
    /** Extracts items list from a single page of API response */
    getItems: (page: TPage) => TItem[];
    /** Determine the next page parameter */
    getNextPageParam: (lastPage: TPage, allPages: TPage[]) => any;
    /** The page param to start with */
    initialPageParam?: any;

    /** Currently selected value */
    value?: TValue;
    /** Change callback */
    onChange?: (value: TValue | undefined, item: TItem | undefined) => void;

    /** Extracts value from an item */
    getOptionValue: (item: TItem) => TValue;
    /** Extracts label representation from an item */
    getOptionLabel: (item: TItem) => React.ReactNode;

    /** Optional pre-selected item object to render label before list loads */
    selectedItem?: TItem;

    // Component configurations
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    loadingText?: string;
    errorText?: string;
    disabled?: boolean;
    className?: string;
}

export function InfiniteSelect<TItem, TValue = string, TPage = any>({
    queryKey,
    fetchFn,
    getItems,
    getNextPageParam,
    initialPageParam = undefined,
    value,
    onChange,
    getOptionValue,
    getOptionLabel,
    selectedItem,
    placeholder = 'Select option...',
    searchPlaceholder = 'Search...',
    emptyText = 'No results found',
    loadingText = 'Loading options...',
    errorText = 'Failed to load options',
    disabled = false,
    className
}: InfiniteSelectProps<TItem, TValue, TPage>) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const debouncedSearch = useDebounce(search, 300);

    const observerTargetRef = React.useRef<HTMLDivElement | null>(null);

    // Reset search when popover closes
    React.useEffect(() => {
        if (!open) {
            setSearch('');
        }
    }, [open]);

    // Fetch paginated data using TanStack Query
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteQuery({
        queryKey: [...queryKey, debouncedSearch],
        queryFn: (ctx) => fetchFn({ pageParam: ctx.pageParam, query: debouncedSearch, signal: ctx.signal }),
        getNextPageParam,
        initialPageParam,
        enabled: open // Only run query when select is opened to avoid unnecessary requests
    });

    // Flatten fetched items from all loaded pages
    const allItems = React.useMemo(() => {
        if (!data) return [];
        return data.pages.flatMap((page) => getItems(page));
    }, [data, getItems]);

    // Find the currently selected item object to get its label
    const currentItem = React.useMemo(() => {
        if (value === undefined || value === null) return undefined;

        const found = allItems.find((item) => getOptionValue(item) === value);
        if (found) return found;

        if (selectedItem && getOptionValue(selectedItem) === value) {
            return selectedItem;
        }

        return undefined;
    }, [value, allItems, getOptionValue, selectedItem]);

    // Determine the label to display in the button trigger
    const displayLabel = React.useMemo(() => {
        if (currentItem) {
            return getOptionLabel(currentItem);
        }
        return placeholder;
    }, [currentItem, placeholder, getOptionLabel]);

    // Set up Intersection Observer for infinite scrolling
    React.useEffect(() => {
        const target = observerTargetRef.current;
        if (!target || !hasNextPage || isFetchingNextPage || !open) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(target);
        return () => {
            observer.unobserve(target);
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn('w-full justify-between font-normal text-left truncate', !currentItem && 'text-muted-foreground', className)}
                >
                    <span className="truncate">{displayLabel}</span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[240px] max-w-sm" align="start">
                <div className="flex items-center border-b px-3 py-2 gap-2">
                    <Search className="size-4 shrink-0 opacity-50" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8 border-0 shadow-none focus-visible:ring-0 p-0 focus-visible:border-0 focus-visible:ring-offset-0 bg-transparent"
                    />
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-2">
                        <Spinner className="size-6 text-primary" />
                        <p className="text-xs text-muted-foreground">{loadingText}</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center gap-2">
                        <AlertCircle className="size-6 text-destructive" />
                        <p className="text-sm font-medium text-muted-foreground">{errorText}</p>
                        <Button size="sm" variant="outline" onClick={() => refetch()}>
                            Retry
                        </Button>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[260px] overflow-y-auto">
                        <div className="flex flex-col p-1 gap-0.5">
                            {allItems.map((item) => {
                                const itemVal = getOptionValue(item);
                                const isSelected = itemVal === value;
                                return (
                                    <button
                                        key={String(itemVal)}
                                        type="button"
                                        onClick={() => {
                                            onChange?.(isSelected ? undefined : itemVal, isSelected ? undefined : item);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            'relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground text-left transition-colors',
                                            isSelected && 'bg-accent/40 font-medium'
                                        )}
                                    >
                                        <span className="truncate flex-1">{getOptionLabel(item)}</span>
                                        {isSelected && <Check className="absolute right-2 size-4 text-primary shrink-0" />}
                                    </button>
                                );
                            })}

                            {allItems.length === 0 && (
                                <div className="flex flex-col items-center justify-center p-6 text-center gap-1">
                                    <p className="text-sm font-medium">{emptyText}</p>
                                    <p className="text-xs text-muted-foreground">Try a different search term</p>
                                </div>
                            )}

                            {/* Scroll target for next page */}
                            <div ref={observerTargetRef} className="h-1 w-full" />

                            {isFetchingNextPage && (
                                <div className="flex items-center justify-center py-2 gap-2 text-xs text-muted-foreground border-t border-border/20">
                                    <Spinner className="size-3" />
                                    <span>Loading more...</span>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </PopoverContent>
        </Popover>
    );
}
