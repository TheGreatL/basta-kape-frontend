import { createFileRoute } from '@tanstack/react-router';
import ProfilePage from '#/feature/customer/profile-page.tsx';

export const Route = createFileRoute('/_customer/_protected/profile')({
    component: ProfilePage
});
