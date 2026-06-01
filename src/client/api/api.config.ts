export class ApiError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
    get isServerError() {
        return this.statusCode >= 500;
    }
    get isClientError() {
        return this.statusCode >= 400 && this.statusCode < 500;
    }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new ApiError(res.status, text);
    }
    return res.json() as Promise<T>;
}

export const apiClient = {
    get: <T>(url: string): Promise<T> => request<T>(url),
    post: <T>(url: string, body?: unknown): Promise<T> =>
        request<T>(url, {
            method: 'POST',
            headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
            body: body !== undefined ? JSON.stringify(body) : undefined
        })
};
