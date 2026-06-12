export interface IRegisterShift {
    id: string;
    cashierId: string;
    openedAt: string;
    closedAt: string | null;
    startBalance: number;
    endBalance: number | null;
    actualBalance: number | null;
    notes: string | null;
    cashier?: {
        id: string;
        username: string;
        firstName: string;
        lastName: string;
    };
}

export interface IOpenShift {
    startBalance: number;
    notes?: string | null;
}

export interface ICloseShift {
    actualBalance: number;
    notes?: string | null;
}

export interface IGetRegisterShiftsParams {
    page?: number;
    limit?: number;
    search?: string;
}
