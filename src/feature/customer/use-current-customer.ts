import { useQuery } from '@tanstack/react-query';
import { getMyCustomerProfile } from '#/api/customer.api.ts';
import { useAuth } from '#/context/AuthContext.tsx';
import QUERY_KEY from '#/constants/query-keys.ts';

export function useCurrentCustomer() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.CURRENT_CUSTOMER, user?.username],
        queryFn: () => getMyCustomerProfile(user!.username),
        enabled: !!user?.username,
        staleTime: 5 * 60 * 1000
    });
}
