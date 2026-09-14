import type { IPaginationParams, IUserAudit } from '#/types/base.types';

export interface IGetSuppliersListParams extends IPaginationParams {
    search?: string;
    status?: 'active' | 'archive';
}

export interface ISupplierIngredientItemInput {
    ingredientId: string;
    unitCost?: number;
}

export interface ISupplierIngredient {
    id: string;
    supplierId: string;
    ingredientId: string;
    unitCost?: number | null;
    ingredient?: {
        id: string;
        name: string;
        description?: string | null;
        type: string;
        reorderPoint: number;
        defaultUnit?: {
            id: string;
            name: string;
            abbreviation: string | null;
        } | null;
    };
    createdAt?: string;
    updatedAt?: string;
}

export interface ISupplierListItem {
    id: string;
    name: string;
    address: string | null;
    contactPerson: string | null;
    contactNumber: string | null;
    notes: string | null;
    ingredients?: ISupplierIngredient[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    createdBy?: IUserAudit;
    updatedBy?: IUserAudit;
}

export interface ICreateSupplierPayload {
    name: string;
    address?: string | null;
    contactPerson?: string | null;
    contactNumber?: string | null;
    notes?: string | null;
    ingredients?: ISupplierIngredientItemInput[];
    ingredientIds?: string[];
}

export interface IUpdateSupplierPayload {
    name?: string;
    address?: string | null;
    contactPerson?: string | null;
    contactNumber?: string | null;
    notes?: string | null;
    ingredients?: ISupplierIngredientItemInput[];
    ingredientIds?: string[];
}

export interface SuppliersTabProps {
    page: number;
    pageSize: number;
    search: string;
    status: 'active' | 'archive';
    onPaginationChange: (page: number, pageSize: number) => void;
    onSearchChange: (search: string) => void;
    onStatusChange: (status: 'active' | 'archive') => void;
}
