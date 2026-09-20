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
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                        <Shield className="h-5 w-5 text-primary" />
                    </div>
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
                onPaginationChange={(p, ps) => setSearch({ page: p, pageSize: ps })}
                onSearchChange={(s) => setSearch({ search: s, page: 1 })}
            />
        </div>
    );
}
