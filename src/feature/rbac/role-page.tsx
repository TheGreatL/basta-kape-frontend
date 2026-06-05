import { Shield, KeyRound, LayoutGrid } from 'lucide-react';

import { useNavigate } from '@tanstack/react-router';
import { Route } from '#/routes/admin/roles.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';
import RoleTab from './role/role-tab.tsx';
import PermissionTab from './permission/permission-tab.tsx';
import ModuleTab from './module/module-tab.tsx';

export default function RolePage() {
    const navigate = useNavigate({ from: '/admin/roles' });
    const { tab, rPage, rPageSize, rSearch, rStatus, pPage, pPageSize, pSearch, mPage, mPageSize, mSearch } = Route.useSearch();

    const setSearch = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    return (
        <div className="flex flex-col gap-6 p-6">
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

            {/* Tabbed Content */}
            <Tabs value={tab} onValueChange={(val) => setSearch({ tab: val, rPage: 1, pPage: 1, mPage: 1 })} className="w-full">
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="roles" className="gap-1.5">
                        <Shield className="size-3.5" />
                        Roles
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="gap-1.5">
                        <KeyRound className="size-3.5" />
                        Permissions
                    </TabsTrigger>
                    <TabsTrigger value="modules" className="gap-1.5">
                        <LayoutGrid className="size-3.5" />
                        Modules
                    </TabsTrigger>
                </TabsList>

                {/* Roles Tab */}
                <TabsContent value="roles" className="mt-4">
                    <RoleTab
                        page={rPage}
                        pageSize={rPageSize}
                        search={rSearch}
                        status={rStatus}
                        onPaginationChange={(page, pageSize) => setSearch({ rPage: page, rPageSize: pageSize })}
                        onSearchChange={(search) => setSearch({ rSearch: search, rPage: 1 })}
                        onStatusChange={(status) => setSearch({ rStatus: status, rPage: 1 })}
                    />
                </TabsContent>

                {/* Permissions Tab */}
                <TabsContent value="permissions" className="mt-4">
                    <PermissionTab
                        page={pPage}
                        pageSize={pPageSize}
                        search={pSearch}
                        onPaginationChange={(page, pageSize) => setSearch({ pPage: page, pPageSize: pageSize })}
                        onSearchChange={(search) => setSearch({ pSearch: search, pPage: 1 })}
                    />
                </TabsContent>

                {/* Modules Tab */}
                <TabsContent value="modules" className="mt-4">
                    <ModuleTab
                        page={mPage}
                        pageSize={mPageSize}
                        search={mSearch}
                        onPaginationChange={(page, pageSize) => setSearch({ mPage: page, mPageSize: pageSize })}
                        onSearchChange={(search) => setSearch({ mSearch: search, mPage: 1 })}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
