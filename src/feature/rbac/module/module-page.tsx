import { Shield } from 'lucide-react';
import ModuleTable from './module-table.tsx';
import { Route } from '#/routes/admin/(rbac)/modules.tsx';

export default function ModulePage() {
    const navigate = Route.useNavigate();

    const searchParams = Route.useSearch();
    const page = searchParams.page;
    const pageSize = searchParams.pageSize;
    const search = searchParams.search;

    const setSearch = (updates: Record<string, any>) => {
        navigate({
            search: (prev) => ({ ...prev, ...updates }),
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

            {/* Modules Table */}
            <div className="mt-4">
                <ModuleTable
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
