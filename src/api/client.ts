/** Client-only code for a failure the server never sees. */
export type ClientErrorCode = string | 'NETWORK_UNAVAILABLE';

export class ApiError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type TokenProvider = () => Promise<string | null>;

export type RequestOptions = {
  /** Belt-and-suspenders alongside :mosqueId in the path — see the note in request(). */
  tenantId?: string;
  /** Required by the backend's requireIdempotency middleware on every mutation. */
  idempotencyKey?: string;
};

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: TokenProvider,
    private readonly onAuthError?: () => void,
  ) {}

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown, options: RequestOptions = {},
  ): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token !== null) headers['Authorization'] = `Bearer ${token}`;
    // Belt-and-suspenders alongside :mosqueId in the path — TenantGuard (backend) prefers
    // the path param, but a caller may not always have one to interpolate, so pass it
    // here too when known (multi-tenancy doc: "header, or the path").
    if (options.tenantId !== undefined) headers['X-Tenant-Id'] = options.tenantId;
    if (options.idempotencyKey !== undefined) headers['Idempotency-Key'] = options.idempotencyKey;

    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1${path}`, init);
    } catch {
      throw new ApiError('NETWORK_UNAVAILABLE', 0, 'Could not reach the server');
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as
        { error?: { code?: string; message?: string } } | null;
      const status = response.status;
      const code = payload?.error?.code ?? 'INTERNAL_ERROR';
      const message = payload?.error?.message ?? 'Request failed';

      // Auto-trigger onAuthError callback for 401 Unauthorized or 403 No active membership
      if (status === 401 || (status === 403 && (code === 'TENANT_FORBIDDEN' || message.includes('membership')))) {
        this.onAuthError?.();
      }

      throw new ApiError(code, status, message);
    }

    return response.json() as Promise<T>;
  }

  get<T>(path: string, tenantId?: string): Promise<T> {
    return this.request<T>('GET', path, undefined, tenantId === undefined ? {} : { tenantId });
  }
  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }
  put<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }
  patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }
}
