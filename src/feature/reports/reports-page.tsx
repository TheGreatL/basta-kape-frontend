import * as React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { AlertTriangle, FileBarChart, FileSpreadsheet, FileText, Calendar, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Route } from '#/routes/admin/reports';
import { exportReport, getReportModules, previewReport } from '#/api/reports.api.ts';
import { getVoidLogs } from '#/api/orders.api.ts';
import { useAuthStore } from '#/store/auth-store.ts';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { appModules, appPermissions } from '#/constants/rbac.ts';
import type { TAppModule } from '#/constants/rbac.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IReportColumn, IReportModuleDefinition, ReportExportFormat, ReportFilters, ReportModule, ReportRow } from './reports.types';
import ReportFiltersBar, { buildReportFilters } from './components/report-filters.tsx';
import DataTable from '#/components/data-table/data-table.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';
import { cn } from '#/lib/utils.ts';
import { format as formatDate } from 'date-fns';
import { CopyButton } from '#/components/ui/copy-button.tsx';

const EXPORT_ROW_LIMIT = 5000;

function filtersAreEqual(left: ReportFilters, right: ReportFilters) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function buildColumns(columns: IReportColumn[]): ColumnDef<ReportRow>[] {
    return columns.map((column) => ({
        id: column.key,
        accessorKey: column.key,
        header: column.header,
        enableSorting: false,
        cell: ({ row }) => {
            const value = row.original[column.key];
            const displayValue = value === null ? '' : String(value);

            return (
                <span
                    className={cn(
                        'text-xs font-medium text-foreground/90 block whitespace-pre-wrap',
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center'
                    )}
                >
                    {displayValue}
                </span>
            );
        }
    }));
}

function VoidLogsAuditView() {
    const [search, setSearch] = React.useState('');
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [{ pageIndex, pageSize }, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10
    });

    const { data: voidLogsData, isLoading } = useQuery({
        queryKey: [QUERY_KEY.ORDERS.VOID_LOGS],
        queryFn: getVoidLogs
    });

    const list = voidLogsData ?? [];

    const filtered = React.useMemo(() => {
        if (!search) return list;
        const q = search.toLowerCase();
        return list.filter((log: any) => {
            const name = `${log.voidedBy?.firstName ?? ''} ${log.voidedBy?.lastName ?? ''}`.toLowerCase();
            const queue = (log.order?.queueNumber ?? '').toLowerCase();
            const reason = (log.reason ?? '').toLowerCase();
            return queue.includes(q) || name.includes(q) || reason.includes(q);
        });
    }, [list, search]);

    const columns = React.useMemo<ColumnDef<any>[]>(
        () => [
            {
                accessorKey: 'createdAt',
                header: 'Date & Time',
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        {formatDate(new Date(row.original.createdAt), 'MMM dd, yyyy - hh:mm a')}
                    </span>
                )
            },
            {
                accessorKey: 'order.queueNumber',
                header: 'Order Queue No.',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-foreground">{row.original.order?.queueNumber || '#N/A'}</span>
                        {row.original.order?.queueNumber && (
                            <CopyButton
                                value={row.original.order.queueNumber}
                                description={`Queue number #${row.original.order.queueNumber} copied`}
                            />
                        )}
                    </div>
                )
            },
            {
                accessorKey: 'order.netTotal',
                header: 'Order Amount',
                cell: ({ row }) => (
                    <span className="font-bold text-foreground/90">
                        ₱{(row.original.order?.netTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                )
            },
            {
                id: 'authorizedBy',
                header: 'Authorized By',
                cell: ({ row }) => (
                    <span className="font-semibold text-foreground/90">
                        {row.original.voidedBy?.firstName} {row.original.voidedBy?.lastName} (@{row.original.voidedBy?.username})
                    </span>
                )
            },
            {
                accessorKey: 'reason',
                header: 'Stated Reason',
                cell: ({ row }) => <span className="italic text-muted-foreground font-medium whitespace-pre-wrap">{row.original.reason}</span>
            }
        ],
        []
    );

    const pageCount = Math.ceil(filtered.length / pageSize) || 1;
    const paginatedData = React.useMemo(() => {
        const start = pageIndex * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, pageIndex, pageSize]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-foreground">Void Logs Audit Trail</h2>
                    <p className="text-xs text-muted-foreground">Detailed audit log tracking of supervisor/manager-authorized void overrides.</p>
                </div>

                <div className="relative w-full sm:w-[240px]">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search by queue, supervisor, or reason..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 pl-8.5 bg-background/50 text-xs"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/20 p-4">
                <DataTable
                    columns={columns}
                    data={paginatedData}
                    pageCount={pageCount}
                    pageIndex={pageIndex}
                    pageSize={pageSize}
                    onPaginationChange={(idx, size) => setPagination({ pageIndex: idx, pageSize: size })}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    showColumnVisibilityToggle={true}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}

export default function ReportsPage() {
    const navigate = useNavigate({ from: '/admin/reports' });
    const searchParams = Route.useSearch();
    const { module: selectedModuleId, page, pageSize } = searchParams;

    const user = useAuthStore((state) => state.user);
    const permissions = React.useMemo(() => getUserPermissions(user), [user]);
    const canReadOrders = React.useMemo(() => hasPermission(permissions, appModules.ORDERS_MANAGEMENT, appPermissions.READ), [permissions]);

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [previewToken, setPreviewToken] = React.useState(0);
    const [appliedModule, setAppliedModule] = React.useState<ReportModule | null>(null);
    const [appliedFilters, setAppliedFilters] = React.useState<ReportFilters | null>(null);

    const setSearchParams = React.useCallback(
        (updates: Record<string, unknown>) => {
            navigate({
                search: (prev) => ({ ...prev, ...updates })
            });
        },
        [navigate]
    );

    const { data: modulesData, isLoading: isModulesLoading } = useQuery({
        queryKey: [QUERY_KEY.REPORTS.MODULES],
        queryFn: getReportModules
    });

    const rawModules = React.useMemo<IReportModuleDefinition[]>(() => modulesData?.data ?? [], [modulesData]);
    const modules = React.useMemo<IReportModuleDefinition[]>(() => {
        return rawModules.filter(
            (module) =>
                hasPermission(permissions, module.sourceModule as TAppModule, appPermissions.READ) ||
                hasPermission(permissions, appModules.REPORTS_MANAGEMENT, appPermissions.READ)
        );
    }, [rawModules, permissions]);
    const activeModule = (modules.find((module) => module.id === (selectedModuleId as ReportModule)) ?? modules[0]) as IReportModuleDefinition | null;

    React.useEffect(() => {
        const allowedModules = modules.map((m) => m.id as string);
        if (canReadOrders) {
            allowedModules.push('void-logs-audit');
        }

        if (!allowedModules.length) {
            return;
        }

        const isValidModule = allowedModules.includes(selectedModuleId || '');
        if (!isValidModule) {
            setSearchParams({ module: allowedModules[0], page: 1 });
        }
    }, [modules, selectedModuleId, setSearchParams, canReadOrders]);

    const currentFilters = React.useMemo(() => buildReportFilters(searchParams), [searchParams]);
    const filtersChangedSincePreview =
        appliedFilters !== null && appliedModule !== null && (!filtersAreEqual(currentFilters, appliedFilters) || activeModule?.id !== appliedModule);

    const {
        data: previewData,
        isLoading: isPreviewLoading,
        isFetching: isPreviewFetching,
        error: previewError
    } = useQuery({
        queryKey: [QUERY_KEY.REPORTS.PREVIEW, previewToken, appliedModule, appliedFilters, page, pageSize],
        queryFn: () =>
            previewReport({
                module: appliedModule as ReportModule,
                filters: appliedFilters ?? {},
                page,
                limit: pageSize
            }),
        enabled: previewToken > 0 && appliedModule !== null && appliedFilters !== null
    });

    const exportMutation = useMutation({
        mutationFn: (format: ReportExportFormat) => {
            if (!activeModule) {
                throw new Error('No report module selected');
            }

            return exportReport({
                module: activeModule.id,
                filters: currentFilters,
                format,
                title: `${activeModule.label} Report`
            });
        },
        onSuccess: (_, format) => {
            toast.success(`Report exported as ${format === 'excel' ? 'Excel' : 'PDF'}`);
        },
        onError: (error) => {
            toast.error('Failed to export report', {
                description: getErrorMessage(error)
            });
        }
    });

    const handleModuleChange = (moduleId: string) => {
        setPreviewToken(0);
        setAppliedModule(null);
        setAppliedFilters(null);
        setSearchParams({
            module: moduleId,
            page: 1,
            search: '',
            status: 'active',
            dateFrom: '',
            dateTo: '',
            productCategoryId: '',
            productTypeId: '',
            inventoryStatus: '',
            orderStatus: '',
            orderType: ''
        });
    };

    const handlePreview = () => {
        if (!activeModule) {
            return;
        }

        setAppliedModule(activeModule.id);
        setAppliedFilters(currentFilters);
        setPreviewToken((token) => token + 1);
        setSearchParams({ page: 1 });
    };

    const columns = React.useMemo(
        () => buildColumns(previewData?.columns ?? activeModule?.columns ?? []),
        [previewData?.columns, activeModule?.columns]
    );

    const showTruncationWarning = (previewData?.meta.total ?? 0) > EXPORT_ROW_LIMIT;
    const canExport = previewToken > 0 && !filtersChangedSincePreview && Boolean(previewData);

    if (isModulesLoading) {
        return (
            <div className="flex min-h-[320px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Spinner className="h-7 w-7 text-primary" />
                    <p className="text-sm text-muted-foreground">Loading report modules...</p>
                </div>
            </div>
        );
    }

    const hasAnyAccess = modules.length > 0 || canReadOrders;

    if (!hasAnyAccess) {
        return (
            <div className="flex min-h-[320px] items-center justify-center">
                <p className="text-sm text-muted-foreground">No report modules are available.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <FileBarChart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
                        <p className="text-xs text-muted-foreground">
                            Preview filtered datasets and export them as Excel or PDF for auditing and operations.
                        </p>
                    </div>
                </div>
            </div>

            <Tabs value={selectedModuleId || (modules[0]?.id ?? (canReadOrders ? 'void-logs-audit' : ''))} onValueChange={handleModuleChange}>
                <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
                    {modules.map((module: IReportModuleDefinition) => (
                        <TabsTrigger key={module.id} value={module.id} className="text-xs sm:text-sm">
                            {module.label}
                        </TabsTrigger>
                    ))}
                    <RequirePermission module={appModules.ORDERS_MANAGEMENT} action={appPermissions.READ}>
                        <TabsTrigger value="void-logs-audit" className="text-xs sm:text-sm">
                            Void Logs Audit
                        </TabsTrigger>
                    </RequirePermission>
                </TabsList>

                <RequirePermission module={appModules.ORDERS_MANAGEMENT} action={appPermissions.READ}>
                    <TabsContent value="void-logs-audit" className="mt-4 space-y-4">
                        <VoidLogsAuditView />
                    </TabsContent>
                </RequirePermission>

                {modules.map((module) => (
                    <TabsContent key={module.id} value={module.id} className="mt-4 space-y-4">
                        <ReportFiltersBar
                            moduleDefinition={module}
                            searchParams={searchParams}
                            onSearchParamsChange={setSearchParams}
                            onPreview={handlePreview}
                            isPreviewLoading={isPreviewLoading || isPreviewFetching}
                        />

                        {filtersChangedSincePreview && (
                            <Alert>
                                <AlertTriangle className="text-amber-500" />
                                <AlertTitle>Filters changed</AlertTitle>
                                <AlertDescription>
                                    Your filters no longer match the last preview. Click Preview Report to refresh the table before exporting.
                                </AlertDescription>
                            </Alert>
                        )}

                        {showTruncationWarning && (
                            <Alert>
                                <AlertTriangle className="text-amber-500" />
                                <AlertTitle>Export limit reached</AlertTitle>
                                <AlertDescription>
                                    This report has {previewData?.meta.total.toLocaleString()} matching records. Exports include up to{' '}
                                    {EXPORT_ROW_LIMIT.toLocaleString()} rows only.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/20 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-semibold text-foreground">{previewData?.title ?? module.label}</h2>
                                        <Badge variant="secondary" className="text-xs">
                                            {module.sourceModule}
                                        </Badge>
                                    </div>
                                    {previewData?.meta && (
                                        <p className="text-xs text-muted-foreground">
                                            {previewData.meta.total.toLocaleString()} record{previewData.meta.total === 1 ? '' : 's'}
                                            {previewData.meta.generatedAt
                                                ? ` · Generated ${new Date(previewData.meta.generatedAt).toLocaleString('en-PH')}`
                                                : ''}
                                        </p>
                                    )}
                                </div>

                                <RequirePermission module={appModules.REPORTS_MANAGEMENT} action={appPermissions.READ}>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9"
                                            disabled={!canExport || exportMutation.isPending}
                                            onClick={() => exportMutation.mutate('excel')}
                                        >
                                            <FileSpreadsheet className="size-4 mr-2" />
                                            Export Excel
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9"
                                            disabled={!canExport || exportMutation.isPending}
                                            onClick={() => exportMutation.mutate('pdf')}
                                        >
                                            <FileText className="size-4 mr-2" />
                                            Export PDF
                                        </Button>
                                    </div>
                                </RequirePermission>
                            </div>

                            {previewError ? (
                                <Alert variant="destructive">
                                    <AlertTitle>Preview failed</AlertTitle>
                                    <AlertDescription>{getErrorMessage(previewError)}</AlertDescription>
                                </Alert>
                            ) : previewToken === 0 ? (
                                <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/10">
                                    <div className="max-w-md text-center space-y-2 px-4">
                                        <FileBarChart className="mx-auto h-8 w-8 text-muted-foreground/70" />
                                        <p className="text-sm font-medium text-foreground">No preview yet</p>
                                        <p className="text-xs text-muted-foreground">
                                            Configure the filters above, then click Preview Report to load the table.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <DataTable
                                    columns={columns}
                                    data={previewData?.rows ?? []}
                                    pageCount={previewData?.meta.pageCount || 1}
                                    pageIndex={page - 1}
                                    pageSize={pageSize}
                                    onPaginationChange={(idx, size) => setSearchParams({ page: idx + 1, pageSize: size })}
                                    sorting={sorting}
                                    onSortingChange={setSorting}
                                    showColumnVisibilityToggle={true}
                                    isLoading={isPreviewLoading || isPreviewFetching}
                                />
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
