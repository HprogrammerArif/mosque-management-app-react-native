import type { paths } from './contract.gen';
import type { ApiClient } from './client';

// mosque/member creation routes are POST (201); reads are GET (200) — same fallback
// shape as money.ts's Json<>.
type Json<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { responses: { 200: { content: { 'application/json': infer T } } } } ? T :
  paths[P][M] extends { responses: { 201: { content: { 'application/json': infer T } } } } ? T :
  never;
type Body<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { requestBody: { content: { 'application/json': infer T } } } ? T : never;

export type MosqueResponse = Json<'/api/v1/mosques/{mosqueId}', 'get'>;
export type MosqueListResponse = Json<'/api/v1/mosques', 'get'>;
export type CreateMosqueRequest = Body<'/api/v1/mosques', 'post'>;
export type PrayerConfigResponse = Json<'/api/v1/mosques/{mosqueId}/prayer-config', 'get'>;
export type UpdatePrayerConfigRequest =
  paths['/api/v1/mosques/{mosqueId}/prayer-config']['put'] extends
    { requestBody: { content: { 'application/json': infer T } } } ? T : never;
export type CreateInvitationRequest = Body<'/api/v1/mosques/{mosqueId}/invitations', 'post'>;
export type InvitationResponse = Json<'/api/v1/mosques/{mosqueId}/invitations', 'post'>;
export type MembershipResponse = Json<'/api/v1/invitations/{token}/accept', 'post'>;
export type MemberListResponse = Json<'/api/v1/mosques/{mosqueId}/members', 'get'>;

export function createMosque(
  api: ApiClient, input: CreateMosqueRequest, idempotencyKey: string,
): Promise<MosqueResponse> {
  return api.post<MosqueResponse>('/mosques', input, { idempotencyKey });
}

export function inviteMember(
  api: ApiClient, mosqueId: string, input: CreateInvitationRequest, idempotencyKey: string,
): Promise<InvitationResponse> {
  return api.post<InvitationResponse>(
    `/mosques/${mosqueId}/invitations`, input, { tenantId: mosqueId, idempotencyKey },
  );
}

export function acceptInvitation(
  api: ApiClient, token: string, idempotencyKey: string,
): Promise<MembershipResponse> {
  return api.post<MembershipResponse>(`/invitations/${token}/accept`, {}, { idempotencyKey });
}

export function listMembers(api: ApiClient, mosqueId: string): Promise<MemberListResponse> {
  return api.get<MemberListResponse>(`/mosques/${mosqueId}/members`, mosqueId);
}

export function fetchMosque(api: ApiClient, mosqueId: string): Promise<MosqueResponse> {
  return api.get<MosqueResponse>(`/mosques/${mosqueId}`, mosqueId);
}

export function listMyMosques(api: ApiClient): Promise<MosqueListResponse> {
  return api.get<MosqueListResponse>('/mosques');
}

export function fetchPrayerConfig(api: ApiClient, mosqueId: string): Promise<PrayerConfigResponse> {
  return api.get<PrayerConfigResponse>(`/mosques/${mosqueId}/prayer-config`, mosqueId);
}

export function updatePrayerConfig(
  api: ApiClient, mosqueId: string, input: UpdatePrayerConfigRequest, idempotencyKey: string,
): Promise<PrayerConfigResponse> {
  return api.put<PrayerConfigResponse>(
    `/mosques/${mosqueId}/prayer-config`, input, { tenantId: mosqueId, idempotencyKey },
  );
}
