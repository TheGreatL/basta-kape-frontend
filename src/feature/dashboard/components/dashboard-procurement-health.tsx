import { Truck, Users, UserPlus, FileText, ArrowUpRight, DollarSign } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';
import type { DashboardProcurementSummary, DashboardCustomerMetrics, IDashboardDateRange } from '../dashboard.types';

interface DashboardProcurementHealthProps {
    procurement?: DashboardProcurementSummary;
    customers?: DashboardCustomerMetrics;
    dateRange: IDashboardDateRange;
}

export function DashboardProcurementHealth({ procurement, customers, dateRange }: DashboardProcurementHealthProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Procurement & Purchase Orders */}
            <Card className="shadow-2xs border-border/60 rounded-2xl">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Truck className="size-4 text-primary" /> Procurement & Supplier POs
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Purchase order commitments and inventory replenishment spend
                        </CardDescription>
                    </div>
                    <Link
                        to="/admin/purchase-orders"
                        search={{} as any}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
                    >
                        Purchase Orders <ArrowUpRight className="size-3.5" />
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/20 border border-border/50 rounded-xl p-3.5 space-y-1">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-bold uppercase">Pending POs</span>
                                <FileText className="size-4 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <h4 className="text-lg font-bold text-foreground">{procurement?.openPOCount ?? 0}</h4>
                                <p className="text-xs text-muted-foreground font-semibold">
                                    ₱{(procurement?.openPOAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} value
                                </p>
                            </div>
                        </div>

                        <div className="bg-muted/20 border border-border/50 rounded-xl p-3.5 space-y-1">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-bold uppercase">Deliveries Spend</span>
                                <DollarSign className="size-4 text-emerald-600" />
                            </div>
                            <div className="space-y-0.5">
                                <h4 className="text-lg font-bold text-foreground">
                                    ₱{(procurement?.procurementSpend ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </h4>
                                <p className="text-xs text-muted-foreground font-semibold">Received in {dateRange.label}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Customer Base & Retention */}
            <Card className="shadow-2xs border-border/60 rounded-2xl">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Users className="size-4 text-primary" /> Customer Growth & Base
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Loyalty member registrations and new customer acquisitions
                        </CardDescription>
                    </div>
                    <Link to="/admin/customers" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0">
                        Directory <ArrowUpRight className="size-3.5" />
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/20 border border-border/50 rounded-xl p-3.5 space-y-1">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-bold uppercase">Total Members</span>
                                <Users className="size-4 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <h4 className="text-lg font-bold text-foreground">{(customers?.totalCustomers ?? 0).toLocaleString()}</h4>
                                <p className="text-xs text-muted-foreground font-semibold">Registered customer profiles</p>
                            </div>
                        </div>

                        <div className="bg-muted/20 border border-border/50 rounded-xl p-3.5 space-y-1">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-bold uppercase">New ({dateRange.label})</span>
                                <UserPlus className="size-4 text-emerald-600" />
                            </div>
                            <div className="space-y-0.5">
                                <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    +{(customers?.newCustomersInPeriod ?? 0).toLocaleString()}
                                </h4>
                                <p className="text-xs text-muted-foreground font-semibold">New patrons signed up</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
