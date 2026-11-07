import * as React from 'react';
import { Folder, LayoutGrid, Sparkles } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '#/routes/admin/products/settings.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';

import CategoryTab from './tabs/category-tab.tsx';
import TypeTab from './tabs/type-tab.tsx';
import AttributeTab from './tabs/attribute-tab.tsx';

export default function ProductSettingsPage() {
    const navigate = useNavigate({ from: '/admin/products/settings' });
    const { tab, cPage, cPageSize, cSearch, cStatus, cProductTypeId, tPage, tPageSize, tSearch, tStatus, aPage, aPageSize, aSearch, aStatus } =
        Route.useSearch();

    const setSearch = React.useCallback(
        (updates: Record<string, any>) => {
            navigate({
                search: (prev: any) => ({ ...prev, ...updates })
            });
        },
        [navigate]
    );

    const handleCategoryPaginationChange = React.useCallback(
        (page: number, pageSize: number) => setSearch({ cPage: page, cPageSize: pageSize }),
        [setSearch]
    );
    const handleCategorySearchChange = React.useCallback((search: string) => setSearch({ cSearch: search, cPage: 1 }), [setSearch]);
    const handleCategoryStatusChange = React.useCallback((status: 'active' | 'archive') => setSearch({ cStatus: status, cPage: 1 }), [setSearch]);
    const handleCategoryProductTypeChange = React.useCallback((id: string) => setSearch({ cProductTypeId: id, cPage: 1 }), [setSearch]);

    const handleTypePaginationChange = React.useCallback(
        (page: number, pageSize: number) => setSearch({ tPage: page, tPageSize: pageSize }),
        [setSearch]
    );
    const handleTypeSearchChange = React.useCallback((search: string) => setSearch({ tSearch: search, tPage: 1 }), [setSearch]);
    const handleTypeStatusChange = React.useCallback((status: 'active' | 'archive') => setSearch({ tStatus: status, tPage: 1 }), [setSearch]);

    const handleAttributePaginationChange = React.useCallback(
        (page: number, pageSize: number) => setSearch({ aPage: page, aPageSize: pageSize }),
        [setSearch]
    );
    const handleAttributeSearchChange = React.useCallback((search: string) => setSearch({ aSearch: search, aPage: 1 }), [setSearch]);
    const handleAttributeStatusChange = React.useCallback((status: 'active' | 'archive') => setSearch({ aStatus: status, aPage: 1 }), [setSearch]);

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Product Settings</h1>
                        <p className="text-xs text-muted-foreground">Set up product categories, types, and custom choices.</p>
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
                        Customizations & Options
                    </TabsTrigger>
                </TabsList>

                {/* Categories Tab */}
                <TabsContent value="categories" className="mt-4">
                    <CategoryTab
                        page={cPage}
                        pageSize={cPageSize}
                        search={cSearch}
                        status={cStatus}
                        productTypeId={cProductTypeId}
                        onPaginationChange={handleCategoryPaginationChange}
                        onSearchChange={handleCategorySearchChange}
                        onStatusChange={handleCategoryStatusChange}
                        onProductTypeChange={handleCategoryProductTypeChange}
                    />
                </TabsContent>

                {/* Product Types Tab */}
                <TabsContent value="types" className="mt-4">
                    <TypeTab
                        page={tPage}
                        pageSize={tPageSize}
                        search={tSearch}
                        status={tStatus}
                        onPaginationChange={handleTypePaginationChange}
                        onSearchChange={handleTypeSearchChange}
                        onStatusChange={handleTypeStatusChange}
                    />
                </TabsContent>

                {/* Attributes Tab */}
                <TabsContent value="attributes" className="mt-4">
                    <AttributeTab
                        page={aPage}
                        pageSize={aPageSize}
                        search={aSearch}
                        status={aStatus}
                        onPaginationChange={handleAttributePaginationChange}
                        onSearchChange={handleAttributeSearchChange}
                        onStatusChange={handleAttributeStatusChange}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
