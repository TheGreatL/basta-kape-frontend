// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CategoryTab from './tabs/category-tab';
import * as api from '#/api/product-settings';

vi.mock('#/api/product-settings', () => ({
    getCategoriesList: vi.fn(),
    getProductTypesList: vi.fn(),
    restoreCategory: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn()
}));

vi.mock('#/components/rbac/require-permission.tsx', () => ({
    RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('CategoryTab Pagination and Search', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('triggers onPaginationChange to page 2 when Next page button is clicked and does NOT reset page via onSearchChange', async () => {
        const mockCategoriesPage1 = {
            data: Array.from({ length: 10 }, (_, i) => ({
                id: `cat-${i + 1}`,
                name: `Category ${i + 1}`,
                description: `Description ${i + 1}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null,
                type: { id: 'type-1', name: 'Coffee' }
            })),
            meta: {
                totalRows: 25,
                page: 1,
                pageSize: 10,
                pageCount: 3
            }
        };

        vi.mocked(api.getCategoriesList).mockResolvedValue(mockCategoriesPage1 as any);
        vi.mocked(api.getProductTypesList).mockResolvedValue({ data: [] } as any);

        const onPaginationChange = vi.fn();
        const onSearchChange = vi.fn();
        const onStatusChange = vi.fn();

        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });

        render(
            <QueryClientProvider client={queryClient}>
                <CategoryTab
                    page={1}
                    pageSize={10}
                    search=""
                    status="active"
                    onPaginationChange={onPaginationChange}
                    onSearchChange={onSearchChange}
                    onStatusChange={onStatusChange}
                />
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('Category 1')).toBeTruthy();
        });

        // Search shouldn't be called on mount
        expect(onSearchChange).not.toHaveBeenCalled();

        // Click Next Page button
        const nextPageBtn = screen.getByRole('button', { name: /Go to next page/i });
        expect((nextPageBtn as HTMLButtonElement).disabled).toBe(false);
        fireEvent.click(nextPageBtn);

        // onPaginationChange must be called with page 2
        expect(onPaginationChange).toHaveBeenCalledWith(2, 10);
        // onSearchChange must still NOT have been called
        expect(onSearchChange).not.toHaveBeenCalled();
    });
});
