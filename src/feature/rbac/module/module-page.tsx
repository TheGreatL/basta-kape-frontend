import * as React from 'react';
import { Shield } from 'lucide-react';
import ModuleTable from './module-table.tsx';
import { Route } from '#/routes/admin/(rbac)/modules.tsx';

export default function ModulePage() {
    const navigate = Route.useNavigate();

    const searchParams = Route.useSearch();
    const page = searchParams.page;
    const pageSize = searchParams.pageSize;
    const search = searchParams.search;

    const setSearch = React.useCallback(
        (updates: Record<string, any>) => {
            navigate({
                search: (prev) => ({ ...prev, ...updates }),
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
                        <h1 className="text-2xl font-bold text-foreground leading-tight">System Modules</h1>
                        <p className="text-xs text-muted-foreground">
                            Directory of registered operational system modules available for custom security role configuration.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modules Table */}
            <ModuleTable
                page={page}
                pageSize={pageSize}
                search={search}
                onPaginationChange={handlePaginationChange}
                onSearchChange={handleSearchChange}
            />
        </div>
    );
}
