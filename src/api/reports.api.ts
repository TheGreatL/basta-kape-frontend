import { api } from './api';
import { ApiError } from '../utils/error-handler';
import { downloadBlob, parseContentDispositionFilename } from '../utils/download';
import type { IReportExportParams, IReportModulesResponse, IReportPreviewParams, IReportPreviewResponse } from '../feature/reports/reports.types';
import { format } from 'date-fns';

export const getReportModules = async (): Promise<IReportModulesResponse> => {
    const response = await api.get('/reports/modules');
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch report modules', response.status, errorData);
    }
    return response.json();
};

export const previewReport = async (params: IReportPreviewParams): Promise<IReportPreviewResponse> => {
    const response = await api.post('/reports/preview', {
        module: params.module,
        filters: params.filters ?? {},
        page: params.page ?? 1,
        limit: params.limit ?? 20
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to preview report', response.status, errorData);
    }

    return response.json();
};

export const exportReport = async (params: IReportExportParams): Promise<void> => {
    const response = await api.post('/reports/export', {
        module: params.module,
        filters: params.filters ?? {},
        format: params.format,
        ...(params.title ? { title: params.title } : {})
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to export report', response.status, errorData);
    }

    const blob = await response.blob();
    const fallbackExt = params.format === 'excel' ? 'xlsx' : 'pdf';
    const today = format(new Date(), `MMM d, yyyy hh:mm a`);
    const filename =
        parseContentDispositionFilename(response.headers.get('Content-Disposition')) ?? `${params.module}-${today}-report.${fallbackExt}`;

    downloadBlob(blob, filename);
};

export const getSalesAnalytics = async (dateFrom?: string, dateTo?: string): Promise<any> => {
    const query = new URLSearchParams();
    if (dateFrom) query.append('dateFrom', dateFrom);
    if (dateTo) query.append('dateTo', dateTo);

    const response = await api.get(`/reports/sales-analytics?${query.toString()}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError('Failed to fetch sales analytics', response.status, errorData);
    }

    return response.json();
};
