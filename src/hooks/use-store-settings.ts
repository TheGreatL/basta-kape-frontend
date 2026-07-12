import { useQuery } from '@tanstack/react-query';
import { getStoreSettings } from '#/api/store-settings.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';

export const DEFAULT_STORE_SETTINGS = {
    id: 'default',
    storeName: 'Basta Kape',
    address: '50 K-1st, Quezon City, Metro Manila',
    contactNumber: null,
    openingTime: '07:00',
    closingTime: '21:00',
    vatRate: 12.0,
    serviceCharge: 0.0,
    updatedAt: new Date().toISOString()
};

export function useStoreSettings() {
    const { data, isLoading, error } = useQuery({
        queryKey: [QUERY_KEY.STORE_SETTINGS.ACTIVE],
        queryFn: getStoreSettings,
        staleTime: 1000 * 60 * 10, // Cache for 10 minutes since store settings change rarely
        retry: false
    });

    const settings = data || DEFAULT_STORE_SETTINGS;

    return {
        settings,
        storeName: settings.storeName,
        address: settings.address,
        isLoading,
        error
    };
}
