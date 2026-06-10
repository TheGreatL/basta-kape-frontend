export type ReportModule =
    | 'products'
    | 'inventory-ingredients'
    | 'inventory-levels'
    | 'inventory-deliveries'
    | 'inventory-adjustments'
    | 'customers'
    | 'suppliers'
    | 'activity-logs'
    | 'orders';

export type ReportExportFormat = 'excel' | 'pdf';

export type ReportFilters = {
    search?: string;
    status?: 'active' | 'archive';
    dateFrom?: string;
    dateTo?: string;
    productCategoryId?: string;
    productTypeId?: string;
    inventoryStatus?: 'SAFE' | 'CRITICAL' | 'OUT_OF_STOCK';
    orderStatus?: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    orderType?: 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY';
};

export type ReportFilterType = 'text' | 'select' | 'date';

export interface IReportFilterOption {
    value: string;
    label: string;
}

export interface IReportFilterField {
    key: string;
    label: string;
    type: ReportFilterType;
    options?: IReportFilterOption[];
}

export interface IReportColumn {
    key: string;
    header: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
}

export interface IReportModuleDefinition {
    id: ReportModule;
    label: string;
    description: string;
    sourceModule: string;
    filters: IReportFilterField[];
    columns: IReportColumn[];
}

export interface IReportModulesResponse {
    data: IReportModuleDefinition[];
}

export type ReportRow = Record<string, string | number | null>;

export interface IReportPreviewMeta {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
    hasMore: boolean;
    generatedAt: string;
    filters: ReportFilters;
}

export interface IReportPreviewResponse {
    module: ReportModule;
    title: string;
    columns: IReportColumn[];
    rows: ReportRow[];
    meta: IReportPreviewMeta;
}

export interface IReportPreviewParams {
    module: ReportModule;
    filters?: ReportFilters;
    page?: number;
    limit?: number;
}

export interface IReportExportParams {
    module: ReportModule;
    filters?: ReportFilters;
    format: ReportExportFormat;
    title?: string;
}
