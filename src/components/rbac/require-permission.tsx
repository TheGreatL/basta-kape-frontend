import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, getUserPermissions } from '../../utils/rbac';
import type { TAppModule, TAppPermission } from '../../constants/rbac';

interface RequirePermissionProps {
    module: TAppModule;
    action: TAppPermission;
    children: ReactNode;
    fallback?: ReactNode;
}

export function RequirePermission({ module, action, children, fallback = null }: RequirePermissionProps) {
    const { user } = useAuth();

    if (!user) {
        return <>{fallback}</>;
    }

    const permissions = getUserPermissions(user);

    if (hasPermission(permissions, module, action)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
