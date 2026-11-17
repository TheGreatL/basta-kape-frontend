// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheckoutPage from './checkout-page';
import { api } from '#/api/api';

vi.mock('#/api/api', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn()
    }
}));

vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
    createFileRoute: () => () => ({ useParams: () => ({}), useSearch: () => ({}) })
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

vi.mock('#/feature/customer/use-cart.ts', () => ({
    useCart: () => ({
        customer: {
            id: 'cust-1',
            deliveryAddress: '123 Main St, Barangay Central, Quezon City',
            user: { firstName: 'Maria', lastName: 'Santos', phoneNumber: '09171234567' }
        },
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

// Mock useStoreSettings to return custom delivery fare variables
vi.mock('#/hooks/use-store-settings.ts', () => ({
    useStoreSettings: () => ({
        settings: {
            id: 'settings-1',
            storeName: 'Basta Kape',
            address: '50 K-1st, Quezon City',
            contactNumber: '09171234567',
            deliveryBaseFare: 49.0,
            deliveryBaseDistanceKm: 2.0,
            deliveryRatePerKm: 10.0,
            deliveryMaxDistanceKm: 10.0,
            storeLatitude: 14.6288,
            storeLongitude: 121.0422
        },
        storeName: 'Basta Kape',
        address: '50 K-1st, Quezon City',
        isLoading: false,
        error: null
    })
}));

// Mock DeliveryMapPinPicker to allow simulated coordinate selections in tests
vi.mock('./components/delivery-map-pin-picker', () => ({
    default: ({
        onLocationSelect,
        distanceKm
    }: {
        onLocationSelect: (loc: { lat: number; lng: number; distanceKm: number; address?: string }) => void;
        distanceKm: number | null;
    }) => (
        <div data-testid="delivery-map-pin-picker">
            <span>Map Pin Picker Component</span>
            {distanceKm !== null && <span data-testid="picker-distance">{distanceKm.toFixed(1)} km</span>}
            <button
                type="button"
                data-testid="mock-pin-in-range"
                onClick={() =>
                    onLocationSelect({
                        lat: 14.64,
                        lng: 121.05,
                        distanceKm: 3.2,
                        address: '45 Tomas Morato Ave, Quezon City'
                    })
                }
            >
                Pin In Range (3.2 km)
            </button>
            <button
                type="button"
                data-testid="mock-pin-out-of-range"
                onClick={() =>
                    onLocationSelect({
                        lat: 14.8,
                        lng: 121.2,
                        distanceKm: 15.5,
                        address: 'Far Away Location, Outside Radius'
                    })
                }
            >
                Pin Out of Range (15.5 km)
            </button>
        </div>
    )
}));

describe('Customer CheckoutPage - Staff-Booked Delivery Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders map pin picker and address textarea when DELIVERY order type is selected', () => {
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

        // Map pin picker component should be rendered
        expect(screen.getByTestId('delivery-map-pin-picker')).toBeTruthy();

        // Delivery address input should be rendered
        expect(screen.getByPlaceholderText(/Enter your full delivery address/i)).toBeTruthy();

        // Delivery info notice explaining staff booking should be shown
        expect(screen.getByText(/We Book The Courier For You/i)).toBeTruthy();
    });

    it('computes and displays dynamic shipping fee when location within max radius is selected', async () => {
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

        // Click mock pin at 3.2 km
        const pinBtn = screen.getByTestId('mock-pin-in-range');
        fireEvent.click(pinBtn);

        // Fare calculation:
        // distance = 3.2km, base = 2.0km (₱49), rate = ₱10/km
        // extraKm = ceil(3.2 - 2.0) = ceil(1.2) = 2 km
        // fee = 49 + 2 * 10 = ₱69.00
        // Subtotal = ₱150.00, Grand Total = ₱150 + ₱69 = ₱219.00
        await waitFor(() => {
            expect(screen.getByText(/Shipping Fee/i)).toBeTruthy();
            expect(screen.getByText(/₱69\.00/i)).toBeTruthy();
            expect(screen.getByText(/₱219\.00/i)).toBeTruthy();
        });
    });

    it('displays out-of-scope notice and disables place order button when pin exceeds max distance', async () => {
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

        // Click mock pin at 15.5 km (exceeds 10.0 km max radius)
        const pinBtn = screen.getByTestId('mock-pin-out-of-range');
        fireEvent.click(pinBtn);

        await waitFor(() => {
            expect(screen.getByText(/out of scope for delivery/i)).toBeTruthy();
            expect(screen.getByText(/15\.5 km away/i)).toBeTruthy();
        });

        const submitButton = screen.getByRole('button', { name: /Confirm & Place Order/i });
        expect((submitButton as HTMLButtonElement).disabled).toBe(true);
    });

    it('updates delivery address textarea whenever the pinned location changes', async () => {
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

        const textarea = screen.getByPlaceholderText(/Enter your full delivery address/i);

        // Click first pin
        const pinInRange = screen.getByTestId('mock-pin-in-range');
        fireEvent.click(pinInRange);

        await waitFor(() => {
            expect(textarea.value).toBe('45 Tomas Morato Ave, Quezon City');
        });

        // Click second pin to change location - textarea must update to new location
        const pinOutOfRange = screen.getByTestId('mock-pin-out-of-range');
        fireEvent.click(pinOutOfRange);

        await waitFor(() => {
            expect(textarea.value).toBe('Far Away Location, Outside Radius');
        });
    });

    it('submits deliveryAddress, coordinates, distance, and fee when placing a valid delivery order', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });

        const mockCreatedOrder = {
            id: 'order-123',
            queueNumber: '#010',
            status: 'PENDING',
            orderType: 'DELIVERY',
            deliveryFee: 69,
            deliveryAddress: '45 Tomas Morato Ave, Quezon City',
            deliveryLatitude: 14.64,
            deliveryLongitude: 121.05,
            deliveryDistanceKm: 3.2
        };

        vi.mocked(api.post).mockImplementation(async (url: string) => {
            if (url.includes('/upload')) {
                return {
                    ok: true,
                    json: async () => ({ url: 'https://example.com/receipt.jpg' })
                } as Response;
            }
            return {
                ok: true,
                json: async () => mockCreatedOrder
            } as Response;
        });

        render(
            <QueryClientProvider client={queryClient}>
                <CheckoutPage />
            </QueryClientProvider>
        );

        // Select Delivery
        const deliveryButton = screen.getByRole('button', { name: /Delivery/i });
        fireEvent.click(deliveryButton);

        // Pin in range (3.2 km, fee ₱69)
        fireEvent.click(screen.getByTestId('mock-pin-in-range'));

        // Input 13-digit reference number
        const refInput = screen.getByPlaceholderText(/13-digit GCash Ref #/i);
        fireEvent.change(refInput, { target: { value: '1234567890123' } });

        // Add dummy receipt file
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['dummy receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        // Submit order
        const submitButton = screen.getByRole('button', { name: /Confirm & Place Order/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(
                '/orders',
                expect.objectContaining({
                    orderType: 'DELIVERY',
                    deliveryAddress: '45 Tomas Morato Ave, Quezon City',
                    deliveryLatitude: 14.64,
                    deliveryLongitude: 121.05,
                    deliveryDistanceKm: 3.2,
                    deliveryFee: 69
                })
            );
        });
    });
});
