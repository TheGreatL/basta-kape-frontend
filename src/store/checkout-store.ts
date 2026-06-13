import { create } from 'zustand';

interface CheckoutState {
    checkoutItemIds: string[];
    isCheckoutAllowed: boolean;
    selectedModifiers: Record<string, { ids: string[]; price: number; names: string[] } | undefined>;
    setCheckoutState: (
        itemIds: string[],
        allowed: boolean,
        selectedModifiers?: Record<string, { ids: string[]; price: number; names: string[] } | undefined>
    ) => void;
    clearCheckoutState: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
    checkoutItemIds: [],
    isCheckoutAllowed: false,
    selectedModifiers: {},
    setCheckoutState: (itemIds, allowed, selectedModifiers = {}) => set({ checkoutItemIds: itemIds, isCheckoutAllowed: allowed, selectedModifiers }),
    clearCheckoutState: () => set({ checkoutItemIds: [], isCheckoutAllowed: false, selectedModifiers: {} })
}));
