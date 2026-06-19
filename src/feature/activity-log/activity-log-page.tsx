import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Activity, X } from 'lucide-react';
import { format } from 'date-fns';

import { Route } from '#/routes/admin/activity-logs';
import { getActivityLogs } from '#/api/activity-log.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IActivityLog } from './activity-log.types';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { Input } from '#/components/ui/input.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { DatePicker } from './components/date-picker.tsx';

export default function ActivityLogPage() {
    const navigate = Route.useNavigate();
    const { page, pageSize, search, dateFrom, dateTo } = Route.useSearch();

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    const setSearchParams = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        if (debouncedSearch !== (search || '')) {
            setSearchParams({ search: debouncedSearch, page: 1 });
        }
    }, [debouncedSearch, search]);

    const { data: logsData, isLoading: isLogsLoading } = useQuery({
        queryKey: [QUERY_KEY.ACTIVITY_LOGS.LOGS_LIST, { page, pageSize, search, dateFrom, dateTo }],
        queryFn: () =>
            getActivityLogs({
                page,
                limit: pageSize,
                search: search || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined
            })
    });

    const columns = React.useMemo<ColumnDef<IActivityLog>[]>(
        () => [
            {
                accessorKey: 'createdAt',
                header: 'Timestamp',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground font-medium">
                        {format(new Date(row.original.createdAt), 'MMM d, yyyy, hh:mm a')}
                    </span>
                )
            },
            {
                accessorKey: 'actor',
                header: 'Actor / User',
                cell: ({ row }) => {
                    const actor = row.original.actor;
                    if (!actor) {
                        return <span className="text-xs text-muted-foreground italic">System / Unknown</span>;
                    }
                    return (
                        <div className="flex flex-col">
                            <span className="font-semibold text-foreground/90 leading-tight">
                                {actor.firstName} {actor.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">{actor.email}</span>
                        </div>
                    );
                }
            },
            {
                accessorKey: 'title',
                header: 'Action Event',
                cell: ({ row }) => (
                    <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 font-semibold text-xs py-0.5 px-2.5"
                    >
                        {row.original.title}
                    </Badge>
                )
            },
            {
                accessorKey: 'details',
                header: 'Description Details',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground font-normal whitespace-pre-wrap max-w-md block leading-relaxed">
                        {row.original.details}
                    </span>
                )
            }
        ],
        []
    );

    const handleClearFilters = () => {
        setLocalSearch('');
        setSearchParams({ search: '', dateFrom: '', dateTo: '', page: 1 });
    };

    const hasActiveFilters = !!(search || dateFrom || dateTo);

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
                        <p className="text-xs text-muted-foreground">
                            Stream operational audits, deactivations, security logs, and system modifications.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Logs Table */}
            <DataTable
                columns={columns}
                data={logsData?.data || []}
                pageCount={logsData?.meta.pageCount || 1}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(idx, size) => setSearchParams({ page: idx + 1, pageSize: size })}
                sorting={sorting}
                onSortingChange={setSorting}
                showColumnVisibilityToggle={true}
                isLoading={isLogsLoading}
                filterContent={
                    <>
                        <Input
                            placeholder="Search logs by action, details, actor..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="h-9 w-full sm:w-[250px] bg-background/50"
                        />
                        <DatePicker
                            label="From:"
                            value={dateFrom}
                            onChange={(val) => setSearchParams({ dateFrom: val, page: 1 })}
                            placeholder="From date"
                        />
                        <DatePicker label="To:" value={dateTo} onChange={(val) => setSearchParams({ dateTo: val, page: 1 })} placeholder="To date" />
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
                    </>
                }
            />
        </div>
    );
}
