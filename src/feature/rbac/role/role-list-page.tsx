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

    const setSearch = (updates: Record<string, any>) => {
        navigate({
            search: { ...searchParams, ...updates }
        });
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                        <Shield className="h-5 w-5 text-primary" />
                    </div>
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
                onPaginationChange={(p, ps) => setSearch({ page: p, pageSize: ps })}
                onSearchChange={(s) => setSearch({ search: s, page: 1 })}
                onStatusChange={(st) => setSearch({ status: st, page: 1 })}
            />
        </div>
    );
}
