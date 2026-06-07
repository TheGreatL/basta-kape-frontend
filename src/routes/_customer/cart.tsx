import { createFileRoute } from '@tanstack/react-router';
import CartPage from '#/feature/customer/cart-page.tsx';

export const Route = createFileRoute('/_customer/cart')({
    component: CartPage
});
