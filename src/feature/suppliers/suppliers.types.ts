import type { IPaginationParams } from '#/types/base.types';

export interface IGetSuppliersListParams extends IPaginationParams {
    search?: string;
    status?: 'active' | 'archive';
}

export interface ISupplierListItem {
    id: string;
    name: string;
    address: string | null;
    contactPerson: string | null;
    contactNumber: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ICreateSupplierPayload {
    name: string;
    address?: string | null;
    contactPerson?: string | null;
    contactNumber?: string | null;
    notes?: string | null;
}

export interface IUpdateSupplierPayload {
    name?: string;
    address?: string | null;
    contactPerson?: string | null;
    contactNumber?: string | null;
    notes?: string | null;
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
