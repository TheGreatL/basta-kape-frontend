import { createFileRoute, redirect } from '@tanstack/react-router';
import CheckoutPage from '#/feature/customer/checkout-page.tsx';
import { useCheckoutStore } from '#/store/checkout-store.ts';

export const Route = createFileRoute('/_customer/checkout')({
    beforeLoad: async () => {
        const { isCheckoutAllowed, checkoutItemIds } = useCheckoutStore.getState();
        if (!isCheckoutAllowed || checkoutItemIds.length === 0) {
            throw redirect({ to: '/cart' });
        }
    },
    component: CheckoutPage
});
