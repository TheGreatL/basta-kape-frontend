// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrderDetailsPage from './order-details-page';
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
    useParams: () => ({ id: 'order-123' }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
    createFileRoute: () => () => ({ useParams: () => ({ id: 'order-123' }), useSearch: () => ({}) })
}));

describe('Customer OrderDetailsPage - Staff-Booked Delivery Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders Delivery Destination card with address, distance, and shipping fee', async () => {
        const mockOrder = {
            id: 'order-123',
            queueNumber: '#005',
            status: 'PREPARING',
            orderType: 'DELIVERY',
            orderSource: 'WEBSITE',
            deliveryAddress: '50 K-1st Kamuning, Quezon City',
            deliveryDistanceKm: 3.2,
            deliveryFee: 69,
            subtotal: 150,
            netTotal: 219,
            riderName: null,
            riderPlate: null,
            riderVehicle: null,
            trackingLink: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            paymentStatus: 'PAID',
            totalPaid: 219,
            items: [],
            payments: [],
            statusHistory: []
        };

        vi.mocked(api.get).mockResolvedValue({
            ok: true,
            json: async () => mockOrder
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
            expect(screen.getByText('Delivery Destination')).toBeTruthy();
        });

        expect(screen.getByText('50 K-1st Kamuning, Quezon City')).toBeTruthy();
        expect(screen.getAllByText(/3\.2 km/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/₱69\.00/).length).toBeGreaterThan(0);

        // Pending courier booking notice should be displayed
        expect(screen.getByText(/Our staff will book your courier upon preparation/i)).toBeTruthy();

        // Customer must NOT have courier input fields
        expect(screen.queryByPlaceholderText('e.g. Juan Dela Cruz')).toBeNull();
        expect(screen.queryByPlaceholderText('e.g. ABC 1234')).toBeNull();
    });

    it('renders read-only Courier Details with external Track Courier link when booked by staff', async () => {
        const mockDispatchedOrder = {
            id: 'order-123',
            queueNumber: '#005',
            status: 'DISPATCHED',
            orderType: 'DELIVERY',
            orderSource: 'WEBSITE',
            deliveryAddress: '50 K-1st Kamuning, Quezon City',
            deliveryDistanceKm: 3.2,
            deliveryFee: 69,
            subtotal: 150,
            netTotal: 219,
            riderName: 'Juan Rider',
            riderPlate: 'ND 4521',
            riderVehicle: 'Motorcycle',
            trackingLink: 'https://track.example.com/rider123',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            paymentStatus: 'PAID',
            totalPaid: 219,
            items: [],
            payments: [],
            statusHistory: []
        };

        vi.mocked(api.get).mockResolvedValue({
            ok: true,
            json: async () => mockDispatchedOrder
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
            expect(screen.getByText('Juan Rider')).toBeTruthy();
        });

        expect(screen.getByText('ND 4521')).toBeTruthy();
        expect(screen.getByText('Motorcycle')).toBeTruthy();

        // "Track Courier" external button link
        const trackLink = screen.getByRole('link', { name: /Track Courier/i });
        expect(trackLink).toBeTruthy();
        expect(trackLink.getAttribute('href')).toBe('https://track.example.com/rider123');

        // Customer should NOT have courier form
        expect(screen.queryByRole('button', { name: /Submit Courier Details/i })).toBeNull();
    });

    it('allows customer to click Order Received to complete delivery when status is DISPATCHED', async () => {
        const mockDispatchedOrder = {
            id: 'order-123',
            queueNumber: '#005',
            status: 'DISPATCHED',
            orderType: 'DELIVERY',
            orderSource: 'WEBSITE',
            deliveryAddress: '50 K-1st Kamuning, Quezon City',
            deliveryDistanceKm: 3.2,
            deliveryFee: 69,
            subtotal: 150,
            netTotal: 219,
            riderName: 'Juan Rider',
            riderPlate: 'ND 4521',
            riderVehicle: 'Motorcycle',
            trackingLink: 'https://track.example.com/rider123',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            paymentStatus: 'PAID',
            totalPaid: 219,
            items: [],
            payments: [],
            statusHistory: []
        };

        vi.mocked(api.get).mockResolvedValue({
            ok: true,
            json: async () => mockDispatchedOrder
        } as Response);

        vi.mocked(api.patch).mockResolvedValue({
            ok: true,
            json: async () => ({ ...mockDispatchedOrder, status: 'COMPLETED' })
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

        const orderReceivedBtn = screen.getByRole('button', { name: /Order Received/i });
        fireEvent.click(orderReceivedBtn);

        await waitFor(() => {
            expect(api.patch).toHaveBeenCalledWith('/orders/order-123/complete', {});
        });
    });
});
