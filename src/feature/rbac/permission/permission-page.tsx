import * as React from 'react';
import { Shield } from 'lucide-react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import PermissionTable from './permission-table.tsx';

export default function PermissionPage() {
    const navigate = useNavigate();
    const searchParams = useSearch({ from: '/admin/(rbac)/permissions' });
    const page = searchParams.page;
    const pageSize = searchParams.pageSize;
    const search = searchParams.search;

    const setSearch = React.useCallback(
        (updates: Record<string, any>) => {
            navigate({
                to: '/admin/permissions',
                search: (prev: any) => ({ ...prev, ...updates }),
                replace: true
            });
        },
        [navigate]
    );

    const handlePaginationChange = React.useCallback((p: number, ps: number) => setSearch({ page: p, pageSize: ps }), [setSearch]);

    const handleSearchChange = React.useCallback((s: string) => setSearch({ search: s, page: 1 }), [setSearch]);

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Action Permissions</h1>
                        <p className="text-xs text-muted-foreground">Directory of system-wide action nodes mapping nested module security scopes.</p>
                    </div>
                </div>
            </div>

            {/* Permissions Table */}
            <PermissionTable
                page={page}
                pageSize={pageSize}
                search={search}
                onPaginationChange={handlePaginationChange}
                onSearchChange={handleSearchChange}
            />
        </div>
    );
}
