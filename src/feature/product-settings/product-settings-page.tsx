import { Settings, Folder, LayoutGrid, Sparkles } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '#/routes/admin/products/settings.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';

import CategoryTab from './tabs/category-tab.tsx';
import TypeTab from './tabs/type-tab.tsx';
import AttributeTab from './tabs/attribute-tab.tsx';

export default function ProductSettingsPage() {
    const navigate = useNavigate({ from: '/admin/products/settings' });
    const { tab, cPage, cPageSize, cSearch, cStatus, tPage, tPageSize, tSearch, tStatus, aPage, aPageSize, aSearch, aStatus } = Route.useSearch();

    const setSearch = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Product Configurations</h1>
                        <p className="text-xs text-muted-foreground">Configure category taxonomy, product preparation types, and option modifiers.</p>
                    </div>
                </div>
            </div>

            {/* Tabbed Content */}
            <Tabs value={tab} onValueChange={(val) => setSearch({ tab: val, cPage: 1, tPage: 1, aPage: 1 })} className="w-full">
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="categories" className="gap-1.5">
                        <Folder className="size-3.5" />
                        Categories
                    </TabsTrigger>
                    <TabsTrigger value="types" className="gap-1.5">
                        <LayoutGrid className="size-3.5" />
                        Product Types
                    </TabsTrigger>
                    <TabsTrigger value="attributes" className="gap-1.5">
                        <Sparkles className="size-3.5" />
                        Attributes / Modifiers
                    </TabsTrigger>
                </TabsList>

                {/* Categories Tab */}
                <TabsContent value="categories" className="mt-4">
                    <CategoryTab
                        page={cPage}
                        pageSize={cPageSize}
                        search={cSearch}
                        status={cStatus}
                        onPaginationChange={(page, pageSize) => setSearch({ cPage: page, cPageSize: pageSize })}
                        onSearchChange={(search) => setSearch({ cSearch: search, cPage: 1 })}
                        onStatusChange={(status) => setSearch({ cStatus: status, cPage: 1 })}
                    />
                </TabsContent>

                {/* Product Types Tab */}
                <TabsContent value="types" className="mt-4">
                    <TypeTab
                        page={tPage}
                        pageSize={tPageSize}
                        search={tSearch}
                        status={tStatus}
                        onPaginationChange={(page, pageSize) => setSearch({ tPage: page, tPageSize: pageSize })}
                        onSearchChange={(search) => setSearch({ tSearch: search, tPage: 1 })}
                        onStatusChange={(status) => setSearch({ tStatus: status, tPage: 1 })}
                    />
                </TabsContent>

                {/* Attributes Tab */}
                <TabsContent value="attributes" className="mt-4">
                    <AttributeTab
                        page={aPage}
                        pageSize={aPageSize}
                        search={aSearch}
                        status={aStatus}
                        onPaginationChange={(page, pageSize) => setSearch({ aPage: page, aPageSize: pageSize })}
                        onSearchChange={(search) => setSearch({ aSearch: search, aPage: 1 })}
                        onStatusChange={(status) => setSearch({ aStatus: status, aPage: 1 })}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
