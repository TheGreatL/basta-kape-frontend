import type React from 'react';
import { env } from '#/env';
import defaultProductImage from '#/assets/default.png';

export function getFileUrl(path: string | undefined | null, fallback?: string) {
    if (!path) return fallback;
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
    return `${env.VITE_BUCKET_URL}${path}`;
}

export function getProductPhotoUrl(path: string | undefined | null) {
    return getFileUrl(path, defaultProductImage);
}

export function handleProductImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
    e.currentTarget.src = defaultProductImage;
}

export const getFrontendReference = (createdAt: string | Date, queueNumber: string | null): string => {
    if (!queueNumber) return 'N/A';
    const date = new Date(createdAt);

    // Format to YYMMDD in Manila timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value || '00';
    const month = parts.find((p) => p.type === 'month')?.value || '00';
    const day = parts.find((p) => p.type === 'day')?.value || '00';

    const yymmdd = `${year.slice(-2)}${month}${day}`;
    const cleanQueue = queueNumber.replace('#', '');
    return `${yymmdd}-${cleanQueue}`;
};
