export interface IStoreSetting {
    id: string;
    storeName: string;
    address: string;
    contactNumber: string | null;
    openingTime: string;
    closingTime: string;
    vatRate: number;
    serviceCharge: number;
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
}

export interface IUpdateStoreSetting {
    storeName?: string;
    address?: string;
    contactNumber?: string | null;
    openingTime?: string;
    closingTime?: string;
    vatRate?: number;
    serviceCharge?: number;
}
