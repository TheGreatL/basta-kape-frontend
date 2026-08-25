import * as React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
    AlertTriangle,
    FileBarChart,
    FileSpreadsheet,
    FileText,
    Calendar,
    Search,
    TrendingUp,
    ShoppingBag,
    Ban,
    Package,
    Boxes,
    Truck,
    SlidersHorizontal,
    Coffee,
    Users,
    Building2,
    History,
    ChevronRight,
    X,
    Filter
} from 'lucide-react';
import { toast } from 'sonner';

import { Route } from '#/routes/admin/reports';
import { exportReport, getReportModules, previewReport } from '#/api/reports.api.ts';
import { getVoidLogs } from '#/api/orders.api.ts';
import { useAuth } from '#/context/AuthContext';
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { cn } from '#/lib/utils.ts';
import { format as formatDate } from 'date-fns';
import { CopyButton } from '#/components/ui/copy-button.tsx';

const EXPORT_ROW_LIMIT = 5000;

interface ReportCategoryGroup {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    moduleIds: string[];
}

const REPORT_CATEGORIES: ReportCategoryGroup[] = [
    {
        id: 'sales-revenue',
        name: 'Sales & Revenue',
        icon: TrendingUp,
        moduleIds: ['sales', 'orders', 'void-logs-audit']
    },
    {
        id: 'inventory',
        name: 'Inventory & Stock',
        icon: Package,
        moduleIds: ['inventory-ingredients', 'inventory-levels', 'inventory-deliveries', 'inventory-adjustments']
    },
    {
        id: 'directory-crm',
        name: 'Catalog & Directory',
        icon: Users,
        moduleIds: ['products', 'customers', 'suppliers']
    },
    {
        id: 'audit-security',
        name: 'Audit & Compliance',
        icon: History,
        moduleIds: ['activity-logs']
    }
];

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    sales: TrendingUp,
    orders: ShoppingBag,
    'void-logs-audit': Ban,
    'inventory-ingredients': Package,
    'inventory-levels': Boxes,
    'inventory-deliveries': Truck,
    'inventory-adjustments': SlidersHorizontal,
    products: Coffee,
    customers: Users,
    suppliers: Building2,
    'activity-logs': History
};

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
                                description={`Queue number ${row.original.order.queueNumber} copied`}
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
                    <h2 className="text-lg font-semibold text-foreground">Cancelled Orders History</h2>
                    <p className="text-xs text-muted-foreground">List of orders cancelled by supervisors or managers with reasons.</p>
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

    const { user } = useAuth();
    const permissions = React.useMemo(() => getUserPermissions(user), [user]);
    const canReadOrders = React.useMemo(() => hasPermission(permissions, appModules.ORDERS_MANAGEMENT, appPermissions.READ), [permissions]);

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [previewToken, setPreviewToken] = React.useState(0);
    const [appliedModule, setAppliedModule] = React.useState<ReportModule | null>(null);
    const [appliedFilters, setAppliedFilters] = React.useState<ReportFilters | null>(null);
    const [sidebarSearch, setSidebarSearch] = React.useState('');

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

    // Construct full list of selectable modules including void-logs-audit if permitted
    const allAvailableModuleItems = React.useMemo(() => {
        const items: Array<{ id: string; label: string; description: string; sourceModule: string; isAudit?: boolean }> = modules.map((m) => ({
            id: m.id,
            label: m.label,
            description: m.description,
            sourceModule: m.sourceModule,
            isAudit: false
        }));

        if (canReadOrders) {
            items.push({
                id: 'void-logs-audit',
                label: 'Cancelled Orders',
                description: 'Supervisory and manager void authorization audit trail.',
                sourceModule: 'Orders Management',
                isAudit: true
            });
        }

        return items;
    }, [modules, canReadOrders]);

    const currentActiveModuleId = selectedModuleId || (allAvailableModuleItems[0]?.id ?? '');
    const activeModule = modules.find((module) => module.id === currentActiveModuleId) ?? null;
    const isVoidLogsActive = currentActiveModuleId === 'void-logs-audit';

    React.useEffect(() => {
        if (!allAvailableModuleItems.length) {
            return;
        }

        const isValidModule = allAvailableModuleItems.some((item) => item.id === currentActiveModuleId);
        if (!isValidModule) {
            setSearchParams({ module: allAvailableModuleItems[0].id, page: 1 });
        }
    }, [allAvailableModuleItems, currentActiveModuleId, setSearchParams]);

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
        enabled: previewToken > 0 && appliedModule !== null && appliedFilters !== null && !isVoidLogsActive
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

    // Group available modules into categories for the sidebar
    const categorizedModules = React.useMemo(() => {
        const query = sidebarSearch.trim().toLowerCase();

        return REPORT_CATEGORIES.map((category) => {
            const items = category.moduleIds
                .map((id) => allAvailableModuleItems.find((item) => item.id === id))
                .filter((item): item is NonNullable<typeof item> => {
                    if (!item) return false;
                    if (!query) return true;
                    return (
                        item.label.toLowerCase().includes(query) ||
                        item.description.toLowerCase().includes(query) ||
                        category.name.toLowerCase().includes(query)
                    );
                });

            return {
                ...category,
                items
            };
        }).filter((category) => category.items.length > 0);
    }, [allAvailableModuleItems, sidebarSearch]);

    const activeItemMetadata = allAvailableModuleItems.find((item) => item.id === currentActiveModuleId);
    const ActiveIcon = MODULE_ICONS[currentActiveModuleId];

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

    const hasAnyAccess = allAvailableModuleItems.length > 0;

    if (!hasAnyAccess) {
        return (
            <div className="flex min-h-[320px] items-center justify-center">
                <p className="text-sm text-muted-foreground">No report modules are available for your authorization role.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <FileBarChart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Reports & Downloads</h1>
                        <p className="text-xs text-muted-foreground">View and download business reports in Excel or PDF files.</p>
                    </div>
                </div>
            </div>

            {/* Mobile / Tablet Categorized Dropdown Selector (< lg) */}
            <div className="block lg:hidden">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Filter className="size-3.5 text-primary" />
                        Selected Report Module
                    </label>
                    <Select value={currentActiveModuleId} onValueChange={handleModuleChange}>
                        <SelectTrigger className="h-10 w-full bg-card border-border/70 shadow-xs font-medium text-sm">
                            <SelectValue placeholder="Choose a report module..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[380px]">
                            {REPORT_CATEGORIES.map((category) => {
                                const availableItems = category.moduleIds
                                    .map((id) => allAvailableModuleItems.find((item) => item.id === id))
                                    .filter((item): item is NonNullable<typeof item> => Boolean(item));

                                if (!availableItems.length) return null;

                                return (
                                    <SelectGroup key={category.id}>
                                        <SelectLabel className="text-xs font-bold text-muted-foreground uppercase px-2 py-1.5 bg-muted/30">
                                            {category.name}
                                        </SelectLabel>
                                        {availableItems.map((item) => {
                                            const ItemIcon = MODULE_ICONS[item.id] ?? FileText;
                                            return (
                                                <SelectItem key={item.id} value={item.id} className="text-xs py-2">
                                                    <div className="flex items-center gap-2">
                                                        <ItemIcon className="size-3.5 text-primary shrink-0" />
                                                        <span>{item.label}</span>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectGroup>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main Master-Detail Layout (Sidebar + Workspace) */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 items-start">
                {/* Left Report Navigator Sidebar (Hidden on mobile, visible on lg+) */}
                <div className="hidden lg:flex flex-col gap-3 sticky top-4">
                    <div className="rounded-xl border border-border/70 bg-card p-3 shadow-xs space-y-3">
                        {/* Search Input for report modules */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Filter report modules..."
                                value={sidebarSearch}
                                onChange={(e) => setSidebarSearch(e.target.value)}
                                className="h-8.5 pl-8 pr-7 bg-background/50 text-xs"
                            />
                            {sidebarSearch && (
                                <button
                                    type="button"
                                    onClick={() => setSidebarSearch('')}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Categorized Reports List */}
                        <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                            {categorizedModules.map((category) => (
                                <div key={category.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between px-2 py-0.5">
                                        <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                            <category.icon className="size-3.5 text-primary/80" />
                                            {category.name}
                                        </span>
                                        <Badge variant="outline" className="text-xs h-4.5 px-1.5 font-semibold text-muted-foreground">
                                            {category.items.length}
                                        </Badge>
                                    </div>

                                    <div className="space-y-1">
                                        {category.items.map((item) => {
                                            const isActive = item.id === currentActiveModuleId;
                                            const ItemIcon = MODULE_ICONS[item.id] ?? FileText;

                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleModuleChange(item.id)}
                                                    className={cn(
                                                        'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-all duration-150',
                                                        isActive
                                                            ? 'bg-primary/10 text-primary font-semibold border border-primary/25 shadow-xs'
                                                            : 'text-foreground/80 hover:text-foreground hover:bg-muted/50 border border-transparent'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div
                                                            className={cn(
                                                                'size-6 rounded-md flex items-center justify-center shrink-0 transition-colors',
                                                                isActive ? 'bg-primary/20 text-primary' : 'bg-muted/60 text-muted-foreground'
                                                            )}
                                                        >
                                                            <ItemIcon className="size-3.5" />
                                                        </div>
                                                        <span className="truncate">{item.label}</span>
                                                    </div>

                                                    {isActive && <ChevronRight className="size-3.5 text-primary shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {categorizedModules.length === 0 && (
                                <div className="text-center py-6 px-3 space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground">No matching reports</p>
                                    <p className="text-xs text-muted-foreground/70">Try a different search keyword</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Workspace Panel (Active Report Content) */}
                <div className="flex flex-col gap-4 min-w-0">
                    {/* Active Report Header Card */}
                    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 mt-0.5">
                                    <ActiveIcon className="size-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-bold text-foreground leading-tight">
                                            {previewData?.title ?? activeItemMetadata?.label ?? 'Report Workspace'}
                                        </h2>
                                        {activeItemMetadata?.sourceModule && (
                                            <Badge variant="secondary" className="text-xs font-semibold">
                                                {activeItemMetadata.sourceModule}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{activeItemMetadata?.description}</p>
                                </div>
                            </div>

                            {/* Export Actions (for standard reports) */}
                            {!isVoidLogsActive && (
                                <RequirePermission module={appModules.REPORTS_MANAGEMENT} action={appPermissions.READ}>
                                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 gap-1.5 shadow-2xs"
                                            disabled={!canExport || exportMutation.isPending}
                                            onClick={() => exportMutation.mutate('excel')}
                                        >
                                            <FileSpreadsheet className="size-4 text-emerald-600" />
                                            <span>Excel</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 gap-1.5 shadow-2xs"
                                            disabled={!canExport || exportMutation.isPending}
                                            onClick={() => exportMutation.mutate('pdf')}
                                        >
                                            <FileText className="size-4 text-rose-500" />
                                            <span>PDF</span>
                                        </Button>
                                    </div>
                                </RequirePermission>
                            )}
                        </div>
                    </div>

                    {/* View Switcher based on Active Report */}
                    {isVoidLogsActive ? (
                        <VoidLogsAuditView />
                    ) : activeModule ? (
                        <div className="space-y-4">
                            {/* Filter Bar */}
                            <ReportFiltersBar
                                moduleDefinition={activeModule}
                                searchParams={searchParams}
                                onSearchParamsChange={setSearchParams}
                                onPreview={handlePreview}
                                isPreviewLoading={isPreviewLoading || isPreviewFetching}
                            />

                            {/* Status Warnings */}
                            {filtersChangedSincePreview && (
                                <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="size-4 text-amber-500" />
                                    <AlertTitle className="font-semibold text-xs">Filters Changed</AlertTitle>
                                    <AlertDescription className="text-xs">
                                        Your query parameters were updated after the last preview. Click <strong>Preview Report</strong> to refresh
                                        the data before exporting.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {showTruncationWarning && (
                                <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="size-4 text-amber-500" />
                                    <AlertTitle className="font-semibold text-xs">Export Limit Notice</AlertTitle>
                                    <AlertDescription className="text-xs">
                                        This report matches {previewData?.meta.total.toLocaleString()} records. File exports are capped at{' '}
                                        {EXPORT_ROW_LIMIT.toLocaleString()} rows to optimize server processing.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Main Preview / Table Container */}
                            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/20 p-4 shadow-xs">
                                {previewData?.meta && (
                                    <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2.5">
                                        <span className="font-medium text-foreground/80">
                                            {previewData.meta.total.toLocaleString()} record{previewData.meta.total === 1 ? '' : 's'} found
                                        </span>
                                        {previewData.meta.generatedAt && (
                                            <span>Generated: {formatDate(new Date(previewData.meta.generatedAt), 'MMM d, yyyy · hh:mm a')}</span>
                                        )}
                                    </div>
                                )}

                                {previewError ? (
                                    <Alert variant="destructive">
                                        <AlertTitle>Preview Failed</AlertTitle>
                                        <AlertDescription>{getErrorMessage(previewError)}</AlertDescription>
                                    </Alert>
                                ) : previewToken === 0 ? (
                                    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/5 p-6 text-center">
                                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                                            <FileBarChart className="size-6" />
                                        </div>
                                        <h3 className="text-sm font-bold text-foreground">No Preview Generated</h3>
                                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                            Adjust the filter criteria above and click <strong>Preview Report</strong> to load records into the table.
                                        </p>
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
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
