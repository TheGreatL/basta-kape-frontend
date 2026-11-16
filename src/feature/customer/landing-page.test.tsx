// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LandingPage from './landing-page';
import * as menuApi from '#/api/menu.api';
import * as storeSettingsApi from '#/api/store-settings.api';

vi.mock('@tanstack/react-router', () => ({
    Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
        <a href={to} className={className}>
            {children}
        </a>
    )
}));

vi.mock('#/api/menu.api', () => ({
    getBestSellingProducts: vi.fn(),
    getMenuTypes: vi.fn(),
    getMenuCategories: vi.fn(),
    getMenuCatalog: vi.fn(),
    getMenuProductById: vi.fn()
}));

vi.mock('#/api/store-settings.api', () => ({
    getStoreSettings: vi.fn()
}));

describe('Customer LandingPage Revamp', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders editorial hero, counter directory, best sellers, craft standards, order steps, store ledger, and CTA', async () => {
        vi.mocked(storeSettingsApi.getStoreSettings).mockResolvedValue({
            id: 'store-1',
            storeName: 'Basta Kape Specialty',
            address: '50 K-1st, Quezon City, Metro Manila',
            contactNumber: '0917-123-4567',
            openingTime: '07:00',
            closingTime: '21:00',
            vatRate: 12,
            serviceCharge: 0,
            updatedAt: new Date().toISOString()
        });

        vi.mocked(menuApi.getMenuTypes).mockResolvedValue([
            {
                id: 'type-espresso',
                name: 'Espresso Classics',
                description: 'Handcrafted hot and iced espresso beverages',
                categories: [{ id: 'cat-1', name: 'Latte' }]
            },
            {
                id: 'type-pastry',
                name: 'Artisanal Pastries',
                description: 'Freshly baked croissants and loaves',
                categories: []
            }
        ] as any);

        vi.mocked(menuApi.getBestSellingProducts).mockResolvedValue([
            {
                id: 'prod-1',
                name: 'Sea Salt Spanish Latte',
                description: 'Rich double shot espresso with sweetened milk and sea salt foam',
                photo: null,
                category: { id: 'cat-1', name: 'Signature Coffee' },
                type: { id: 'type-espresso', name: 'Coffee' },
                variants: [{ id: 'var-1', name: '12oz', price: 145 }]
            }
        ] as any);

        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false }
            }
        });

        render(
            <QueryClientProvider client={queryClient}>
                <LandingPage />
            </QueryClientProvider>
        );

        // 1. Editorial Hero Section
        expect(screen.getByText(/Good coffee, roasted with care/i)).toBeDefined();
        expect(screen.getByText(/Order From the Menu/i)).toBeDefined();

        // 2. Wait for async data: Categories & Best Sellers
        await waitFor(() => {
            expect(screen.getByText('Espresso Classics')).toBeDefined();
            expect(screen.getByText('Artisanal Pastries')).toBeDefined();
            expect(screen.getAllByText('Sea Salt Spanish Latte').length).toBeGreaterThan(0);
        });

        // 3. Craft Standards Ledger
        expect(screen.getByText('Single-Origin Precision')).toBeDefined();
        expect(screen.getByText('Crafted To Your Taste')).toBeDefined();
        expect(screen.getByText('Honest Menu Availability')).toBeDefined();

        // 4. How It Works Timeline
        expect(screen.getByText('Order In 3 Simple Steps')).toBeDefined();
        expect(screen.getByText('Browse & Personalize')).toBeDefined();
        expect(screen.getByText('Pickup or Book Your Courier')).toBeDefined();

        // 5. Store Info Ledger & Directions
        expect(screen.getAllByText('50 K-1st, Quezon City, Metro Manila').length).toBeGreaterThan(0);
        expect(screen.getByText('Get Directions')).toBeDefined();
        expect(screen.getByText('0917-123-4567')).toBeDefined();

        // 6. Bottom CTA Bar
        expect(screen.getByText(/Browse Full Menu & Order/i)).toBeDefined();
    });
});
