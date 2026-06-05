import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';

import { getPermissionsList } from '#/api/rbac.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import DataTable from '#/components/data-table/data-table.tsx';
import { Badge } from '#/components/ui/badge';
import { Input } from '#/components/ui/input.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { PermissionTabProps, ISystemPermission } from '../rbac.types';

export default function PermissionTab({ page, pageSize, search, onPaginationChange, onSearchChange }: PermissionTabProps) {
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
        queryKey: [QUERY_KEY.RBAC.PERMISSIONS_LIST, { page, pageSize, search }],
        queryFn: async () => {
            const res = await getPermissionsList({
                page,
                limit: pageSize,
                search
            });
            return res;
        }
    });

    const columns = React.useMemo<ColumnDef<ISystemPermission>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Permission Action',
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

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-bold text-foreground/90">Action Permissions</h2>
                <p className="text-xs text-muted-foreground">Directory of system-wide action nodes mapping nested module security scopes.</p>
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
                        placeholder="Search action permissions..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="h-9 w-full sm:w-[300px] bg-background/50"
                    />
                }
            />
        </div>
    );
}
