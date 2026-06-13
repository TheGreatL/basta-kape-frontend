import { createFileRoute, redirect } from '@tanstack/react-router';
import CheckoutPage from '#/feature/customer/checkout-page.tsx';
import { useCheckoutStore } from '#/store/checkout-store.ts';

export const Route = createFileRoute('/_customer/checkout')({
    beforeLoad: async () => {
        const { isCheckoutAllowed, checkoutItemIds, isDirectCheckout, directCheckoutItem } = useCheckoutStore.getState();
        const hasCartItems = checkoutItemIds.length > 0;
        const hasDirectItem = isDirectCheckout && directCheckoutItem !== null;
        if (!isCheckoutAllowed || (!hasCartItems && !hasDirectItem)) {
            throw redirect({ to: '/cart' });
        }
    },
    component: CheckoutPage
});
