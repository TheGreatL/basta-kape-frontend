import { formatDistanceToNow, parseISO } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { History, ArrowUpRight, User, ShieldCheck, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#/components/ui/card.tsx';
import type { DashboardRecentActivity } from '../dashboard.types';

interface DashboardRecentActivitiesProps {
    activities?: DashboardRecentActivity[];
}

export function DashboardRecentActivities({ activities = [] }: DashboardRecentActivitiesProps) {
    const formatTimeAgo = (dateStr: string) => {
        try {
            return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
        } catch {
            return 'recently';
        }
    };

    return (
        <Card className="shadow-2xs border-border/60 rounded-2xl">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Activity className="size-4 text-primary" /> Recent System Activities
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        Live audit log of recent staff actions, updates, and operations
                    </CardDescription>
                </div>
                <Link
                    to="/admin/activity-logs"
                    search={{} as any}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
                >
                    All Logs <ArrowUpRight className="size-3.5" />
                </Link>
            </CardHeader>
            <CardContent className="space-y-3">
                {activities.length > 0 ? (
                    <div className="space-y-3">
                        {activities.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                            >
                                <div className="flex items-start gap-2.5">
                                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                        <History className="size-3.5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-foreground leading-tight">{item.title}</span>
                                            <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                                                <User className="size-2.5" /> {item.actorName}
                                            </span>
                                        </div>
                                        {item.details && <p className="text-xs text-muted-foreground line-clamp-1 leading-snug">{item.details}</p>}
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">{formatTimeAgo(item.createdAt)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                        <ShieldCheck className="size-6 text-muted-foreground/60" />
                        <span>No recent activity logs recorded yet.</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
