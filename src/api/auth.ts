import type { paths } from './contract.gen';
import type { ApiClient } from './client';

// Same fallback shape as money.ts's Json<> — register/login are POST (201), me is GET (200).
type Json<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { responses: { 200: { content: { 'application/json': infer T } } } } ? T :
  paths[P][M] extends { responses: { 201: { content: { 'application/json': infer T } } } } ? T :
  never;
type Body<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { requestBody: { content: { 'application/json': infer T } } } ? T : never;

export type RegisterRequest = Body<'/api/v1/auth/register', 'post'>;
export type RegisterResponse = Json<'/api/v1/auth/register', 'post'>;
export type MeResponse = Json<'/api/v1/auth/me', 'get'>;

export function register(api: ApiClient, input: RegisterRequest): Promise<RegisterResponse> {
  return api.post<RegisterResponse>('/auth/register', input);
}

/** Re-syncs the session's memberships after an action that changes them (creating a
 * mosque, accepting an invitation) without forcing a full re-login. */
export function fetchMe(api: ApiClient): Promise<MeResponse> {
  return api.get<MeResponse>('/auth/me');
}
