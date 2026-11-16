// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransactionsPage from './transactions-page';
import * as transactionsApi from '#/api/transactions.api';
import * as ordersApi from '#/api/orders.api';

vi.mock('#/routes/admin/transactions.tsx', () => ({
    Route: {
        useSearch: () => ({
            page: 1,
            pageSize: 10,
            search: '',
            paymentMethod: undefined,
            paymentStatus: undefined,
            dateFrom: undefined,
            dateTo: undefined
        })
    }
}));

vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => vi.fn()
}));

vi.mock('#/api/transactions.api', async () => {
    const actual = await vi.importActual('#/api/transactions.api');
    return {
        ...actual,
        getTransactions: vi.fn(),
        updateTransactionReceipt: vi.fn(),
        uploadImageFile: vi.fn()
    };
});

vi.mock('#/api/orders.api', () => ({
    getOrderById: vi.fn()
}));

const mockTransactionWithItems: transactionsApi.ITransaction = {
    id: 'tx-1',
    orderId: 'order-1',
    paymentMethod: 'GCASH',
    paymentStatus: 'PAID',
    amount: 280,
    paymentReferenceNumber: '1234567890123',
    paymentProofPhoto: null,
    amountTendered: null,
    amountChange: null,
    createdAt: '2026-03-29T10:00:00Z',
    updatedAt: '2026-03-29T10:00:00Z',
    order: {
        id: 'order-1',
        queueNumber: '001',
        customerName: 'Juan Dela Cruz',
        netTotal: 280,
        status: 'COMPLETED',
        orderType: 'TAKE_OUT',
        orderSource: 'WEBSITE',
        cashierSessionId: null,
        referenceNumber: 'ORD-20260329-001',
        createdAt: '2026-03-29T10:00:00Z',
        items: [
            {
                id: 'item-1',
                productVariantId: 'var-1',
                quantity: 2,
                unitPrice: 120,
                totalPrice: 240,
                notes: 'Less ice',
                variant: {
                    id: 'var-1',
                    sku: 'ICED-LATTE-16',
                    price: 120,
                    product: {
                        id: 'prod-1',
                        name: 'Iced Latte',
                        photo: null,
                        description: null
                    },
                    attributes: [
                        {
                            id: 'attr-1',
                            attributeValue: {
                                value: '16oz',
                                attribute: { id: 'a1', name: 'Size' }
                            }
                        }
                    ]
                },
                modifiers: [
                    {
                        id: 'mod-1',
                        modifierOptionId: 'opt-1',
                        price: 20,
                        modifierOption: { id: 'opt-1', name: 'Extra Shot' }
                    }
                ]
            }
        ]
    }
};

const mockTransactionWithoutItems: transactionsApi.ITransaction = {
    id: 'tx-2',
    orderId: 'order-2',
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    amount: 150,
    paymentReferenceNumber: null,
    paymentProofPhoto: null,
    amountTendered: 200,
    amountChange: 50,
    createdAt: '2026-03-29T11:00:00Z',
    updatedAt: '2026-03-29T11:00:00Z',
    order: {
        id: 'order-2',
        queueNumber: '002',
        customerName: 'Maria Clara',
        netTotal: 150,
        status: 'COMPLETED',
        orderType: 'DINE_IN',
        orderSource: 'POS',
        cashierSessionId: 'sess-1',
        referenceNumber: 'ORD-20260329-002',
        createdAt: '2026-03-29T11:00:00Z'
    }
};

describe('TransactionsPage - Order Items in Transaction Details', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false }
            }
        });
        vi.clearAllMocks();
    });

    const renderComponent = () =>
        render(
            <QueryClientProvider client={queryClient}>
                <TransactionsPage />
            </QueryClientProvider>
        );

    it('displays order items when items are included directly in transaction response', async () => {
        vi.mocked(transactionsApi.getTransactions).mockResolvedValue({
            data: [mockTransactionWithItems],
            meta: { total: 1, page: 1, limit: 10, pageCount: 1, hasMore: false }
        });

        renderComponent();

        // Wait for table to load
        await waitFor(() => {
            expect(screen.getByText('Juan Dela Cruz')).toBeDefined();
        });

        // Click eye button to open inspection dialog
        const viewButton = screen.getByRole('button', { name: /Inspect Details/i });
        fireEvent.click(viewButton);

        // Verify Transaction Details Dialog is open
        expect(screen.getByText('Transaction Details')).toBeDefined();
        expect(screen.getByText(/Ordered Items/i)).toBeDefined();

        // Verify item details are displayed
        expect(screen.getByText('Iced Latte')).toBeDefined();
        expect(screen.getByText('x2')).toBeDefined();
        expect(screen.getByText('16oz')).toBeDefined();
        expect(screen.getByText('+Extra Shot (₱20.00)')).toBeDefined();
        expect(screen.getByText(/Note: "Less ice"/i)).toBeDefined();
        expect(screen.getByText('₱240.00')).toBeDefined();
    });

    it('falls back to fetching order details via getOrderById when items are not in transaction payload', async () => {
        vi.mocked(transactionsApi.getTransactions).mockResolvedValue({
            data: [mockTransactionWithoutItems],
            meta: { total: 1, page: 1, limit: 10, pageCount: 1, hasMore: false }
        });

        vi.mocked(ordersApi.getOrderById).mockResolvedValue({
            id: 'order-2',
            queueNumber: '002',
            status: 'COMPLETED',
            orderType: 'DINE_IN',
            orderSource: 'POS',
            subtotal: 150,
            taxAmount: 0,
            discountAmount: 0,
            netTotal: 150,
            paymentStatus: 'PAID',
            totalPaid: 150,
            createdAt: '2026-03-29T11:00:00Z',
            updatedAt: '2026-03-29T11:00:00Z',
            items: [
                {
                    id: 'item-2',
                    productVariantId: 'var-2',
                    quantity: 1,
                    unitPrice: 150,
                    totalPrice: 150,
                    variant: {
                        id: 'var-2',
                        sku: 'CAPPUCCINO',
                        price: 150,
                        product: {
                            id: 'prod-2',
                            name: 'Hot Cappuccino',
                            photo: null,
                            description: null
                        }
                    },
                    modifiers: []
                }
            ],
            payments: [],
            discounts: []
        } as any);

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Maria Clara')).toBeDefined();
        });

        const viewButton = screen.getByRole('button', { name: /Inspect Details/i });
        fireEvent.click(viewButton);

        // Verify fallback getOrderById was called
        await waitFor(() => {
            expect(ordersApi.getOrderById).toHaveBeenCalledWith('order-2');
            expect(screen.getByText('Hot Cappuccino')).toBeDefined();
            expect(screen.getByText('x1')).toBeDefined();
        });
    });
});
