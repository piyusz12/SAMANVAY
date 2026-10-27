import { useAppStore } from '../lib/store';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.origin ? '' : 'http://127.0.0.1:8000');

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;
  const store = useAppStore.getState();

  // If offline and making a state-mutating request, queue it
  if (!store.isOnline && options.method && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method.toUpperCase())) {
    store.queueOfflineAction({
      type: `${options.method} ${endpoint}`,
      endpoint,
      method: options.method,
      payload: options.body ? JSON.parse(options.body as string) : null,
    });
    // Return an optimistic success payload
    return {
      id: Math.floor(Math.random() * 100000),
      _offline_queued: true,
      status: 'QUEUED_OFFLINE',
    } as unknown as T;
  }

  // Construct URL with query parameters
  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Build headers
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  if (store.token) {
    reqHeaders['Authorization'] = `Bearer ${store.token}`;
  }

  try {
    const response = await fetch(url, {
      headers: reqHeaders,
      ...restOptions,
    });

    if (!response.ok) {
      let errorBody: any = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      const message = errorBody?.detail || errorBody?.message || `Request failed with status ${response.status}`;
      throw new ApiError(response.status, message, errorBody);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    // Network failure -> Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      store.setOnlineStatus(false);
    }
    throw new ApiError(0, error.message || 'Network communication failure');
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};
