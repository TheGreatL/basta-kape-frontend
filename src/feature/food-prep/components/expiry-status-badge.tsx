import { Badge } from '#/components/ui/badge.tsx';
import { Clock, AlertTriangle, CheckCircle2, XCircle, Archive } from 'lucide-react';
import { cn } from '#/lib/utils.ts';
import type { PreparedBatchStatus } from '../food-prep.types';

interface ExpiryStatusBadgeProps {
    status?: PreparedBatchStatus;
    expiresAt?: string | null;
    currentQuantity?: number;
    className?: string;
    showTimeRemaining?: boolean;
}

export function formatTimeRemaining(expiresAtStr: string | null | undefined): {
    label: string;
    isExpired: boolean;
    isNearExpiry: boolean;
    hoursLeft: number;
} {
    if (!expiresAtStr) {
        return { label: 'No Expiry', isExpired: false, isNearExpiry: false, hoursLeft: 999 };
    }

    const expiryTime = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diffMs = expiryTime - now;

    if (diffMs <= 0) {
        const pastMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60));
        const pastHours = Math.floor(pastMinutes / 60);
        const pastDays = Math.floor(pastHours / 24);

        let agoText = `${pastMinutes}m ago`;
        if (pastDays > 0) {
            agoText = `${pastDays}d ago`;
        } else if (pastHours > 0) {
            agoText = `${pastHours}h ago`;
        }

        return { label: `Expired ${agoText}`, isExpired: true, isNearExpiry: false, hoursLeft: 0 };
    }

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);

    const isNearExpiry = totalMinutes <= 120; // 2 hours or less

    let remainingText = '';
    if (days > 0) {
        const remainingHours = hours % 24;
        remainingText = remainingHours > 0 ? `${days}d ${remainingHours}h left` : `${days}d left`;
    } else if (hours > 0) {
        remainingText = `${hours}h ${minutes}m left`;
    } else {
        remainingText = `${minutes}m left`;
    }

    return {
        label: remainingText,
        isExpired: false,
        isNearExpiry,
        hoursLeft: hours + minutes / 60
    };
}

export default function ExpiryStatusBadge({ status, expiresAt, currentQuantity = 1, className, showTimeRemaining = true }: ExpiryStatusBadgeProps) {
    const { label, isExpired, isNearExpiry } = formatTimeRemaining(expiresAt);

    if (status === 'DISPOSED') {
        return (
            <Badge
                variant="outline"
                className={cn('bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-bold text-xs gap-1 py-0.5', className)}
            >
                <Archive className="size-3" />
                Disposed
            </Badge>
        );
    }

    if (status === 'DEPLETED' || currentQuantity <= 0) {
        return (
            <Badge variant="outline" className={cn('bg-muted/50 text-muted-foreground border-border/60 font-bold text-xs gap-1 py-0.5', className)}>
                <XCircle className="size-3" />
                Depleted
            </Badge>
        );
    }

    if (status === 'EXPIRED' || isExpired) {
        return (
            <Badge
                variant="destructive"
                className={cn(
                    'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold text-xs gap-1 py-0.5 animate-pulse',
                    className
                )}
            >
                <AlertTriangle className="size-3 text-rose-500" />
                {showTimeRemaining ? label : 'Expired'}
            </Badge>
        );
    }

    if (status === 'NEAR_EXPIRY' || isNearExpiry) {
        return (
            <Badge
                variant="outline"
                className={cn('bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 font-bold text-xs gap-1 py-0.5', className)}
            >
                <Clock className="size-3 text-amber-600 dark:text-amber-400" />
                {showTimeRemaining ? `Near Expiry (${label})` : 'Near Expiry'}
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className={cn('bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs gap-1 py-0.5', className)}
        >
            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
            {showTimeRemaining ? `Fresh (${label})` : 'Fresh'}
        </Badge>
    );
}
