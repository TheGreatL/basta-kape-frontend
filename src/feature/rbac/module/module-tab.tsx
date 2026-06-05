import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';

import { getModulesList } from '#/api/rbac.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import DataTable from '#/components/data-table/data-table.tsx';
import { Badge } from '#/components/ui/badge';
import { format } from 'date-fns';
import { Input } from '#/components/ui/input.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { ModuleTabProps, ISystemModule } from '../rbac.types';

export default function ModuleTab({ page, pageSize, search, onPaginationChange, onSearchChange }: ModuleTabProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        if (debouncedSearch !== (search || '')) {
            onSearchChange(debouncedSearch);
        }
    }, [debouncedSearch, search, onSearchChange]);

    const { data, isLoading } = useQuery({
        queryKey: [QUERY_KEY.RBAC.MODULES_LIST, { page, pageSize, search }],
        queryFn: async () => {
            const res = await getModulesList({
                page,
                limit: pageSize,
                search
            });
            return res;
        }
    });

    const columns = React.useMemo<ColumnDef<ISystemModule>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'System Module',
                cell: ({ row }) => <Badge>{row.getValue('name')}</Badge>
            },
            {
                accessorKey: 'description',
                header: 'Description',
                cell: ({ row }) => (
                    <span className="text-muted-foreground font-normal">{row.getValue('description') || 'No description provided.'}</span>
                )
            },
            {
                accessorKey: 'createdAt',
                header: 'System Registered Date',
                cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'MMM d, yyyy')
            }
        ],
        []
    );
    console.log(data);
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-bold text-foreground/90">System Modules</h2>
                <p className="text-xs text-muted-foreground">
                    Directory of registered operational system modules available for custom security role configuration.
                </p>
            </div>

            <DataTable
                columns={columns}
                data={data?.data || []}
                pageCount={data?.meta.pageCount || 1}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(idx, size) => onPaginationChange(idx + 1, size)}
                sorting={sorting}
                onSortingChange={setSorting}
                showColumnVisibilityToggle={false}
                isLoading={isLoading}
                filterContent={
                    <Input
                        placeholder="Search system modules..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="h-9 w-full sm:w-[300px] bg-background/50"
                    />
                }
            />
        </div>
    );
}
