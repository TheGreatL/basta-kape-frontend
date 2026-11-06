// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RIDER_VEHICLES, orderCreateFormSchema } from './order.types';
import * as ordersApi from '#/api/orders.api';
import { api } from '#/api/api';
import CheckoutPaymentDialog from '#/feature/pos/components/checkout-payment-dialog';
import CheckoutPage from '#/feature/customer/checkout-page';
import OrderDetailsPage from '#/feature/customer/order-details-page';
import OrderViewPage from '#/feature/order/order-view-page';

vi.mock('#/api/api', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn()
    }
}));

// Mocks for Customer CheckoutPage & OrderDetailsPage tests
vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'order-deliv-1' }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
    createFileRoute: () => () => ({ useParams: () => ({ id: 'order-deliv-1' }), useSearch: () => ({}) })
}));

vi.mock('#/context/AuthContext.tsx', () => ({
    useAuth: () => ({
        user: {
            id: 'user-1',
            firstName: 'Maria',
            lastName: 'Santos',
            username: 'mariasantos',
            phoneNumber: '09171234567'
        }
    })
}));

vi.mock('#/api/auth.api.ts', () => ({
    getCurrentUser: vi.fn().mockResolvedValue({
        id: 'user-1',
        firstName: 'Maria',
        lastName: 'Santos',
        username: 'mariasantos',
        phoneNumber: '09171234567'
    })
}));

vi.mock('#/feature/customer/use-cart.ts', () => ({
    useCart: () => ({
        customer: { id: 'cust-1', user: { firstName: 'Maria', lastName: 'Santos', phoneNumber: '09171234567' } },
        cart: {
            items: [
                {
                    id: 'cart-item-1',
                    quantity: 1,
                    unitPrice: 150,
                    productVariantId: 'var-1',
                    productVariant: {
                        id: 'var-1',
                        sku: 'LATTE-LRG',
                        price: 150,
                        attributes: [],
                        product: {
                            id: 'prod-1',
                            name: 'Spanish Latte',
                            photo: null,
                            description: 'Rich espresso with condensed milk'
                        }
                    },
                    cartModifiers: []
                }
            ]
        },
        isLoading: false,
        clearCart: vi.fn()
    })
}));

vi.mock('#/store/checkout-store.ts', () => ({
    useCheckoutStore: () => ({
        checkoutItemIds: ['cart-item-1'],
        selectedModifiers: {},
        clearCheckoutState: vi.fn(),
        isDirectCheckout: false,
        directCheckoutItem: null
    })
}));

describe('Delivery Order Frontend Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe('Schema & Constants Validation', () => {
        it('defines the exact 4 allowed rider vehicle types', () => {
            expect(RIDER_VEHICLES).toEqual(['Bike', 'Motorcycle', 'Car', 'Other Transportation Service']);
        });

        it('disallows DELIVERY in POS/Admin orderCreateFormSchema and allows DINE_IN and TAKE_OUT', () => {
            const validDineIn = orderCreateFormSchema.safeParse({
                customerType: 'GUEST',
                guestName: 'Walk-in Guest',
                orderType: 'DINE_IN',
                items: [
                    {
                        productVariantId: 'var-1',
                        name: 'Spanish Latte',
                        sku: 'LATTE-1',
                        price: 150,
                        quantity: 1
                    }
                ]
            });
            expect(validDineIn.success).toBe(true);

            const invalidDelivery = orderCreateFormSchema.safeParse({
                customerType: 'GUEST',
                guestName: 'Walk-in Guest',
                orderType: 'DELIVERY',
                items: [
                    {
                        productVariantId: 'var-1',
                        name: 'Spanish Latte',
                        sku: 'LATTE-1',
                        price: 150,
                        quantity: 1
                    }
                ]
            });
            expect(invalidDelivery.success).toBe(false);
        });
    });

    describe('Orders API - updateOrderCourier', () => {
        it('sends PATCH /orders/:id/courier with rider details payload', async () => {
            const mockOrderResponse = {
                id: 'order-deliv-1',
                queueNumber: '#001',
                status: 'READY',
                orderType: 'DELIVERY',
                riderName: 'Juan Dela Cruz',
                riderPlate: 'ABC 1234',
                riderVehicle: 'Motorcycle',
                trackingLink: 'https://track.example.com/12345'
            };

            vi.mocked(api.patch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockOrderResponse
            } as Response);

            const result = await ordersApi.updateOrderCourier('order-deliv-1', {
                riderName: 'Juan Dela Cruz',
                riderPlate: 'ABC 1234',
                riderVehicle: 'Motorcycle',
                trackingLink: 'https://track.example.com/12345'
            });

            expect(api.patch).toHaveBeenCalledWith('/orders/order-deliv-1/courier', {
                riderName: 'Juan Dela Cruz',
                riderPlate: 'ABC 1234',
                riderVehicle: 'Motorcycle',
                trackingLink: 'https://track.example.com/12345'
            });
            expect(result).toEqual(mockOrderResponse);
        });
    });

    describe('POS CheckoutPaymentDialog', () => {
        it('does not offer Delivery in POS Fulfillment Mode', () => {
            render(
                <CheckoutPaymentDialog
                    open={true}
                    onOpenChange={vi.fn()}
                    cartNetTotal={150}
                    cart={[{ quantity: 1 }]}
                    membersData={{ data: [] }}
                    customerType="GUEST"
                    setCustomerType={vi.fn()}
                    guestName="Walk-in Customer"
                    setGuestName={vi.fn()}
                    selectedCustomerId=""
                    setSelectedCustomerId={vi.fn()}
                    buzzerId=""
                    setBuzzerId={vi.fn()}
                    orderType="DINE_IN"
                    setOrderType={vi.fn()}
                    paymentMethod="CASH"
                    setPaymentMethod={vi.fn()}
                    cashTendered={150}
                    setCashTendered={vi.fn()}
                    referenceNumber=""
                    setReferenceNumber={vi.fn()}
                    appliedDiscount={null}
                    discountRefId=""
                    setDiscountRefId={vi.fn()}
                    discountRefName=""
                    setDiscountRefName={vi.fn()}
                    isPending={false}
                    onSubmit={vi.fn()}
                    paymentProofPhoto=""
                    setPaymentProofPhoto={vi.fn()}
                />
            );

            expect(screen.queryByText('Store Delivery')).toBeNull();
        });
    });

    describe('Customer CheckoutPage - Delivery Mode', () => {
        it('removes Delivery Address input, shows courier notice, switches to GCash, and disables Cash when Delivery is selected', async () => {
            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } }
            });

            render(
                <QueryClientProvider client={queryClient}>
                    <CheckoutPage />
                </QueryClientProvider>
            );

            const deliveryButton = screen.getByRole('button', { name: /Delivery/i });
            fireEvent.click(deliveryButton);

            // Delivery Address input should NOT exist
            expect(screen.queryByPlaceholderText(/House\/Unit #, Street name/i)).toBeNull();

            // Self-Booked Courier Delivery notice should be visible
            expect(screen.getByText(/Self-Booked Courier Delivery/i)).toBeTruthy();

            // Cash button should be disabled for Delivery and GCash details should be active
            expect(screen.getByText(/\(Disabled for Delivery\)/i)).toBeTruthy();
            expect(screen.getByText(/GCash Account Details/i)).toBeTruthy();
        });
    });

    describe('Customer OrderDetailsPage - Delivery Lifecycle & Courier Submission', () => {
        it('displays Ready for Pickup and Dispatched steps and allows customer to submit courier details when status is READY', async () => {
            const mockReadyDeliveryOrder = {
                id: 'order-deliv-1',
                queueNumber: '#005',
                buzzerId: null,
                referenceNumber: '261107-005',
                status: 'READY',
                orderType: 'DELIVERY',
                orderSource: 'WEBSITE',
                notes: 'Contact Phone: 09171234567',
                subtotal: 150,
                taxAmount: 16.07,
                discountAmount: 0,
                netTotal: 150,
                customerId: 'cust-1',
                customerName: 'Maria Santos',
                riderName: null,
                riderPlate: null,
                riderVehicle: null,
                trackingLink: null,
                cashierSessionId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                paymentStatus: 'PAID',
                totalPaid: 150,
                items: [],
                payments: [],
                statusHistory: []
            };

            vi.mocked(api.get).mockResolvedValue({
                ok: true,
                json: async () => mockReadyDeliveryOrder
            } as Response);

            vi.mocked(api.patch).mockResolvedValue({
                ok: true,
                json: async () => ({
                    ...mockReadyDeliveryOrder,
                    riderName: 'Pedro Penduko',
                    riderPlate: 'XYZ 9876',
                    riderVehicle: 'Motorcycle',
                    trackingLink: 'https://lalamove.com/track/xyz'
                })
            } as Response);

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } }
            });

            render(
                <QueryClientProvider client={queryClient}>
                    <OrderDetailsPage />
                </QueryClientProvider>
            );

            await waitFor(() => {
                expect(screen.getAllByText('Ready for Pickup').length).toBeGreaterThan(0);
            });

            // Dispatched step should be in the stepper for DELIVERY orders
            expect(screen.getByText('Dispatched')).toBeTruthy();

            // Indicators that customer needs to input courier details should be visible
            expect(screen.getByText('Action Required: Input Courier Details')).toBeTruthy();
            expect(screen.getByText('Courier Details Required Before Dispatch')).toBeTruthy();
            expect(screen.getByText('Input Required')).toBeTruthy();

            // Courier form inputs should be rendered when status is READY
            const riderNameInput = screen.getByPlaceholderText('e.g. Juan Dela Cruz');
            const plateInput = screen.getByPlaceholderText('e.g. ABC 1234');
            const trackingInput = screen.getByPlaceholderText('https://...');

            fireEvent.change(riderNameInput, { target: { value: 'Pedro Penduko' } });
            fireEvent.change(plateInput, { target: { value: 'XYZ 9876' } });
            fireEvent.change(trackingInput, { target: { value: 'https://lalamove.com/track/xyz' } });

            const submitButton = screen.getByRole('button', { name: /Submit Courier Details/i });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(api.patch).toHaveBeenCalledWith('/orders/order-deliv-1/courier', {
                    riderName: 'Pedro Penduko',
                    riderPlate: 'XYZ 9876',
                    riderVehicle: 'Motorcycle',
                    trackingLink: 'https://lalamove.com/track/xyz'
                });
            });
        });

        it('allows customer to trigger complete order when status is DISPATCHED', async () => {
            const mockDispatchedDeliveryOrder = {
                id: 'order-deliv-1',
                queueNumber: '#005',
                buzzerId: null,
                referenceNumber: '261107-005',
                status: 'DISPATCHED',
                orderType: 'DELIVERY',
                orderSource: 'WEBSITE',
                notes: 'Contact Phone: 09171234567',
                subtotal: 150,
                taxAmount: 16.07,
                discountAmount: 0,
                netTotal: 150,
                customerId: 'cust-1',
                customerName: 'Maria Santos',
                riderName: 'Pedro Penduko',
                riderPlate: 'XYZ 9876',
                riderVehicle: 'Motorcycle',
                trackingLink: 'https://lalamove.com/track/xyz',
                cashierSessionId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                paymentStatus: 'PAID',
                totalPaid: 150,
                items: [],
                payments: [],
                statusHistory: []
            };

            vi.mocked(api.get).mockResolvedValue({
                ok: true,
                json: async () => mockDispatchedDeliveryOrder
            } as Response);

            vi.mocked(api.patch).mockResolvedValue({
                ok: true,
                json: async () => ({
                    ...mockDispatchedDeliveryOrder,
                    status: 'COMPLETED'
                })
            } as Response);

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } }
            });

            render(
                <QueryClientProvider client={queryClient}>
                    <OrderDetailsPage />
                </QueryClientProvider>
            );

            await waitFor(() => {
                expect(screen.getByText(/Order On Its Way — Has Your Order Arrived\?/i)).toBeTruthy();
            });

            const orderReceivedButton = screen.getByRole('button', { name: /Order Received/i });
            fireEvent.click(orderReceivedButton);

            await waitFor(() => {
                expect(api.patch).toHaveBeenCalledWith('/orders/order-deliv-1/complete', {});
            });
        });
    });

    describe('Admin OrderViewPage - Read-Only Courier Visibility', () => {
        it('displays Ready for Pickup badge and read-only Courier / Rider Details on a DELIVERY order', async () => {
            const mockDeliveryOrderWithCourier = {
                id: 'order-deliv-1',
                queueNumber: '#009',
                buzzerId: null,
                referenceNumber: '261107-009',
                status: 'READY',
                orderType: 'DELIVERY',
                orderSource: 'WEBSITE',
                notes: 'Contact Phone: 09171234567',
                subtotal: 150,
                taxAmount: 16.07,
                discountAmount: 0,
                netTotal: 150,
                customerId: 'cust-1',
                customerName: 'Maria Santos',
                riderName: 'Juan Dela Cruz',
                riderPlate: 'ABC 1234',
                riderVehicle: 'Car',
                trackingLink: 'https://grab.com/track/abc1234',
                cashierSessionId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                paymentStatus: 'PAID',
                totalPaid: 150,
                items: [],
                payments: [],
                statusHistory: []
            };

            vi.mocked(api.get).mockImplementation(async (url: string) => {
                if (url.includes('/payments')) {
                    return { ok: true, json: async () => [] } as Response;
                }
                return { ok: true, json: async () => mockDeliveryOrderWithCourier } as Response;
            });

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } }
            });

            render(
                <QueryClientProvider client={queryClient}>
                    <OrderViewPage />
                </QueryClientProvider>
            );

            await waitFor(() => {
                expect(screen.getByText('Ready for Pickup')).toBeTruthy();
            });

            expect(screen.getByText('Courier / Rider Details')).toBeTruthy();
            expect(screen.getByText('Juan Dela Cruz')).toBeTruthy();
            expect(screen.getByText('ABC 1234')).toBeTruthy();
            expect(screen.getByText('Car')).toBeTruthy();
            expect(screen.getByText('https://grab.com/track/abc1234')).toBeTruthy();
        });
    });
});
