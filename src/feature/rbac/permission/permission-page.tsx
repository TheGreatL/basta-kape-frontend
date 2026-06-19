import { Shield } from 'lucide-react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import PermissionTable from './permission-table.tsx';

export default function PermissionPage() {
    const navigate = useNavigate();
    const searchParams = useSearch({ from: '/admin/(rbac)/permissions' });
    const page = searchParams.page;
    const pageSize = searchParams.pageSize;
    const search = searchParams.search;

    const setSearch = (updates: Record<string, any>) => {
        navigate({
            to: '/admin/permissions',
            search: { page, pageSize, search, ...updates },
            replace: true
        });
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
                        <p className="text-xs text-muted-foreground">
                            Configure role-based access control (RBAC) — manage roles, action permissions, and system modules.
                        </p>
                    </div>
                </div>
            </div>

            {/* Permissions Table */}
            <div className="mt-4">
                <PermissionTable
                    page={page}
                    pageSize={pageSize}
                    search={search}
                    onPaginationChange={(p, ps) => setSearch({ page: p, pageSize: ps })}
                    onSearchChange={(s) => setSearch({ search: s, page: 1 })}
                />
            </div>
        </div>
    );
}
