import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.11:8080/api';
const TIMEOUT_MS = 15000;

/** Turns a public API path (or an absolute/local URI) into something <Image> can load. */
export function resolveImageUrl(uri?: string | null): string | undefined {
  if (!uri) return undefined;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(uri)) return uri;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${uri.startsWith('/') ? '' : '/'}${uri}`;
}


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
  /** Public path such as /api/profile-pictures/<uuid>.png, or null. */
  profilePictureUrl: string | null;
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


export interface UserSummary {
  id: number;
  nomPrenom: string;
  role: Role;
  department: string | null;
  classe: string | null;
  level: string | null;
  profilePictureUrl: string | null;
}

export interface PublicationResponse {
  id: number;
  title: string;
  content: string;
  author: UserSummary;
  communityId: number | null;
  communityName: string | null;
  commentsCount: number;
  likesCount: number;
  liked: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface LikeResponse {
  liked: boolean;
  likesCount: number;
}

export interface CommentResponse {
  id: number;
  content: string;
  author: UserSummary;
  publicationId: number;
  createdAt: string;
}

export interface CommunityResponse {
  id: number;
  name: string;
  description: string | null;
  isPrivate: boolean | null;
  nbMax: number | null;
  membersCount: number;
  joined: boolean;
  ownerId: number | null;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface PublicationBody {
  title: string;
  content: string;
  communityId?: number | null;
}


export interface MemberResponse {
  user: UserSummary;
  joinedAt: string;
}

export interface CommunityBody {
  name: string;
  description?: string | null;
  isPrivate?: boolean;
  /** Private only. On update, omit to keep the current key (min 4 chars). */
  key?: string;
  /** Private only (>= 1). */
  nbMax?: number;
}


export interface UpdateProfileBody {
  nomPrenom?: string;
  classe?: string;
  /** min 6 chars; omit to keep the current password */
  password?: string;
}


export interface ResourceResponse {
  id: number;
  title: string;
  description: string | null;
  module: string | null;
  hasAttachment: boolean;
  attachmentName: string | null;
  downloadUrl: string | null;
  uploader: UserSummary;
  createdAt: string;
}

export interface ResourceBody {
  title: string;
  description?: string | null;
  module?: string | null;
}

/** A file chosen with the document picker. */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  file?: Blob;
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
  /** multipart/form-data payload (file uploads). Content-Type is set by fetch, with the boundary. */
  form?: FormData;
  timeoutMs?: number;
}

async function request<T>(path: string, { method = 'GET', body, form, timeoutMs = TIMEOUT_MS }: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined && !form) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ApiError(0, form
        ? 'The upload timed out. Try a smaller file or check your connection.'
        : 'The request timed out. Check your connection and try again.');
    }
    const detail = form && err instanceof Error && err.message ? ` (${err.message})` : '';
    throw new ApiError(0, `Can't reach the server. Check your connection and try again.${detail}`);
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

export interface FeedParams {
  page?: number;
  size?: number;
  /** Department enum code (e.g. TECHNOLOGIES_INFORMATIQUE) — powers the "My Department" tab. */
  department?: string;
  communityId?: number;
}

export const getPublications = ({ page = 0, size = 10, department, communityId }: FeedParams = {}) => {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  if (department) q.set('department', department);
  if (communityId !== undefined) q.set('communityId', String(communityId));
  return request<PageResponse<PublicationResponse>>(`/publications?${q.toString()}`);
};

/**
 * "My Department" feed, filtered on the app side (the backend feed has no department filter, so this
 * keeps working with any backend version). `page` is a BACKEND page index: we scan forward until we
 * have `size` matching publications, and return the last scanned page so the next call continues after it.
 */
export const getDepartmentFeed = async (
  department: string,
  { page = 0, size = 10 }: { page?: number; size?: number } = {},
): Promise<PageResponse<PublicationResponse>> => {
  const MAX_SCANNED_PAGES = 10;
  const collected: PublicationResponse[] = [];
  let res = await getPublications({ page, size });
  let scanned = 1;
  collected.push(...res.content.filter((p) => p.author.department === department));
  while (!res.last && collected.length < size && scanned < MAX_SCANNED_PAGES) {
    res = await getPublications({ page: res.page + 1, size });
    scanned += 1;
    collected.push(...res.content.filter((p) => p.author.department === department));
  }
  return { ...res, content: collected, totalElements: collected.length };
};


export const createPublication = (body: PublicationBody) =>
  request<PublicationResponse>('/publications', { method: 'POST', body });

export const getComments = (publicationId: number, page = 0, size = 30) =>
  request<PageResponse<CommentResponse>>(`/publications/${publicationId}/comments?page=${page}&size=${size}`);

export const addComment = (publicationId: number, content: string) =>
  request<CommentResponse>(`/publications/${publicationId}/comments`, { method: 'POST', body: { content } });

export const likePublication = (publicationId: number) =>
  request<LikeResponse>(`/publications/${publicationId}/like`, { method: 'POST' });

export const unlikePublication = (publicationId: number) =>
  request<LikeResponse>(`/publications/${publicationId}/like`, { method: 'DELETE' });

export const getMyCommunities = () => request<CommunityResponse[]>('/communities/mine');


export interface SearchParams {
  q?: string;
  page?: number;
  size?: number;
}

export const searchUsers = ({ q, page = 0, size = 20 }: SearchParams = {}) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (q && q.trim()) params.set('q', q.trim());
  return request<PageResponse<UserResponse>>(`/users?${params.toString()}`);
};

export const getCommunities = ({ q, page = 0, size = 20 }: SearchParams = {}) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (q && q.trim()) params.set('q', q.trim());
  return request<PageResponse<CommunityResponse>>(`/communities?${params.toString()}`);
};

/** Public communities: no key. Private communities: the join key is required. */
export const joinCommunity = (id: number, key?: string) =>
  request<CommunityResponse>(`/communities/${id}/join`, { method: 'POST', body: key ? { key } : undefined });

export const leaveCommunity = (id: number) => request<void>(`/communities/${id}/leave`, { method: 'POST' });


export const createCommunity = (body: CommunityBody) =>
  request<CommunityResponse>('/communities', { method: 'POST', body });

export const updateCommunity = (id: number, body: CommunityBody) =>
  request<CommunityResponse>(`/communities/${id}`, { method: 'PUT', body });

export const deleteCommunity = (id: number) => request<void>(`/communities/${id}`, { method: 'DELETE' });

export const getCommunityMembers = (id: number, page = 0, size = 30) =>
  request<PageResponse<MemberResponse>>(`/communities/${id}/members?page=${page}&size=${size}`);


export const updateMe = (body: UpdateProfileBody) => request<UserResponse>('/users/me', { method: 'PUT', body });

export const getUserPublications = (userId: number, { page = 0, size = 10 }: { page?: number; size?: number } = {}) =>
  request<PageResponse<PublicationResponse>>(`/users/${userId}/publications?page=${page}&size=${size}`);

export const updatePublication = (id: number, body: PublicationBody) =>
  request<PublicationResponse>(`/publications/${id}`, { method: 'PUT', body });

export const deletePublication = (id: number) => request<void>(`/publications/${id}`, { method: 'DELETE' });


export interface ResourceSearch {
  q?: string;
  module?: string;
  page?: number;
  size?: number;
}

export const getResources = ({ q, module, page = 0, size = 15 }: ResourceSearch = {}) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (q && q.trim()) params.set('q', q.trim());
  if (module) params.set('module', module);
  return request<PageResponse<ResourceResponse>>(`/resources?${params.toString()}`);
};

export const getResourceModules = () => request<string[]>('/resources/modules');

/** Short-lived link (relative to the API base) that downloads the file without an Authorization header. */
export const getResourceDownloadUrl = async (id: number): Promise<string> => {
  const { url } = await request<{ url: string }>(`/resources/${id}/download-link`);
  return `${API_BASE_URL}${url}`;
};

const appendFile = async (form: FormData, file: PickedFile) => {
  if (Platform.OS === 'web') {
    let blob = file.file;
    if (!blob) {
      const response = await fetch(file.uri);
      if (!response.ok) throw new ApiError(response.status, "Couldn't read the selected file.");
      blob = await response.blob();
    }
    form.append('file', blob, file.name);
    return;
  }
  // React Native FormData accepts { uri, name, type } for local files.
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
};

const fileForm = async (file: PickedFile) => {
  const form = new FormData();
  await appendFile(form, file);
  return form;
};

const UPLOAD_TIMEOUT_MS = 120000;

export const createResource = async (body: ResourceBody, file?: PickedFile | null) => {
  const form = new FormData();
  form.append('title', body.title);
  if (body.description) form.append('description', body.description);
  if (body.module) form.append('module', body.module);
  if (file) await appendFile(form, file);
  return request<ResourceResponse>('/resources', { method: 'POST', form, timeoutMs: UPLOAD_TIMEOUT_MS });
};

export const updateResource = (id: number, body: ResourceBody) =>
  request<ResourceResponse>(`/resources/${id}`, { method: 'PUT', body });

export const replaceResourceAttachment = async (id: number, file: PickedFile) =>
  request<ResourceResponse>(`/resources/${id}/attachment`, { method: 'POST', form: await fileForm(file), timeoutMs: UPLOAD_TIMEOUT_MS });

/** expo-file-system's native uploader (iOS + Android). Optional: falls back to FormData when unavailable. */
const loadFileSystem = (): any => {
  try {
    return require('expo-file-system/legacy');
  } catch {
    try {
      return require('expo-file-system');
    } catch {
      return null;
    }
  }
};

const nativeUpload = async <T>(FS: any, path: string, file: PickedFile): Promise<T> => {
  let result: { status: number; body: string };
  try {
    result = await FS.uploadAsync(`${API_BASE_URL}${path}`, file.uri, {
      httpMethod: 'POST',
      uploadType: FS.FileSystemUploadType?.MULTIPART ?? 1,
      fieldName: 'file',
      mimeType: file.mimeType || 'image/jpeg',
      headers: { Accept: 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
    });
  } catch (e) {
    const detail = e instanceof Error && e.message ? ` (${e.message})` : '';
    throw new ApiError(0, `Can't reach the server. Check your connection and try again.${detail}`);
  }
  let data: any = null;
  try {
    data = result.body ? JSON.parse(result.body) : null;
  } catch {
    data = null;
  }
  if (result.status < 200 || result.status >= 300) {
    if (result.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError(result.status, data?.message || `Request failed (HTTP ${result.status})`, data?.fieldErrors ?? undefined);
  }
  return data as T;
};

export const uploadProfilePicture = async (file: PickedFile) => {
  if (Platform.OS !== 'web') {
    const FS = loadFileSystem();
    if (FS?.uploadAsync) return nativeUpload<UserResponse>(FS, '/users/me/profile-picture', file);
  }
  return request<UserResponse>('/users/me/profile-picture', { method: 'POST', form: await fileForm(file), timeoutMs: UPLOAD_TIMEOUT_MS });
};

export const removeProfilePicture = () =>
  request<UserResponse>('/users/me/profile-picture', { method: 'DELETE' });

export const deleteResource = (id: number) => request<void>(`/resources/${id}`, { method: 'DELETE' });


export default {
  API_BASE_URL,
  login,
  register,
  getDepartments,
  getMe,
  getPublications,
  getDepartmentFeed,
  createPublication,
  getComments,
  addComment,
  getMyCommunities,
  searchUsers,
  getCommunities,
  joinCommunity,
  leaveCommunity,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  getCommunityMembers,
  updateMe,
  uploadProfilePicture,
  removeProfilePicture,
  resolveImageUrl,
  getUserPublications,
  updatePublication,
  deletePublication,
  getResources,
  getResourceModules,
  getResourceDownloadUrl,
  createResource,
  updateResource,
  replaceResourceAttachment,
  deleteResource,
  checkBackendHealth,
  checkDbStatus,
};
