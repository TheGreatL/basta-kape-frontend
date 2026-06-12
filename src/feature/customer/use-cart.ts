import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentCustomer } from './use-current-customer.ts';
import { getCart, addCartItem, updateCartItem, removeCartItem, clearCart as clearCartApi } from '#/api/customer.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { toast } from 'sonner';

export function useCart() {
    const queryClient = useQueryClient();
    const { data: customer, isLoading: isCustomerLoading } = useCurrentCustomer();

    const customerId = customer?.id;

    const cartQuery = useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.CART, customerId],
        queryFn: () => getCart(customerId!),
        enabled: !!customerId
    });

    const addMutation = useMutation({
        mutationFn: (payload: { productVariantId: string; quantity: number; modifierOptionIds?: string[] }) => {
            if (!customerId) throw new Error('No customer ID');
            return addCartItem(customerId, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CART, customerId] });
            toast.success('Added to cart');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to add item to cart');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (payload: { cartItemId: string; quantity: number }) => {
            if (!customerId) throw new Error('No customer ID');
            return updateCartItem(customerId, payload.cartItemId, { quantity: payload.quantity });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CART, customerId] });
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to update item quantity');
        }
    });

    const removeMutation = useMutation({
        mutationFn: (cartItemId: string) => {
            if (!customerId) throw new Error('No customer ID');
            return removeCartItem(customerId, cartItemId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CART, customerId] });
            toast.success('Removed from cart');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to remove item');
        }
    });

    const clearMutation = useMutation({
        mutationFn: () => {
            if (!customerId) throw new Error('No customer ID');
            return clearCartApi(customerId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CART, customerId] });
            toast.success('Cart cleared');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to clear cart');
        }
    });

    return {
        customer,
        cart: cartQuery.data,
        isLoading: isCustomerLoading || cartQuery.isLoading,
        isFetching: cartQuery.isFetching,
        addItem: addMutation.mutateAsync,
        isAdding: addMutation.isPending,
        updateItem: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,
        removeItem: removeMutation.mutateAsync,
        isRemoving: removeMutation.isPending,
        clearCart: clearMutation.mutateAsync,
        isClearing: clearMutation.isPending
    };
}
