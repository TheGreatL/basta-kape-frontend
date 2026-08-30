import { Badge } from '#/components/ui/badge.tsx';
import { Cookie, Package } from 'lucide-react';
import { cn } from '#/lib/utils.ts';
import type { DisposalCategory } from '../disposal.types';

interface DisposalCategoryBadgeProps {
    category: DisposalCategory | string;
    className?: string;
}

export default function DisposalCategoryBadge({ category, className }: DisposalCategoryBadgeProps) {
    if (category === 'PREPARED_FOOD') {
        return (
            <Badge
                variant="outline"
                className={cn('text-xs font-bold gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', className)}
            >
                <Cookie className="size-3" />
                Prepared Food
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className={cn('text-xs font-bold gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30', className)}>
            <Package className="size-3" />
            Raw Material
        </Badge>
    );
}
