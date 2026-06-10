import { createFileRoute } from '@tanstack/react-router';
import StoreSettingsPage from '#/feature/store-settings/store-settings-page';
import { appModules, appPermissions } from '#/constants/rbac.ts';
import { requirePermission } from '#/utils/rbac.ts';
import { useAuthStore, waitForAuthHydration } from '#/store/auth-store.ts';
import { restoreSession } from '#/api/auth.api.ts';

export const Route = createFileRoute('/admin/store-settings')({
    beforeLoad: async () => {
        if (typeof window === 'undefined') {
            return;
        }

        await waitForAuthHydration();

        if (!useAuthStore.getState().user) {
            await restoreSession().catch(() => null);
        }

        requirePermission(null, appModules.STORE_SETTINGS, appPermissions.READ);
    },
    component: StoreSettingsPage
});
