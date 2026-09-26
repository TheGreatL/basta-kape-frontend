import { redirect } from '@tanstack/react-router';
import type { User, useAuth } from '../context/AuthContext';
import { appModules, appPermissions   } from '../constants/rbac';
import type {TAppModule, TAppPermission} from '../constants/rbac';

export type Permission = {
    module: string;
    permission: string;
};

export interface NavItemConfig {
    path: string;
    module: TAppModule;
}

export const ADMIN_NAV_PRIORITY: NavItemConfig[] = [
    { path: '/admin', module: appModules.DASHBOARD },
    { path: '/admin/pos', module: appModules.POINT_OF_SALE },
    { path: '/admin/order-queue', module: appModules.ORDER_QUEUE },
    { path: '/admin/orders', module: appModules.ORDERS_MANAGEMENT },
    { path: '/admin/transactions', module: appModules.TRANSACTION_HISTORY },
    { path: '/admin/menu', module: appModules.MENU },
    { path: '/admin/products', module: appModules.PRODUCTS_MANAGEMENT },
    { path: '/admin/products/settings', module: appModules.PRODUCT_SETTINGS_MANAGEMENT },
    { path: '/admin/inventory', module: appModules.INVENTORY_MANAGEMENT },
    { path: '/admin/food-prep', module: appModules.FOOD_PREPARATION },
    { path: '/admin/purchase-orders', module: appModules.PURCHASE_ORDERS_MANAGEMENT },
    { path: '/admin/suppliers', module: appModules.SUPPLIERS_MANAGEMENT },
    { path: '/admin/customers', module: appModules.CUSTOMERS_MANAGEMENT },
    { path: '/admin/users', module: appModules.USERS_MANAGEMENT },
    { path: '/admin/roles', module: appModules.ROLES_AND_PERMISSIONS },
    { path: '/admin/sales', module: appModules.SALES_MANAGEMENT },
    { path: '/admin/reports', module: appModules.REPORTS_MANAGEMENT },
    { path: '/admin/activity-logs', module: appModules.ACTIVITY_LOGS },
    { path: '/admin/store-settings', module: appModules.STORE_SETTINGS }
];

export function getDefaultAdminRoute(permissions: Permission[]): string {
    for (const item of ADMIN_NAV_PRIORITY) {
        if (hasPermission(permissions, item.module, appPermissions.READ)) {
            return item.path;
        }
    }
    return '/admin';
}

export function getUserPermissions(user: User | null | undefined): Permission[] {
    if (!user) return [];
    return user.roles.flatMap((role) => role.permissions);
}

export function hasPermission(permissions: Permission[], module: TAppModule, action: TAppPermission): boolean {
    return permissions.some((p) => p.module.toLowerCase() === module.toLowerCase() && p.permission.toLowerCase() === action.toLowerCase());
}

export function requirePermission(auth: ReturnType<typeof useAuth> | null, module: TAppModule, action: TAppPermission) {
    if (auth?.isLoading) {
        return;
    }

    const currentUser = auth?.user;
    const currentPermissions = getUserPermissions(currentUser);

    if (!currentUser) {
        throw redirect({ to: '/login' });
    }

    if (!hasPermission(currentPermissions, module, action)) {
        throw redirect({ to: '/not-found' });
    }
}
