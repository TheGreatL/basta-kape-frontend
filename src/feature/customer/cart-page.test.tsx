// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import CartPage from './cart-page';
import * as menuApi from '#/api/menu.api';
import * as modifiersApi from '#/api/modifiers.api';
import * as useCartHook from './use-cart';
import * as authContext from '#/context/AuthContext';
import { useCheckoutStore } from '#/store/checkout-store';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
        success: vi.fn()
    }
}));

vi.mock('#/api/menu.api', () => ({
    getMenuProductById: vi.fn()
}));

vi.mock('#/api/modifiers.api', () => ({
    getModifierGroups: vi.fn().mockResolvedValue({ data: [] })
}));

describe('CartPage - Inventory & Live Stock Validation', () => {
    let queryClient: QueryClient;

    const mockCartItem1 = {
        id: 'cart-item-1',
        customerId: 'cust-1',
        quantity: 2,
        unitPrice: 150,
        notes: null,
        productVariantId: 'var-1',
        productVariant: {
            id: 'var-1',
            sku: 'SKU-LATTE-R',
            price: 150,
            product: {
                id: 'prod-latte',
                name: 'Spanish Latte',
                photo: null,
                description: 'Rich espresso with condensed milk',
                category: { id: 'cat-1', name: 'Coffee' },
                type: { id: 'type-1', name: 'Beverage' }
            },
            attributes: [
                {
                    id: 'attr-1',
                    attributeValue: {
                        id: 'val-1',
                        value: 'Regular',
                        attribute: { id: 'attr-def-1', name: 'Size' }
                    }
                }
            ],
            maxProduceable: 10
        },
        cartModifiers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
    };

    const mockCartItem2 = {
        id: 'cart-item-2',
        customerId: 'cust-1',
        quantity: 5,
        unitPrice: 120,
        notes: null,
        productVariantId: 'var-2',
        productVariant: {
            id: 'var-2',
            sku: 'SKU-CROISSANT',
            price: 120,
            product: {
                id: 'prod-croissant',
                name: 'Butter Croissant',
                photo: null,
                description: 'Flaky pastry',
                category: { id: 'cat-2', name: 'Pastry' },
                type: { id: 'type-2', name: 'Food' }
            },
            attributes: [],
            maxProduceable: 2 // Only 2 left in stock!
        },
        cartModifiers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
    };

    const mockUpdateItem = vi.fn();
    const mockRemoveItem = vi.fn();
    const mockClearCart = vi.fn();

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false, gcTime: 0 }
            }
        });
        vi.clearAllMocks();
        mockNavigate.mockReset();

        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: {
                id: 'user-1',
                firstName: 'Ken',
                lastName: 'Tester',
                username: 'kentesters',
                phoneNumber: '09123456789'
            } as any,
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
            setUser: vi.fn()
        });

        vi.spyOn(useCartHook, 'useCart').mockReturnValue({
            cart: {
                items: [mockCartItem1],
                totalAmount: 300
            },
            customer: { id: 'cust-1' } as any,
            isLoading: false,
            updateItem: mockUpdateItem,
            removeItem: mockRemoveItem,
            clearCart: mockClearCart,
            isClearing: false,
            isUpdating: false,
            isRemoving: false
        });

        // Mock getMenuProductById responses
        vi.mocked(menuApi.getMenuProductById).mockImplementation(async (id: string) => {
            if (id === 'prod-latte') {
                return {
                    id: 'prod-latte',
                    name: 'Spanish Latte',
                    photo: null,
                    description: '',
                    productCategoryId: 'cat-1',
                    productTypeId: 'type-1',
                    category: null,
                    type: null,
                    variants: [
                        {
                            id: 'var-1',
                            productId: 'prod-latte',
                            sku: 'SKU-LATTE-R',
                            price: 150,
                            attributes: [],
                            recipe: null,
                            maxProduceable: 10
                        }
                    ]
                };
            }
            if (id === 'prod-croissant') {
                return {
                    id: 'prod-croissant',
                    name: 'Butter Croissant',
                    photo: null,
                    description: '',
                    productCategoryId: 'cat-2',
                    productTypeId: 'type-2',
                    category: null,
                    type: null,
                    variants: [
                        {
                            id: 'var-2',
                            productId: 'prod-croissant',
                            sku: 'SKU-CROISSANT',
                            price: 120,
                            attributes: [],
                            recipe: null,
                            maxProduceable: 2
                        }
                    ]
                };
            }
            throw new Error('Not found');
        });
    });

    afterEach(() => {
        cleanup();
    });

    const renderPage = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <CartPage />
            </QueryClientProvider>
        );
    };

    it('navigates to checkout when all selected items have sufficient inventory', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Spanish Latte')).toBeDefined();
        });

        const checkoutButton = screen.getByRole('button', { name: /Proceed to Checkout/i });
        fireEvent.click(checkoutButton);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith({ to: '/checkout' });
        });
    });

    it('blocks checkout and shows error toast when an item is Out of Stock (stock = 0)', async () => {
        // Mock Spanish Latte with 0 stock
        vi.mocked(menuApi.getMenuProductById).mockResolvedValue({
            id: 'prod-latte',
            name: 'Spanish Latte',
            photo: null,
            description: '',
            productCategoryId: 'cat-1',
            productTypeId: 'type-1',
            category: null,
            type: null,
            variants: [
                {
                    id: 'var-1',
                    productId: 'prod-latte',
                    sku: 'SKU-LATTE-R',
                    price: 150,
                    attributes: [],
                    recipe: null,
                    maxProduceable: 0
                }
            ]
        });

        renderPage();

        await waitFor(() => {
            expect(screen.getAllByText(/Out of stock/i).length).toBeGreaterThan(0);
        });

        const checkoutButton = screen.getByRole('button', { name: /Adjust Items to Checkout/i });
        fireEvent.click(checkoutButton);

        await waitFor(() => {
            expect(mockNavigate).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith(
                'Item Out of Stock',
                expect.objectContaining({
                    description: expect.stringContaining('out of stock')
                })
            );
        });
    });

    it('blocks checkout and shows error toast when requested quantity exceeds available inventory', async () => {
        // Item 2 has quantity 5, but stock is 2
        vi.spyOn(useCartHook, 'useCart').mockReturnValue({
            cart: {
                items: [mockCartItem2],
                totalAmount: 600
            },
            customer: { id: 'cust-1' } as any,
            isLoading: false,
            updateItem: mockUpdateItem,
            removeItem: mockRemoveItem,
            clearCart: mockClearCart,
            isClearing: false,
            isUpdating: false,
            isRemoving: false
        });

        renderPage();

        await waitFor(() => {
            expect(screen.getByText(/Selected quantity exceeds inventory/i)).toBeDefined();
        });

        const checkoutButton = screen.getByRole('button', { name: /Adjust Items to Checkout/i });
        fireEvent.click(checkoutButton);

        await waitFor(() => {
            expect(mockNavigate).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith(
                'Insufficient Stock',
                expect.objectContaining({
                    description: expect.stringContaining('Only 2 unit(s) available')
                })
            );
        });
    });

    it('blocks checkout when multiple selected items of the same variant collectively exceed inventory', async () => {
        // Two distinct cart items for the same variant var-2 (e.g. customized differently), each quantity 2 (total 4), but stock is 2
        const itemA = { ...mockCartItem2, id: 'cart-item-2a', quantity: 2 };
        const itemB = { ...mockCartItem2, id: 'cart-item-2b', quantity: 2 };

        vi.spyOn(useCartHook, 'useCart').mockReturnValue({
            cart: {
                items: [itemA, itemB],
                totalAmount: 480
            },
            customer: { id: 'cust-1' } as any,
            isLoading: false,
            updateItem: mockUpdateItem,
            removeItem: mockRemoveItem,
            clearCart: mockClearCart,
            isClearing: false,
            isUpdating: false,
            isRemoving: false
        });

        renderPage();

        await waitFor(() => {
            expect(screen.getAllByText('Butter Croissant').length).toBeGreaterThan(0);
        });

        const checkoutButton = screen.getByRole('button', { name: /Adjust Items to Checkout/i });
        fireEvent.click(checkoutButton);

        await waitFor(() => {
            expect(mockNavigate).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith(
                'Insufficient Stock',
                expect.objectContaining({
                    description: expect.stringContaining('Only 2 unit(s) available')
                })
            );
        });
    });

    it('prevents increasing quantity beyond available stock using the plus button', async () => {
        // Item 2 has quantity 2 and available stock 2
        const itemAtMax = { ...mockCartItem2, quantity: 2 };

        vi.spyOn(useCartHook, 'useCart').mockReturnValue({
            cart: {
                items: [itemAtMax],
                totalAmount: 240
            },
            customer: { id: 'cust-1' } as any,
            isLoading: false,
            updateItem: mockUpdateItem,
            removeItem: mockRemoveItem,
            clearCart: mockClearCart,
            isClearing: false,
            isUpdating: false,
            isRemoving: false
        });

        renderPage();

        await waitFor(() => {
            expect(screen.getAllByText('Butter Croissant').length).toBeGreaterThan(0);
        });

        // The plus button should be disabled when quantity >= stock
        const plusButton = screen.getAllByRole('button').find((btn) => btn.querySelector('.lucide-plus'));
        expect(plusButton).toBeDefined();
        expect(plusButton?.hasAttribute('disabled')).toBe(true);

        fireEvent.click(plusButton!);
        expect(mockUpdateItem).not.toHaveBeenCalled();
    });

    it('allows deducting quantity when current item quantity exceeds available stock', async () => {
        // Item 2 has quantity 5, but stock is 2
        const itemExceedingStock = { ...mockCartItem2, quantity: 5 };

        vi.spyOn(useCartHook, 'useCart').mockReturnValue({
            cart: {
                items: [itemExceedingStock],
                totalAmount: 600
            },
            customer: { id: 'cust-1' } as any,
            isLoading: false,
            updateItem: mockUpdateItem,
            removeItem: mockRemoveItem,
            clearCart: mockClearCart,
            isClearing: false,
            isUpdating: false,
            isRemoving: false
        });

        renderPage();

        await waitFor(() => {
            expect(screen.getAllByText('Butter Croissant').length).toBeGreaterThan(0);
        });

        // Click minus button to reduce quantity from 5 to 4
        const minusButton = screen.getAllByRole('button').find((btn) => btn.querySelector('.lucide-minus'));
        expect(minusButton).toBeDefined();

        fireEvent.click(minusButton!);

        // Should successfully call updateItem with quantity 4 even though 4 is still > stock (2)
        await waitFor(() => {
            expect(mockUpdateItem).toHaveBeenCalledWith({
                cartItemId: 'cart-item-2',
                quantity: 4
            });
            expect(toast.warning).not.toHaveBeenCalled();
        });
    });
});
