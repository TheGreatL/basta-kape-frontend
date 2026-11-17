// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerCreatePage from './customer-create-page';
import * as customerApi from '#/api/customer.api';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => mockNavigate
}));

vi.mock('#/api/customer.api', () => ({
    createCustomer: vi.fn().mockResolvedValue({ id: 'new-cust-1', user: { username: 'testuser' } })
}));

describe('CustomerCreatePage - Delivery Address', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        vi.clearAllMocks();
    });

    it('renders delivery address field and submits it in create customer payload', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <CustomerCreatePage />
            </QueryClientProvider>
        );

        expect(screen.getByLabelText(/Delivery Address/i)).toBeDefined();

        fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Alice' } });
        fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Smith' } });
        fireEvent.change(screen.getByPlaceholderText('john.doe@gmail.com'), { target: { value: 'alice@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('johndoe'), { target: { value: 'alicesmith' } });
        fireEvent.change(screen.getByPlaceholderText(/House\/Unit/i), {
            target: { value: '123 Magnolia St, Diliman, Quezon City' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Create Customer Account/i }));

        await waitFor(() => {
            expect(customerApi.createCustomer).toHaveBeenCalledWith(
                expect.objectContaining({
                    firstName: 'Alice',
                    lastName: 'Smith',
                    email: 'alice@example.com',
                    username: 'alicesmith',
                    deliveryAddress: '123 Magnolia St, Diliman, Quezon City'
                }),
                expect.anything()
            );
        });
    });
});
