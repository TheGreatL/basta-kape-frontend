import { createFileRoute } from '@tanstack/react-router';
import LandingPage from '#/feature/customer/landing-page';

export const Route = createFileRoute('/_customer/')({
    component: LandingPage
});
