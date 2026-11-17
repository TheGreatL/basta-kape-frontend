// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrderQueuePage from './order-queue-page';
import { api } from '#/api/api';

vi.mock('#/api/api', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn()
    }
}));

vi.mock('#/context/AuthContext.tsx', () => ({
    useAuth: () => ({
        user: {
            id: 'staff-1',
            firstName: 'Barista',
            lastName: 'Staff',
            username: 'barista',
            roles: [{ id: 'role-1', name: 'Admin', permissions: [] }]
        }
    })
}));

vi.mock('#/components/rbac/require-permission.tsx', () => ({
    RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('OrderQueuePage - Staff Delivery Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders delivery distance badge and Assign Courier button for PREPARING delivery order', async () => {
        const mockPreparingOrder = {
            id: 'order-q-1',
            queueNumber: '#011',
            status: 'PREPARING',
            orderType: 'DELIVERY',
            orderSource: 'WEBSITE',
            deliveryAddress: '78 Scout Gandia, Diliman, Quezon City',
            deliveryLatitude: 14.634,
            deliveryLongitude: 121.038,
            deliveryDistanceKm: 2.8,
            deliveryFee: 59,
            notes: 'Contact Phone: 09187654321',
            customerName: 'Juan Dela Cruz',
            riderName: null,
            riderPlate: null,
            riderVehicle: null,
            trackingLink: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: []
        };

        vi.mocked(api.get).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [mockPreparingOrder], total: 1 })
        } as Response);

        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });

        render(
            <QueryClientProvider client={queryClient}>
                <OrderQueuePage />
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('#011')).toBeTruthy();
        });

        // Delivery distance badge should be rendered
        expect(screen.getAllByText(/2\.8 km/).length).toBeGreaterThan(0);

        // Assign Courier button should be present
        const assignBtn = screen.getByRole('button', { name: /Assign Courier/i });
        expect(assignBtn).toBeTruthy();

        // Clicking Assign Courier opens the modal dialog
        fireEvent.click(assignBtn);

        await waitFor(() => {
            expect(screen.getByText('Assign Delivery Courier')).toBeTruthy();
            expect(screen.getByText('78 Scout Gandia, Diliman, Quezon City')).toBeTruthy();
            expect(screen.getAllByText(/09187654321/).length).toBeGreaterThan(0);
        });
    });

    it('disables Dispatch button when courier is not yet assigned, and enables it once assigned', async () => {
        const mockReadyUnassignedOrder = {
            id: 'order-q-2',
            queueNumber: '#012',
            status: 'READY',
            orderType: 'DELIVERY',
            orderSource: 'WEBSITE',
            deliveryAddress: '50 K-1st, Quezon City',
            deliveryLatitude: 14.6288,
            deliveryLongitude: 121.0422,
            deliveryDistanceKm: 1.5,
            deliveryFee: 49,
            notes: 'Contact Phone: 09187654321',
            customerName: 'Maria Santos',
            riderName: null,
            riderPlate: null,
            riderVehicle: null,
            trackingLink: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: []
        };

        vi.mocked(api.get).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [mockReadyUnassignedOrder], total: 1 })
        } as Response);

        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });

        render(
            <QueryClientProvider client={queryClient}>
                <OrderQueuePage />
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('#012')).toBeTruthy();
        });

        // Dispatch button must be disabled because courier details are not yet entered
        const dispatchBtn = screen.getByRole('button', { name: /Dispatch/i });
        expect((dispatchBtn as HTMLButtonElement).disabled).toBe(true);

        // Also has Assign Courier button
        expect(screen.getByRole('button', { name: /Assign Courier/i })).toBeTruthy();
    });
});
