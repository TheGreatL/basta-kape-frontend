import { createFileRoute } from '@tanstack/react-router';
import ForbiddenPage from '#/components/errors/forbidden-page';

export const Route = createFileRoute('/not-found')({
    component: ForbiddenPage
});
