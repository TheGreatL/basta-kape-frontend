import { env } from '#/env';

export function getFileUrl(path: string | undefined | null) {
    if (!path) return undefined;
    return `${env.VITE_BUCKET_URL}${path}`;
}
