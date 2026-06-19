import { env } from '../env';

interface RequestOptions extends RequestInit {
    skipAuth?: boolean;
}

let accessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
    accessToken = token;
    if (typeof window !== 'undefined') {
        if (token) {
            localStorage.setItem('accessToken', token);
        } else {
            localStorage.removeItem('accessToken');
        }
        window.dispatchEvent(new CustomEvent('auth:token', { detail: token }));
    }
};

export const logout = () => {
    setAccessToken(null);
    if (typeof window !== 'undefined') {
        localStorage.removeItem('userId');
        window.dispatchEvent(new Event('auth:logout'));
    }
};

// Queue mechanism to prevent duplicate concurrent token refresh requests
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string | null) => {
    if (token) {
        refreshQueue.forEach((callback) => callback(token));
    }
    refreshQueue = [];
};

/**
 * Automatically calls the `/auth/refresh` endpoint to get a new access token
 * using the HttpOnly refresh token cookie.
 */
async function handleTokenRefresh(): Promise<string> {
    if (isRefreshing) {
        return new Promise((resolve) => {
            refreshQueue.push(resolve);
        });
    }

    isRefreshing = true;

    try {
        const refreshUrl = `${env.VITE_API_URL}/auth/refresh`;
        const response = await fetch(refreshUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Refresh token invalid or expired');
        }

        const data = await response.json();
        const newToken = data.accessToken;

        if (!newToken) {
            throw new Error('Access token missing in refresh response');
        }

        setAccessToken(newToken);
        processQueue(newToken);
        return newToken;
    } catch (error) {
        processQueue(null);
        logout();
        throw error;
    } finally {
        isRefreshing = false;
    }
}

/**
 * Custom fetch wrapper that implements:
 * 1. Base URL prefixing
 * 2. Request interception (attaching Authorization headers and Content-Type)
 * 3. Response interception (checking for 401 errors, queuing, and auto-token-refresh)
 */
async function request(url: string, options: RequestOptions = {}): Promise<Response> {
    const absoluteUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `${env.VITE_API_URL}${url}`;

    const headers = new Headers(options.headers);

    // Auto-set Content-Type if there's a JSON body and it's not FormData
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // Auto-attach access token unless explicitly skipped
    const token = getAccessToken();
    if (token && !options.skipAuth && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Ensure cookies are included (important for the HttpOnly refresh cookie)
    if (options.credentials === undefined) {
        options.credentials = 'include';
    }

    const finalOptions: RequestInit = {
        ...options,
        headers
    };

    let response = await fetch(absoluteUrl, finalOptions);

    // Intercept 401 Unauthorized for token refresh
    if (response.status === 401 && !options.skipAuth && !url.includes('/auth/refresh') && !url.includes('/auth/login')) {
        try {
            const newToken = await handleTokenRefresh();

            // Retry the original request with the new access token
            headers.set('Authorization', `Bearer ${newToken}`);
            response = await fetch(absoluteUrl, {
                ...finalOptions,
                headers
            });
        } catch (refreshError) {
            // Token refresh failed, handle token logout is already done in handleTokenRefresh
            // We just let the original 401 response return or throw the error.
        }
    }

    return response;
}

export const api = {
    get: (url: string, options?: RequestOptions) => request(url, { ...options, method: 'GET' }),

    post: (url: string, body?: unknown, options?: RequestOptions) =>
        request(url, {
            ...options,
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body)
        }),

    put: (url: string, body?: unknown, options?: RequestOptions) =>
        request(url, {
            ...options,
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body)
        }),

    patch: (url: string, body?: unknown, options?: RequestOptions) =>
        request(url, {
            ...options,
            method: 'PATCH',
            body: body instanceof FormData ? body : JSON.stringify(body)
        }),

    delete: (url: string, options?: RequestOptions) => request(url, { ...options, method: 'DELETE' })
};
