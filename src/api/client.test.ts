import { ApiClient, ApiError } from './client';

describe('ApiClient', () => {
  const client = new ApiClient('http://localhost:3000', async () => null);

  it('returns the parsed body on success', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ id: 'u1' }),
    }) as never;
    await expect(client.post('/auth/login', {})).resolves.toEqual({ id: 'u1' });
  });

  it('throws ApiError carrying the server error code', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'nope' } }),
    }) as never;
    await expect(client.post('/auth/login', {})).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS', status: 401,
    });
  });

  it('maps a network failure to a stable code rather than a raw fetch error', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as never;
    const error = await client.post('/auth/login', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('NETWORK_UNAVAILABLE');
  });

  it('attaches the bearer token when one is available', async () => {
    const authed = new ApiClient('http://localhost:3000', async () => 'token-123');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    globalThis.fetch = fetchMock as never;
    await authed.get('/auth/me');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token-123');
  });
});
