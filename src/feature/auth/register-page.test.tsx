// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterPage from './register-page';
import * as authApi from '@/api/auth.api';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
    useRouter: () => ({ navigate: mockNavigate }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>
}));

vi.mock('@/hooks/use-store-settings', () => ({
    useStoreSettings: () => ({ storeName: 'Basta Kape' })
}));

vi.mock('@/assets/logo.png', () => ({
    default: 'logo.png'
}));

const mockRegister = vi.fn().mockResolvedValue({});
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        register: mockRegister
    })
}));

vi.mock('@/api/auth.api', () => ({
    sendOtp: vi.fn().mockResolvedValue({ otpCode: '123456' })
}));

beforeAll(() => {
    global.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    document.elementFromPoint = () => null;
});

describe('RegisterPage - Delivery Address', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        vi.clearAllMocks();
    });

    it('renders delivery address field on registration form and submits it upon verification', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <RegisterPage />
            </QueryClientProvider>
        );

        expect(screen.getByLabelText(/Delivery Address/i)).toBeDefined();

        fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Daniel' } });
        fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Padilla' } });
        fireEvent.change(screen.getByPlaceholderText('john.doe@example.com'), { target: { value: 'daniel@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('johndoe'), { target: { value: 'danielp' } });
        fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'Password123' } });
        fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'Password123' } });
        fireEvent.change(screen.getByPlaceholderText(/House\/Unit/i), {
            target: { value: 'Unit 707, Gilmore Tower, New Manila, Quezon City' }
        });

        // Submit form step (triggers OTP request)
        fireEvent.click(screen.getByRole('button', { name: /Continue to Verification/i }));

        await waitFor(() => {
            expect(authApi.sendOtp).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'daniel@example.com',
                    firstName: 'Daniel',
                    username: 'danielp',
                    type: 'register'
                })
            );
        });

        // OTP step is displayed
        await waitFor(() => {
            expect(screen.getByText(/Verify Your Email/i)).toBeDefined();
        });

        // Click auto-fill development code button
        fireEvent.click(screen.getByRole('button', { name: /Auto-Fill Code/i }));

        // Submit OTP verification
        fireEvent.click(screen.getByRole('button', { name: /Verify & Complete Registration/i }));

        await waitFor(() => {
            expect(mockRegister).toHaveBeenCalledWith(
                expect.objectContaining({
                    firstName: 'Daniel',
                    lastName: 'Padilla',
                    email: 'daniel@example.com',
                    username: 'danielp',
                    deliveryAddress: 'Unit 707, Gilmore Tower, New Manila, Quezon City',
                    otp: '123456'
                })
            );
        });
    });
});
