import { createFileRoute } from '@tanstack/react-router';
import StoreSettingsPage from '#/feature/store-settings/store-settings-page';
import { appModules, appPermissions } from '#/constants/rbac.ts';
import { requirePermission } from '#/utils/rbac.ts';

export const Route = createFileRoute('/admin/store-settings')({
    beforeLoad: () => {
        requirePermission(null, appModules.STORE_SETTINGS, appPermissions.READ);
    },
    component: StoreSettingsPage
});
