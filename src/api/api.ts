import { env } from '../env';

// -----------------------------------------------------------------------------
// Token Storage Placeholders
// Replace these with your actual storage mechanism (Zustand, localStorage, etc.)
// -----------------------------------------------------------------------------
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
    accessToken = token;
};

export const getAccessToken = () => accessToken;

// -----------------------------------------------------------------------------
// Refresh Logic State
// -----------------------------------------------------------------------------
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token as string);
        }
    });
    failedQueue = [];
};

// -----------------------------------------------------------------------------
// Native Fetch API Wrapper
// -----------------------------------------------------------------------------
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Ensure endpoint starts with a slash or handle accordingly
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${env.VITE_API_URL}${path}`;

    const headers = new Headers(options.headers);

    // Default to JSON content type if body is present and not FormData
    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const token = getAccessToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
        ...options,
        headers
    };

    let response = await fetch(url, config);

    // -------------------------------------------------------------------------
    // Handle 401 Unauthorized - Attempt Token Refresh
    // -------------------------------------------------------------------------
    if (response.status === 401) {
        if (!isRefreshing) {
            isRefreshing = true;

            try {
                // TODO: Update this to match your actual refresh endpoint and payload
                const refreshResponse = await fetch(`${env.VITE_API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                    // If using HttpOnly cookies for refresh token, uncomment the line below:
                    // credentials: 'include',

                    // If sending refresh token in body, add it here:
                    // body: JSON.stringify({ refreshToken: getRefreshToken() })
                });

                if (!refreshResponse.ok) {
                    throw new Error('Token refresh failed');
                }

                const data = await refreshResponse.json();

                // TODO: Adjust based on your API's response structure
                const newAccessToken = data.accessToken;
                setAccessToken(newAccessToken);

                processQueue(null, newAccessToken);

                // Retry the original request with the new token
                headers.set('Authorization', `Bearer ${newAccessToken}`);
                response = await fetch(url, { ...config, headers });
            } catch (refreshError) {
                processQueue(refreshError as Error, null);
                // Handle logout logic here (e.g. clear state, redirect to login)
                setAccessToken(null);
                throw refreshError;
            } finally {
                isRefreshing = false;
            }
        } else {
            // If already refreshing, queue the request and wait for the new token
            return new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((newToken) => {
                headers.set('Authorization', `Bearer ${newToken}`);
                return fetch(url, { ...config, headers });
            });
        }
    }

    return response;
}

// -----------------------------------------------------------------------------
// Convenience Methods
// -----------------------------------------------------------------------------
export const api = {
    get: (endpoint: string, options?: Omit<RequestInit, 'method'>) => apiFetch(endpoint, { ...options, method: 'GET' }),

    post: (endpoint: string, body: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
        apiFetch(endpoint, {
            ...options,
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body)
        }),

    put: (endpoint: string, body: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
        apiFetch(endpoint, {
            ...options,
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body)
        }),

    patch: (endpoint: string, body: any, options?: Omit<RequestInit, 'method' | 'body'>) =>
        apiFetch(endpoint, {
            ...options,
            method: 'PATCH',
            body: body instanceof FormData ? body : JSON.stringify(body)
        }),

    delete: (endpoint: string, options?: Omit<RequestInit, 'method'>) => apiFetch(endpoint, { ...options, method: 'DELETE' })
};
