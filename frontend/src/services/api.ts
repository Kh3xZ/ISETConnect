const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

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

/**
 * Checks backend health endpoint
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Checks backend database connection to PostgreSQL
 */
export async function checkDbStatus(): Promise<DbStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/test/db`);
  return response.json();
}

export default {
  API_BASE_URL,
  checkBackendHealth,
  checkDbStatus,
};

