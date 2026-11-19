// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import EditVariantsTab from './edit-variants-tab';

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
        success: vi.fn()
    }
}));

vi.mock('#/api/product-settings.ts', () => ({
    getAttributeValuesList: vi.fn().mockResolvedValue({ data: [] })
}));

describe('EditVariantsTab - Advanced Variant Matrix Generator Price Validation', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false }
            }
        });
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    const defaultProps = {
        gridVariants: [],
        setGridVariants: vi.fn(),
        onSaveVariants: vi.fn(),
        isSaving: false,
        onOpenRecipe: vi.fn(),
        attributesData: {
            data: [{ id: 'attr-1', name: 'Size', status: 'active', createdAt: '', updatedAt: '' }]
        },
        activeAttributes: { 'attr-1': true },
        setActiveAttributes: vi.fn(),
        selectedValuesMap: {
            'attr-1': [
                { id: 'val-1', value: 'Regular' },
                { id: 'val-2', value: 'Large' }
            ]
        },
        setSelectedValuesMap: vi.fn(),
        defaultPrice: '',
        setDefaultPrice: vi.fn(),
        onGenerateMatrix: vi.fn(),
        bulkPriceInput: '',
        setBulkPriceInput: vi.fn(),
        onApplyBulkPrice: vi.fn()
    };

    const renderComponent = (props = {}) => {
        return render(
            <QueryClientProvider client={queryClient}>
                <EditVariantsTab {...defaultProps} {...props} />
            </QueryClientProvider>
        );
    };

    it('marks the price input as required with min="1" and step="1" and shows the required indicator', () => {
        renderComponent();

        const trigger = screen.getByText('Advanced Variant Matrix Generator');
        fireEvent.click(trigger);

        const priceLabel = screen.getByText(/Default Price/i);
        expect(priceLabel).toBeDefined();

        const input = screen.getByPlaceholderText('0.00');
        expect(input).toBeDefined();
        expect(input.hasAttribute('required')).toBe(true);
        expect(input.getAttribute('min')).toBe('1');
        expect(input.getAttribute('step')).toBe('1');
        expect(input.getAttribute('type')).toBe('number');
    });

    it('blocks matrix generation and shows error toast when price is empty', () => {
        const onGenerateMatrix = vi.fn();
        renderComponent({ defaultPrice: '', onGenerateMatrix });

        const trigger = screen.getByText('Advanced Variant Matrix Generator');
        fireEvent.click(trigger);

        const generateBtn = screen.getByRole('button', { name: /Generate Combinations/i });
        fireEvent.click(generateBtn);

        expect(onGenerateMatrix).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
            'Price Required',
            expect.objectContaining({
                description: expect.stringContaining('Please enter a default price')
            })
        );
    });

    it('blocks matrix generation, displays error message, and disables button when price is less than 0', () => {
        const onGenerateMatrix = vi.fn();
        renderComponent({ defaultPrice: '-5', onGenerateMatrix });

        const trigger = screen.getByText('Advanced Variant Matrix Generator');
        fireEvent.click(trigger);

        expect(screen.getByText('Price must be greater than 0')).toBeDefined();

        const generateBtn = screen.getByRole('button', { name: /Generate Combinations/i });
        expect(generateBtn.hasAttribute('disabled')).toBe(true);

        fireEvent.click(generateBtn);
        expect(onGenerateMatrix).not.toHaveBeenCalled();
    });

    it('blocks matrix generation, displays error message, and disables button when price is 0', () => {
        const onGenerateMatrix = vi.fn();
        renderComponent({ defaultPrice: '0', onGenerateMatrix });

        const trigger = screen.getByText('Advanced Variant Matrix Generator');
        fireEvent.click(trigger);

        expect(screen.getByText('Price must be greater than 0')).toBeDefined();

        const generateBtn = screen.getByRole('button', { name: /Generate Combinations/i });
        expect(generateBtn.hasAttribute('disabled')).toBe(true);

        fireEvent.click(generateBtn);
        expect(onGenerateMatrix).not.toHaveBeenCalled();
    });

    it('allows matrix generation when price is a positive number (e.g. 120)', () => {
        const onGenerateMatrix = vi.fn();
        renderComponent({ defaultPrice: '120', onGenerateMatrix });

        const trigger = screen.getByText('Advanced Variant Matrix Generator');
        fireEvent.click(trigger);

        expect(screen.queryByText('Price must be greater than 0')).toBeNull();

        const generateBtn = screen.getByRole('button', { name: /Generate Combinations/i });
        expect(generateBtn.hasAttribute('disabled')).toBe(false);

        fireEvent.click(generateBtn);
        expect(onGenerateMatrix).toHaveBeenCalledTimes(1);
    });

    it('disables Save Variants Matrix when any variant row has a price of 0 or below', () => {
        const onSaveVariants = vi.fn();
        renderComponent({
            onSaveVariants,
            gridVariants: [
                {
                    tempId: 'var-1',
                    sku: 'LATTE-REG',
                    price: 0,
                    attributeValueIds: ['val-1'],
                    attributeValueLabels: ['Regular'],
                    recipeConfigured: false
                }
            ]
        });

        expect(screen.getByText('Every variant must have a price greater than 0 before saving.')).toBeDefined();
        const saveBtn = screen.getByRole('button', { name: /Save Variants Matrix/i });
        expect(saveBtn.hasAttribute('disabled')).toBe(true);
    });

    it('triggers validation when pressing Enter inside the price input', () => {
        const onGenerateMatrix = vi.fn();
        renderComponent({ defaultPrice: '', onGenerateMatrix });

        const trigger = screen.getByText('Advanced Variant Matrix Generator');
        fireEvent.click(trigger);

        const input = screen.getByPlaceholderText('0.00');
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(onGenerateMatrix).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Price Required', expect.anything());
    });
});
