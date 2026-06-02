import { redirect } from '@tanstack/react-router';
import { useAuthStore } from '../store/auth-store';
import type { User } from '../store/auth-store';
import type { TAppModule, TAppPermission, TAccessScope } from '../constants/rbac';

export type Permission = {
    module: string;
    permission: string;
    scope: string;
};

export function getUserPermissions(user: User | null | undefined): Permission[] {
    if (!user) return [];
    return user.roles.flatMap((role) => role.permissions);
}

export function hasPermission(permissions: Permission[], module: string, action: string, scope?: TAccessScope): boolean {
    return permissions.some(
        (p) =>
            p.module.toLowerCase() === module.toLowerCase() &&
            p.permission.toLowerCase() === action.toLowerCase() &&
            (!scope || p.scope.toLowerCase() === scope.toLowerCase())
    );
}

export function requirePermission(auth: { user: User | null } | null, module: TAppModule, action: TAppPermission, scope?: TAccessScope) {
    const currentUser = auth?.user || useAuthStore.getState().user;
    const currentPermissions = getUserPermissions(currentUser);

    if (!currentUser) {
        throw redirect({ to: '/login' });
    }

    if (!hasPermission(currentPermissions, module, action, scope)) {
        throw redirect({ to: '/403' as any });
    }
}
