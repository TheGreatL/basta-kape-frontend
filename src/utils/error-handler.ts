export class ApiError extends Error {
    public status: number;
    public data: any;

    constructor(message: string, status: number = 500, data: any = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Extracts a user-friendly error message from an unknown error object.
 * Useful for displaying messages in toasts or form errors.
 */
export function getErrorMessage(error: unknown, fallbackMessage: string = 'An unexpected error occurred'): string {
    if (error instanceof ApiError) {
        // Backend specifically sends `{ message: '...' }` or `{ error: '...' }`
        if (error.data && typeof error.data === 'object') {
            if (typeof error.data.message === 'string') return error.data.message;
            if (typeof error.data.error === 'string') return error.data.error;

            // Handle validation errors specifically if needed (e.g., Zod error array)
            if (Array.isArray(error.data.errors) && error.data.errors.length > 0) {
                const firstError = error.data.errors[0];
                return firstError.message || firstError.msg || fallbackMessage;
            }
        }
        return error.message || fallbackMessage;
    }

    if (error instanceof Error) {
        return error.message || fallbackMessage;
    }

    if (typeof error === 'string') {
        return error;
    }

    return fallbackMessage;
}
