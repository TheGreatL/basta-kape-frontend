import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrderQueueCount } from '#/api/orders.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useAuth } from '#/context/AuthContext.tsx';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import { appModules, appPermissions } from '#/constants/rbac.ts';

export function useOrderQueueCount() {
    const { user } = useAuth();
    const permissions = React.useMemo(() => getUserPermissions(user), [user]);
    const canReadQueue = React.useMemo(
        () =>
            hasPermission(permissions, appModules.ORDER_QUEUE, appPermissions.READ) ||
            hasPermission(permissions, appModules.ORDERS_MANAGEMENT, appPermissions.READ),
        [permissions]
    );

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.QUEUE_COUNT],
        queryFn: getOrderQueueCount,
        enabled: !!user && canReadQueue,
        refetchInterval: 10000,
        staleTime: 5000
    });

    return {
        count: data?.count ?? 0,
        pending: data?.pending ?? 0,
        preparing: data?.preparing ?? 0,
        ready: data?.ready ?? 0,
        isLoading,
        isError,
        refetch
    };
}
