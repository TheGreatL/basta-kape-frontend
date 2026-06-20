import { Link, useMatchRoute } from '@tanstack/react-router';

import type { IconName } from 'lucide-react/dynamic';
import { DynamicIcon } from 'lucide-react/dynamic';
import { appModules, appPermissions } from '#/constants/rbac.ts';
import type { TAppModule } from '#/constants/rbac.ts';
import { useStoreSettings } from '#/hooks/use-store-settings.ts';
import { useAuth } from '#/context/AuthContext.tsx';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';

import logo from '#/assets/logo.png';

import {
    Sidebar as SidebarComponent,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    SidebarFooter,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton
} from '#/components/ui/sidebar.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx';
import { ScrollArea, ScrollBar } from '#/components/ui/scroll-area.tsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '#/components/ui/dropdown-menu.tsx';
import { ChevronDown, LogOut, Users, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#/components/ui/collapsible.tsx';
import { cn } from '#/lib/utils.ts';

interface SidebarSubItem {
    title: string;
    path: string;
    module?: TAppModule;
    public?: boolean;
    exact?: boolean;
    badge?: string;
}

interface SidebarItem {
    title: string;
    path?: string;
    icon: IconName;
    module?: TAppModule;
    public?: boolean;
    exact?: boolean;
    badge?: string;
    items?: SidebarSubItem[];
}

const sidebarGroups: Array<{
    label: string;
    items: SidebarItem[];
}> = [
    {
        label: 'Overview',
        items: [{ title: 'Dashboard', path: '/admin', icon: 'layout-dashboard', public: true, exact: true }]
    },
    {
        label: 'Operations',
        items: [
            { title: 'POS', path: '/admin/pos', icon: 'monitor-play', module: appModules.POINT_OF_SALE },
            {
                title: 'Register Shifts',
                icon: 'timer',
                module: appModules.POINT_OF_SALE,
                items: [
                    { title: 'Shifts', path: '/admin/register-shifts', module: appModules.POINT_OF_SALE, exact: true },
                    { title: 'Shift History', path: '/admin/register-shifts/history', module: appModules.POINT_OF_SALE }
                ]
            },
            { title: 'Order Queue', path: '/admin/order-queue', icon: 'list-ordered', module: appModules.ORDER_QUEUE, badge: '5' },
            { title: 'Orders', path: '/admin/orders', icon: 'shopping-cart', module: appModules.ORDERS_MANAGEMENT },
            { title: 'Transactions', path: '/admin/transactions', icon: 'history', module: appModules.TRANSACTION_HISTORY }
        ]
    },
    {
        label: 'Catalog & Menu',
        items: [
            { title: 'Menu', path: '/admin/menu', icon: 'menu', module: appModules.MENU },
            {
                title: 'Products',
                icon: 'package',
                module: appModules.PRODUCTS_MANAGEMENT,
                items: [
                    { title: 'Products List', path: '/admin/products', module: appModules.PRODUCTS_MANAGEMENT, exact: true },
                    { title: 'Modifiers', path: '/admin/products/modifiers', module: appModules.PRODUCTS_MANAGEMENT, exact: true },
                    { title: 'Recipes', path: '/admin/products/recipes', module: appModules.PRODUCTS_MANAGEMENT, exact: true },
                    { title: 'Product Settings', path: '/admin/products/settings', module: appModules.PRODUCT_SETTINGS_MANAGEMENT, exact: true }
                ]
            }
        ]
    },
    {
        label: 'Inventory & Purchasing',
        items: [
            {
                title: 'Inventory',
                icon: 'archive',
                module: appModules.INVENTORY_MANAGEMENT,
                items: [
                    { title: 'Dashboard', path: '/admin/inventory', module: appModules.INVENTORY_MANAGEMENT, exact: true },
                    { title: 'Stock Levels', path: '/admin/inventory/stock-levels', module: appModules.INVENTORY_MANAGEMENT, exact: true },
                    { title: 'Projections', path: '/admin/inventory/projections', module: appModules.INVENTORY_MANAGEMENT, exact: true },
                    { title: 'Deliveries', path: '/admin/inventory/deliveries', module: appModules.INVENTORY_MANAGEMENT, exact: true },
                    { title: 'Waste Log', path: '/admin/inventory/waste-log', module: appModules.INVENTORY_MANAGEMENT, exact: true },
                    { title: 'Ingredients', path: '/admin/inventory/ingredients', module: appModules.INVENTORY_MANAGEMENT, exact: true },
                    { title: 'Units', path: '/admin/inventory/units', module: appModules.INVENTORY_MANAGEMENT, exact: true }
                ]
            },
            { title: 'Purchase Orders', path: '/admin/purchase-orders', icon: 'receipt', module: appModules.PURCHASE_ORDERS_MANAGEMENT },
            { title: 'Suppliers', path: '/admin/suppliers', icon: 'truck', module: appModules.SUPPLIERS_MANAGEMENT }
        ]
    },
    {
        label: 'People & Security',
        items: [
            { title: 'Customers', path: '/admin/customers', icon: 'users-round', module: appModules.CUSTOMERS_MANAGEMENT },
            { title: 'Users', path: '/admin/users', icon: 'users', module: appModules.USERS_MANAGEMENT },
            {
                title: 'RBAC',
                icon: 'shield',
                module: appModules.ROLES_AND_PERMISSIONS,
                items: [
                    { title: 'Roles', path: '/admin/roles', module: appModules.ROLES_AND_PERMISSIONS, exact: true },
                    { title: 'Permissions', path: '/admin/permissions', module: appModules.ROLES_AND_PERMISSIONS, exact: true },
                    { title: 'Modules', path: '/admin/modules', module: appModules.ROLES_AND_PERMISSIONS, exact: true }
                ]
            }
        ]
    },
    {
        label: 'System & Reports',
        items: [
            { title: 'Sales Management', path: '/admin/sales', icon: 'trending-up', module: appModules.SALES_MANAGEMENT },
            { title: 'Reports', path: '/admin/reports', icon: 'file-bar-chart', module: appModules.REPORTS_MANAGEMENT },
            { title: 'Activity Logs', path: '/admin/activity-logs', icon: 'activity', module: appModules.ACTIVITY_LOGS },
            { title: 'Store Settings', path: '/admin/store-settings', icon: 'store', module: appModules.STORE_SETTINGS }
        ]
    }
];

function SidebarLinkItem({ item }: { item: SidebarItem }) {
    const matchRoute = useMatchRoute();

    const isRouteActive = (path: string, exact?: boolean) => {
        let active = matchRoute({ to: path as any, fuzzy: !exact }) !== false;

        // Keep "Products" active on nested creation and editing subroutes
        if (path === '/admin/products') {
            const isCreate = matchRoute({ to: '/admin/products/create' as any, fuzzy: false }) !== false;
            const isEdit = matchRoute({ to: '/admin/products/$id/edit' as any, fuzzy: false }) !== false;
            if (isCreate || isEdit) {
                active = true;
            }
        }

        // Keep "Orders" active on nested creation and editing subroutes
        if (path === '/admin/orders') {
            const isCreate = matchRoute({ to: '/admin/orders/create' as any, fuzzy: false }) !== false;
            const isEdit = matchRoute({ to: '/admin/orders/$id/edit' as any, fuzzy: false }) !== false;
            if (isCreate || isEdit) {
                active = true;
            }
        }

        // Keep "Roles" active on nested creation and details subroutes
        if (path === '/admin/roles') {
            const isCreate = matchRoute({ to: '/admin/roles/create' as any, fuzzy: false }) !== false;
            const isEdit = matchRoute({ to: '/admin/roles/$slug' as any, fuzzy: false }) !== false;
            if (isCreate || isEdit) {
                active = true;
            }
        }

        return active;
    };

    // If it has children (accordion)
    if (item.items && item.items.length > 0) {
        const hasActiveChild = item.items.some((subItem) => isRouteActive(subItem.path, subItem.exact));

        return (
            <Collapsible asChild defaultOpen={hasActiveChild} className="group/collapsible">
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                            <DynamicIcon name={item.icon} />
                            <span>{item.title}</span>
                            {item.badge && (
                                <span className="ml-auto bg-primary/10 text-primary font-medium text-[10px] px-1.5 py-0.5 rounded-full mr-2 group-data-[collapsible=icon]:hidden">
                                    {item.badge}
                                </span>
                            )}
                            <ChevronRight
                                className={cn(
                                    'size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90',
                                    !item.badge && 'ml-auto'
                                )}
                            />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {item.items.map((subItem) => {
                                const isSubActive = isRouteActive(subItem.path, subItem.exact);
                                return (
                                    <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton asChild isActive={isSubActive}>
                                            <Link to={subItem.path}>
                                                <span>{subItem.title}</span>
                                                {subItem.badge && (
                                                    <span className="ml-auto bg-primary/10 text-primary font-medium text-[10px] px-1.5 py-0.5 rounded-full group-data-[collapsible=icon]:hidden">
                                                        {subItem.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                );
                            })}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </SidebarMenuItem>
            </Collapsible>
        );
    }

    const isActive = item.path ? isRouteActive(item.path, item.exact) : false;

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive}
                className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground hover:bg-sidebar-accent"
            >
                <Link to={item.path}>
                    <DynamicIcon name={item.icon} />
                    <span>{item.title}</span>
                    {item.badge && (
                        <span className="ml-auto bg-primary/10 text-primary font-medium text-[10px] px-1.5 py-0.5 rounded-full group-data-[collapsible=icon]:hidden">
                            {item.badge}
                        </span>
                    )}
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

export default function AppSidebar() {
    const { user, logout } = useAuth();
    const permissions = getUserPermissions(user);
    const { storeName } = useStoreSettings();

    const authorizedGroups = sidebarGroups
        .map((group) => {
            const filteredItems = group.items
                .map((item) => {
                    if (item.items) {
                        const filteredSubItems = item.items.filter((subItem) => {
                            if (subItem.public) return true;
                            if (!subItem.module) return false;
                            return hasPermission(permissions, subItem.module, appPermissions.READ);
                        });

                        if (filteredSubItems.length === 0) {
                            return null;
                        }

                        return {
                            ...item,
                            items: filteredSubItems
                        };
                    }

                    if (item.public) return item;
                    if (!item.module) return null;
                    return hasPermission(permissions, item.module, appPermissions.READ) ? item : null;
                })
                .filter((item): item is SidebarItem => item !== null);

            return {
                ...group,
                items: filteredItems
            };
        })
        .filter((group) => group.items.length > 0);

    // Profile variables
    const displayName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Guest';
    const initials = user?.firstName ? `${user.firstName[0]}${user.lastName[0]}` : 'GU';
    const getStorageUrl = (url: string) => url;
    const handleLogout = async () => {
        await logout();
    };

    return (
        <SidebarComponent collapsible="icon">
            <SidebarHeader>
                <div className="flex h-12 items-center gap-2 px-4">
                    <img src={logo} alt={storeName} className="size-8 rounded-md object-contain" />
                    <span className="font-bold text-lg truncate group-data-[collapsible=icon]:hidden">{storeName}</span>
                </div>
            </SidebarHeader>
            <SidebarSeparator />
            <SidebarContent>
                <ScrollArea className="flex-1 w-full">
                    {authorizedGroups.map((group) => (
                        <SidebarGroup key={group.label}>
                            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {group.items.map((item) => (
                                        <SidebarLinkItem key={item.title} item={item} />
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}
                    <ScrollBar orientation="vertical" />
                </ScrollArea>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    tooltip={displayName}
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="size-8 rounded-lg">
                                        <AvatarImage
                                            src={(user as any)?.photo ? getStorageUrl((user as any).photo) : undefined}
                                            alt={user?.firstName ? `${user.firstName} ${user.lastName}` : ''}
                                        />
                                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{displayName}</span>
                                        <span className="truncate text-xs text-sidebar-foreground/60">{user?.email}</span>
                                    </div>
                                    <ChevronDown className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side="bottom"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="size-8 rounded-lg">
                                            <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">{displayName}</span>
                                            <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link to="/admin/profile" className="cursor-pointer">
                                        <Users className="mr-2 size-4" />
                                        My Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 size-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </SidebarComponent>
    );
}
