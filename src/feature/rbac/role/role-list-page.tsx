import * as React from 'react';
import { Shield, Plus } from 'lucide-react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '#/components/ui/button.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import RoleTable from './role-table.tsx';

export default function RoleListPage() {
    const navigate = useNavigate();
    const searchParams = useSearch({ strict: false }) as any;
    const page = searchParams?.page;
    const pageSize = searchParams?.pageSize;
    const searchVal = searchParams?.search;
    const status = searchParams?.status;

    const setSearch = React.useCallback(
        (updates: Record<string, any>) => {
            navigate({
                search: (prev: any) => ({ ...prev, ...updates })
            });
        },
        [navigate]
    );

    const handlePaginationChange = React.useCallback((p: number, ps: number) => setSearch({ page: p, pageSize: ps }), [setSearch]);

    const handleSearchChange = React.useCallback((s: string) => setSearch({ search: s, page: 1 }), [setSearch]);

    const handleStatusChange = React.useCallback((st: string) => setSearch({ status: st, page: 1 }), [setSearch]);

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">User Roles & Access</h1>
                        <p className="text-xs text-muted-foreground">Manage employee roles and what each staff member can see or edit.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {status !== 'archive' && (
                        <RequirePermission module="Roles and Permissions" action="create">
                            <Button onClick={() => navigate({ to: '/admin/roles/create' })} className="h-9 gap-1.5 shadow-sm">
                                <Plus className="size-4" />
                                Create Role
                            </Button>
                        </RequirePermission>
                    )}
                </div>
            </div>

            {/* Roles Table */}
            <RoleTable
                page={page || 1}
                pageSize={pageSize || 10}
                search={searchVal || ''}
                status={status || 'active'}
                onPaginationChange={handlePaginationChange}
                onSearchChange={handleSearchChange}
                onStatusChange={handleStatusChange}
            />
        </div>
    );
}
