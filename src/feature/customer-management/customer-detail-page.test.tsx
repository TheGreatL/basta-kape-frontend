// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerDetailPage from './customer-detail-page';
import * as customerApi from '#/api/customer.api';
import * as authContext from '#/context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: 'testuser' }),
    createFileRoute: () => () => ({ useParams: () => ({ slug: 'testuser' }) })
}));

const mockCustomerData = {
    id: 'cust-123',
    userId: 'user-123',
    deliveryAddress: 'Old Address 123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    user: {
        id: 'user-123',
        email: 'john@example.com',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        middleName: '',
        phoneNumber: '09171234567',
        profilePhoto: null
    }
};

vi.mock('#/api/customer.api', () => ({
    getCustomerById: vi.fn(),
    updateCustomer: vi.fn().mockResolvedValue({ user: { username: 'testuser' } }),
    adminResetCustomerPassword: vi.fn()
}));

describe('CustomerDetailPage - Delivery Address', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        vi.clearAllMocks();
        vi.spyOn(customerApi, 'getCustomerById').mockResolvedValue(mockCustomerData as any);
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: {
                roles: [
                    {
                        id: 'r1',
                        name: 'Administrator',
                        permissions: [{ id: 'p1', module: 'Customers Management', permission: 'update' }]
                    }
                ]
            } as any,
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
            setUser: vi.fn()
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('populates existing delivery address and submits updated address', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <CustomerDetailPage />
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Old Address 123')).toBeDefined();
        });

        const addressInput = screen.getByLabelText(/Delivery Address/i);
        fireEvent.change(addressInput, { target: { value: 'Updated 456 New Street, QC' } });

        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(customerApi.updateCustomer).toHaveBeenCalledWith(
                'cust-123',
                expect.objectContaining({
                    deliveryAddress: 'Updated 456 New Street, QC'
                })
            );
        });
    });

    it('disables delivery address when user lacks update permission', async () => {
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: { roles: [] } as any,
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
            setUser: vi.fn()
        });

        render(
            <QueryClientProvider client={queryClient}>
                <CustomerDetailPage />
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Old Address 123')).toBeDefined();
        });

        const addressInput = screen.getByLabelText(/Delivery Address/i);
        expect(addressInput.hasAttribute('disabled')).toBe(true);
    });
});
