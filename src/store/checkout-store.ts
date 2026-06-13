import { create } from 'zustand';

export interface IDirectCheckoutItem {
    productVariantId: string;
    quantity: number;
    unitPrice: number;
    productVariant: {
        product: {
            name: string;
            photo?: string | null;
            category?: { name: string } | null;
        };
        attributes: {
            attributeValue: {
                value: string;
            };
        }[];
    };
    modifierOptionIds: string[];
    selectedModifiersInfo: {
        ids: string[];
        price: number;
        names: string[];
    };
}

interface CheckoutState {
    checkoutItemIds: string[];
    isCheckoutAllowed: boolean;
    selectedModifiers: Record<string, { ids: string[]; price: number; names: string[] } | undefined>;

    // Direct checkout fields
    isDirectCheckout: boolean;
    directCheckoutItem: IDirectCheckoutItem | null;

    setCheckoutState: (
        itemIds: string[],
        allowed: boolean,
        selectedModifiers?: Record<string, { ids: string[]; price: number; names: string[] } | undefined>
    ) => void;

    setDirectCheckoutState: (item: IDirectCheckoutItem, allowed: boolean) => void;

    clearCheckoutState: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
    checkoutItemIds: [],
    isCheckoutAllowed: false,
    selectedModifiers: {},
    isDirectCheckout: false,
    directCheckoutItem: null,
    setCheckoutState: (itemIds, allowed, selectedModifiers = {}) =>
        set({
            checkoutItemIds: itemIds,
            isCheckoutAllowed: allowed,
            selectedModifiers,
            isDirectCheckout: false,
            directCheckoutItem: null
        }),
    setDirectCheckoutState: (item, allowed) =>
        set({
            checkoutItemIds: [],
            isCheckoutAllowed: allowed,
            selectedModifiers: {},
            isDirectCheckout: true,
            directCheckoutItem: item
        }),
    clearCheckoutState: () =>
        set({
            checkoutItemIds: [],
            isCheckoutAllowed: false,
            selectedModifiers: {},
            isDirectCheckout: false,
            directCheckoutItem: null
        })
}));
