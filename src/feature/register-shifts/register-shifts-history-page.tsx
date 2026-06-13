import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Timer, Search, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { useAuthStore } from '#/store/auth-store.ts';
import { getRegisterShifts, getMyRegisterShifts } from '#/api/register-shift.api.ts';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import { appModules, AccessScope } from '#/constants/rbac.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';
import type { IRegisterShift } from './register-shifts.types';

export default function RegisterShiftsHistoryPage() {
    const currentUser = useAuthStore((state) => state.user);
    const permissions = getUserPermissions(currentUser);
    const hasAllScope = hasPermission(permissions, appModules.POINT_OF_SALE, 'read', AccessScope.ALL);

    // If they have ALL scope, they can view All Shifts, otherwise default to My Shifts
    const [activeTab, setActiveTab] = React.useState<string>(hasAllScope ? 'all-shifts' : 'my-shifts');
    const [historySearch, setHistorySearch] = React.useState('');
    const debouncedHistorySearch = useDebounce(historySearch, 300);
    const [historyPage, setHistoryPage] = React.useState(1);
    const historyLimit = 10;

    // Reset pagination and search on tab change
    const handleTabChange = (val: string) => {
        setActiveTab(val);
        setHistoryPage(1);
        setHistorySearch('');
    };

    // Fetch shifts history
    const { data: historyData, isLoading: isHistoryLoading } = useQuery({
        queryKey: ['register-shifts:history', activeTab, historyPage, debouncedHistorySearch],
        queryFn: () => {
            const params = {
                page: historyPage,
                limit: historyLimit,
                search: debouncedHistorySearch || undefined
            };
            return activeTab === 'all-shifts' ? getRegisterShifts(params) : getMyRegisterShifts(params);
        },
        enabled: !!currentUser
    });

    const shiftLogs = historyData?.data || [];
    const historyMeta = historyData?.meta;

    // Reset pagination on search change
    React.useEffect(() => {
        setHistoryPage(1);
    }, [debouncedHistorySearch]);

    return (
        <div className="flex flex-col gap-6">
            {/* Back to Control Panel Button & Page Header */}
            <div className="flex flex-col gap-3">
                <div>
                    <Link to="/admin/register-shifts">
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 pl-2">
                            <ArrowLeft className="size-3.5" />
                            Back to Active Session
                        </Button>
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Timer className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Register Shifts History</h1>
                        <p className="text-xs text-muted-foreground">
                            Audit log of open and closed cashier shift sessions, drawer start balance, cash sales, and physical drawer counts.
                        </p>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                    <TabsList className="bg-muted/40 p-1">
                        {hasAllScope && (
                            <TabsTrigger value="all-shifts" className="text-xs sm:text-sm">
                                All Shifts
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="my-shifts" className="text-xs sm:text-sm">
                            My Shifts
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="mt-6">
                    <Card className="shadow-xs border-border/60 bg-card/40 backdrop-blur-xs">
                        <CardHeader className="border-b border-border/40 pb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">Shift Drawer History Logs</CardTitle>
                                    <CardDescription className="text-2xs">
                                        {activeTab === 'all-shifts'
                                            ? 'Listing all operational cashier shift logs with expectation and physical cash discrepancy verification.'
                                            : 'Listing your operational cashier shift logs with expectation and physical cash discrepancy verification.'}
                                    </CardDescription>
                                </div>
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search cashier..."
                                        value={historySearch}
                                        onChange={(e) => setHistorySearch(e.target.value)}
                                        className="pl-9 h-9 text-xs"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isHistoryLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-2xs text-muted-foreground font-medium">Fetching history logs...</span>
                                </div>
                            ) : shiftLogs.length === 0 ? (
                                <div className="text-center py-12 text-xs text-muted-foreground font-medium border border-dashed border-border/60 rounded-lg bg-muted/5">
                                    No register shift history logs found.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="overflow-x-auto border border-border/40 rounded-xl bg-card/10">
                                        <table className="w-full text-xs text-left">
                                            <thead>
                                                <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground font-semibold">
                                                    <th className="py-2.5 px-3">Cashier Details</th>
                                                    <th className="py-2.5 px-3">Opened At</th>
                                                    <th className="py-2.5 px-3">Closed At</th>
                                                    <th className="py-2.5 px-3 text-right">Start Balance</th>
                                                    <th className="py-2.5 px-3 text-right">Expected End</th>
                                                    <th className="py-2.5 px-3 text-right">Actual Settle</th>
                                                    <th className="py-2.5 px-3 text-center">Settle Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                {shiftLogs.map((log: IRegisterShift) => {
                                                    const isSessionOpen = !log.closedAt;
                                                    const expectedEnd = log.endBalance ?? 0;
                                                    const actualSettle = log.actualBalance ?? 0;
                                                    const diff = actualSettle - expectedEnd;

                                                    return (
                                                        <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                                                            <td className="py-3 px-3">
                                                                <div className="font-bold text-foreground">
                                                                    {log.cashier ? `${log.cashier.firstName} ${log.cashier.lastName}` : 'System'}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    @{log.cashier?.username || 'system'}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-3 text-muted-foreground">
                                                                {format(new Date(log.openedAt), 'MMM dd, yyyy - hh:mm a')}
                                                            </td>
                                                            <td className="py-3 px-3 text-muted-foreground">
                                                                {log.closedAt ? (
                                                                    format(new Date(log.closedAt), 'MMM dd, yyyy - hh:mm a')
                                                                ) : (
                                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold px-2 py-0.5">
                                                                        Active Shift
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-3 text-right font-semibold text-foreground">
                                                                ₱{log.startBalance.toFixed(2)}
                                                            </td>
                                                            <td className="py-3 px-3 text-right font-semibold text-foreground">
                                                                {isSessionOpen ? '-' : `₱${expectedEnd.toFixed(2)}`}
                                                            </td>
                                                            <td className="py-3 px-3 text-right font-semibold text-foreground">
                                                                {isSessionOpen ? '-' : `₱${actualSettle.toFixed(2)}`}
                                                            </td>
                                                            <td className="py-3 px-3 text-center">
                                                                {isSessionOpen ? (
                                                                    <span className="text-2xs text-muted-foreground font-medium">-</span>
                                                                ) : diff === 0 ? (
                                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold px-2">
                                                                        Balanced
                                                                    </Badge>
                                                                ) : diff < 0 ? (
                                                                    <Badge
                                                                        className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs font-semibold px-2"
                                                                        title={`Shortage of ₱${Math.abs(diff).toFixed(2)}`}
                                                                    >
                                                                        Short: ₱{Math.abs(diff).toFixed(2)}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge
                                                                        className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-semibold px-2"
                                                                        title={`Surplus of ₱${diff.toFixed(2)}`}
                                                                    >
                                                                        Over: ₱{diff.toFixed(2)}
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Shift history logs pagination */}
                                    {historyMeta && historyMeta.pageCount > 1 && (
                                        <div className="flex items-center justify-end gap-2 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={historyPage <= 1}
                                                onClick={() => setHistoryPage((prev) => prev - 1)}
                                                className="h-7 px-2"
                                            >
                                                <ChevronLeft className="size-3.5 mr-1" />
                                                Previous
                                            </Button>
                                            <span className="text-2xs text-muted-foreground font-medium px-2">
                                                Page {historyMeta.currentPage} of {historyMeta.pageCount}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={!historyMeta.hasMore}
                                                onClick={() => setHistoryPage((prev) => prev + 1)}
                                                className="h-7 px-2"
                                            >
                                                Next
                                                <ChevronRight className="size-3.5 ml-1" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </Tabs>
        </div>
    );
}
