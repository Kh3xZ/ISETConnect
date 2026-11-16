const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';
const TIMEOUT_MS = 15000;


export type Role = 'STUDENT' | 'PROF' | 'ADMIN';

export interface UserResponse {
  id: number;
  nomPrenom: string;
  email: string;
  role: Role;
  department: string | null;
  departmentLabel: string | null;
  classe: string | null;
  level: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  user: UserResponse;
}

export interface DepartmentInfo {
  code: string;
  label: string;
  classes: string[];
}

export interface RegisterBody {
  nomPrenom: string;
  email: string;
  password: string;
  department: string;
  classe: string;
}

export interface HealthResponse {
  status: string;
  message: string;
  timestamp: string;
}

export interface DbStatusResponse {
  database: string;
  message: string;
  queryResult?: number;
}


export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}



let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}


export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}



interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError(
      response.status,
      data?.message || `Request failed (HTTP ${response.status})`,
      data?.fieldErrors ?? undefined,
    );
  }
  return data as T;
}



export const login = (email: string, password: string) =>
  request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } });

export const register = (body: RegisterBody) =>
  request<AuthResponse>('/auth/register', { method: 'POST', body });


export const getDepartments = () => request<DepartmentInfo[]>('/meta/departments');

export const getMe = () => request<UserResponse>('/users/me');

export const checkBackendHealth = () => request<HealthResponse>('/health');
export const checkDbStatus = () => request<DbStatusResponse>('/test/db');

export default {
  API_BASE_URL,
  login,
  register,
  getDepartments,
  getMe,
  checkBackendHealth,
  checkDbStatus,
};
