// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfilePage from './profile-page';
import * as customerApi from '#/api/customer.api';
import * as authContext from '#/context/AuthContext';
import * as currentCustomerHook from './use-current-customer';

vi.mock('@tanstack/react-router', () => ({
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>
}));

vi.mock('#/feature/auth/components/change-password-form.tsx', () => ({
    default: () => <div data-testid="change-password-form" />
}));

vi.mock('#/api/customer.api', () => ({
    updateCustomer: vi.fn().mockResolvedValue({})
}));

describe('ProfilePage - Delivery Address', () => {
    let queryClient: QueryClient;

    const mockCustomer = {
        id: 'cust-abc',
        userId: 'user-abc',
        deliveryAddress: 'Tower 1 Unit 808, Cyberpark, Cubao, QC',
        createdAt: new Date().toISOString(),
        user: {
            id: 'user-abc',
            firstName: 'Maria',
            lastName: 'Clara',
            middleName: '',
            phoneNumber: '09181234567',
            email: 'maria@example.com',
            username: 'mariaclara'
        }
    };

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        vi.clearAllMocks();
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
            user: mockCustomer.user as any,
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
            setUser: vi.fn()
        });
        vi.spyOn(currentCustomerHook, 'useCurrentCustomer').mockReturnValue({
            data: mockCustomer as any,
            isLoading: false
        } as any);
    });

    afterEach(() => {
        cleanup();
    });

    it('renders customer delivery address on profile card and updates address on form submission', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <ProfilePage />
            </QueryClientProvider>
        );

        // Address visible on profile card
        expect(screen.getAllByText(/Tower 1 Unit 808, Cyberpark, Cubao, QC/i).length).toBeGreaterThan(0);

        // Edit address in form
        const addressTextarea = screen.getByLabelText(/Default Delivery Address/i);
        fireEvent.change(addressTextarea, { target: { value: 'Unit 999, Greenbelt Tower, Makati' } });

        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(customerApi.updateCustomer).toHaveBeenCalledWith(
                'cust-abc',
                expect.objectContaining({
                    deliveryAddress: 'Unit 999, Greenbelt Tower, Makati'
                })
            );
        });
    });
});
