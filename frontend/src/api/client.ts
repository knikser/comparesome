import type {
  Comparison,
  ComparisonDetail,
  DashboardData,
  FeatureFlag,
  Settings,
  User,
  Variant
} from '../types/api';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldErrors;

  constructor(message: string, status = 500, fieldErrors: FieldErrors = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type RequestOptions = RequestInit & { token?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseFieldErrors(payload: unknown): FieldErrors {
  if (!isRecord(payload) || !isRecord(payload.fieldErrors)) {
    return {};
  }
  const out: FieldErrors = {};
  for (const [key, value] of Object.entries(payload.fieldErrors)) {
    if (typeof value === 'string' && value.trim() !== '') {
      out[key] = value.trim();
    }
  }
  return out;
}

function parseErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }
  const value = payload.error ?? payload.message;
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function defaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Please check the entered data.';
    case 401:
      return 'Authentication failed. Please sign in again.';
    case 403:
      return 'You do not have access to perform this action.';
    case 404:
      return 'Requested data was not found.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new ApiError('Cannot connect to server. Check your connection and try again.', 0);
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = parseErrorMessage(body) ?? defaultErrorMessage(response.status);
    throw new ApiError(message, response.status, parseFieldErrors(body));
  }

  return body as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),

  me: (token: string) => request<{ user: User }>('/me', { token }),

  changePassword: (token: string, oldPassword: string, newPassword: string) =>
    request<{ token: string; user: User }>('/auth/change-password', {
      token,
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    }),

  dashboard: (token: string) => request<DashboardData>('/dashboard', { token }),

  users: (token: string) => request<{ users: User[] }>('/users', { token }),

  comparisons: (token: string) => request<{ comparisons: Comparison[] }>('/comparisons', { token }),

  createComparison: (token: string, name: string, participantIds: number[]) =>
    request<Comparison>('/comparisons', {
      token,
      method: 'POST',
      body: JSON.stringify({ name, participantIds })
    }),

  comparisonDetail: (token: string, comparisonId: number) =>
    request<ComparisonDetail>(`/comparisons/${comparisonId}`, { token }),

  createVariant: (token: string, comparisonId: number, title: string, description: string) =>
    request<Variant>(`/comparisons/${comparisonId}/variants`, {
      token,
      method: 'POST',
      body: JSON.stringify({ title, description })
    }),

  rateVariant: (token: string, variantId: number, rank: number, pros: string, cons: string) =>
    request<{ ok: boolean }>(`/variants/${variantId}/rating`, {
      token,
      method: 'PUT',
      body: JSON.stringify({ rank, pros, cons })
    }),

  adminUsers: (token: string) => request<{ users: User[] }>('/admin/users', { token }),

  adminCreateUser: (token: string, username: string, password: string, isAdmin: boolean) =>
    request<User>('/admin/users', {
      token,
      method: 'POST',
      body: JSON.stringify({ username, password, isAdmin })
    }),

  adminFlags: (token: string) => request<{ flags: FeatureFlag[] }>('/admin/feature-flags', { token }),

  adminUpdateFlag: (token: string, key: string, enabled: boolean) =>
    request<{ ok: boolean }>(`/admin/feature-flags/${encodeURIComponent(key)}`, {
      token,
      method: 'PUT',
      body: JSON.stringify({ enabled })
    }),

  adminSettings: (token: string) => request<Settings>('/admin/settings', { token }),

  adminUpdateSettings: (token: string, maxVariantsPerUser: number) =>
    request<Settings>('/admin/settings', {
      token,
      method: 'PUT',
      body: JSON.stringify({ maxVariantsPerUser })
    })
};
