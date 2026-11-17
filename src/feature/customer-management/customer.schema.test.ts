import { describe, it, expect } from 'vitest';
import { createCustomerSchema, updateCustomerSchema } from './customer.schema';

describe('Customer Management Schemas - deliveryAddress', () => {
    it('accepts valid deliveryAddress in createCustomerSchema', () => {
        const result = createCustomerSchema.safeParse({
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'First',
            lastName: 'Last',
            deliveryAddress: 'Unit 4B, 123 Main St, Quezon City'
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.deliveryAddress).toBe('Unit 4B, 123 Main St, Quezon City');
        }
    });

    it('allows omitting deliveryAddress in createCustomerSchema', () => {
        const result = createCustomerSchema.safeParse({
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'First',
            lastName: 'Last'
        });
        expect(result.success).toBe(true);
    });

    it('rejects deliveryAddress exceeding 1000 characters', () => {
        const result = createCustomerSchema.safeParse({
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'First',
            lastName: 'Last',
            deliveryAddress: 'A'.repeat(1001)
        });
        expect(result.success).toBe(false);
    });

    it('accepts deliveryAddress in updateCustomerSchema', () => {
        const result = updateCustomerSchema.safeParse({
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'First',
            lastName: 'Last',
            middleName: '',
            phoneNumber: '',
            deliveryAddress: 'New Address'
        });
        expect(result.success).toBe(true);
    });
});
