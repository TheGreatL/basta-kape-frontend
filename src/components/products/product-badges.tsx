export interface ProductBadgeTarget {
    [key: string]: unknown;
}

interface ProductBadgesProps {
    product?: ProductBadgeTarget;
    variant?: 'floating' | 'inline' | 'compact';
    className?: string;
}

export function ProductBadges(_props: ProductBadgesProps) {
    return null;
}
