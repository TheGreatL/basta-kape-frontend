import { redirect } from '@tanstack/react-router';
import type { User, useAuth } from '../context/AuthContext';
import type { TAppModule, TAppPermission } from '../constants/rbac';

export type Permission = {
    module: string;
    permission: string;
};

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

    console.log('[DEBUG] requirePermission checked.', {
        user: currentUser ? currentUser.username : null,
        permissionsCount: currentPermissions.length,
        module,
        action
    });

    if (!currentUser) {
        console.log('[DEBUG] requirePermission redirecting to /login because currentUser is null!');
        throw redirect({ to: '/login' });
    }

    if (!hasPermission(currentPermissions, module, action)) {
        console.log('[DEBUG] requirePermission redirecting to /not-found because permission check failed!');
        throw redirect({ to: '/not-found' });
    }
}
