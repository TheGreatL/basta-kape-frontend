export interface IStoreSetting {
    id: string;
    storeName: string;
    address: string;
    contactNumber: string | null;
    openingTime: string;
    closingTime: string;
    vatRate: number;
    serviceCharge: number;
    deliveryBaseFare: number;
    deliveryBaseDistanceKm: number;
    deliveryRatePerKm: number;
    deliveryMaxDistanceKm: number;
    storeLatitude: number;
    storeLongitude: number;
    updatedAt: string;
}

export interface ICreateStoreSetting {
    storeName: string;
    address: string;
    contactNumber?: string | null;
    openingTime: string;
    closingTime: string;
    vatRate?: number;
    serviceCharge?: number;
    deliveryBaseFare?: number;
    deliveryBaseDistanceKm?: number;
    deliveryRatePerKm?: number;
    deliveryMaxDistanceKm?: number;
    storeLatitude?: number;
    storeLongitude?: number;
}

export interface IUpdateStoreSetting {
    storeName?: string;
    address?: string;
    contactNumber?: string | null;
    openingTime?: string;
    closingTime?: string;
    vatRate?: number;
    serviceCharge?: number;
    deliveryBaseFare?: number;
    deliveryBaseDistanceKm?: number;
    deliveryRatePerKm?: number;
    deliveryMaxDistanceKm?: number;
    storeLatitude?: number;
    storeLongitude?: number;
}
