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

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: TokenProvider,
  ) {}

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const token = await this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token !== null) headers['Authorization'] = `Bearer ${token}`;

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
      throw new ApiError(
        payload?.error?.code ?? 'INTERNAL_ERROR',
        response.status,
        payload?.error?.message ?? 'Request failed',
      );
    }

    return response.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> { return this.request<T>('GET', path); }
  post<T>(path: string, body: unknown): Promise<T> { return this.request<T>('POST', path, body); }
}
