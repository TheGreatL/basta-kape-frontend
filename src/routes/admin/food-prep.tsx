import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import FoodPrepPage from '#/feature/food-prep/food-prep-page.tsx';
import { requirePermission } from '#/utils/rbac.ts';
import { appModules, appPermissions } from '#/constants/rbac.ts';

const searchParamsSchema = z.object({
    page: z.number().catch(1),
    limit: z.number().catch(10),
    status: z.string().catch(''),
    search: z.string().catch('')
});

export const Route = createFileRoute('/admin/food-prep')({
    validateSearch: (search) => searchParamsSchema.parse(search),
    component: FoodPrepPage,
    beforeLoad: ({ context }) => {
        requirePermission(context.auth, appModules.FOOD_PREPARATION, appPermissions.READ);
    }
});

export type TFoodPrepSearchSchema = z.infer<typeof searchParamsSchema>;
