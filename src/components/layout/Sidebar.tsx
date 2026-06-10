import { Link, useMatchRoute } from '@tanstack/react-router';

import type { IconName } from 'lucide-react/dynamic';
import { DynamicIcon } from 'lucide-react/dynamic';
import { appModules, appPermissions } from '#/constants/rbac.ts';
import { useStoreSettings } from '#/hooks/use-store-settings.ts';
import { useAuthStore } from '#/store/auth-store.ts';
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
    SidebarFooter
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
import { ChevronDown, LogOut, Users } from 'lucide-react';

const sidebarGroups: Array<{
    label: string;
    items: Array<{
        title: string;
        path: string;
        icon: IconName;
        public?: boolean;
        exact?: boolean;
    }>;
}> = [
    {
        label: 'Overview',
        items: [{ title: 'Dashboard', path: '/admin', icon: 'layout-dashboard', public: true, exact: true }]
    },
    {
        label: 'Sales & Orders',
        items: [
            { title: appModules.POINT_OF_SALE, path: '/admin/pos', icon: 'monitor-play' },
            { title: appModules.ORDER_QUEUE, path: '/admin/order-queue', icon: 'list-ordered' },
            { title: appModules.ORDERS_MANAGEMENT, path: '/admin/orders', icon: 'shopping-cart' },
            { title: appModules.TRANSACTION_HISTORY, path: '/admin/transactions', icon: 'history' },
            { title: appModules.SALES_MANAGEMENT, path: '/admin/sales', icon: 'trending-up' }
        ]
    },
    {
        label: 'Inventory & Products',
        items: [
            { title: appModules.PRODUCTS_MANAGEMENT, path: '/admin/products', icon: 'package' },
            { title: appModules.PRODUCT_SETTINGS_MANAGEMENT, path: '/admin/product-settings', icon: 'settings' },
            { title: appModules.INVENTORY_MANAGEMENT, path: '/admin/inventory', icon: 'archive' },
            { title: appModules.PURCHASE_ORDERS_MANAGEMENT, path: '/admin/purchase-orders', icon: 'receipt' },
            { title: appModules.MENU, path: '/admin/menu', icon: 'menu' }
        ]
    },
    {
        label: 'People',
        items: [
            { title: appModules.CUSTOMERS_MANAGEMENT, path: '/admin/customers', icon: 'users-round' },
            { title: appModules.SUPPLIERS_MANAGEMENT, path: '/admin/suppliers', icon: 'truck' },
            { title: appModules.USERS_MANAGEMENT, path: '/admin/users', icon: 'users' },
            { title: appModules.ROLES_AND_PERMISSIONS, path: '/admin/roles', icon: 'shield' }
        ]
    },
    {
        label: 'System',
        items: [
            { title: appModules.REPORTS_MANAGEMENT, path: '/admin/reports', icon: 'file-bar-chart' },
            { title: appModules.ACTIVITY_LOGS, path: '/admin/activity-logs', icon: 'activity' },
            { title: appModules.STORE_SETTINGS, path: '/admin/store-settings', icon: 'store' }
        ]
    }
];

function SidebarLinkItem({ item }: { item: { title: string; path: string; icon: IconName; exact?: boolean } }) {
    const matchRoute = useMatchRoute();
    const isActive = matchRoute({ to: item.path as any, fuzzy: !item.exact }) !== false;

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
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

export default function AppSidebar() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const permissions = getUserPermissions(user);
    const { storeName } = useStoreSettings();

    const authorizedGroups = sidebarGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.public || hasPermission(permissions, item.title, appPermissions.READ))
        }))
        .filter((group) => group.items.length > 0);

    // Profile variables
    const displayName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Guest';
    const initials = user?.firstName ? `${user.firstName[0]}${user.lastName[0]}` : 'GU';
    const getStorageUrl = (url: string) => url;
    const handleLogout = () => {
        logout();
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
